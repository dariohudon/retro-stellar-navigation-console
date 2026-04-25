import { NextRequest, NextResponse } from 'next/server';
import { fetchPlanetPosition } from '@/lib/ephemeris/jplHorizons';
import { getCached, setCached, invalidate } from '@/lib/ephemeris/cache';
import { PLANET_HORIZONS_IDS, EphemerisResponse } from '@/lib/ephemeris/types';

const CACHE_KEY = 'planets_ephemeris';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function GET(req: NextRequest) {
  const force = req.nextUrl.searchParams.get('force') === 'true';

  // Return cached data unless force-refresh is requested
  if (!force) {
    const cached = getCached<EphemerisResponse>(CACHE_KEY);
    if (cached) {
      return NextResponse.json({
        ...cached.data,
        fromCache: true,
        cacheAgeSeconds: cached.ageSeconds,
      });
    }
  } else {
    invalidate(CACHE_KEY);
  }

  // Fetch planets sequentially with a short gap — JPL Horizons rate-limits parallel hits
  const entries = Object.entries(PLANET_HORIZONS_IDS);
  const settled: PromiseSettledResult<Awaited<ReturnType<typeof fetchPlanetPosition>>>[] = [];
  for (const [id, { horizonsId, name }] of entries) {
    const result = await fetchPlanetPosition(id, horizonsId, name)
      .then(v => ({ status: 'fulfilled' as const, value: v }))
      .catch(e => ({ status: 'rejected' as const, reason: e }));
    settled.push(result);
    if (result.status === 'fulfilled') {
      await new Promise(r => setTimeout(r, 280)); // small gap between requests
    }
  }

  const positions: EphemerisResponse['positions'] = {};
  let anyLive = false;

  settled.forEach((result, i) => {
    const [id, { name }] = entries[i];
    if (result.status === 'fulfilled') {
      positions[id] = result.value;
      anyLive = true;
    } else {
      const msg = result.reason instanceof Error
        ? result.reason.message
        : 'Unknown error';
      positions[id] = {
        id, name,
        x: 0, y: 0, z: 0,
        distanceAU: 0, angleDeg: 0,
        timestamp: new Date().toISOString(),
        source: 'NASA/JPL Horizons',
        isLive: false,
        error: msg,
      };
    }
  });

  const response: EphemerisResponse = {
    positions,
    timestamp:        new Date().toISOString(),
    source:           'NASA/JPL Horizons',
    isLive:           anyLive,
    fromCache:        false,
    cacheAgeSeconds:  0,
  };

  // Only cache if at least some planets returned live data
  if (anyLive) {
    setCached(CACHE_KEY, response, CACHE_TTL_MS);
  }

  return NextResponse.json(response);
}
