import { SITE } from './site';

export interface HourCloud {
  time: string;
  cloud: number;
}

export interface ConditionsData {
  cloudNow: { total: number; low: number; mid: number; high: number };
  hourly: HourCloud[];
  temperature: number;
  dewPoint: number;
  humidity: number;
  windSpeed: number;
  visibilityKm: number;
  score: number;
  summary: string;
  fetchedAt: string;
}

export async function fetchConditions(): Promise<ConditionsData> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${SITE.lat}&longitude=${SITE.lon}` +
    `&hourly=cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility,` +
    `temperature_2m,dew_point_2m,relative_humidity_2m,wind_speed_10m` +
    `&forecast_days=2&timezone=${encodeURIComponent(SITE.timezone)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`open-meteo ${res.status}`);
  const j = await res.json();

  const h = j.hourly;
  const now = new Date();
  // find current hour index (times are local to SITE.timezone)
  let idx = 0;
  for (let i = 0; i < h.time.length; i++) {
    if (new Date(h.time[i]).getTime() <= now.getTime()) idx = i;
  }

  // next 12 hours of cloud for the graph
  const hourly: HourCloud[] = [];
  for (let i = idx; i < Math.min(idx + 12, h.time.length); i++) {
    hourly.push({ time: h.time[i].slice(11, 16), cloud: h.cloud_cover[i] });
  }

  // score: avg total cloud over hours 21:00–03:00 tonight
  let nightClouds: number[] = [];
  for (let i = idx; i < h.time.length; i++) {
    const hh = parseInt(h.time[i].slice(11, 13), 10);
    if (hh >= 21 || hh <= 3) nightClouds.push(h.cloud_cover[i]);
    if (nightClouds.length >= 7) break;
  }
  if (nightClouds.length === 0) nightClouds = [h.cloud_cover[idx]];
  const avgCloud = nightClouds.reduce((a, b) => a + b, 0) / nightClouds.length;
  const score = Math.round((100 - avgCloud) / 10);
  const summary = avgCloud <= 20 ? 'CLEAR' : avgCloud <= 45 ? 'PARTLY CLOUDY' : avgCloud <= 75 ? 'MOSTLY CLOUDY' : 'OVERCAST';

  return {
    cloudNow: {
      total: h.cloud_cover[idx],
      low: h.cloud_cover_low[idx],
      mid: h.cloud_cover_mid[idx],
      high: h.cloud_cover_high[idx],
    },
    hourly,
    temperature: h.temperature_2m[idx],
    dewPoint: h.dew_point_2m[idx],
    humidity: h.relative_humidity_2m[idx],
    windSpeed: h.wind_speed_10m[idx],
    visibilityKm: Math.round((h.visibility[idx] ?? 0) / 1000),
    score,
    summary,
    fetchedAt: new Date().toISOString(),
  };
}
