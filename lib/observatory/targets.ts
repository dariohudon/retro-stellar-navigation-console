import { Body, Observer, SearchAltitude, Illumination, Horizon } from 'astronomy-engine';
import { SITE } from './site';
import { brightnessRatio, sqmFromRatio, bortleFromSqm } from './lightpollution';

interface CatalogObject {
  id: string; name: string; type: string;
  raHours: number; decDeg: number; mag: number;
  /** worst (highest) Bortle class from which this is still rewarding */
  maxBortle: number;
  moonSensitive: boolean;
  /** one plain-language line of wonder for beginners */
  blurb: string;
}

const CATALOG: CatalogObject[] = [
  { id: 'M31', name: 'ANDROMEDA GALAXY', type: 'GALAXY', raHours: 0.712, decDeg: 41.27, mag: 3.4, maxBortle: 5, moonSensitive: true , blurb: 'The nearest big galaxy — 2.5 million light-years away, the farthest thing human eyes can see' },
  { id: 'M33', name: 'TRIANGULUM GALAXY', type: 'GALAXY', raHours: 1.564, decDeg: 30.66, mag: 5.7, maxBortle: 4, moonSensitive: true , blurb: 'A whole spiral galaxy seen face-on — huge but ghostly faint' },
  { id: 'M42', name: 'ORION NEBULA', type: 'NEBULA', raHours: 5.588, decDeg: -5.39, mag: 4.0, maxBortle: 7, moonSensitive: false , blurb: 'A glowing cloud where new stars are literally being born right now' },
  { id: 'M45', name: 'PLEIADES', type: 'OPEN CLUSTER', raHours: 3.79, decDeg: 24.12, mag: 1.6, maxBortle: 8, moonSensitive: false , blurb: 'The Seven Sisters — a sparkling knot of young blue stars' },
  { id: 'M13', name: 'HERCULES CLUSTER', type: 'GLOBULAR', raHours: 16.695, decDeg: 36.46, mag: 5.8, maxBortle: 7, moonSensitive: false , blurb: 'A glittering ball of 300,000 ancient stars, older than Earth itself' },
  { id: 'M92', name: 'M92 GLOBULAR', type: 'GLOBULAR', raHours: 17.285, decDeg: 43.14, mag: 6.4, maxBortle: 7, moonSensitive: false , blurb: 'M13\'s overlooked neighbour — another dazzling ball of ancient suns' },
  { id: 'M57', name: 'RING NEBULA', type: 'PLANETARY', raHours: 18.893, decDeg: 33.03, mag: 8.8, maxBortle: 7, moonSensitive: false , blurb: 'The ghost of a dead star — a tiny, perfect smoke ring in space' },
  { id: 'M27', name: 'DUMBBELL NEBULA', type: 'PLANETARY', raHours: 19.99, decDeg: 22.72, mag: 7.4, maxBortle: 6, moonSensitive: true , blurb: 'A dying star\'s final exhale, glowing like an apple core' },
  { id: 'M81', name: "BODE'S GALAXY", type: 'GALAXY', raHours: 9.926, decDeg: 69.07, mag: 6.9, maxBortle: 5, moonSensitive: true , blurb: 'A bright spiral galaxy 12 million light-years away' },
  { id: 'M51', name: 'WHIRLPOOL GALAXY', type: 'GALAXY', raHours: 13.498, decDeg: 47.2, mag: 8.4, maxBortle: 4, moonSensitive: true , blurb: 'Two galaxies caught in the act of colliding' },
  { id: 'NGC869', name: 'DOUBLE CLUSTER', type: 'OPEN CLUSTER', raHours: 2.32, decDeg: 57.13, mag: 4.3, maxBortle: 7, moonSensitive: false , blurb: 'Twin star clusters side by side — breathtaking in binoculars' },
  { id: 'M44', name: 'BEEHIVE CLUSTER', type: 'OPEN CLUSTER', raHours: 8.667, decDeg: 19.67, mag: 3.7, maxBortle: 7, moonSensitive: false , blurb: 'A loose swarm of stars the Romans could see with bare eyes' },
  { id: 'M11', name: 'WILD DUCK CLUSTER', type: 'OPEN CLUSTER', raHours: 18.85, decDeg: -6.27, mag: 6.3, maxBortle: 6, moonSensitive: false , blurb: 'Hundreds of stars packed like a flock of wild ducks in flight' },
  { id: 'M8', name: 'LAGOON NEBULA', type: 'NEBULA', raHours: 18.06, decDeg: -24.38, mag: 6.0, maxBortle: 6, moonSensitive: true , blurb: 'A pink gas cloud birthing a fresh cluster of stars' },
  { id: 'M22', name: 'M22 GLOBULAR', type: 'GLOBULAR', raHours: 18.607, decDeg: -23.9, mag: 5.1, maxBortle: 6, moonSensitive: false , blurb: 'One of the sky\'s richest star balls, hugging the southern horizon' },
  { id: 'NGC7000', name: 'NORTH AMERICA NEB.', type: 'NEBULA', raHours: 20.98, decDeg: 44.33, mag: 4.0, maxBortle: 4, moonSensitive: true , blurb: 'A gas cloud shaped uncannily like North America' },
  { id: 'ALBIREO', name: 'ALBIREO', type: 'DOUBLE STAR', raHours: 19.512, decDeg: 27.96, mag: 3.1, maxBortle: 9, moonSensitive: false , blurb: 'One gold star, one sapphire star — the sky\'s best colour duo' },
  { id: 'EPSLYR', name: 'DOUBLE DOUBLE', type: 'DOUBLE STAR', raHours: 18.74, decDeg: 39.67, mag: 4.7, maxBortle: 9, moonSensitive: false , blurb: 'The Double Double — look close and each star splits in two' },
  { id: 'MIZAR', name: 'MIZAR & ALCOR', type: 'DOUBLE STAR', raHours: 13.42, decDeg: 54.92, mag: 2.2, maxBortle: 9, moonSensitive: false , blurb: 'The Big Dipper\'s handle hides a famous stellar pair' },
  { id: 'ALMACH', name: 'ALMACH', type: 'DOUBLE STAR', raHours: 2.065, decDeg: 42.33, mag: 4.1, maxBortle: 9, moonSensitive: false , blurb: 'A golden giant with a blue-green companion' },
  { id: 'M3', name: 'M3 GLOBULAR', type: 'GLOBULAR', raHours: 13.7, decDeg: 28.38, mag: 6.2, maxBortle: 6, moonSensitive: false , blurb: 'Half a million stars crammed into one shimmering sphere' },
  { id: 'M104', name: 'SOMBRERO GALAXY', type: 'GALAXY', raHours: 12.667, decDeg: -11.62, mag: 8.0, maxBortle: 5, moonSensitive: true , blurb: 'A galaxy wearing a dark dust lane like a sombrero brim' },
];

export interface TargetPick {
  id: string; name: string; type: string; mag: number; blurb: string;
  bestTime: string; altitude: number; azCompass: string; azimuth: number;
  visibleHere: boolean;   // survives the user's Bortle class
  moonWarning: boolean;
}

export interface TargetsData {
  picks: TargetPick[];
  bortle: number | null;
  moonIllumination: number;
  windowStart: string | null;
  windowEnd: string | null;
  fetchedAt: string;
}

function compass(az: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(az / 22.5) % 16];
}

export async function computeTargets(lat = SITE.lat, lon = SITE.lon, tz = SITE.timezone): Promise<TargetsData> {
  const obs = new Observer(lat, lon, 800);
  const now = new Date();

  // darkness window: astronomical if possible, else nautical, else 23:00–03:00
  let dusk = SearchAltitude(Body.Sun, obs, -1, now, 2, -18);
  let dawn = dusk ? SearchAltitude(Body.Sun, obs, +1, dusk.date, 2, -18) : null;
  if (!dusk || !dawn) {
    dusk = SearchAltitude(Body.Sun, obs, -1, now, 2, -12);
    dawn = dusk ? SearchAltitude(Body.Sun, obs, +1, dusk.date, 2, -12) : null;
  }
  const start = dusk ? dusk.date : new Date(now.getTime() + 8 * 3600 * 1000);
  const end = dawn ? dawn.date : new Date(start.getTime() + 4 * 3600 * 1000);

  const moonIllum = Math.round(Illumination(Body.Moon, start).phase_fraction * 100);

  const ratio = await brightnessRatio(lat, lon);
  const bortle = ratio === null ? null : bortleFromSqm(sqmFromRatio(ratio));

  const fmt = (d: Date) =>
    d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: tz });

  const picks: TargetPick[] = [];
  for (const o of CATALOG) {
    let bestAlt = -90, bestAz = 0, bestT = start;
    for (let t = start.getTime(); t <= end.getTime(); t += 30 * 60 * 1000) {
      const time = new Date(t);
      const hor = Horizon(time, obs, o.raHours, o.decDeg, 'normal');
      if (hor.altitude > bestAlt) { bestAlt = hor.altitude; bestAz = hor.azimuth; bestT = time; }
    }
    if (bestAlt < 20) continue;
    picks.push({
      id: o.id, name: o.name, type: o.type, mag: o.mag, blurb: o.blurb,
      bestTime: fmt(bestT), altitude: Math.round(bestAlt),
      azCompass: compass(bestAz), azimuth: Math.round(bestAz),
      visibleHere: bortle === null ? true : o.maxBortle >= bortle,
      moonWarning: o.moonSensitive && moonIllum > 60,
    });
  }

  picks.sort((a, b) => Number(b.visibleHere) - Number(a.visibleHere) || b.altitude - a.altitude);

  return {
    picks: picks.slice(0, 9),
    bortle,
    moonIllumination: moonIllum,
    windowStart: fmt(start),
    windowEnd: fmt(end),
    fetchedAt: new Date().toISOString(),
  };
}
