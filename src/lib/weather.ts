export interface DayWeather {
  temp: number;
  tempMin: number;
  code: number;
  condition: string;
  rainProb: number;
  date: string;
}

export interface WeatherData {
  day1: DayWeather;  // Vortag
  day2: DayWeather;  // Event-Tag
  day3: DayWeather;  // Folgetag
}

export type WeatherCategory =
  | 'clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'shower'
  | 'storm';

const WMO_LABELS: Record<number, string> = {
  0: 'Klarer Himmel',
  1: 'Überwiegend klar',
  2: 'Teils bewölkt',
  3: 'Bedeckt',
  45: 'Nebel',
  48: 'Eisnebel',
  51: 'Leichter Nieselregen',
  53: 'Nieselregen',
  55: 'Starker Nieselregen',
  56: 'Gefrierender Nieselregen',
  57: 'Starker gefrierender Nieselregen',
  61: 'Leichter Regen',
  63: 'Regen',
  65: 'Starker Regen',
  66: 'Gefrierender Regen',
  67: 'Starker gefrierender Regen',
  71: 'Leichter Schneefall',
  73: 'Schneefall',
  75: 'Starker Schneefall',
  77: 'Schneegriesel',
  80: 'Regenschauer',
  81: 'Mäßige Regenschauer',
  82: 'Starke Regenschauer',
  85: 'Leichte Schneeschauer',
  86: 'Starke Schneeschauer',
  95: 'Gewitter',
  96: 'Gewitter mit Hagel',
  99: 'Schweres Gewitter mit Hagel',
};

export function getWeatherLabel(code: number | string): string {
  const n = typeof code === 'string' ? parseInt(code, 10) : code;
  return WMO_LABELS[n] ?? 'Unbekannt';
}

export function getWeatherCategory(code: number): WeatherCategory {
  if (code === 0 || code === 1) return 'clear';
  if (code === 2) return 'partly-cloudy';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if (code >= 61 && code <= 67) return 'rain';
  if (code >= 71 && code <= 77) return 'snow';
  if (code >= 80 && code <= 86) return 'shower';
  if (code >= 95) return 'storm';
  return 'cloudy';
}

export function formatDayLabel(dateStr: string, offset: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  
  if (diff === -1) return 'Gestern';
  if (diff === 0) return 'Heute';
  if (diff === 1) return 'Morgen';
  if (diff === 2) return 'Übermorgen';
  
  const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const dayName = days[d.getDay()];
  return `${dayName} ${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function getDayStatus(offset: number): string {
  if (offset === 0) return 'Event-Tag';
  if (offset === -1) return 'Vortag';
  return 'Folgetag';
}

interface GeoResult {
  latitude: number;
  longitude: number;
  population: number;
}

async function geocode(name: string): Promise<GeoResult | null> {
  if (!name || name.length < 2) return null;
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=de&format=json`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.results?.length) {
      const r = data.results[0];
      return { latitude: r.latitude, longitude: r.longitude, population: r.population ?? 0 };
    }
  } catch {}
  return null;
}

async function resolveCoords(location: string): Promise<{ latitude: number; longitude: number } | null> {
  const parts = (location || "").split(/[,;/]+/).map((s: string) => s.trim()).filter(Boolean);
  const words = (location || "").trim().split(/\s+/);

  const candidates: string[] = [
    location,
    ...(parts.length > 1 ? [parts[parts.length - 1]] : []),
    ...(parts.length > 1 ? [parts[0]] : []),
    ...(words.length > 1 ? [words[0]] : []),
    ...(words.length > 1 ? [words[words.length - 1]] : []),
    ...(words.length > 2 ? [words.slice(0, 2).join(' ')] : []),
    ...(words.length > 2 ? [words.slice(-2).join(' ')] : []),
  ];

  const seen = new Set<string>();
  const promises: Promise<GeoResult | null>[] = [];
  for (const c of candidates) {
    const key = c.toLowerCase();
    if (seen.has(key) || c.length < 2) continue;
    seen.add(key);
    promises.push(geocode(c));
  }

  const results = (await Promise.all(promises)).filter((r): r is GeoResult => r !== null);
  if (!results.length) return null;

  results.sort((a, b) => b.population - a.population);
  return results[0];
}

function parseDay(daily: any, idx: number): DayWeather | null {
  if (idx < 0 || idx >= daily.time.length) return null;
  return {
    temp: Math.round(daily.temperature_2m_max[idx]),
    tempMin: Math.round(daily.temperature_2m_min[idx]),
    code: daily.weathercode[idx],
    condition: getWeatherLabel(daily.weathercode[idx]),
    rainProb: daily.precipitation_probability_max?.[idx] ?? 0,
    date: daily.time[idx],
  };
}

const _cache = new Map<string, WeatherData | null>();

export async function fetchWeather(location: string, date?: string): Promise<WeatherData | null> {
  const dateStr = date ? date.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const cacheKey = `${location}|${dateStr}`;
  if (_cache.has(cacheKey)) return _cache.get(cacheKey)!;

  try {
    const targetDate = new Date(dateStr + 'T12:00:00');
    const now = new Date();
    const daysAhead = Math.ceil((targetDate.getTime() - now.getTime()) / 86400000);

    if (daysAhead > 16) {
      _cache.set(cacheKey, null);
      return null;
    }

    const coords = await resolveCoords(location);
    if (!coords) {
      _cache.set(cacheKey, null);
      return null;
    }
    const { latitude, longitude } = coords;

    // Berechne 3-Tage-Fenster: Vortag, Event-Tag, Folgetag
    const eventDate = new Date(dateStr + 'T12:00:00');
    const prevDate = new Date(eventDate);
    prevDate.setDate(prevDate.getDate() - 1);
    const nextDate = new Date(eventDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const startDate = prevDate.toISOString().slice(0, 10);
    const endDate = nextDate.toISOString().slice(0, 10);

    const wxRes = await fetch(
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${latitude}&longitude=${longitude}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode` +
      `&timezone=Europe%2FBerlin` +
      `&start_date=${startDate}&end_date=${endDate}`
    );
    if (!wxRes.ok) throw new Error('Forecast fetch failed');
    const wxData = await wxRes.json();

    const daily = wxData.daily;
    if (!daily?.time?.length) {
      _cache.set(cacheKey, null);
      return null;
    }

    // Finde Index für jeden Tag
    const day1Idx = daily.time.indexOf(startDate);
    const day2Idx = daily.time.indexOf(dateStr);
    const day3Idx = daily.time.indexOf(endDate);

    const day1 = parseDay(daily, day1Idx);
    const day2 = parseDay(daily, day2Idx);
    const day3 = parseDay(daily, day3Idx);

    if (!day2) {
      _cache.set(cacheKey, null);
      return null;
    }

    const result: WeatherData = {
      day1: day1 || { ...day2, condition: 'Keine Daten', date: startDate },
      day2,
      day3: day3 || { ...day2, condition: 'Keine Daten', date: endDate },
    };
    _cache.set(cacheKey, result);
    return result;
  } catch (e) {
    console.warn('[weather] fetch error:', e);
    _cache.set(cacheKey, null);
    return null;
  }
}
