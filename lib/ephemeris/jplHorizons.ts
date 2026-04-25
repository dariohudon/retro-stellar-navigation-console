import { EphemerisPosition } from './types';

const HORIZONS_API = 'https://ssd.jpl.nasa.gov/api/horizons.api';
const TIMEOUT_MS = 14000;

// Horizons needs dates as 'YYYY-Mon-DD'
function fmtDate(d: Date): string {
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d.getUTCFullYear()}-${M[d.getUTCMonth()]}-${String(d.getUTCDate()).padStart(2,'0')}`;
}

// 1 Astronomical Unit in km (IAU 2012)
const KM_PER_AU = 149_597_870.700;

// Parse the vector CSV block between $$SOE / $$EOE.
// Horizons VECTORS returns km by default; we convert to AU.
// CSV columns (VEC_TABLE=1): JDTDB, Calendar Date, X, Y, Z, VX, VY, VZ, LT, RG, RR
function parseVectorsCSV(text: string): { x: number; y: number; z: number } | null {
  const soe = text.indexOf('$$SOE');
  const eoe = text.indexOf('$$EOE');
  if (soe === -1 || eoe === -1) return null;

  const block = text.slice(soe + 5, eoe);
  // First line starting with a digit is the data row (the header starts with JDTDB)
  const dataLine = block
    .split('\n')
    .map(l => l.trim())
    .find(l => /^\d/.test(l));

  if (!dataLine) return null;

  const cols = dataLine.split(',').map(c => c.trim());
  if (cols.length < 5) return null;

  const xKm = parseFloat(cols[2]);
  const yKm = parseFloat(cols[3]);
  const zKm = parseFloat(cols[4]);

  if (isNaN(xKm) || isNaN(yKm) || isNaN(zKm)) return null;

  // Convert km → AU
  return { x: xKm / KM_PER_AU, y: yKm / KM_PER_AU, z: zKm / KM_PER_AU };
}

export async function fetchPlanetPosition(
  planetId: string,
  horizonsId: string,
  name: string
): Promise<EphemerisPosition> {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 86_400_000);

  const params = new URLSearchParams({
    format:     'json',
    COMMAND:    `'${horizonsId}'`,
    OBJ_DATA:   "'NO'",
    MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: "'VECTORS'",
    CENTER:     "'500@10'",    // heliocentric — observer at Sun centre
    REF_PLANE:  "'ECLIPTIC'", // ecliptic J2000 frame — x toward vernal equinox, z toward north ecliptic pole
    START_TIME: `'${fmtDate(now)}'`,
    STOP_TIME:  `'${fmtDate(tomorrow)}'`,
    STEP_SIZE:  "'1 d'",
    VEC_TABLE:  "'1'",
    VEC_LABELS: "'YES'",
    CSV_FORMAT: "'YES'",
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${HORIZONS_API}?${params.toString()}`, {
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!res.ok) throw new Error(`Horizons HTTP ${res.status}`);

    const json = (await res.json()) as { result?: string; error?: string };

    if (json.error) throw new Error(`Horizons: ${json.error}`);
    if (!json.result) throw new Error('Horizons: empty result field');

    // Surface any Horizons-level errors embedded in the result text
    if (json.result.includes('!$$SOF') && !json.result.includes('$$SOE')) {
      throw new Error('Horizons: no ephemeris data in response');
    }

    const vec = parseVectorsCSV(json.result);
    if (!vec) throw new Error('Horizons: failed to parse vector data');

    const distanceAU = Math.sqrt(vec.x ** 2 + vec.y ** 2 + vec.z ** 2);

    // Map ecliptic J2000 to SVG angle for a north-ecliptic-pole-up map.
    // In ECL_J2000: x = vernal equinox, y = ecliptic lon 90°, z = north ecliptic pole.
    // SVG has y-axis pointing DOWN, so to get counter-clockwise visual orbit we negate y.
    // atan2(-y, x) maps ecliptic lon 0→right, 90→top, 180→left, 270→bottom in SVG.
    const angleDeg = Math.atan2(-vec.y, vec.x) * (180 / Math.PI);

    return {
      id:         planetId,
      name,
      x:          vec.x,
      y:          vec.y,
      z:          vec.z,
      distanceAU,
      angleDeg,
      timestamp:  now.toISOString(),
      source:     'NASA/JPL Horizons',
      refFrame:   'ECL_J2000',
      isLive:     true,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
