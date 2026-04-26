import { NextRequest, NextResponse } from 'next/server';
import { fetchPlanetPosition } from '@/lib/ephemeris/jplHorizons';
import { getCached, setCached, invalidate } from '@/lib/ephemeris/cache';
import { EphemerisResponse } from '@/lib/ephemeris/types';
import { EXTENDED_HORIZONS_IDS } from '@/lib/ephemeris/extendedBodies';

const CACHE_KEY  = 'extended_ephemeris';
const CACHE_TTL  = 6 * 60 * 60 * 1000; // 6 hours — extended bodies move slowly

export async function GET(req: NextRequest) {
  const force = req.nextUrl.searchParams.get('force') === 'true';

  if (!force) {
    const cached = getCached<EphemerisResponse>(CACHE_KEY);
    if (cached) {
      return NextResponse.json({
        ...cached.data,
        fromCache:       true,
        cacheAgeSeconds: cached.ageSeconds,
      });
    }
  } else {
    invalidate(CACHE_KEY);
  }

  const entries = Object.entries(EXTENDED_HORIZONS_IDS);
  const settled: PromiseSettledResult<Awaited<ReturnType<typeof fetchPlanetPosition>>>[] = [];

  console.log(`[EPHEMERIS/EXTENDED] fetching ${entries.length} bodies force=${force}`);

  for (const [id, { horizonsId, name }] of entries) {
    const result = await fetchPlanetPosition(id, horizonsId, name)
      .then(v  => ({ status: 'fulfilled' as const, value: v }))
      .catch(e => ({ status: 'rejected'  as const, reason: e }));
    settled.push(result);
    if (result.status === 'fulfilled') {
      await new Promise(r => setTimeout(r, 280)); // rate-limit buffer between successes
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
      const msg = result.reason instanceof Error ? result.reason.message : 'Unknown error';
      console.warn(`[EPHEMERIS/EXTENDED] ${id} failed: ${msg}`);
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

  const liveCount = Object.values(positions).filter(p => p.isLive).length;
  console.log(`[EPHEMERIS/EXTENDED] done live=${liveCount}/${entries.length}`);

  const response: EphemerisResponse = {
    positions,
    timestamp:       new Date().toISOString(),
    source:          'NASA/JPL Horizons',
    isLive:          anyLive,
    fromCache:       false,
    cacheAgeSeconds: 0,
  };

  if (anyLive) {
    setCached(CACHE_KEY, response, CACHE_TTL);
  }

  return NextResponse.json(response);
}
