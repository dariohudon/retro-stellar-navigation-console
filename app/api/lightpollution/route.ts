import { NextRequest, NextResponse } from 'next/server';
import { getCached, setCached } from '@/lib/ephemeris/cache';
import { parseLoc } from '@/lib/observatory/loc';
import { computeLightPollution, LightPollutionData } from '@/lib/observatory/lightpollution';

// Light pollution changes on a scale of years — cache for a month.
const TTL = 30 * 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const loc = parseLoc(req);
  const key = `light:${loc.lat.toFixed(1)},${loc.lon.toFixed(1)}`;
  const cached = getCached<LightPollutionData>(key);
  if (cached) return NextResponse.json({ ...cached.data, cached: true });
  try {
    const data = await computeLightPollution(loc.lat, loc.lon);
    if (!data) return NextResponse.json({ error: 'no atlas coverage' }, { status: 404 });
    setCached(key, data, TTL);
    return NextResponse.json({ ...data, cached: false });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
