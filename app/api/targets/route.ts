import { NextRequest, NextResponse } from 'next/server';
import { getCached, setCached } from '@/lib/ephemeris/cache';
import { parseLoc } from '@/lib/observatory/loc';
import { computeTargets, TargetsData } from '@/lib/observatory/targets';

const TTL = 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const loc = parseLoc(req);
  const key = `targets:${loc.key}`;
  const cached = getCached<TargetsData>(key);
  if (cached) return NextResponse.json({ ...cached.data, cached: true });
  try {
    const data = await computeTargets(loc.lat, loc.lon, loc.tz);
    setCached(key, data, TTL);
    return NextResponse.json({ ...data, cached: false });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
