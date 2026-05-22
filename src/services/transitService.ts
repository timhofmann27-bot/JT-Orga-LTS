import { parseISO } from 'date-fns';

export interface TransitLeg {
  mode: 'train' | 'bus' | 'walk' | 'subway' | 'tram' | 'ferry';
  line?: string;
  departure: string;
  arrival: string;
  duration: number;
}

export interface TransitConnection {
  id: string;
  departure: string;
  arrival: string;
  duration: number;
  transfers: number;
  legs: TransitLeg[];
  price?: string;
}

export interface TransitProvider {
  fetchJourneys(from: string, to: string, when?: string, isArrival?: boolean, signal?: AbortSignal): Promise<TransitConnection[]>;
}

const locationCache = new Map<string, string>();
const journeyCache = new Map<string, { data: TransitConnection[]; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 5;

class HafasProvider implements TransitProvider {
  private readonly coordRegex = /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/;
  private isCoords(str: string) { return this.coordRegex.test(str); }

  async fetchJourneys(from: string, to: string, when?: string, isArrival?: boolean, signal?: AbortSignal): Promise<TransitConnection[]> {
    const cacheKey = `${from}-${to}-${when ?? 'now'}-${isArrival ? 'arr' : 'dep'}`;
    const cached = journeyCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data;

    const params = new URLSearchParams({ results: '4', stopovers: 'false' });
    if (when) {
      if (isArrival) {
        params.append('arrival', when);
      } else {
        params.append('departure', when);
      }
    }

    const resolve = async (val: string, type: 'from' | 'to') => {
      if (this.isCoords(val)) {
        const [lat, lon] = val.split(',').map(s => s.trim());
        params.append(`${type}.latitude`, lat);
        params.append(`${type}.longitude`, lon);
        params.append(`${type}.name`, type === 'from' ? 'Start' : 'Ziel');
        return;
      }
      if (locationCache.has(val)) {
        params.append(type, locationCache.get(val)!);
        return;
      }
      try {
        const locRes = await fetch(
          `https://v6.db.transport.rest/locations?query=${encodeURIComponent(val)}&results=1`,
          { signal }
        );
        if (locRes.ok) {
          const locData = await locRes.json();
          if (locData[0]?.id) {
            locationCache.set(val, locData[0].id);
            params.append(type, locData[0].id);
            return;
          }
        }
      } catch (e) {
        if ((e as Error)?.name !== 'AbortError') console.warn('Location resolution failed:', e);
      }
      params.append(type, val);
    };

    await Promise.all([resolve(from, 'from'), resolve(to, 'to')]);

    const urls = [
      `https://v6.vbb.transport.rest/journeys?${params}`,
      `https://v6.db.transport.rest/journeys?${params}`
    ];

    try {
      const results = await Promise.allSettled(
        urls.map(url =>
          fetch(url, { signal }).then(async res => {
            if (!res.ok) throw new Error('API error');
            const data = await res.json();
            if (!data?.journeys?.length) throw new Error('No journeys');
            return data;
          })
        )
      );

      const successful = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map(r => r.value);

      if (successful.length === 0) {
        throw new Error('All APIs failed or returned zero results');
      }

      // Pick the response with journeys
      const bestResponse = successful[0];
      const parsed = this.parseResponse(bestResponse);
      journeyCache.set(cacheKey, { data: parsed, timestamp: Date.now() });
      return parsed;
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') console.warn('Transit fetch failed:', e);
      return [];
    }
  }

  private parseResponse(data: any): TransitConnection[] {
    if (!data?.journeys?.length) return [];
    return data.journeys.map((j: any) => {
      const dep = parseISO(j.legs[0].departure);
      const arr = parseISO(j.legs[j.legs.length - 1].arrival);
      return {
        id: j.refreshToken ?? Math.random().toString(36).slice(2),
        departure: j.legs[0].departure,
        arrival: j.legs[j.legs.length - 1].arrival,
        duration: Math.round((arr.getTime() - dep.getTime()) / 60000),
        transfers: j.legs.filter((l: any) => l.mode !== 'walking').length - 1,
        legs: j.legs.map((l: any) => ({
          mode: l.mode === 'walking' ? 'walk' : (l.line?.product ?? 'tram'),
          line: l.line?.name ?? l.line?.label,
          departure: l.departure,
          arrival: l.arrival,
          duration: Math.round(
            (parseISO(l.arrival).getTime() - parseISO(l.departure).getTime()) / 60000
          )
        })),
        price: j.price?.amount ? `${j.price.amount} ${j.price.currency}` : undefined
      };
    });
  }
}

const activeProvider: TransitProvider = new HafasProvider();

export async function fetchTransitConnections(
  from: string, to: string, when?: string, isArrival?: boolean, signal?: AbortSignal
): Promise<TransitConnection[]> {
  return activeProvider.fetchJourneys(from, to, when, isArrival, signal);
}