export interface AuroraData {
  kpNow: number;
  kpMax24h: number;
  stormLevel: string;
  bz: number | null;
  windSpeed: number | null;
  visibility: string;
  fetchedAt: string;
}

const SWPC = 'https://services.swpc.noaa.gov';

function stormLevel(kp: number): string {
  if (kp >= 9) return 'G5 · EXTREME STORM';
  if (kp >= 8) return 'G4 · SEVERE STORM';
  if (kp >= 7) return 'G3 · STRONG STORM';
  if (kp >= 6) return 'G2 · MODERATE STORM';
  if (kp >= 5) return 'G1 · MINOR STORM';
  if (kp >= 4) return 'ACTIVE';
  return 'QUIET';
}

// heuristic for ~51°N (Calgary)
function visibility(kp: number, bz: number | null): string {
  const boost = bz !== null && bz <= -5 ? 1 : 0;
  const eff = kp + boost * 0.5;
  if (eff >= 6) return 'OVERHEAD DISPLAYS LIKELY';
  if (eff >= 5) return 'LIKELY — WATCH N SKY';
  if (eff >= 4) return 'POSSIBLE LOW ON N HORIZON';
  return 'UNLIKELY TONIGHT';
}

export async function fetchAurora(): Promise<AuroraData> {
  const [kpRes, forecastRes, windRes] = await Promise.allSettled([
    fetch(`${SWPC}/products/noaa-planetary-k-index.json`, { signal: AbortSignal.timeout(10000) }),
    fetch(`${SWPC}/products/noaa-planetary-k-index-forecast.json`, { signal: AbortSignal.timeout(10000) }),
    fetch(`${SWPC}/products/geospace/propagated-solar-wind-1-hour.json`, { signal: AbortSignal.timeout(10000) }),
  ]);

  // rows may be array-of-arrays (with header row) or array-of-objects
  const kpOf = (row: unknown): number => {
    if (Array.isArray(row)) return parseFloat(String(row[1]));
    if (row && typeof row === 'object') return parseFloat(String((row as Record<string, unknown>).Kp ?? (row as Record<string, unknown>).kp));
    return NaN;
  };
  const timeOf = (row: unknown): string => {
    if (Array.isArray(row)) return String(row[0]);
    if (row && typeof row === 'object') return String((row as Record<string, unknown>).time_tag);
    return '';
  };

  let kpNow = 0;
  if (kpRes.status === 'fulfilled' && kpRes.value.ok) {
    const rows: unknown[] = await kpRes.value.json();
    for (let i = rows.length - 1; i >= 0; i--) {
      const v = kpOf(rows[i]);
      if (!Number.isNaN(v)) { kpNow = v; break; }
    }
  }

  let kpMax24h = kpNow;
  if (forecastRes.status === 'fulfilled' && forecastRes.value.ok) {
    const rows: unknown[] = await forecastRes.value.json();
    const now = Date.now();
    for (const r of rows) {
      const v = kpOf(r);
      if (Number.isNaN(v)) continue;
      const t = new Date(timeOf(r).replace(' ', 'T') + 'Z').getTime();
      if (t > now && t < now + 24 * 3600 * 1000) kpMax24h = Math.max(kpMax24h, v);
    }
  }

  // mag/plasma feeds: array-of-arrays, row 0 = header; take last row with data
  const lastValue = (rows: string[][], header: string): number | null => {
    const idx = rows[0].indexOf(header);
    if (idx === -1) return null;
    for (let i = rows.length - 1; i > 0; i--) {
      const v = parseFloat(rows[i][idx]);
      if (!Number.isNaN(v)) return v;
    }
    return null;
  };

  let bz: number | null = null;
  let windSpeed: number | null = null;
  if (windRes.status === 'fulfilled' && windRes.value.ok) {
    const rows: string[][] = await windRes.value.json();
    bz = lastValue(rows, 'bz');
    windSpeed = lastValue(rows, 'speed');
  }

  const kpEff = Math.max(kpNow, kpMax24h);
  return {
    kpNow,
    kpMax24h,
    stormLevel: stormLevel(kpEff),
    bz,
    windSpeed,
    visibility: visibility(kpEff, bz),
    fetchedAt: new Date().toISOString(),
  };
}
