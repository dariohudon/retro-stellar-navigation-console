import { NextResponse } from 'next/server';
import { getCached, setCached } from '@/lib/ephemeris/cache';
import { fetchIssPasses, PassesData } from '@/lib/observatory/passes';

const TTL = 6 * 60 * 60 * 1000;

export async function GET() {
  const cached = getCached<PassesData>('iss-passes');
  if (cached) return NextResponse.json({ ...cached.data, cached: true });
  try {
    const data = await fetchIssPasses();
    setCached('iss-passes', data, TTL);
    return NextResponse.json({ ...data, cached: false });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
