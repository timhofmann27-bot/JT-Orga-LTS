import { parseISO, differenceInMinutes, subMinutes } from 'date-fns';
import { GoogleGenAI } from "@google/genai";
import { TransitConnection } from './transitService';

export interface IntelligenceResult {
  connections: EnrichedConnection[];
  meta: {
    arrivalDeadline: string;
    bestOptionId: string | null;
    globalAdvice: 'leave_now' | 'leave_soon' | 'relaxed';
    globalMessage: string;
    warnings: string[];
  };
}

export type EventType = 'default' | 'concert' | 'meeting' | 'flight' | 'party';
export type BehaviorType = 'risk_averse' | 'balanced' | 'risk_tolerant';

export interface EnrichedConnection extends TransitConnection {
  recommendationScore: number;
  urgency: 'safe' | 'tight' | 'risky';
  confidence: 'high' | 'medium' | 'low';
  tags: string[];
  summary: string;
}

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing. Please configure it in your environment.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

/**
 * Advanced transit intelligence system logic.
 */
export async function processConnections(
  event: { location: string; startTime: string; type?: EventType },
  user: { 
    from: string; 
    preferences: { 
      priority: 'fastest' | 'fewest_transfers' | 'balanced';
      bufferPreference?: number;
      behavior?: BehaviorType;
    } 
  },
  connections: TransitConnection[]
): Promise<IntelligenceResult> {
  const warnings: string[] = [];
  const eventStart = parseISO(event.startTime);
  
  // STEP 1 — DYNAMIC BUFFER
  let bufferMins = user.preferences.bufferPreference || 15;
  const eventType = event.type || 'default';
  
  if (eventType === 'concert') bufferMins += 10;
  else if (eventType === 'flight') bufferMins += 60;
  else if (eventType === 'meeting') bufferMins += 5;
  else if (eventType === 'party') bufferMins += 0;

  const arrivalDeadline = subMinutes(eventStart, bufferMins);

  // STEP 2 — FILTER
  const filtered = connections.filter(c => {
    const arrival = parseISO(c.arrival);
    return arrival <= arrivalDeadline;
  });

  if (filtered.length === 0) {
    return {
      connections: [],
      meta: {
        arrivalDeadline: arrivalDeadline.toISOString(),
        bestOptionId: null,
        globalAdvice: 'relaxed',
        globalMessage: 'Keine rechtzeitige Verbindung verfügbar.',
        warnings: ['Keine Verbindung gefunden, die pünktlich ankommt.']
      }
    };
  }

  const fastestDuration = Math.min(...filtered.map(c => c.duration));
  const minTransfers = Math.min(...filtered.map(c => c.transfers));

  // STEP 3 & 4 — SCORING & CLASSIFICATION
  const enriched = await Promise.all(filtered.map(async (c) => {
    let score = 0;
    const arrival = parseISO(c.arrival);
    const arrivalBuffer = differenceInMinutes(arrivalDeadline, arrival);

    // 1. Arrival Buffer Score
    if (arrivalBuffer >= 25) score += 30;
    else if (arrivalBuffer >= 15) score += 25;
    else if (arrivalBuffer >= 10) score += 15;
    else score += 5;

    // 2. Transfers
    if (c.transfers === 0) score += 25;
    else if (c.transfers === 1) score += 18;
    else if (c.transfers === 2) score += 10;
    else score -= 5;

    // Penalty for tight transfers (less than 5 mins between legs inside the journey)
    const hasTightTransfer = c.legs.some((leg, idx) => {
      if (idx === 0) return false;
      const prevLeg = c.legs[idx - 1];
      const gap = differenceInMinutes(parseISO(leg.departure), parseISO(prevLeg.arrival));
      return gap < 5 && leg.mode !== 'walk'; // Walking gaps are expected to be tight or zero
    });
    if (hasTightTransfer) score -= 15;

    // 3. Duration
    const durationScore = Math.max(5, 20 * (fastestDuration / c.duration));
    score += durationScore;

    // 4. Reliability
    const isReliable = c.legs.every(l => ['train', 'subway', 'tram'].includes(l.mode));
    const isMixed = c.legs.some(l => ['train', 'subway'].includes(l.mode));
    const isBusHeavy = c.legs.filter(l => l.mode === 'bus').length > 1;
    const walkDuration = c.legs.filter(l => l.mode === 'walk').reduce((acc, l) => acc + l.duration, 0);
    
    if (isReliable) score += 15;
    else if (isMixed) score += 5;
    else if (isBusHeavy) score -= 5;
    
    // Penalty for excessive walking (> 15 mins total)
    if (walkDuration > 15) score -= 10;

    // 5. Delay Impact (Mock delays for now as API might not provide them consistently)
    // In a real scenario, we'd check leg.delayMinutes
    const hasDelay = c.legs.some(l => (l as any).delayMinutes > 5);
    const hasMultipleDelays = c.legs.filter(l => (l as any).delayMinutes > 5).length > 1;
    if (hasMultipleDelays) score -= 15;
    else if (hasDelay) score -= 10;

    // 6. Behavioral Adjustment
    const behavior = user.preferences.behavior || 'balanced';
    if (behavior === 'risk_averse' && arrivalBuffer < 10) score -= 15;
    if (behavior === 'risk_tolerant' && c.duration === fastestDuration) score += 5;

    // Urgency
    let urgency: 'safe' | 'tight' | 'risky' = 'risky';
    if (arrivalBuffer >= 20) urgency = 'safe';
    else if (arrivalBuffer >= 10) urgency = 'tight';

    // Confidence
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (c.transfers <= 1 && arrivalBuffer >= 20) confidence = 'high';
    else if (c.transfers <= 2 && arrivalBuffer >= 10) confidence = 'medium';

    // Tags
    const tags: string[] = [];
    if (c.duration === fastestDuration) tags.push('fastest');
    if (arrivalBuffer >= 30 && c.transfers <= 1) tags.push('safest');
    if (c.transfers === minTransfers) tags.push('least_transfers');

    // STEP 6 — HUMAN SUMMARY (GERMAN)
    const summary = await generateGermanSummary(c, urgency, confidence, score);

    return {
      ...c,
      recommendationScore: Math.round(Math.max(0, Math.min(100, score))),
      urgency,
      confidence,
      tags,
      summary
    };
  }));

  // STEP 7 — SORTING
  enriched.sort((a, b) => {
    if (b.recommendationScore !== a.recommendationScore) {
      return b.recommendationScore - a.recommendationScore;
    }
    return parseISO(a.arrival).getTime() - parseISO(b.arrival).getTime();
  });

  const best = enriched[0];

  // STEP 5 — GLOBAL DECISION
  const now = new Date();
  const depTime = parseISO(best.departure);
  const minutesUntilDeparture = differenceInMinutes(depTime, now);

  let globalAdvice: 'leave_now' | 'leave_soon' | 'relaxed' = 'relaxed';
  if (minutesUntilDeparture < 5) globalAdvice = 'leave_now';
  else if (minutesUntilDeparture < 15) globalAdvice = 'leave_soon';

  const globalMessage = await generateGlobalMessage(globalAdvice, minutesUntilDeparture);

  return {
    connections: enriched,
    meta: {
      arrivalDeadline: arrivalDeadline.toISOString(),
      bestOptionId: best.id,
      globalAdvice,
      globalMessage,
      warnings
    }
  };
}

async function generateGermanSummary(
  c: TransitConnection,
  urgency: string,
  confidence: string,
  score: number
): Promise<string> {
  const prompt = `Analysiere diese Verbindung: ${c.duration} Min, ${c.transfers} Umstiege. 
Status: Dringlichkeit ${urgency}, Vertrauen ${confidence}, Score ${score}/100.
Generiere EINEN kurzen, natürlichen Satz auf Deutsch (Beraterton), der die Verbindung bewertet. 
Beispiele: 
- "Beste Verbindung mit viel Puffer und kaum Risiko."
- "Schnell, aber zeitlich knapp."
- "Unsicher wegen mehrerer Umstiege."
Keine Anführungszeichen, nur der Satz.`;

  try {
    const response = await getAI().models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { temperature: 0.7, topP: 0.9 }
    });
    return response.text?.trim() || "Keine Zusammenfassung verfügbar.";
  } catch (e) {
    return score > 70 ? "Zuverlässige Verbindung mit viel Puffer." : "Mögliche Option, aber Vorsicht geboten.";
  }
}

async function generateGlobalMessage(
  advice: 'leave_now' | 'leave_soon' | 'relaxed',
  minutes: number
): Promise<string> {
  const prompt = `Generiere eine kurze, motivierende Nachricht auf Deutsch basierend auf dem Status: ${advice} (${minutes} Minuten bis Abfahrt).
Beispiele:
- "Du solltest jetzt losgehen."
- "Du hast noch etwas Zeit, aber solltest bald aufbrechen."
- "Du bist entspannt unterwegs."
Nur der Satz, keine Anführungszeichen.`;

  try {
    const response = await getAI().models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { temperature: 0.7 }
    });
    return response.text?.trim() || "Bereit für die Abfahrt.";
  } catch (e) {
    if (advice === 'leave_now') return "Du solltest jetzt losgehen.";
    if (advice === 'leave_soon') return "Plane deinen Aufbruch bald ein.";
    return "Du hast noch Zeit.";
  }
}
