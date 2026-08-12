import { promises as fs } from 'fs';
import path from 'path';
import { gunzipSync } from 'zlib';

// David Lorenz Light Pollution Atlas 2025 (djlorenz.github.io/astronomy/lp/)
// 5°x5° tiles, 600x600 points at 1/120°, delta-encoded Int8 with 2-byte seed.
const YEAR = 2025;
const TILE_DIR = process.env.LP_TILES_DIR || '/var/www/retro-stellar-console/data/lptiles';
const TILE_URL = (x: number, y: number) =>
  `https://djlorenz.github.io/astronomy/binary_tiles/${YEAR}/binary_tile_${x}_${y}.dat.gz`;

const tileCache = new Map<string, Int8Array | null>();

async function getTile(tilex: number, tiley: number): Promise<Int8Array | null> {
  const key = `${tilex}_${tiley}`;
  if (tileCache.has(key)) return tileCache.get(key)!;
  const file = path.join(TILE_DIR, String(YEAR), `binary_tile_${tilex}_${tiley}.dat.gz`);
  let raw: Buffer | null = null;
  try {
    raw = await fs.readFile(file);
  } catch {
    try {
      const res = await fetch(TILE_URL(tilex, tiley), { signal: AbortSignal.timeout(20000) });
      if (res.ok) {
        raw = Buffer.from(await res.arrayBuffer());
        await fs.mkdir(path.dirname(file), { recursive: true });
        await fs.writeFile(file, raw);
      }
    } catch { /* offline or missing tile */ }
  }
  const data = raw ? new Int8Array(gunzipSync(raw).buffer) : null;
  tileCache.set(key, data);
  if (tileCache.size > 40) tileCache.delete(tileCache.keys().next().value!);
  return data;
}

const mod = (a: number, n: number) => ((a % n) + n) % n;

/** artificial/natural sky brightness ratio at a point, or null if no data */
export async function brightnessRatio(lat: number, lon: number): Promise<number | null> {
  const lonFromDateLine = mod(lon + 180, 360);
  const latFromStart = lat + 65;
  const tilex = Math.floor(lonFromDateLine / 5) + 1;
  const tiley = Math.floor(latFromStart / 5) + 1;
  if (tiley < 1 || tiley > 28) return null;
  const data = await getTile(tilex, tiley);
  if (!data) return null;
  const ix = Math.round(120 * (lonFromDateLine - 5 * (tilex - 1) + 1 / 240));
  const iy = Math.round(120 * (latFromStart - 5 * (tiley - 1) + 1 / 240));
  const first = 128 * data[0] + data[1];
  let change = 0;
  for (let i = 1; i < iy; i++) change += data[600 * i + 1];
  for (let i = 1; i < ix; i++) change += data[600 * (iy - 1) + 1 + i];
  const compressed = first + change;
  return (5 / 195) * (Math.exp(0.0195 * compressed) - 1);
}

export function sqmFromRatio(ratio: number): number {
  return 22.0 - (5.0 * Math.log(1.0 + ratio)) / Math.log(100.0);
}

export function bortleFromSqm(sqm: number): number {
  if (sqm >= 21.99) return 1;
  if (sqm >= 21.89) return 2;
  if (sqm >= 21.69) return 3;
  if (sqm >= 20.49) return 4;
  if (sqm >= 19.5) return 5;
  if (sqm >= 18.94) return 6;
  if (sqm >= 18.38) return 7;
  if (sqm >= 17.8) return 8;
  return 9;
}

export const BORTLE_LABELS: Record<number, string> = {
  1: 'EXCELLENT DARK SKY — ZODIACAL LIGHT, AIRGLOW VISIBLE',
  2: 'TRULY DARK — MILKY WAY CASTS SHADOWS',
  3: 'RURAL SKY — MILKY WAY RICHLY STRUCTURED',
  4: 'RURAL/SUBURBAN — MILKY WAY CLEAR OVERHEAD',
  5: 'SUBURBAN — MILKY WAY FAINT, WASHED AT HORIZON',
  6: 'BRIGHT SUBURBAN — MILKY WAY BARELY TRACEABLE',
  7: 'CITY EDGE — MILKY WAY INVISIBLE, SKY GREY-ORANGE',
  8: 'CITY SKY — ONLY BRIGHT STARS AND PLANETS',
  9: 'INNER CITY — A FEW DOZEN STARS AT BEST',
};

export interface EscapeCell {
  dirIndex: number;   // 0..15, 0 = N, clockwise
  ringIndex: number;  // 0..4
  bortle: number;
}

export interface LightPollutionData {
  bortle: number;
  sqm: number;
  ratio: number;
  label: string;
  rings: number[];      // ring distances km
  cells: EscapeCell[];  // 16 x rings sky quality around the user
  nearestDark: { km: number; dir: string; bortle: number } | null;
  fetchedAt: string;
}

const RINGS = [15, 30, 50, 75, 105];
const DIRS16 = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

function destination(lat: number, lon: number, bearingDeg: number, km: number): [number, number] {
  const rad = (bearingDeg * Math.PI) / 180;
  const dLat = (km * Math.cos(rad)) / 111.32;
  const dLon = (km * Math.sin(rad)) / (111.32 * Math.cos((lat * Math.PI) / 180));
  return [lat + dLat, lon + dLon];
}

export async function computeLightPollution(lat: number, lon: number): Promise<LightPollutionData | null> {
  const here = await brightnessRatio(lat, lon);
  if (here === null) return null;
  const sqm = sqmFromRatio(here);
  const bortle = bortleFromSqm(sqm);

  const cells: EscapeCell[] = [];
  for (let d = 0; d < 16; d++) {
    for (let r = 0; r < RINGS.length; r++) {
      const [la, lo] = destination(lat, lon, d * 22.5, RINGS[r]);
      const ratio = await brightnessRatio(la, lo);
      cells.push({ dirIndex: d, ringIndex: r, bortle: ratio === null ? 0 : bortleFromSqm(sqmFromRatio(ratio)) });
    }
  }

  // nearest dark sky (Bortle <= 4): fine scan outward
  let nearestDark: LightPollutionData['nearestDark'] = null;
  if (bortle > 4) {
    outer:
    for (let km = 10; km <= 150; km += 10) {
      for (let d = 0; d < 16; d++) {
        const [la, lo] = destination(lat, lon, d * 22.5, km);
        const ratio = await brightnessRatio(la, lo);
        if (ratio !== null) {
          const b = bortleFromSqm(sqmFromRatio(ratio));
          if (b <= 4) { nearestDark = { km, dir: DIRS16[d], bortle: b }; break outer; }
        }
      }
    }
  }

  return {
    bortle,
    sqm: Math.round(sqm * 100) / 100,
    ratio: Math.round(here * 100) / 100,
    label: BORTLE_LABELS[bortle],
    rings: RINGS,
    cells,
    nearestDark,
    fetchedAt: new Date().toISOString(),
  };
}
