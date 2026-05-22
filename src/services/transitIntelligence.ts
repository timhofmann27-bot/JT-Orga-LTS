import { parseISO, differenceInMinutes, subMinutes } from 'date-fns';
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

/**
 * Transit intelligence ohne Gemini-Abhängigkeit.
 * Validiert Verbindungen gegen Event-Start, berechnet Scores, gibt Empfehlungen.
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

  if (isNaN(eventStart.getTime())) {
    return {
      connections: connections.map(c => ({
        ...c,
        recommendationScore: 50,
        urgency: 'safe' as const,
        confidence: 'medium' as const,
        tags: [],
        summary: 'Standard-Verbindung.'
      })),
      meta: {
        arrivalDeadline: event.startTime,
        bestOptionId: connections[0]?.id || null,
        globalAdvice: 'relaxed' as const,
        globalMessage: 'Verbindungen verfügbar.',
        warnings: ['Kein gültiges Event-Datum – Standard-Modus.']
      }
    };
  }

  // DYNAMIC BUFFER
  let bufferMins = user.preferences.bufferPreference || 15;
  const eventType = event.type || 'default';
  if (eventType === 'concert') bufferMins += 10;
  else if (eventType === 'flight') bufferMins += 60;
  else if (eventType === 'meeting') bufferMins += 5;
  else if (eventType === 'party') bufferMins += 0;
  const arrivalDeadline = subMinutes(eventStart, bufferMins);

  // FILTER — nur Verbindungen, die vor der Deadline ankommen
  const filtered = connections.filter(c => {
    const arrival = parseISO(c.arrival);
    return !isNaN(arrival.getTime()) && arrival <= arrivalDeadline;
  });

  if (filtered.length === 0) {
    return {
      connections: connections.slice(0, 3).map(c => ({
        ...c,
        recommendationScore: 40,
        urgency: 'risky' as const,
        confidence: 'low' as const,
        tags: [],
        summary: 'Kommt nicht rechtzeitig — Alternative prüfen.'
      })),
      meta: {
        arrivalDeadline: arrivalDeadline.toISOString(),
        bestOptionId: null,
        globalAdvice: 'leave_now' as const,
        globalMessage: 'Keine rechtzeitige Verbindung — früher los oder anderes Verkehrsmittel?',
        warnings: ['Keine Verbindung pünktlich zum Start.']
      }
    };
  }

  const fastestDuration = Math.min(...filtered.map(c => c.duration));
  const minTransfers = Math.min(...filtered.map(c => c.transfers));

  const enriched: EnrichedConnection[] = filtered.map(c => {
    let score = 0;
    const arrival = parseISO(c.arrival);
    const arrivalBuffer = differenceInMinutes(arrivalDeadline, arrival);

    // Score: Ankunftspuffer
    if (arrivalBuffer >= 25) score += 30;
    else if (arrivalBuffer >= 15) score += 25;
    else if (arrivalBuffer >= 10) score += 15;
    else score += 5;

    // Score: Umstiege
    if (c.transfers === 0) score += 25;
    else if (c.transfers === 1) score += 18;
    else if (c.transfers === 2) score += 10;
    else score -= 5;

    // Penalty: enge Umstiege
    const hasTightTransfer = c.legs.some((leg, idx) => {
      if (idx === 0) return false;
      const prevLeg = c.legs[idx - 1];
      const gap = differenceInMinutes(parseISO(leg.departure), parseISO(prevLeg.arrival));
      return gap < 5 && leg.mode !== 'walk';
    });
    if (hasTightTransfer) score -= 15;

    // Score: Dauer
    score += Math.max(5, 20 * (fastestDuration / c.duration));

    // Score: Zuverlässigkeit
    const isReliable = c.legs.every(l => ['train', 'subway', 'tram'].includes(l.mode));
    const isBusHeavy = c.legs.filter(l => l.mode === 'bus').length > 1;
    const walkDuration = c.legs.filter(l => l.mode === 'walk').reduce((acc, l) => acc + l.duration, 0);
    if (isReliable) score += 15;
    else if (isBusHeavy) score -= 5;
    if (walkDuration > 15) score -= 10;

    // Behavioral
    const behavior = user.preferences.behavior || 'balanced';
    if (behavior === 'risk_averse' && arrivalBuffer < 10) score -= 15;
    if (behavior === 'risk_tolerant' && c.duration === fastestDuration) score += 5;

    const urgency: 'safe' | 'tight' | 'risky' = arrivalBuffer >= 20 ? 'safe' : arrivalBuffer >= 10 ? 'tight' : 'risky';
    const confidence: 'high' | 'medium' | 'low' = c.transfers <= 1 && arrivalBuffer >= 20 ? 'high' : c.transfers <= 2 && arrivalBuffer >= 10 ? 'medium' : 'low';

    const tags: string[] = [];
    if (c.duration === fastestDuration) tags.push('fastest');
    if (arrivalBuffer >= 30 && c.transfers <= 1) tags.push('safest');
    if (c.transfers === minTransfers) tags.push('least_transfers');

    let summary = 'Durchschnittliche Verbindung.';
    if (score > 70 && urgency === 'safe') summary = 'Beste Wahl: entspannt und zuverlässig.';
    else if (score > 50 && urgency === 'tight') summary = 'Schnell, aber knapp — nicht zu viel Zeit lassen.';
    else if (urgency === 'risky') summary = 'Knappe Kiste — einen Plan B haben.';
    else if (tags.includes('fastest') && tags.includes('safest')) summary = 'Schnellste & sicherste Verbindung.';
    else if (c.transfers <= 1 && arrivalBuffer > 30) summary = 'Wenig Umstiege, viel Puffer.';

    return {
      ...c,
      recommendationScore: Math.round(Math.max(0, Math.min(100, score))),
      urgency,
      confidence,
      tags,
      summary
    };
  });

  // Sortiere nach Score
  enriched.sort((a, b) => {
    if (b.recommendationScore !== a.recommendationScore) return b.recommendationScore - a.recommendationScore;
    return parseISO(a.arrival).getTime() - parseISO(b.arrival).getTime();
  });

  const best = enriched[0];
  const now = new Date();
  const depTime = parseISO(best.departure);
  const minutesUntilDeparture = differenceInMinutes(depTime, now);

  let globalAdvice: 'leave_now' | 'leave_soon' | 'relaxed' = 'relaxed';
  let globalMessage = 'Du hast Zeit.';
  if (minutesUntilDeparture < 5) { globalAdvice = 'leave_now'; globalMessage = 'Du solltest jetzt los.'; }
  else if (minutesUntilDeparture < 15) { globalAdvice = 'leave_soon'; globalMessage = 'Bald aufbrechen.'; }
  else { globalMessage = 'Entspannt — noch genug Zeit.'; }

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
