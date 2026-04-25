import { NextRequest, NextResponse } from 'next/server';
import { fetchNeoData, utcToday, NeoApiError } from '@/lib/neo/nasaNeo';
import { getCached, setCached, invalidate } from '@/lib/ephemeris/cache';
import { NeoResponse, NeoErrorCode } from '@/lib/neo/types';

const CACHE_TTL: Record<number, number> = {
  1:  30 * 60 * 1000,
  7:   1 * 60 * 60 * 1000,
  30:  3 * 60 * 60 * 1000,
};

function fmtDateUTC(d: Date): string {
  const y  = d.getUTCFullYear();
  const m  = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

const hasRealKey = !!process.env.NASA_API_KEY;

export async function GET(req: NextRequest) {
  const raw   = req.nextUrl.searchParams.get('days') ?? '7';
  const days  = Math.min(30, Math.max(1, parseInt(raw, 10))) as 1 | 7 | 30;
  const force = req.nextUrl.searchParams.get('force') === 'true';

  const today     = utcToday();
  const startDate = fmtDateUTC(today);
  const endDay    = new Date(today);
  endDay.setUTCDate(endDay.getUTCDate() + days - 1);
  const endDate   = fmtDateUTC(endDay);

  const cacheKey = `neo_${days}`;

  // ── Diagnostic log (key presence only — never the value) ──────────────────
  console.log(`[NEO] request days=${days} start=${startDate} end=${endDate} hasApiKey=${hasRealKey} force=${force}`);

  if (!force) {
    const cached = getCached<NeoResponse>(cacheKey);
    if (cached) {
      const staleFiltered = cached.data.objects.filter(o => o.closeApproachDate >= startDate);
      console.log(`[NEO] serving from cache age=${cached.ageSeconds}s objects=${staleFiltered.length}`);
      return NextResponse.json({
        ...cached.data,
        objects:         staleFiltered,
        fromCache:       true,
        cacheAgeSeconds: cached.ageSeconds,
        hasApiKey:       hasRealKey,
      });
    }
  } else {
    invalidate(cacheKey);
  }

  try {
    const raw_objects = await fetchNeoData(days);
    const objects     = raw_objects.filter(o => o.closeApproachDate >= startDate);
    console.log(`[NEO] live fetch ok objects=${objects.length} (raw=${raw_objects.length})`);

    const response: NeoResponse = {
      objects,
      windowDays:      days,
      startDate,
      endDate,
      timestamp:       new Date().toISOString(),
      source:          hasRealKey ? 'NASA NeoWS (registered key)' : 'NASA NeoWS (DEMO_KEY)',
      isLive:          true,
      fromCache:       false,
      cacheAgeSeconds: 0,
      hasApiKey:       hasRealKey,
    };

    if (objects.length > 0) {
      const ttl = CACHE_TTL[days] ?? CACHE_TTL[7];
      setCached(cacheKey, response, ttl);
    }
    // Don't cache empty results — zero objects might be a transient issue

    return NextResponse.json(response);

  } catch (err) {
    const isNeoErr = err instanceof NeoApiError;
    const code: NeoErrorCode = isNeoErr ? (err as NeoApiError).code : 'NETWORK_ERROR';
    const msg  = err instanceof Error ? err.message : 'Unknown error';

    console.error(`[NEO] fetch failed code=${code} msg=${msg}`);

    return NextResponse.json({
      objects:         [],
      windowDays:      days,
      startDate,
      endDate,
      timestamp:       new Date().toISOString(),
      source:          hasRealKey ? 'NASA NeoWS (registered key)' : 'NASA NeoWS (DEMO_KEY)',
      isLive:          false,
      fromCache:       false,
      cacheAgeSeconds: 0,
      error:           msg,
      errorCode:       code,
      hasApiKey:       hasRealKey,
    } satisfies NeoResponse);
  }
}
