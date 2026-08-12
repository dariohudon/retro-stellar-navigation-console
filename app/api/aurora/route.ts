import { NextResponse } from 'next/server';
import { getCached, setCached } from '@/lib/ephemeris/cache';
import { fetchAurora, AuroraData } from '@/lib/observatory/aurora';

const TTL = 10 * 60 * 1000;

export async function GET() {
  const cached = getCached<AuroraData>('aurora');
  if (cached) return NextResponse.json({ ...cached.data, cached: true });
  try {
    const data = await fetchAurora();
    setCached('aurora', data, TTL);
    return NextResponse.json({ ...data, cached: false });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
