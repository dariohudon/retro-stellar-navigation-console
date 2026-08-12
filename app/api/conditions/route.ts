import { NextRequest, NextResponse } from 'next/server';
import { getCached, setCached } from '@/lib/ephemeris/cache';
import { parseLoc } from '@/lib/observatory/loc';
import { fetchConditions, ConditionsData } from '@/lib/observatory/conditions';

const TTL = 30 * 60 * 1000;

export async function GET(req: NextRequest) {
  const loc = parseLoc(req);
  const key = `conditions:${loc.key}`;
  const cached = getCached<ConditionsData>(key);
  if (cached) return NextResponse.json({ ...cached.data, cached: true });
  try {
    const data = await fetchConditions(loc.lat, loc.lon, loc.tz);
    setCached(key, data, TTL);
    return NextResponse.json({ ...data, cached: false });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
