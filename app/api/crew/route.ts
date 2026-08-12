import { NextResponse } from 'next/server';
import { getCached, setCached } from '@/lib/ephemeris/cache';
import { fetchCrew, CrewData } from '@/lib/observatory/crew';

const TTL = 24 * 60 * 60 * 1000;

export async function GET() {
  const cached = getCached<CrewData>('crew');
  if (cached) return NextResponse.json({ ...cached.data, cached: true });
  try {
    const data = await fetchCrew();
    setCached('crew', data, TTL);
    return NextResponse.json({ ...data, cached: false });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
