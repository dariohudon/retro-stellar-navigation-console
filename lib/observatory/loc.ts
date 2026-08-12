import type { NextRequest } from 'next/server';
import { SITE } from './site';

export interface Loc {
  lat: number;
  lon: number;
  tz: string;
  /** rounded cache key so nearby users share cache entries (~10 km) */
  key: string;
}

function validTz(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function parseLoc(req: NextRequest): Loc {
  const latRaw = parseFloat(req.nextUrl.searchParams.get('lat') ?? '');
  const lonRaw = parseFloat(req.nextUrl.searchParams.get('lon') ?? '');
  const tzRaw = req.nextUrl.searchParams.get('tz') ?? '';

  const lat = Number.isFinite(latRaw) && Math.abs(latRaw) <= 90 ? latRaw : SITE.lat;
  const lon = Number.isFinite(lonRaw) && Math.abs(lonRaw) <= 180 ? lonRaw : SITE.lon;
  const tz = tzRaw && validTz(tzRaw) ? tzRaw : SITE.timezone;

  return { lat, lon, tz, key: `${lat.toFixed(1)},${lon.toFixed(1)},${tz}` };
}

export function fmtTime(d: Date | null, tz: string): string | null {
  if (!d) return null;
  return d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz });
}
