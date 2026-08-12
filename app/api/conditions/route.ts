import { NextResponse } from 'next/server';
import { getCached, setCached } from '@/lib/ephemeris/cache';
import { fetchConditions, ConditionsData } from '@/lib/observatory/conditions';

const TTL = 30 * 60 * 1000;

export async function GET() {
  const cached = getCached<ConditionsData>('conditions');
  if (cached) return NextResponse.json({ ...cached.data, cached: true });
  try {
    const data = await fetchConditions();
    setCached('conditions', data, TTL);
    return NextResponse.json({ ...data, cached: false });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
