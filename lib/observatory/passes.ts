import * as satellite from 'satellite.js';
import { SITE } from './site';

export interface Pass {
  start: string;
  end: string;
  maxElevation: number;
  startDir: string;
  endDir: string;
  durationMin: number;
}

export interface PassesData {
  satellite: string;
  passes: Pass[];
  fetchedAt: string;
}

function compass(azRad: number): string {
  const deg = ((azRad * 180) / Math.PI + 360) % 360;
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

function fmtLocal(d: Date): string {
  return d.toLocaleString('en-CA', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    hour12: false, timeZone: SITE.timezone,
  });
}

export async function fetchIssPasses(): Promise<PassesData> {
  const res = await fetch('https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=tle', {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`celestrak ${res.status}`);
  const tle = (await res.text()).trim().split('\n').map(l => l.trim());
  if (tle.length < 3) throw new Error('bad TLE');

  const satrec = satellite.twoline2satrec(tle[1], tle[2]);
  const observerGd = {
    longitude: satellite.degreesToRadians(SITE.lon),
    latitude: satellite.degreesToRadians(SITE.lat),
    height: SITE.elevation / 1000,
  };

  const passes: Pass[] = [];
  const stepSec = 30;
  const now = Date.now();
  let inPass = false;
  let passStart = 0, maxEl = 0, startDir = '', endDir = '';

  for (let t = 0; t < 48 * 3600; t += stepSec) {
    const time = new Date(now + t * 1000);
    const pv = satellite.propagate(satrec, time);
    if (!pv || !pv.position || typeof pv.position === 'boolean') continue;
    const gmst = satellite.gstime(time);
    const ecf = satellite.eciToEcf(pv.position, gmst);
    const look = satellite.ecfToLookAngles(observerGd, ecf);
    const elDeg = (look.elevation * 180) / Math.PI;

    if (elDeg > 10 && !inPass) {
      inPass = true;
      passStart = time.getTime();
      maxEl = elDeg;
      startDir = compass(look.azimuth);
    } else if (inPass && elDeg > maxEl) {
      maxEl = elDeg;
    }
    if (elDeg <= 10 && inPass) {
      inPass = false;
      endDir = compass(look.azimuth);
      passes.push({
        start: fmtLocal(new Date(passStart)),
        end: fmtLocal(time),
        maxElevation: Math.round(maxEl),
        startDir,
        endDir,
        durationMin: Math.round((time.getTime() - passStart) / 60000),
      });
      if (passes.length >= 6) break;
    }
  }

  return { satellite: 'ISS (ZARYA)', passes, fetchedAt: new Date().toISOString() };
}
