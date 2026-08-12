import { NextResponse } from 'next/server';
import { getCached, setCached } from '@/lib/ephemeris/cache';
import { computeTonight, TonightData } from '@/lib/observatory/tonight';

const TTL = 15 * 60 * 1000;

export async function GET() {
  const cached = getCached<TonightData>('tonight');
  if (cached) return NextResponse.json({ ...cached.data, cached: true });
  const data = computeTonight();
  setCached('tonight', data, TTL);
  return NextResponse.json({ ...data, cached: false });
}
