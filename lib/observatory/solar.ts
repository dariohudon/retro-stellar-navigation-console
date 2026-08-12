export interface SolarFlare {
  time: string;
  maxClass: string;
}

export interface SolarData {
  currentClass: string;      // e.g. B5.4 — background X-ray level right now
  activeRegions: number;
  sunspotNumber: number;
  biggestFlare24h: string | null;
  mProbability: number;      // % chance of M-class flare
  xProbability: number;
  flares: SolarFlare[];      // recent, newest first
  fetchedAt: string;
}

const SWPC = 'https://services.swpc.noaa.gov';

function fluxToClass(flux: number): string {
  if (flux >= 1e-4) return `X${(flux / 1e-4).toFixed(1)}`;
  if (flux >= 1e-5) return `M${(flux / 1e-5).toFixed(1)}`;
  if (flux >= 1e-6) return `C${(flux / 1e-6).toFixed(1)}`;
  if (flux >= 1e-7) return `B${(flux / 1e-7).toFixed(1)}`;
  return `A${(flux / 1e-8).toFixed(1)}`;
}

const classRank = (c: string): number =>
  ({ A: 0, B: 1, C: 2, M: 3, X: 4 }[c[0]] ?? 0) * 10 + parseFloat(c.slice(1) || '0');

export async function fetchSolar(): Promise<SolarData> {
  const [xrayRes, regionsRes, flaresRes] = await Promise.allSettled([
    fetch(`${SWPC}/json/goes/primary/xrays-6-hour.json`, { signal: AbortSignal.timeout(15000) }),
    fetch(`${SWPC}/json/solar_regions.json`, { signal: AbortSignal.timeout(15000) }),
    fetch(`${SWPC}/json/goes/primary/xray-flares-7-day.json`, { signal: AbortSignal.timeout(15000) }),
  ]);

  let currentClass = '—';
  if (xrayRes.status === 'fulfilled' && xrayRes.value.ok) {
    const rows: Array<{ energy: string; flux: number }> = await xrayRes.value.json();
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i].energy === '0.1-0.8nm' && rows[i].flux > 0) { currentClass = fluxToClass(rows[i].flux); break; }
    }
  }

  let activeRegions = 0, sunspotNumber = 0, mProbability = 0, xProbability = 0;
  if (regionsRes.status === 'fulfilled' && regionsRes.value.ok) {
    const rows: Array<{ observed_date: string; number_spots: number; m_flare_probability: number | null; x_flare_probability: number | null }> =
      await regionsRes.value.json();
    const latest = rows.reduce((m, r) => (r.observed_date > m ? r.observed_date : m), '');
    const today = rows.filter(r => r.observed_date === latest);
    activeRegions = today.length;
    for (const r of today) {
      sunspotNumber += r.number_spots ?? 0;
      mProbability = Math.max(mProbability, r.m_flare_probability ?? 0);
      xProbability = Math.max(xProbability, r.x_flare_probability ?? 0);
    }
    sunspotNumber += 10 * activeRegions; // Wolf number convention: 10R + spots
  }

  let flares: SolarFlare[] = [];
  let biggestFlare24h: string | null = null;
  if (flaresRes.status === 'fulfilled' && flaresRes.value.ok) {
    const rows: Array<{ max_time: string; max_class: string }> = await flaresRes.value.json();
    flares = rows
      .filter(r => r.max_class)
      .map(r => ({ time: r.max_time, maxClass: r.max_class }))
      .reverse()
      .slice(0, 8);
    const dayAgo = Date.now() - 24 * 3600 * 1000;
    for (const f of flares) {
      if (new Date(f.time).getTime() > dayAgo) {
        if (!biggestFlare24h || classRank(f.maxClass) > classRank(biggestFlare24h)) biggestFlare24h = f.maxClass;
      }
    }
  }

  return { currentClass, activeRegions, sunspotNumber, biggestFlare24h, mProbability, xProbability, flares, fetchedAt: new Date().toISOString() };
}
