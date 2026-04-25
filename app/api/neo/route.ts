import { NextRequest, NextResponse } from 'next/server';
import { fetchNeoData, utcToday } from '@/lib/neo/nasaNeo';
import { getCached, setCached, invalidate } from '@/lib/ephemeris/cache';
import { NeoResponse } from '@/lib/neo/types';

const CACHE_TTL: Record<number, number> = {
  1:  30 * 60 * 1000,       // 30 min for today's view
  7:   1 * 60 * 60 * 1000,  // 1 hour for 7-day
  30:  3 * 60 * 60 * 1000,  // 3 hours for 30-day
};

function fmtDateUTC(d: Date): string {
  const y  = d.getUTCFullYear();
  const m  = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export async function GET(req: NextRequest) {
  const raw   = req.nextUrl.searchParams.get('days') ?? '7';
  const days  = Math.min(30, Math.max(1, parseInt(raw, 10))) as 1 | 7 | 30;
  const force = req.nextUrl.searchParams.get('force') === 'true';

  // All date strings are UTC
  const today     = utcToday();
  const startDate = fmtDateUTC(today);
  const endDay    = new Date(today);
  endDay.setUTCDate(endDay.getUTCDate() + days - 1);
  const endDate   = fmtDateUTC(endDay);

  const cacheKey = `neo_${days}`;

  if (!force) {
    const cached = getCached<NeoResponse>(cacheKey);
    if (cached) {
      // Filter out any past objects that crept in via a cache populated before midnight
      const staleFiltered = cached.data.objects.filter(
        o => o.closeApproachDate >= startDate
      );
      return NextResponse.json({
        ...cached.data,
        objects:         staleFiltered,
        fromCache:       true,
        cacheAgeSeconds: cached.ageSeconds,
      });
    }
  } else {
    invalidate(cacheKey);
  }

  try {
    const raw_objects = await fetchNeoData(days);

    // Remove any objects NASA returned that are before today UTC
    const objects = raw_objects.filter(o => o.closeApproachDate >= startDate);

    const response: NeoResponse = {
      objects,
      windowDays:      days,
      startDate,
      endDate,
      timestamp:       new Date().toISOString(),
      source:          'NASA NeoWS',
      isLive:          true,
      fromCache:       false,
      cacheAgeSeconds: 0,
    };

    const ttl = CACHE_TTL[days] ?? CACHE_TTL[7];
    setCached(cacheKey, response, ttl);

    return NextResponse.json(response);

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({
      objects:         [],
      windowDays:      days,
      startDate,
      endDate,
      timestamp:       new Date().toISOString(),
      source:          'NASA NeoWS',
      isLive:          false,
      fromCache:       false,
      cacheAgeSeconds: 0,
      error:           msg,
    } satisfies NeoResponse);
  }
}
