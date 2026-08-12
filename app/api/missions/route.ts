import { NextResponse } from 'next/server';
import { getCached, setCached } from '@/lib/ephemeris/cache';
import { fetchMissions, MissionsData } from '@/lib/observatory/missions';

// Launch Library free tier is rate-limited (~15 req/h) — cache generously.
const TTL = 6 * 60 * 60 * 1000;

export async function GET() {
  const cached = getCached<MissionsData>('missions');
  if (cached) return NextResponse.json({ ...cached.data, cached: true });
  try {
    const data = await fetchMissions();
    setCached('missions', data, TTL);
    return NextResponse.json({ ...data, cached: false });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
