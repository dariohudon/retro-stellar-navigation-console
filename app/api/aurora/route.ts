import { NextRequest, NextResponse } from 'next/server';
import { getCached, setCached } from '@/lib/ephemeris/cache';
import { parseLoc } from '@/lib/observatory/loc';
import { fetchAurora, AuroraData } from '@/lib/observatory/aurora';

const TTL = 10 * 60 * 1000;

export async function GET(req: NextRequest) {
  const loc = parseLoc(req);
  const key = `aurora:${loc.lat.toFixed(1)}`;
  const cached = getCached<AuroraData>(key);
  if (cached) return NextResponse.json({ ...cached.data, cached: true });
  try {
    const data = await fetchAurora(loc.lat);
    setCached(key, data, TTL);
    return NextResponse.json({ ...data, cached: false });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
