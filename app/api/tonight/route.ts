import { NextRequest, NextResponse } from 'next/server';
import { getCached, setCached } from '@/lib/ephemeris/cache';
import { parseLoc } from '@/lib/observatory/loc';
import { computeTonight, TonightData } from '@/lib/observatory/tonight';

const TTL = 15 * 60 * 1000;

export async function GET(req: NextRequest) {
  const loc = parseLoc(req);
  const key = `tonight:${loc.key}`;
  const cached = getCached<TonightData>(key);
  if (cached) return NextResponse.json({ ...cached.data, cached: true });
  const data = computeTonight(loc.lat, loc.lon, loc.tz);
  setCached(key, data, TTL);
  return NextResponse.json({ ...data, cached: false });
}
