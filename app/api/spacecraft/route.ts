import { NextRequest, NextResponse } from 'next/server';
import { fetchPlanetPosition } from '@/lib/ephemeris/jplHorizons';
import { getCached, setCached, invalidate } from '@/lib/ephemeris/cache';
import { SpacecraftResponse } from '@/lib/spacecraft/types';
import { SPACECRAFT_REGISTRY } from '@/lib/spacecraft/spacecraftRegistry';

const CACHE_KEY = 'spacecraft_ephemeris';
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours — deep-space assets move slowly

export async function GET(req: NextRequest) {
  const force = req.nextUrl.searchParams.get('force') === 'true';

  if (!force) {
    const cached = getCached<SpacecraftResponse>(CACHE_KEY);
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

  const entries = Object.entries(SPACECRAFT_REGISTRY);
  const settled: PromiseSettledResult<Awaited<ReturnType<typeof fetchPlanetPosition>>>[] = [];

  console.log(`[SPACECRAFT] fetching ${entries.length} assets force=${force}`);

  for (const [id, { horizonsId, name }] of entries) {
    const result = await fetchPlanetPosition(id, horizonsId, name)
      .then(v  => ({ status: 'fulfilled' as const, value: v }))
      .catch(e => ({ status: 'rejected'  as const, reason: e }));
    settled.push(result);
    if (result.status === 'fulfilled') {
      await new Promise(r => setTimeout(r, 280)); // rate-limit buffer between successes
    }
  }

  const assets: SpacecraftResponse['assets'] = {};
  let anyLive = false;

  settled.forEach((result, i) => {
    const [id, entry] = entries[i];
    const meta = {
      category:      entry.category,
      agency:        entry.agency,
      launchYear:    entry.launchYear,
      missionStatus: entry.missionStatus,
      ...(entry.note !== undefined ? { note: entry.note } : {}),
    };

    if (result.status === 'fulfilled') {
      assets[id] = { ...result.value, ...meta };
      anyLive = true;
    } else {
      const msg = result.reason instanceof Error ? result.reason.message : 'Unknown error';
      console.warn(`[SPACECRAFT] ${id} failed: ${msg}`);
      assets[id] = {
        id,
        name:       entry.name,
        x: 0, y: 0, z: 0,
        distanceAU: 0,
        angleDeg:   0,
        timestamp:  new Date().toISOString(),
        source:     'NASA/JPL Horizons',
        isLive:     false,
        error:      msg,
        ...meta,
      };
    }
  });

  const liveCount = Object.values(assets).filter(a => a.isLive).length;
  console.log(`[SPACECRAFT] done live=${liveCount}/${entries.length}`);

  const response: SpacecraftResponse = {
    assets,
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
