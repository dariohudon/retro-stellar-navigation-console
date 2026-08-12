import * as satellite from 'satellite.js';
import { Body, Observer, Equator, Horizon } from 'astronomy-engine';
import { SITE } from './site';
import { getCached, setCached } from '../ephemeris/cache';

export interface Pass {
  start: string;
  end: string;
  maxElevation: number;
  startDir: string;
  endDir: string;
  durationMin: number;
  /** pass occurs in darkness (sun below -6°), i.e. potentially visible */
  isDark: boolean;
  /** az/el track sampled through the pass, for sky-path plotting */
  points: Array<{ az: number; el: number }>;
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

function fmtLocal(d: Date, tz: string): string {
  return d.toLocaleString('en-CA', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    hourCycle: 'h23', timeZone: tz,
  });
}

async function getTle(): Promise<string[]> {
  const cached = getCached<string[]>('iss-tle');
  if (cached) return cached.data;
  const res = await fetch('https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=tle', {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`celestrak ${res.status}`);
  const tle = (await res.text()).trim().split('\n').map(l => l.trim());
  if (tle.length < 3) throw new Error('bad TLE');
  setCached('iss-tle', tle, 6 * 60 * 60 * 1000);
  return tle;
}

export async function fetchIssPasses(lat = SITE.lat, lon = SITE.lon, tz = SITE.timezone): Promise<PassesData> {
  const tle = await getTle();
  const satrec = satellite.twoline2satrec(tle[1], tle[2]);
  const observerGd = {
    longitude: satellite.degreesToRadians(lon),
    latitude: satellite.degreesToRadians(lat),
    height: 0.8,
  };

  const passes: Pass[] = [];
  const stepSec = 30;
  const now = Date.now();
  let inPass = false;
  let passStart = 0, maxEl = 0, startDir = '', endDir = '';
  let track: Array<{ az: number; el: number }> = [];

  for (let t = 0; t < 48 * 3600; t += stepSec) {
    const time = new Date(now + t * 1000);
    const pv = satellite.propagate(satrec, time);
    if (!pv || !pv.position || typeof pv.position === 'boolean') continue;
    const gmst = satellite.gstime(time);
    const ecf = satellite.eciToEcf(pv.position, gmst);
    const look = satellite.ecfToLookAngles(observerGd, ecf);
    const elDeg = (look.elevation * 180) / Math.PI;
    const azDeg = ((look.azimuth * 180) / Math.PI + 360) % 360;

    if (elDeg > 10 && !inPass) {
      inPass = true;
      passStart = time.getTime();
      maxEl = elDeg;
      startDir = compass(look.azimuth);
      track = [{ az: Math.round(azDeg), el: Math.round(elDeg) }];
    } else if (inPass) {
      if (elDeg > maxEl) maxEl = elDeg;
      track.push({ az: Math.round(azDeg), el: Math.round(elDeg) });
    }
    if (elDeg <= 10 && inPass) {
      inPass = false;
      endDir = compass(look.azimuth);
      // downsample long tracks to ~24 points
      const stride = Math.max(1, Math.ceil(track.length / 24));
      const points = track.filter((_, i) => i % stride === 0 || i === track.length - 1);
      const mid = new Date((passStart + time.getTime()) / 2);
      const obs = new Observer(lat, lon, 800);
      const sunEq = Equator(Body.Sun, mid, obs, true, true);
      const sunHor = Horizon(mid, obs, sunEq.ra, sunEq.dec, 'normal');
      passes.push({
        start: fmtLocal(new Date(passStart), tz),
        end: fmtLocal(time, tz),
        maxElevation: Math.round(maxEl),
        startDir,
        endDir,
        durationMin: Math.round((time.getTime() - passStart) / 60000),
        isDark: sunHor.altitude < -6,
        points,
      });
      if (passes.length >= 6) break;
    }
  }

  return { satellite: 'ISS (ZARYA)', passes, fetchedAt: new Date().toISOString() };
}
