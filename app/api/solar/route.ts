import { NextResponse } from 'next/server';
import { getCached, setCached } from '@/lib/ephemeris/cache';
import { fetchSolar, SolarData } from '@/lib/observatory/solar';

const TTL = 20 * 60 * 1000;

export async function GET() {
  const cached = getCached<SolarData>('solar');
  if (cached) return NextResponse.json({ ...cached.data, cached: true });
  try {
    const data = await fetchSolar();
    setCached('solar', data, TTL);
    return NextResponse.json({ ...data, cached: false });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
