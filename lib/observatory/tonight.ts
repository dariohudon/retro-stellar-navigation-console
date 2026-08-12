import {
  Body, Observer, SearchAltitude, SearchRiseSet, Illumination, MoonPhase,
  Equator, Horizon,
} from 'astronomy-engine';
import { SITE } from './site';

export interface PlanetInfo {
  name: string;
  visible: boolean;
  altitude: number;
  azimuthCompass: string;
  rise: string | null;
  set: string | null;
  magnitude: number;
}

export interface TonightData {
  darknessStart: string | null;
  darknessEnd: string | null;
  moon: { illumination: number; phaseName: string; rise: string | null; set: string | null };
  planets: PlanetInfo[];
  nextShower: { name: string; peak: string; daysAway: number } | null;
  fetchedAt: string;
}

const SHOWERS: Array<{ name: string; month: number; day: number }> = [
  { name: 'QUADRANTIDS', month: 1, day: 3 },
  { name: 'LYRIDS', month: 4, day: 22 },
  { name: 'ETA AQUARIIDS', month: 5, day: 5 },
  { name: 'S. DELTA AQUARIIDS', month: 7, day: 30 },
  { name: 'PERSEIDS', month: 8, day: 12 },
  { name: 'ORIONIDS', month: 10, day: 21 },
  { name: 'LEONIDS', month: 11, day: 17 },
  { name: 'GEMINIDS', month: 12, day: 13 },
  { name: 'URSIDS', month: 12, day: 22 },
];

function fmtLocal(d: Date | null, tz: string): string | null {
  if (!d) return null;
  return d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: tz });
}

function compass(az: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(az / 22.5) % 16];
}

function phaseName(angle: number): string {
  if (angle < 22.5 || angle >= 337.5) return 'NEW MOON';
  if (angle < 67.5) return 'WAXING CRESCENT';
  if (angle < 112.5) return 'FIRST QUARTER';
  if (angle < 157.5) return 'WAXING GIBBOUS';
  if (angle < 202.5) return 'FULL MOON';
  if (angle < 247.5) return 'WANING GIBBOUS';
  if (angle < 292.5) return 'LAST QUARTER';
  return 'WANING CRESCENT';
}

export function computeTonight(lat = SITE.lat, lon = SITE.lon, tz = SITE.timezone): TonightData {
  const obs = new Observer(lat, lon, 800);
  const now = new Date();

  const duskEvent = SearchAltitude(Body.Sun, obs, -1, now, 2, -18);
  const dawnEvent = duskEvent ? SearchAltitude(Body.Sun, obs, +1, duskEvent.date, 2, -18) : null;

  const moonIllum = Illumination(Body.Moon, now);
  const moonRise = SearchRiseSet(Body.Moon, obs, +1, now, 1.5);
  const moonSet = SearchRiseSet(Body.Moon, obs, -1, now, 1.5);

  const planets: PlanetInfo[] = [];
  for (const body of [Body.Mercury, Body.Venus, Body.Mars, Body.Jupiter, Body.Saturn]) {
    const eq = Equator(body, now, obs, true, true);
    const hor = Horizon(now, obs, eq.ra, eq.dec, 'normal');
    const rise = SearchRiseSet(body, obs, +1, now, 1.5);
    const set = SearchRiseSet(body, obs, -1, now, 1.5);
    const illum = Illumination(body, now);
    planets.push({
      name: body.toString().toUpperCase(),
      visible: hor.altitude > 5,
      altitude: Math.round(hor.altitude),
      azimuthCompass: compass(hor.azimuth),
      rise: fmtLocal(rise ? rise.date : null, tz),
      set: fmtLocal(set ? set.date : null, tz),
      magnitude: Math.round(illum.mag * 10) / 10,
    });
  }

  let nextShower: TonightData['nextShower'] = null;
  const year = now.getFullYear();
  let best: { name: string; date: Date } | null = null;
  for (const s of SHOWERS) {
    for (const y of [year, year + 1]) {
      const d = new Date(Date.UTC(y, s.month - 1, s.day, 12));
      if (d.getTime() >= now.getTime() - 36 * 3600 * 1000) {
        if (!best || d < best.date) best = { name: s.name, date: d };
        break;
      }
    }
  }
  if (best) {
    const daysAway = Math.max(0, Math.round((best.date.getTime() - now.getTime()) / 86400000));
    nextShower = {
      name: best.name,
      peak: best.date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', timeZone: tz }),
      daysAway,
    };
  }

  return {
    darknessStart: fmtLocal(duskEvent ? duskEvent.date : null, tz),
    darknessEnd: fmtLocal(dawnEvent ? dawnEvent.date : null, tz),
    moon: {
      illumination: Math.round(moonIllum.phase_fraction * 100),
      phaseName: phaseName(MoonPhase(now)),
      rise: fmtLocal(moonRise ? moonRise.date : null, tz),
      set: fmtLocal(moonSet ? moonSet.date : null, tz),
    },
    planets,
    nextShower,
    fetchedAt: new Date().toISOString(),
  };
}
