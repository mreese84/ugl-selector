import { useEffect, useState } from 'react';

// Forecasts from Open-Meteo (https://open-meteo.com): free for non-commercial use with credit,
// no API key, and it allows browser requests from any site. Hourly forecasts reach about 16
// days ahead; earlier than that a date simply has no forecast yet.
const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
export const OPEN_METEO_URL = 'https://open-meteo.com/';
const REFRESH_MS = 30 * 60_000; // Open-Meteo updates its forecasts about hourly

export interface HourForecast {
  hour: number; // 0–23, in the requested time zone
  chance: number; // % chance of rain in the hour before
  amount: number; // inches of rain in the hour before
  temp: number; // °F
  wind: number; // mph
  code: number; // WMO weather code (see describeWeather)
}

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado',
  CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky',
  LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota',
  OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island',
  SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

// "555 Highland Park Dr SW, Aiken, SC" or "Columbia, SC 29201" -> { town: 'Aiken', state: 'SC' }
export function townOf(place: string): { town: string; state: string } | null {
  const parts = place.split(',').map((p) => p.trim()).filter(Boolean);
  const state = parts.at(-1)?.match(/^([A-Z]{2})(\s+\d{5})?$/)?.[1];
  if (parts.length < 2 || !state || !STATE_NAMES[state]) return null;
  return { town: parts[parts.length - 2], state };
}

export function describeWeather(code: number) {
  if (code === 0) return 'Clear';
  if (code === 1) return 'Mostly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Cloudy';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Showers';
  if (code === 85 || code === 86) return 'Snow showers';
  if (code >= 95) return 'Thunderstorms';
  return '';
}

const json = (res: Response) => {
  if (!res.ok) throw new Error(`Open-Meteo responded ${res.status}`);
  return res.json();
};

interface Place {
  latitude: number;
  longitude: number;
  admin1?: string; // state name
}

// Town coordinates, looked up once per page load
const places = new Map<string, Promise<Place | null>>();

function locate(town: string, state: string) {
  const key = `${town}, ${state}`;
  let found = places.get(key);
  if (!found) {
    found = fetch(`${GEOCODE_URL}?name=${encodeURIComponent(town)}&count=10&countryCode=US`)
      .then(json)
      .then((data: { results?: Place[] }) => data.results?.find((r) => r.admin1 === STATE_NAMES[state]) ?? null);
    found.catch(() => places.delete(key)); // look it up again next time
    places.set(key, found);
  }
  return found;
}

interface Hourly {
  time: string[]; // "2026-11-06T10:00"
  precipitation_probability: (number | null)[];
  precipitation: (number | null)[];
  temperature_2m: (number | null)[];
  wind_speed_10m: (number | null)[];
  weather_code: (number | null)[];
}

// One day's hours, or null when the place isn't found or the date has no forecast
async function loadDay(place: string, date: string, timeZone: string | null): Promise<HourForecast[] | null> {
  const where = townOf(place);
  const coords = where && (await locate(where.town, where.state));
  if (!coords) return null;
  const params = new URLSearchParams({
    latitude: String(coords.latitude),
    longitude: String(coords.longitude),
    hourly: 'precipitation_probability,precipitation,temperature_2m,wind_speed_10m,weather_code',
    temperature_unit: 'fahrenheit',
    wind_speed_unit: 'mph',
    precipitation_unit: 'inch',
    timezone: timeZone ?? 'auto',
    start_date: date,
    end_date: date,
  });
  const res = await fetch(`${FORECAST_URL}?${params}`);
  if (res.status === 400) return null; // the date is outside the forecast range
  const { hourly: h }: { hourly: Hourly } = await json(res);
  return h.time.flatMap((t, i) => {
    const temp = h.temperature_2m[i];
    const wind = h.wind_speed_10m[i];
    if (temp == null || wind == null) return [];
    return [{
      hour: Number(t.slice(11, 13)),
      chance: h.precipitation_probability[i] ?? 0,
      amount: h.precipitation[i] ?? 0,
      temp,
      wind,
      code: h.weather_code[i] ?? -1,
    }];
  });
}

interface Fetched {
  key: string;
  status: 'ready' | 'unavailable';
  hours: HourForecast[];
}

// A day's hourly forecast for a place (an address or "Town, ST"), refreshed every 30 minutes.
// 'unavailable' when the town can't be found, the date has no forecast, or Open-Meteo is down.
export function useForecast(place: string | null, date: string | null, timeZone: string | null) {
  const key = place && date ? `${place}|${date}|${timeZone}` : null;
  const [state, setState] = useState<Fetched | null>(null);

  useEffect(() => {
    if (!key || !place || !date) return;
    let cancelled = false;
    const load = () =>
      loadDay(place, date, timeZone).then(
        (hours) => {
          if (!cancelled) setState({ key, status: hours?.length ? 'ready' : 'unavailable', hours: hours ?? [] });
        },
        () => {
          // Keep showing the last good forecast if a refresh fails
          if (!cancelled) {
            setState((prev) => (prev?.key === key && prev.status === 'ready' ? prev : { key, status: 'unavailable', hours: [] }));
          }
        },
      );
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [key, place, date, timeZone]);

  if (!key) return { status: 'unavailable' as const, hours: [] };
  if (state?.key !== key) return { status: 'loading' as const, hours: [] };
  return state;
}
