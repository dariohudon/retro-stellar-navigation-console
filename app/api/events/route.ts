import { NextRequest, NextResponse } from 'next/server';
import { getCached, setCached } from '@/lib/ephemeris/cache';
import { parseLoc } from '@/lib/observatory/loc';
import { computeEvents, EventsData } from '@/lib/observatory/events';

const TTL = 12 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const loc = parseLoc(req);
  const key = `events:${loc.key}`;
  const cached = getCached<EventsData>(key);
  if (cached) return NextResponse.json({ ...cached.data, cached: true });
  const data = computeEvents(loc.lat, loc.lon, loc.tz);
  setCached(key, data, TTL);
  return NextResponse.json({ ...data, cached: false });
}
