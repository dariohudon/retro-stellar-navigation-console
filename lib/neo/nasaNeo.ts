import { NeoObject } from './types';

const NEO_API = 'https://api.nasa.gov/neo/rest/v1/feed';
const TIMEOUT_MS = 14000;

// Format a Date as YYYY-MM-DD using UTC components
function fmtDateUTC(d: Date): string {
  const y  = d.getUTCFullYear();
  const m  = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// Build a Date at UTC midnight for the current UTC day
export function utcToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// Add N days using UTC arithmetic (avoids DST / timezone issues)
function addUTCDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setUTCDate(result.getUTCDate() + n);
  return result;
}

// Clean up NASA name strings: "(2025 FM3)" → "2025 FM3"
export function cleanNeoName(raw: string): string {
  return raw.replace(/^\(|\)$/g, '').trim();
}

// Fetch one batch (max 7 days) from NASA NeoWS
async function fetchBatch(startDate: Date, endDate: Date): Promise<NeoObject[]> {
  const apiKey = process.env.NASA_API_KEY ?? 'DEMO_KEY';

  const params = new URLSearchParams({
    start_date: fmtDateUTC(startDate),
    end_date:   fmtDateUTC(endDate),
    api_key:    apiKey,
  });

  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${NEO_API}?${params}`, {
      cache:  'no-store',
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`NASA NeoWS HTTP ${res.status}`);

    const json = (await res.json()) as {
      near_earth_objects: Record<string, unknown[]>;
    };

    const objects: NeoObject[] = [];
    const neoMap = json.near_earth_objects ?? {};

    for (const dateStr of Object.keys(neoMap)) {
      for (const raw of neoMap[dateStr] as Record<string, unknown>[]) {
        // Prefer Earth close approach; fall back to first
        const approaches = (raw.close_approach_data as Record<string, unknown>[] | undefined) ?? [];
        const approach = approaches.find(
          a => String(a.orbiting_body).toLowerCase() === 'earth'
        ) ?? approaches[0];

        if (!approach) continue;

        const velocity = approach.relative_velocity as Record<string, string>;
        const miss     = approach.miss_distance    as Record<string, string>;
        const diam     = (raw.estimated_diameter   as Record<string, { estimated_diameter_min: number; estimated_diameter_max: number }>);
        const diamKm   = diam?.kilometers ?? { estimated_diameter_min: 0, estimated_diameter_max: 0 };

        objects.push({
          id:                     String(raw.id ?? dateStr + Math.random()),
          name:                   cleanNeoName(String(raw.name ?? 'UNKNOWN')),
          closeApproachDate:      String(approach.close_approach_date ?? dateStr),
          closeApproachDateFull:  String(approach.close_approach_date_full ?? dateStr),
          velocityKmS:            parseFloat(velocity?.kilometers_per_second ?? '0'),
          missDistanceKm:         parseFloat(miss?.kilometers ?? '0'),
          missDistanceLunar:      parseFloat(miss?.lunar ?? '999'),
          diameterMinKm:          diamKm.estimated_diameter_min,
          diameterMaxKm:          diamKm.estimated_diameter_max,
          isPotentiallyHazardous: Boolean(raw.is_potentially_hazardous_asteroid),
          orbitingBody:           String(approach.orbiting_body ?? 'Earth'),
          absoluteMagnitude:      Number(raw.absolute_magnitude_h ?? 0),
          nasaJplUrl:             String(raw.nasa_jpl_url ?? ''),
        });
      }
    }

    return objects;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Sort priority: hazardous first → closest miss distance → soonest date
function sortNeos(objects: NeoObject[]): NeoObject[] {
  return [...objects].sort((a, b) => {
    if (a.isPotentiallyHazardous !== b.isPotentiallyHazardous) {
      return a.isPotentiallyHazardous ? -1 : 1;
    }
    if (a.missDistanceLunar !== b.missDistanceLunar) {
      return a.missDistanceLunar - b.missDistanceLunar;
    }
    return a.closeApproachDate.localeCompare(b.closeApproachDate);
  });
}

// Fetch NEO data for windowDays, batching into ≤7-day UTC chunks
export async function fetchNeoData(windowDays: number): Promise<NeoObject[]> {
  const today    = utcToday();
  const MAX_BATCH = 7;
  const all: NeoObject[] = [];

  for (let offset = 0; offset < windowDays; offset += MAX_BATCH) {
    const bStart = addUTCDays(today, offset);
    const bEnd   = addUTCDays(today, Math.min(offset + MAX_BATCH - 1, windowDays - 1));

    const batch = await fetchBatch(bStart, bEnd);
    all.push(...batch);

    // Rate-limit buffer between batches (DEMO_KEY = 30 req/hr)
    if (offset + MAX_BATCH < windowDays) {
      await new Promise(r => setTimeout(r, 400));
    }
  }

  return sortNeos(all);
}
