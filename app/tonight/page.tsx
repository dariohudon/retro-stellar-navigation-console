'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import './tonight.css';
import pkg from '../../package.json';
import type { AuroraData } from '@/lib/observatory/aurora';
import type { ConditionsData } from '@/lib/observatory/conditions';
import type { TonightData } from '@/lib/observatory/tonight';
import type { PassesData } from '@/lib/observatory/passes';
import type { EventsData } from '@/lib/observatory/events';
import type { MissionsData } from '@/lib/observatory/missions';
import type { LightPollutionData } from '@/lib/observatory/lightpollution';
import type { CrewData } from '@/lib/observatory/crew';
import type { SolarData } from '@/lib/observatory/solar';
import type { TargetsData } from '@/lib/observatory/targets';

interface NeoItem {
  name: string;
  isHazardous: boolean;
  missDistanceLunar: number;
  diameterM: number;
  closeApproachDate: string;
}

const ICONS: Record<string, React.ReactNode> = {
  events: <><circle cx="6" cy="11" r="3" /><line x1="8.5" y1="8.5" x2="14" y2="3" /><line x1="9.5" y1="10.5" x2="15" y2="6" /></>,
  sky: <path d="M11 2 A7 7 0 1 0 15 13 A5.5 5.5 0 0 1 11 2 Z" />,
  neo: <><circle cx="8.5" cy="8.5" r="6" /><circle cx="8.5" cy="8.5" r="1.4" fill="currentColor" stroke="none" /><line x1="13" y1="4" x2="16" y2="1" /></>,
  weather: <path d="M4 12 A3.4 3.4 0 0 1 5 5.5 A4.4 4.4 0 0 1 13.6 6.5 A2.9 2.9 0 0 1 13 12 Z" />,
  light: <><circle cx="8.5" cy="10" r="3.4" /><line x1="8.5" y1="3" x2="8.5" y2="5" /><line x1="3" y1="5.5" x2="4.6" y2="7" /><line x1="14" y1="5.5" x2="12.4" y2="7" /></>,
  aurora: <><path d="M2.5 11 Q5 7.5 8.5 11 T14.5 11" /><path d="M2.5 6.5 Q5 3 8.5 6.5 T14.5 6.5" /></>,
  solar: <><circle cx="8.5" cy="8.5" r="3.2" /><line x1="8.5" y1="1.5" x2="8.5" y2="3.4" /><line x1="8.5" y1="13.6" x2="8.5" y2="15.5" /><line x1="1.5" y1="8.5" x2="3.4" y2="8.5" /><line x1="13.6" y1="8.5" x2="15.5" y2="8.5" /><line x1="3.6" y1="3.6" x2="4.9" y2="4.9" /><line x1="12.1" y1="12.1" x2="13.4" y2="13.4" /></>,
  iss: <><rect x="6.2" y="6.6" width="4.6" height="3.8" rx="0.5" /><line x1="1.5" y1="8.5" x2="6.2" y2="8.5" /><line x1="10.8" y1="8.5" x2="15.5" y2="8.5" /><line x1="2.8" y1="6" x2="2.8" y2="11" /><line x1="14.2" y1="6" x2="14.2" y2="11" /></>,
  map: <><circle cx="8.5" cy="8.5" r="2" /><ellipse cx="8.5" cy="8.5" rx="7" ry="2.6" transform="rotate(-20 8.5 8.5)" /></>,
  missions: <><path d="M8.5 1.5 Q11 5 11 9 L6 9 Q6 5 8.5 1.5 Z" /><line x1="6" y1="11" x2="5" y2="14" /><line x1="11" y1="11" x2="12" y2="14" /><line x1="8.5" y1="10.5" x2="8.5" y2="13.5" /></>,
};

function Icon({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 17 17" className="obs-icon" aria-hidden="true"
      fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      {ICONS[id]}
    </svg>
  );
}

function Skel({ rows = 4 }: { rows?: number }) {
  return (
    <div className="obs-skel">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="obs-skel-row" style={{ width: `${88 - (i % 3) * 14}%`, animationDelay: `${i * 0.08}s` }} />
      ))}
    </div>
  );
}

function Upd({ t, tz }: { t?: string; tz: string }) {
  if (!t) return null;
  return <span className="obs-tag obs-upd">UPD {new Date(t).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: tz })}</span>;
}

/** Polar sky chart: horizon = outer ring, zenith = centre. */
function SkyPath({ pass }: { pass: PassesData['passes'][number] }) {
  const R = 118, C = 130;
  const project = (az: number, el: number) => {
    const r = (R * (90 - Math.max(0, el))) / 90;
    const rad = (az * Math.PI) / 180;
    return { x: C + r * Math.sin(rad), y: C - r * Math.cos(rad) };
  };
  const pts = pass.points.map(p => project(p.az, p.el));
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const first = pts[0], last = pts[pts.length - 1];
  const maxIdx = pass.points.reduce((bi, p, i, a) => (p.el > a[bi].el ? i : bi), 0);
  const peak = pts[maxIdx];
  return (
    <svg viewBox="0 0 260 260" className="obs-skypath" aria-label="ISS sky path">
      {/* elevation rings: horizon, 30°, 60° */}
      <circle cx={C} cy={C} r={R} fill="none" stroke="var(--hud-border)" strokeWidth="1.5" />
      <circle cx={C} cy={C} r={(R * 60) / 90} fill="none" stroke="var(--hud-border)" strokeWidth="0.75" strokeDasharray="3 5" />
      <circle cx={C} cy={C} r={(R * 30) / 90} fill="none" stroke="var(--hud-border)" strokeWidth="0.75" strokeDasharray="3 5" />
      {/* crosshair */}
      <line x1={C} y1={C - R} x2={C} y2={C + R} stroke="var(--hud-border)" strokeWidth="0.5" strokeDasharray="2 6" />
      <line x1={C - R} y1={C} x2={C + R} y2={C} stroke="var(--hud-border)" strokeWidth="0.5" strokeDasharray="2 6" />
      {/* cardinal labels */}
      <text x={C} y={16} textAnchor="middle" className="sp-card">N</text>
      <text x={252} y={C + 4} textAnchor="middle" className="sp-card">E</text>
      <text x={C} y={256} textAnchor="middle" className="sp-card">S</text>
      <text x={8} y={C + 4} textAnchor="middle" className="sp-card">W</text>
      <text x={C - R * 0.6} y={C + R * 0.78} textAnchor="middle" transform={`rotate(38 ${C - R * 0.6} ${C + R * 0.78})`} className="sp-lbl sp-faint">— HORIZON —</text>
      <circle cx={C} cy={C} r="1.5" fill="var(--hud-green-faint)" />
      <text x={C} y={C - 6} textAnchor="middle" className="sp-lbl sp-faint">YOU · LOOKING UP</text>
      {/* track */}
      <path d={d} fill="none" stroke="var(--hud-green)" strokeWidth="1.75" />
      <circle cx={first.x} cy={first.y} r="3.5" fill="var(--hud-bg)" stroke="var(--hud-green)" strokeWidth="1.5" />
      <circle cx={last.x} cy={last.y} r="3" fill="var(--hud-green)" />
      <circle cx={peak.x} cy={peak.y} r="2" fill="var(--hud-amber)" />
      <text x={first.x} y={first.y - 8} textAnchor="middle" className="sp-lbl">RISE {pass.startDir}</text>
      <text x={last.x} y={last.y + 14} textAnchor="middle" className="sp-lbl">SET {pass.endDir}</text>
      <text x={peak.x + 6} y={peak.y - 6} className="sp-lbl sp-peak">MAX {pass.maxElevation}°</text>
    </svg>
  );
}

function SkyDome({ planets, moon }: {
  planets: TonightData['planets'];
  moon: TonightData['moon'];
}) {
  const R = 118, C = 130;
  const project = (az: number, el: number) => {
    const r = (R * (90 - Math.max(0, el))) / 90;
    const rad = (az * Math.PI) / 180;
    return { x: C + r * Math.sin(rad), y: C - r * Math.cos(rad) };
  };
  const up = planets.filter(p => p.altitude > 0);
  const moonUp = moon.altitude > 0;
  return (
    <svg viewBox="0 0 260 260" className="obs-skypath" aria-label="Sky right now">
      <circle cx={C} cy={C} r={R} fill="none" stroke="var(--hud-border)" strokeWidth="1.5" />
      <circle cx={C} cy={C} r={(R * 60) / 90} fill="none" stroke="var(--hud-border)" strokeWidth="0.75" strokeDasharray="3 5" />
      <circle cx={C} cy={C} r={(R * 30) / 90} fill="none" stroke="var(--hud-border)" strokeWidth="0.75" strokeDasharray="3 5" />
      <line x1={C} y1={C - R} x2={C} y2={C + R} stroke="var(--hud-border)" strokeWidth="0.5" strokeDasharray="2 6" />
      <line x1={C - R} y1={C} x2={C + R} y2={C} stroke="var(--hud-border)" strokeWidth="0.5" strokeDasharray="2 6" />
      <text x={C} y={16} textAnchor="middle" className="sp-card">N</text>
      <text x={252} y={C + 4} textAnchor="middle" className="sp-card">E</text>
      <text x={C} y={256} textAnchor="middle" className="sp-card">S</text>
      <text x={8} y={C + 4} textAnchor="middle" className="sp-card">W</text>
      <text x={C - R * 0.6} y={C + R * 0.78} textAnchor="middle" transform={`rotate(38 ${C - R * 0.6} ${C + R * 0.78})`} className="sp-lbl sp-faint">— HORIZON —</text>
      <circle cx={C} cy={C} r="1.5" fill="var(--hud-green-faint)" />
      <text x={C} y={C - 6} textAnchor="middle" className="sp-lbl sp-faint">OVERHEAD</text>
      {moonUp && (() => { const m = project(moon.azimuth, moon.altitude); return (
        <g>
          <circle cx={m.x} cy={m.y} r="5" fill="none" stroke="var(--hud-green)" strokeWidth="1.5" />
          <text x={m.x} y={m.y - 10} textAnchor="middle" className="sp-lbl sp-peak">MOON {moon.illumination}%</text>
        </g>
      ); })()}
      {up.map((p, i) => { const q = project(p.azimuth, p.altitude); return (
        <g key={p.name}>
          <circle cx={q.x} cy={q.y} r="3.5" fill="var(--hud-green-mid)" />
          <text x={Math.min(Math.max(q.x, 12), 248)} y={i % 2 === 0 ? q.y + 15 : q.y - 9} textAnchor={q.x > 190 ? 'end' : q.x < 70 ? 'start' : 'middle'} className="sp-lbl">{p.name}</text>
        </g>
      ); })}
      {up.length === 0 && !moonUp && (
        <text x={C} y={C} textAnchor="middle" className="sp-lbl">NOTHING ABOVE HORIZON RIGHT NOW</text>
      )}
    </svg>
  );
}

function NeoChart({ items }: { items: NeoItem[] }) {
  const R = 118, C = 130;
  const maxD = Math.max(2, ...items.map(n => n.missDistanceLunar)) * 1.15;
  const scale = (d: number) => R * Math.sqrt(d / maxD);
  const rMoon = scale(1);
  return (
    <svg viewBox="0 0 260 260" className="obs-skypath" aria-label="NEO miss distances">
      <circle cx={C} cy={C} r={3.5} fill="var(--hud-green)" />
      <text x={C} y={C + 15} textAnchor="middle" className="sp-lbl sp-peak">EARTH</text>
      <circle cx={C} cy={C} r={rMoon} fill="none" stroke="var(--hud-green-dim)" strokeWidth="0.75" strokeDasharray="3 4" />
      <text x={C + rMoon + 4} y={C - 4} className="sp-lbl">MOON · 1 LD</text>
      <circle cx={C} cy={C} r={R} fill="none" stroke="var(--hud-border)" strokeWidth="1" />
      <text x={C} y={14} textAnchor="middle" className="sp-card">{maxD.toFixed(0)} LD</text>
      {items.map((n, i) => {
        const ang = ((i * 360) / items.length + 30) * (Math.PI / 180);
        const r = scale(Math.max(0.15, n.missDistanceLunar));
        const x = C + r * Math.sin(ang), y = C - r * Math.cos(ang);
        return (
          <g key={n.name}>
            <line x1={C} y1={C} x2={x} y2={y} stroke="var(--hud-border)" strokeWidth="0.4" strokeDasharray="1 4" />
            <circle cx={x} cy={y} r="3" fill={n.isHazardous ? 'var(--hud-danger)' : 'var(--hud-green-mid)'} />
            <text x={Math.min(Math.max(x, 12), 248)} y={y - 8} textAnchor={x > 190 ? 'end' : x < 70 ? 'start' : 'middle'} className={`sp-lbl${n.isHazardous ? ' sp-danger' : ''}`}>
              {n.name.slice(0, 12)} · {n.missDistanceLunar.toFixed(1)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function KpChart({ forecast, needed, tz }: { forecast: AuroraData['forecast']; needed: number; tz: string }) {
  const W = 260, H = 130, top = 14, bottom = 26;
  const plotH = H - top - bottom;
  const bw = W / Math.max(1, forecast.length);
  const yFor = (kp: number) => top + plotH - (Math.min(kp, 9) / 9) * plotH;
  const yNeed = yFor(needed);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="obs-skypath obs-kpchart" aria-label="24h Kp forecast">
      {forecast.map((f, i) => {
        const h = (Math.min(f.kp, 9) / 9) * plotH;
        const cls = f.kp >= needed ? 'kp-go' : f.kp >= needed - 1 ? 'kp-close' : 'kp-quiet';
        const hr = new Date(f.time).toLocaleTimeString('en-CA', { hour: '2-digit', hourCycle: 'h23', timeZone: tz });
        return (
          <g key={f.time}>
            <rect x={i * bw + 3} y={top + plotH - h} width={bw - 6} height={Math.max(2, h)} className={cls} />
            <text x={i * bw + bw / 2} y={H - 12} textAnchor="middle" className="sp-lbl">{hr}</text>
            <text x={i * bw + bw / 2} y={top + plotH - h - 4} textAnchor="middle" className="sp-lbl">{f.kp.toFixed(1)}</text>
          </g>
        );
      })}
      <line x1="0" y1={yNeed} x2={W} y2={yNeed} stroke="var(--hud-green)" strokeWidth="0.75" strokeDasharray="4 4" />
      <text x={W - 2} y={yNeed - 4} textAnchor="end" className="sp-lbl sp-peak">VISIBLE HERE ≥ KP {needed}</text>
    </svg>
  );
}

const LADDER_PLANETS: Array<[string, number]> = [
  ['MERCURY', 0.39], ['VENUS', 0.72], ['EARTH', 1], ['MARS', 1.52],
  ['JUPITER', 5.2], ['SATURN', 9.5], ['URANUS', 19.2], ['NEPTUNE', 30.1],
];

function DistanceLadder({ craft }: { craft: Array<{ name: string; distanceAU: number }> }) {
  const W = 260, H = 300, top = 16, bottom = 12;
  const maxAU = Math.max(180, ...craft.map(c => c.distanceAU)) * 1.15;
  const yFor = (au: number) => top + (Math.log10(Math.max(0.3, au) / 0.3) / Math.log10(maxAU / 0.3)) * (H - top - bottom);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="obs-skypath obs-ladder" aria-label="Deep space distances">
      <line x1={W / 2} y1={top - 6} x2={W / 2} y2={H - bottom} stroke="var(--hud-border)" strokeWidth="1" />
      <circle cx={W / 2} cy={top - 6} r="4" fill="var(--hud-warning)" />
      <text x={W / 2 - 10} y={top - 2} textAnchor="end" className="sp-lbl sp-peak">SUN</text>
      {LADDER_PLANETS.map(([name, au]) => (
        <g key={name}>
          <line x1={W / 2 - 6} y1={yFor(au)} x2={W / 2 + 6} y2={yFor(au)} stroke="var(--hud-green-faint)" strokeWidth="1" />
          <text x={W / 2 - 12} y={yFor(au) + 3} textAnchor="end" className="sp-lbl">{name}</text>
        </g>
      ))}
      {craft.map(c => (
        <g key={c.name}>
          <circle cx={W / 2} cy={yFor(c.distanceAU)} r="3" fill="var(--hud-green)" />
          <text x={W / 2 + 12} y={yFor(c.distanceAU) + 3} className="sp-lbl sp-peak">{c.name.toUpperCase().replace('PARKER SOLAR PROBE', 'PARKER PROBE')} · {c.distanceAU.toFixed(1)} AU</text>
        </g>
      ))}
    </svg>
  );
}

const BORTLE_COLORS: Record<number, string> = {
  0: 'transparent', 1: '#0b7a3c', 2: '#0f9c4a', 3: '#27c060', 4: '#00FF88',
  5: '#ffc857', 6: '#ff9354', 7: '#ff6b4a', 8: '#ff4a4a', 9: '#ff8f8f',
};
// softer palette-matched tones for the light RETRO mode
const BORTLE_COLORS_RETRO: Record<number, string> = {
  0: 'transparent', 1: '#4F7168', 2: '#5F8378', 3: '#71968A', 4: '#8CACA4',
  5: '#E8BE5D', 6: '#D9A662', 7: '#D28E7C', 8: '#B27B64', 9: '#9E6B55',
};

function BortleScale({ bortle, retro }: { bortle: number; retro?: boolean }) {
  const C9 = retro ? BORTLE_COLORS_RETRO : BORTLE_COLORS;
  const W = 260, H = 56, bw = W / 9;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="obs-skypath obs-bortlescale" aria-label="Bortle scale">
      {Array.from({ length: 9 }, (_, i) => (
        <g key={i}>
          <rect x={i * bw + 2} y={18} width={bw - 4} height={16} fill={C9[i + 1]} opacity={i + 1 === bortle ? 1 : retro ? 0.45 : 0.32} />
          <text x={i * bw + bw / 2} y={48} textAnchor="middle" className="sp-lbl">{i + 1}</text>
        </g>
      ))}
      <path d={`M${(bortle - 0.5) * bw - 5},12 L${(bortle - 0.5) * bw + 5},12 L${(bortle - 0.5) * bw},18 Z`} fill="var(--hud-amber)" />
    </svg>
  );
}

function EscapeMap({ lp, retro }: { lp: LightPollutionData; retro?: boolean }) {
  const C9 = retro ? BORTLE_COLORS_RETRO : BORTLE_COLORS;
  const C = 130, R = 118;
  const ringR = (i: number) => ((i + 1) / lp.rings.length) * (R - 16) + 16;
  const wedge = (dir: number, ring: number) => {
    const a0 = (dir * 22.5 - 11.25 - 90) * (Math.PI / 180);
    const a1 = (dir * 22.5 + 11.25 - 90) * (Math.PI / 180);
    const r0 = ring === 0 ? 16 : ringR(ring - 1);
    const r1 = ringR(ring);
    const p = (a: number, r: number) => `${(C + r * Math.cos(a)).toFixed(1)},${(C + r * Math.sin(a)).toFixed(1)}`;
    return `M${p(a0, r0)} L${p(a0, r1)} A${r1},${r1} 0 0 1 ${p(a1, r1)} L${p(a1, r0)} A${r0},${r0} 0 0 0 ${p(a0, r0)} Z`;
  };
  return (
    <svg viewBox="0 0 260 260" className="obs-skypath" aria-label="Dark sky directions">
      {lp.cells.map(c => (
        <path key={`${c.dirIndex}-${c.ringIndex}`} d={wedge(c.dirIndex, c.ringIndex)}
          fill={C9[c.bortle] ?? 'transparent'} opacity={c.bortle === 0 ? 0 : c.bortle <= 4 ? 0.85 : retro ? 0.6 : 0.45}
          stroke="var(--hud-bg)" strokeWidth="0.5" />
      ))}
      <circle cx={C} cy={C} r={13} fill="var(--hud-bg)" stroke={C9[lp.bortle]} strokeWidth="1.5" />
      <text x={C} y={C + 4} textAnchor="middle" className="sp-lbl sp-peak">{lp.bortle}</text>
      <text x={C} y={10} textAnchor="middle" className="sp-card">N</text>
      <text x={254} y={C + 4} textAnchor="middle" className="sp-card">E</text>
      <text x={C} y={258} textAnchor="middle" className="sp-card">S</text>
      <text x={6} y={C + 4} textAnchor="middle" className="sp-card">W</text>
    </svg>
  );
}

function SunDisk({ regions }: { regions: SolarData['regions'] }) {
  const C = 130, R = 108;
  const deg = Math.PI / 180;
  // orthographic projection of the Earth-facing hemisphere; east limb on the left
  const project = (lat: number, lonEW: number) => ({
    x: C - R * Math.cos(lat * deg) * Math.sin(lonEW * deg),
    y: C - R * Math.sin(lat * deg),
  });
  return (
    <svg viewBox="0 0 260 260" className="obs-skypath" aria-label="Solar disk with active regions">
      <circle cx={C} cy={C} r={R} fill="none" stroke="var(--hud-warning)" strokeWidth="1.5" opacity="0.8" />
      {/* heliographic grid */}
      {[-60, -30, 0, 30, 60].map(lat => {
        const y = C - R * Math.sin(lat * deg);
        const hw = R * Math.cos(lat * deg);
        return <line key={lat} x1={C - hw} y1={y} x2={C + hw} y2={y} stroke="var(--hud-border)" strokeWidth="0.5" strokeDasharray="2 5" />;
      })}
      {[-60, -30, 0, 30, 60].map(lon => (
        <ellipse key={lon} cx={C} cy={C} rx={Math.abs(R * Math.sin(lon * deg)) || 0.5} ry={R} fill="none" stroke="var(--hud-border)" strokeWidth="0.5" strokeDasharray="2 5" />
      ))}
      <text x={C - R - 8} y={C + 3} textAnchor="middle" className="sp-card">E</text>
      <text x={C + R + 8} y={C + 3} textAnchor="middle" className="sp-card">W</text>
      <text x={C} y={C - R - 6} textAnchor="middle" className="sp-lbl sp-faint">SPOTS DRIFT E → W IN ~13 DAYS</text>
      {regions.map(r => {
        const p = project(r.lat, r.lonEW);
        const size = Math.max(2.5, Math.min(9, Math.sqrt(r.area) / 3));
        const hot = r.mProb >= 20 || r.flared >= 3;
        return (
          <g key={r.region}>
            <circle cx={p.x} cy={p.y} r={size} fill={hot ? 'var(--hud-danger)' : 'var(--hud-warning)'} opacity={hot ? 0.95 : 0.75} />
            <text x={p.x} y={p.y - size - 4} textAnchor="middle" className="sp-lbl">{String(r.region).slice(-2)}</text>
          </g>
        );
      })}
      {regions.length === 0 && <text x={C} y={C} textAnchor="middle" className="sp-lbl">BLANK SUN — NO SPOTS TODAY</text>}
    </svg>
  );
}

function useClock(tz: string) {
  const [now, setNow] = useState('');
  useEffect(() => {
    const tick = () => {
      const parts = new Date().toLocaleTimeString('en-CA', {
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: tz, timeZoneName: 'short',
      });
      setNow(parts);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [tz]);
  return now;
}

const DEFAULT_LOC = { lat: 51.0447, lon: -114.0719, source: 'default' as 'default' | 'gps' };

export default function TonightPage() {
  const [loc, setLoc] = useState(DEFAULT_LOC);
  const [tz, setTz] = useState('America/Edmonton');
  const clock = useClock(tz);
  const [open, setOpen] = useState<string>('');
  const [splash, setSplash] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 2000);
    return () => clearTimeout(t);
  }, []);

  // ── location: saved > geolocation prompt > Calgary default ──
  useEffect(() => {
    try { setTz(Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Edmonton'); } catch {}
    const saved = localStorage.getItem('obs-loc');
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (Number.isFinite(p.lat) && Number.isFinite(p.lon)) { setLoc({ lat: p.lat, lon: p.lon, source: 'gps' }); return; }
      } catch {}
    }
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const next = { lat: pos.coords.latitude, lon: pos.coords.longitude, source: 'gps' as const };
          localStorage.setItem('obs-loc', JSON.stringify({ lat: next.lat, lon: next.lon }));
          setLoc(next);
        },
        () => {},
        { timeout: 8000, maximumAge: 3600000 },
      );
    }
  }, []);

  const qs = `?lat=${loc.lat.toFixed(3)}&lon=${loc.lon.toFixed(3)}&tz=${encodeURIComponent(tz)}`;
  const [isDesktop, setIsDesktop] = useState(false);
  const [theme, setTheme] = useState<'auto' | 'day' | 'green' | 'night' | 'retro'>('auto');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showHints, setShowHints] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('obs-hints-seen')) setShowHints(true);
  }, []);
  const dismissHints = () => { localStorage.setItem('obs-hints-seen', '1'); setShowHints(false); };
  const [craft, setCraft] = useState<Array<{ name: string; distanceAU: number }> | null>(null);
  const [issView, setIssView] = useState(0); // 0 list · 1 sky path · 2 crew
  const [crew, setCrew] = useState<CrewData | null>(null);
  const [solar, setSolar] = useState<SolarData | null>(null);
  const [solarView, setSolarView] = useState(0); // 0 stats · 1 disk · 2 flares
  const [targets, setTargets] = useState<TargetsData | null>(null);
  const [skyView, setSkyView] = useState(0); // 0 planets · 1 targets · 2 dome
  const [neoView, setNeoView] = useState<0 | 1>(0);
  const [auroraView, setAuroraView] = useState<0 | 1>(0);
  const [craftView, setCraftView] = useState<0 | 1>(0);
  const [events, setEvents] = useState<EventsData | null>(null);
  const [evPage, setEvPage] = useState(0);
  const [missions, setMissions] = useState<MissionsData | null>(null);
  const [light, setLight] = useState<LightPollutionData | null>(null);
  const [lightView, setLightView] = useState<0 | 1>(0);
  const [msnPage, setMsnPage] = useState(0);
  const [issPass, setIssPass] = useState(0);
  const touchX = useRef(0);

  useEffect(() => {
    const t = localStorage.getItem('obs-theme');
    if (t === 'green' || t === 'night' || t === 'day' || t === 'auto' || t === 'retro') setTheme(t);
  }, []);
  const pickTheme = (t: 'auto' | 'day' | 'green' | 'night' | 'retro') => {
    setTheme(t);
    localStorage.setItem('obs-theme', t);
  };

  const fetchCraft = useCallback(() => {
    return fetch('/api/spacecraft')
        .then(r => r.json())
        .then(d => {
          const assets = Object.values(d.assets ?? {}) as Array<{ name: string; distanceAU: number }>;
          setCraft(assets.map(a => ({ name: a.name, distanceAU: a.distanceAU })));
        })
        .catch(() => setCraft([]));
  }, []);
  const loadCraft = useCallback(() => { if (!craft) fetchCraft(); }, [craft, fetchCraft]);
  const [aurora, setAurora] = useState<AuroraData | null>(null);
  const [conditions, setConditions] = useState<ConditionsData | null>(null);
  const [tonight, setTonight] = useState<TonightData | null>(null);
  const [passes, setPasses] = useState<PassesData | null>(null);
  const [neo, setNeo] = useState<NeoItem[] | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)');
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    fetch('/api/aurora' + qs).then(r => r.json()).then(d => !d.error && setAurora(d)).catch(() => {});
    fetch('/api/conditions' + qs).then(r => r.json()).then(d => !d.error && setConditions(d)).catch(() => {});
    fetch('/api/tonight' + qs).then(r => r.json()).then(d => !d.error && setTonight(d)).catch(() => {});
    fetch('/api/passes' + qs).then(r => r.json()).then(d => !d.error && setPasses(d)).catch(() => {});
    fetch('/api/events' + qs).then(r => r.json()).then(d => !d.error && setEvents(d)).catch(() => {});
    fetch('/api/missions').then(r => r.json()).then(d => !d.error && setMissions(d)).catch(() => {});
    fetch('/api/lightpollution' + qs).then(r => r.json()).then(d => !d.error && setLight(d)).catch(() => {});
    fetch('/api/crew').then(r => r.json()).then(d => !d.error && setCrew(d)).catch(() => {});
    fetch('/api/solar').then(r => r.json()).then(d => !d.error && setSolar(d)).catch(() => {});
    fetch('/api/targets' + qs).then(r => r.json()).then(d => !d.error && setTargets(d)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs]);

  const loadPasses = useCallback(() => {
    if (!passes) fetch('/api/passes' + qs).then(r => r.json()).then(d => !d.error && setPasses(d)).catch(() => {});
  }, [passes, qs]);

  const fetchNeo = useCallback(() => {
    return fetch('/api/neo?days=7')
        .then(r => r.json())
        .then(d => {
          interface RawNeo {
            name: string; isPotentiallyHazardous: boolean; missDistanceLunar: number;
            diameterMinKm: number; diameterMaxKm: number; closeApproachDate: string;
          }
          const objs: RawNeo[] = d.objects ?? [];
          const items = objs
            .sort((a, b) => a.missDistanceLunar - b.missDistanceLunar)
            .slice(0, 5)
            .map(o => ({
              name: o.name.replace(/[()]/g, ''),
              isHazardous: o.isPotentiallyHazardous,
              missDistanceLunar: o.missDistanceLunar,
              diameterM: Math.round(((o.diameterMinKm + o.diameterMaxKm) / 2) * 1000),
              closeApproachDate: o.closeApproachDate,
            }));
          setNeo(items);
        })
        .catch(() => setNeo([]));
  }, []);
  const loadNeo = useCallback(() => { if (!neo) fetchNeo(); }, [neo, fetchNeo]);

  useEffect(() => {
    if (isDesktop) { loadPasses(); loadNeo(); loadCraft(); }
  }, [isDesktop, loadPasses, loadNeo, loadCraft]);

  // ── pull-to-refresh on the open card ──
  const stackScroll = useRef(0);
  const [pullPx, setPullPx] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullRef = useRef(0);
  const setPull = (v: number) => { pullRef.current = v; setPullPx(v); };

  const refresh = useCallback(async (id: string) => {
    setRefreshing(true);
    const j = (u: string) => fetch(u).then(r => r.json());
    try {
      if (id === 'aurora') { const d = await j('/api/aurora' + qs); if (!d.error) setAurora(d); }
      else if (id === 'conditions') { const d = await j('/api/conditions' + qs); if (!d.error) setConditions(d); }
      else if (id === 'sky') {
        const [a, b] = await Promise.all([j('/api/tonight' + qs), j('/api/targets' + qs)]);
        if (!a.error) setTonight(a);
        if (!b.error) setTargets(b);
      }
      else if (id === 'passes') { const d = await j('/api/passes' + qs); if (!d.error) setPasses(d); }
      else if (id === 'events') { const d = await j('/api/events' + qs); if (!d.error) setEvents(d); }
      else if (id === 'missions') { const d = await j('/api/missions'); if (!d.error) setMissions(d); }
      else if (id === 'light') { const d = await j('/api/lightpollution' + qs); if (!d.error) setLight(d); }
      else if (id === 'solar') { const d = await j('/api/solar'); if (!d.error) setSolar(d); }
      else if (id === 'neo') await fetchNeo();
      else if (id === 'map') await fetchCraft();
      else if (id === 'all') {
        const urls: Array<[string, (d: never) => void]> = [];
        await Promise.allSettled([
          j('/api/aurora' + qs).then(d => !d.error && setAurora(d)),
          j('/api/conditions' + qs).then(d => !d.error && setConditions(d)),
          j('/api/tonight' + qs).then(d => !d.error && setTonight(d)),
          j('/api/targets' + qs).then(d => !d.error && setTargets(d)),
          j('/api/passes' + qs).then(d => !d.error && setPasses(d)),
          j('/api/events' + qs).then(d => !d.error && setEvents(d)),
        ]);
        void urls;
      }
    } catch { /* keep old data */ }
    setRefreshing(false);
    setPull(0);
  }, [qs, fetchNeo, fetchCraft]);

  useEffect(() => {
    if (isDesktop) return;
    let startY = 0, active = false;
    const body = () => (open ? document.querySelector('.obs-card.open .obs-card-body') : document.querySelector('.obs-root'));
    const ts = (e: TouchEvent) => {
      const el = body();
      active = !!el && el.scrollTop <= 0;
      startY = e.touches[0].clientY;
    };
    const tm = (e: TouchEvent) => {
      if (!active) return;
      const el = body();
      if (!el || el.scrollTop > 0) { setPull(0); return; }
      const dy = e.touches[0].clientY - startY;
      if (dy > 10) { e.preventDefault(); setPull(Math.min(90, (dy - 10) * 0.5)); }
    };
    const te = () => {
      if (!active) return;
      active = false;
      if (pullRef.current > 55) refresh(open || 'all');
      else setPull(0);
    };
    document.addEventListener('touchstart', ts, { passive: true });
    document.addEventListener('touchmove', tm, { passive: false });
    document.addEventListener('touchend', te);
    return () => {
      document.removeEventListener('touchstart', ts);
      document.removeEventListener('touchmove', tm);
      document.removeEventListener('touchend', te);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isDesktop, refresh]);

  const toggle = (id: string) => {
    if (isDesktop) return;
    const root = document.querySelector('.obs-root');
    const next = open === id ? '' : id;
    if (open === '' && next) stackScroll.current = root ? root.scrollTop : 0;
    setOpen(next);
    if (next === 'passes') loadPasses();
    if (next === 'neo') loadNeo();
    if (next !== '' && root) root.scrollTop = 0;
  };

  // restore stack scroll position after the cards re-render
  useEffect(() => {
    if (open === '') {
      const r = document.querySelector('.obs-root');
      if (r) r.scrollTop = stackScroll.current;
    }
  }, [open]);

  const openCls = (id: string) => `obs-card${open === id || isDesktop ? ' open' : ''}`;

  // ── glance status: can you actually see anything tonight? ──
  type DotColor = 'green' | 'amber' | 'red' | null;
  const skyDot: DotColor = !conditions ? null : conditions.score >= 7 ? 'green' : conditions.score >= 4 ? 'amber' : 'red';
  const auroraDot: DotColor = !aurora || !conditions ? null
    : skyDot === 'red' ? 'red'
    : Math.max(aurora.kpNow, aurora.kpMax24h) >= 5 ? (skyDot === 'amber' ? 'amber' : 'green')
    : Math.max(aurora.kpNow, aurora.kpMax24h) >= 4 ? 'amber'
    : 'red';
  const darkPasses = passes ? passes.passes.filter(p => p.isDark) : [];
  const issDot: DotColor = !passes || !conditions ? null
    : darkPasses.length === 0 || skyDot === 'red' ? 'red'
    : darkPasses.some(p => p.maxElevation >= 25) && skyDot === 'green' ? 'green'
    : 'amber';
  const Dot = ({ c }: { c: DotColor }) => (c ? <i className={`obs-dot ${c}`} /> : null);

  const pager = (view: 0 | 1, set: (v: 0 | 1) => void) => ({
    swipe: {
      onTouchStart: (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; },
      onTouchEnd: (e: React.TouchEvent) => {
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (dx < -40) set(1);
        if (dx > 40) set(0);
      },
    },
    dots: (
      <div className="obs-dots">
        <i className={view === 0 ? 'on' : ''} onClick={e => { e.stopPropagation(); set(0); }} />
        <i className={view === 1 ? 'on' : ''} onClick={e => { e.stopPropagation(); set(1); }} />
      </div>
    ),
  });
  const msnMax = missions ? missions.missions.length : 0;
  const msnSwipe = {
    onTouchStart: (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; },
    onTouchEnd: (e: React.TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchX.current;
      if (dx < -40) setMsnPage(p => Math.min(msnMax, p + 1));
      if (dx > 40) setMsnPage(p => Math.max(0, p - 1));
    },
  };
  const fmtMsnDate = (iso: string) => new Date(iso).toLocaleString('en-CA', { month: 'short', day: 'numeric', hourCycle: 'h23', hour: '2-digit', minute: '2-digit', timeZone: tz }).toUpperCase();
  const msnDays = (iso: string) => Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 86400000));

  const neoPager = pager(neoView, v => setNeoView(v));
  const auroraPager = pager(auroraView, v => setAuroraView(v));
  const lightPager = pager(lightView, v => setLightView(v));
  const solarDots = (
    <div className="obs-dots">
      {[0, 1, 2].map(v => (
        <i key={v} className={solarView === v ? 'on' : ''} onClick={e => { e.stopPropagation(); setSolarView(v); }} />
      ))}
    </div>
  );
  const solarSwipe = {
    onTouchStart: (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; },
    onTouchEnd: (e: React.TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchX.current;
      if (dx < -40) setSolarView(v => Math.min(2, v + 1));
      if (dx > 40) setSolarView(v => Math.max(0, v - 1));
    },
  };
  const skyDots = (
    <div className="obs-dots">
      {[0, 1, 2].map(v => (
        <i key={v} className={skyView === v ? 'on' : ''} onClick={e => { e.stopPropagation(); setSkyView(v); }} />
      ))}
    </div>
  );
  const skySwipe = {
    onTouchStart: (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; },
    onTouchEnd: (e: React.TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchX.current;
      if (dx < -40) setSkyView(v => Math.min(2, v + 1));
      if (dx > 40) setSkyView(v => Math.max(0, v - 1));
    },
  };
  const craftPager = pager(craftView, v => setCraftView(v));

  const lightDot: DotColor = !light ? null : light.bortle <= 4 ? 'green' : light.bortle <= 6 ? 'amber' : 'red';
  const tgtDot: DotColor = !targets ? null : targets.picks.filter(p => p.visibleHere).length >= 3 ? 'green' : targets.picks.length > 0 ? 'amber' : 'red';
  const nextEvent = events?.events[0] ?? null;
  const evDot: DotColor = !nextEvent ? null : nextEvent.daysAway <= 2 ? 'green' : nextEvent.daysAway <= 7 ? 'amber' : null;
  const evCount = events ? events.events.length : 0;
  const evMax = evCount; // page 0 = list, 1..N = details
  const evSwipe = {
    onTouchStart: (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; },
    onTouchEnd: (e: React.TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchX.current;
      if (dx < -40) setEvPage(p => Math.min(evMax, p + 1));
      if (dx > 40) setEvPage(p => Math.max(0, p - 1));
    },
  };

  const issDots = (
    <div className="obs-dots">
      {[0, 1, 2].map(v => (
        <i key={v} className={issView === v ? 'on' : ''} onClick={e => { e.stopPropagation(); setIssView(v); }} />
      ))}
    </div>
  );

  const effTheme = theme === 'auto' ? (tonight?.isNight ? 'night' : 'day') : theme;
  const isRetro = effTheme === 'retro';

  return (
    <div className={`obs-root${effTheme !== 'day' ? ` ${effTheme}` : ''}`}>
      {splash && (
        <div className="obs-splash">
          <svg viewBox="0 0 160 160" className="obs-splash-logo" aria-hidden="true">
            <circle cx="80" cy="80" r="30" className="sl-draw" fill="none" strokeWidth="1.5" />
            <ellipse cx="80" cy="80" rx="62" ry="20" className="sl-draw sl-orbit" fill="none" strokeWidth="1" transform="rotate(-18 80 80)" />
            <circle cx="80" cy="80" r="52" className="sl-draw sl-ring" fill="none" strokeWidth="0.5" strokeDasharray="2 6" />
            <line x1="80" y1="6" x2="80" y2="16" className="sl-tick" strokeWidth="1" />
            <line x1="80" y1="144" x2="80" y2="154" className="sl-tick" strokeWidth="1" />
            <line x1="6" y1="80" x2="16" y2="80" className="sl-tick" strokeWidth="1" />
            <line x1="144" y1="80" x2="154" y2="80" className="sl-tick" strokeWidth="1" />
            <circle cx="132" cy="58" r="3" className="sl-sat" />
          </svg>
          <div className="obs-splash-title">RETRO STELLAR</div>
          <div className="obs-splash-sub">ASTRONOMY</div>
        </div>
      )}
      <header className="obs-header">
        <div className="obs-clock">
          <div className="obs-clock-time">{clock}</div>
          <div className="obs-clock-sub">
            {new Date().toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', timeZone: tz }).toUpperCase()}
            {' · '}{Math.abs(loc.lat).toFixed(2)}°{loc.lat >= 0 ? 'N' : 'S'} {Math.abs(loc.lon).toFixed(2)}°{loc.lon >= 0 ? 'E' : 'W'}{loc.source === 'default' ? ' (DEFAULT)' : ''}
          </div>
        </div>
        <button className="obs-menu-btn" aria-label="Menu" onClick={() => setMenuOpen(true)}>☰</button>
      </header>

      {menuOpen && <div className="obs-drawer-backdrop" onClick={() => setMenuOpen(false)} />}
      <aside className={`obs-drawer${menuOpen ? ' openm' : ''}`}>
        <div className="obs-drawer-head">
          <span>SETTINGS</span>
          <button onClick={() => setMenuOpen(false)}>✕</button>
        </div>
        <div className="obs-drawer-label">DISPLAY MODE</div>
        {([['auto', 'AUTO', 'RED AFTER DARK, DAY OTHERWISE'], ['day', 'DAY', 'WHITE PHOSPHOR'], ['green', 'GREEN', 'CLASSIC CRT'], ['night', 'RED', 'PRESERVES NIGHT VISION'], ['retro', 'RETRO', 'ALBERTANS IN SPACE PALETTE']] as const).map(([id, name, sub]) => (
          <button key={id} className={`obs-drawer-opt${theme === id ? ' on' : ''}`} onClick={() => pickTheme(id)}>
            <span className="odo-dot" />
            <span className="odo-text"><b>{name}</b><i>{sub}</i></span>
          </button>
        ))}
        <div className="obs-drawer-foot">
          <div>RETRO STELLAR OBSERVATORY</div>
          <div className="odf-ver">v{pkg.version}</div>
        </div>
      </aside>

      <div className="obs-status">
        <div>KP <b className={aurora && aurora.kpNow >= 4 ? 'hot' : ''}>{aurora ? aurora.kpNow.toFixed(1) : '—'}</b></div>
        <div>CLOUD <b>{conditions ? `${conditions.cloudNow.total}%` : '—'}</b></div>
        <div>MOON <b>{tonight ? `${tonight.moon.illumination}%` : '—'}</b></div>
        <div>DARK <b>{tonight && tonight.darknessStart ? `${tonight.darknessStart}–${tonight.darknessEnd ?? '…'}` : '—'}</b></div>
      </div>

      {conditions && tonight && (
        <div className="obs-verdict">
          {(() => {
            const moonless = tonight.moon.illumination < 30;
            const auroraOn = aurora && Math.max(aurora.kpNow, aurora.kpMax24h) >= aurora.neededKp;
            if (conditions.score <= 3)
              return <>TONIGHT: CLOUDED OUT{conditions.outlook ? <> — <b>NEXT CLEAR SHOT {conditions.outlook}</b></> : ''}</>;
            if (conditions.score >= 7)
              return <>GO OUT AT <b>{tonight.darknessStart ?? 'DUSK'}</b> — CLEAR{moonless ? ', MOONLESS' : ''}{auroraOn ? ', AURORA POSSIBLE' : ''}</>;
            return <>MIXED SKIES TONIGHT — <b>WORTH A LOOK AFTER {tonight.darknessStart ?? 'DUSK'}</b></>;
          })()}
        </div>
      )}

      <div className={`obs-stack${open && !isDesktop ? ' has-open' : ''}`}>

        {!isDesktop && (pullPx > 0 || refreshing) && (
          <div className="obs-pull" style={{ height: refreshing ? 40 : pullPx }}>
            {refreshing ? <span className="obs-pull-spin">⟳ REFRESHING…</span> : pullPx > 55 ? '⟳ RELEASE TO REFRESH' : '↓ PULL TO REFRESH'}
          </div>
        )}

        <div className="obs-section"><span>//</span> THE SKY</div>

        <div className={openCls('events')}>
          <div className="obs-card-head" onClick={() => toggle('events')}>
            <div className="t"><Icon id="events" /> EVENTS</div>
            <div className="g"><span className="g-txt">{nextEvent ? `${nextEvent.title} · ${nextEvent.daysAway === 0 ? 'TODAY' : `${nextEvent.daysAway}d`}` : 'LOADING…'}</span><Dot c={evDot} /></div>
          </div>
          <div className="obs-card-body" {...evSwipe}>
            {events ? (
              <>
                {evPage === 0 ? (
                  <>
                    {events.events.map((ev, i) => (
                      <div className="obs-row obs-pass" key={ev.id} onClick={e => { e.stopPropagation(); setEvPage(i + 1); }}>
                        <span className="k">{ev.dateLabel}</span>
                        <span className={`v ${ev.daysAway <= 2 ? 'hot' : ''}`}>{ev.title} · {ev.daysAway === 0 ? 'TODAY' : `${ev.daysAway}d`} ▸</span>
                      </div>
                    ))}
                    <span className="obs-tag">COMPUTED FOR YOUR LOCATION</span><Upd t={events.fetchedAt} tz={tz} />
                  </>
                ) : (() => { const ev = events.events[evPage - 1]; return (
                  <>
                    <div className="obs-ev-date">{ev.dateLabel}{ev.daysAway === 0 ? ' · TODAY' : ` · IN ${ev.daysAway} DAYS`}</div>
                    <div className="obs-ev-title">{ev.title}</div>
                    <span className="obs-tag">{ev.type}</span>
                    <div className="obs-row"><span className="k">WINDOW</span><span className="v">{ev.window}</span></div>
                    <div className="obs-row"><span className="k">DETAILS</span><span className="v">{ev.stat}</span></div>
                    <div className="obs-row"><span className="k">VIEWING</span><span className="v">{ev.best}</span></div>
                    <p className="obs-ev-blurb">{ev.blurb}</p>
                  </>
                ); })()}
                <div className="obs-dots">
                  {Array.from({ length: evMax + 1 }, (_, i) => (
                    <i key={i} className={evPage === i ? 'on' : ''} onClick={e => { e.stopPropagation(); setEvPage(i); }} />
                  ))}
                </div>
              </>
            ) : <Skel rows={5} />}
          </div>
        </div>

        <div className={openCls('sky')}>
          <div className="obs-card-head" onClick={() => toggle('sky')}>
            <div className="t"><Icon id="sky" /> TONIGHT&apos;S SKY</div>
            <div className="g"><span className="g-txt">{tonight && targets ? `${tonight.planets.filter(p => p.visible).length} PLANETS · ${targets.picks.filter(p => p.visibleHere).length} TARGETS` : 'LOADING…'}</span><Dot c={skyDot} /></div>
          </div>
          <div className="obs-card-body" {...skySwipe}>
            {tonight ? (
              skyView === 2 ? (
                <>
                  <div className="obs-row"><span className="k">YOUR SKY, LOOKING UP</span><span className="v">EDGE = HORIZON · CENTRE = OVERHEAD</span></div>
                  <SkyDome
                    planets={[
                      ...tonight.planets,
                      ...(targets ? targets.picks.filter(p => p.visibleHere).slice(0, 5).map(p => ({ name: p.id, visible: true, altitude: p.altitude, azimuth: p.azimuth, azimuthCompass: p.azCompass, rise: null, set: null, magnitude: p.mag })) : []),
                    ]}
                    moon={tonight.moon}
                  />
                  {skyDots}
                </>
              ) : skyView === 1 ? (
                targets ? (
                  <>
                    {conditions && conditions.score <= 3 && (
                      <div className="obs-cloudwarn">☁ CLOUDS WILL LIKELY BLOCK TONIGHT — PICKS ASSUME A CLEAR SKY</div>
                    )}
                    <div className="obs-row"><span className="k">BEST THINGS TO POINT AT</span><span className="v">MOON {targets.moonIllumination}%{targets.bortle ? ` · BORTLE ${targets.bortle}` : ''}</span></div>
                    {targets.picks.map(p => {
                      const altPhrase = p.altitude >= 60 ? 'nearly overhead' : p.altitude >= 35 ? 'halfway up the sky' : 'low on the horizon';
                      return (
                        <div className="obs-tgt" key={p.id}>
                          <div className="obs-tgt-top">
                            <span className="obs-tgt-name">{p.name}</span>
                            <span className={`obs-tgt-chip ${p.visibleHere ? (p.moonWarning ? 'chip-moon' : 'chip-ok') : 'chip-dark'}`}>
                              {p.visibleHere ? (p.moonWarning ? '☾ MOONLIGHT HURTS' : '✓ YOUR SKY') : 'NEEDS DARK SITE'}
                            </span>
                          </div>
                          <div className="obs-tgt-sub">{p.blurb}.</div>
                          <div className="obs-tgt-how">LOOK {p.azCompass} · {altPhrase.toUpperCase()} · BEST {p.bestTime}</div>
                        </div>
                      );
                    })}
                    {skyDots}
                  </>
                ) : <Skel rows={6} />
              ) : (
                <>
                  {tonight.planets.map(p => (
                    <div className="obs-row" key={p.name}>
                      <span className="k">{p.name}</span>
                      <span className={`v ${p.visible ? '' : ''}`}>
                        {p.visible ? `UP · ${p.azimuthCompass} ${p.altitude}°` : p.rise ? `rises ${p.rise}` : 'below horizon'}
                        {` · mag ${p.magnitude}`}
                      </span>
                    </div>
                  ))}
                  <div className="obs-row"><span className="k">MOON</span><span className="v">{tonight.moon.phaseName} {tonight.moon.illumination}%{tonight.moon.rise ? ` · rise ${tonight.moon.rise}` : ''}{tonight.moon.set ? ` · set ${tonight.moon.set}` : ''}</span></div>
                  {tonight.nextShower && (
                    <div className="obs-row"><span className="k">METEORS</span><span className={`v ${tonight.nextShower.daysAway <= 2 ? 'warn' : ''}`}>{tonight.nextShower.name} · {tonight.nextShower.daysAway === 0 ? 'PEAKS TONIGHT' : `peak ${tonight.nextShower.peak} (${tonight.nextShower.daysAway}d)`}</span></div>
                  )}
                  <span className="obs-tag">SWIPE: TARGETS ▸ DOME</span>
                  {skyDots}
                </>
              )
            ) : <Skel rows={6} />}
          </div>
        </div>

        <div className={openCls('neo')}>
          <div className="obs-card-head" onClick={() => toggle('neo')}>
            <div className="t"><Icon id="neo" /> NEO WATCH</div>
            <div className="g"><span className="g-txt">{neo ? `${neo.length} APPROACHES · 7D` : ''}</span></div>
          </div>
          <div className="obs-card-body" {...neoPager.swipe}>
            {neo ? (
              neo.length > 0 ? (
                neoView === 0 ? (
                  <>
                    <div className="obs-row"><span className="k">MISS DISTANCE MAP</span><span className="v">RADIUS = CLOSEST APPROACH</span></div>
                    <NeoChart items={neo} />
                    {neoPager.dots}
                  </>
                ) : (
                  <>
                    {neo.map((n, i) => (
                      <div className="obs-row" key={i}>
                        <span className="k">{n.name}</span>
                        <span className={`v ${n.isHazardous ? 'danger' : ''}`}>
                          {n.missDistanceLunar ? `${n.missDistanceLunar.toFixed(1)} LD` : ''}{n.diameterM ? ` · ${Math.round(n.diameterM)} m` : ''}{n.closeApproachDate ? ` · ${n.closeApproachDate.slice(5)}` : ''}
                        </span>
                      </div>
                    ))}
                    {neoPager.dots}
                  </>
                )
              ) : <div className="obs-empty">NO CLOSE APPROACHES</div>
            ) : <Skel rows={5} />}
          </div>
        </div>

        <div className="obs-section"><span>//</span> CAN I OBSERVE?</div>

        <div className={openCls('conditions')}>
          <div className="obs-card-head" onClick={() => toggle('conditions')}>
            <div className="t"><Icon id="weather" /> WEATHER CONDITIONS</div>
            <div className="g"><span className="g-txt">{conditions ? <span className={conditions.score >= 7 ? 'hot' : ''}>{conditions.summary} · {conditions.score}/10</span> : 'LOADING…'}</span><Dot c={skyDot} /></div>
          </div>
          <div className="obs-card-body">
            {conditions ? (
              <>
                <div className="obs-graph-title">
                  <span>SKY CLARITY · NEXT 12H</span>
                  <span className="obs-legend"><i className="lg-clear" />CLEAR<i className="lg-part" />PARTLY<i className="lg-cloud" />CLOUDY</span>
                </div>
                <div className="obs-graph">
                  {conditions.hourly.map((h, i) => {
                    const cls = h.cloud <= 25 ? 'clear' : h.cloud <= 60 ? 'part' : 'cloud';
                    return (
                      <div className="og-col" key={h.time}>
                        <div className="og-barwrap"><i className={cls} style={{ height: `${Math.max(4, 100 - h.cloud)}%` }} /></div>
                        <span className="og-hr">{i % 2 === 0 ? h.time.slice(0, 2) : ''}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="obs-row"><span className="k">CLOUD L / M / H</span><span className="v">{conditions.cloudNow.low}% / {conditions.cloudNow.mid}% / {conditions.cloudNow.high}%</span></div>
                <div className="obs-row"><span className="k">TEMP / DEW</span><span className="v">{Math.round(conditions.temperature)}°C / {Math.round(conditions.dewPoint)}°C</span></div>
                <div className="obs-row"><span className="k">WIND</span><span className="v">{Math.round(conditions.windSpeed)} km/h</span></div>
                <div className="obs-row"><span className="k">SITE</span><span className="v">{loc.source === 'gps' ? `${Math.abs(loc.lat).toFixed(2)}°${loc.lat >= 0 ? 'N' : 'S'} ${Math.abs(loc.lon).toFixed(2)}°${loc.lon >= 0 ? 'E' : 'W'} · LOCAL` : 'CALGARY · DEFAULT'}</span></div>
                <span className="obs-tag">OPEN-METEO</span><Upd t={conditions.fetchedAt} tz={tz} />
              </>
            ) : <Skel rows={5} />}
          </div>
        </div>

        <div className={openCls('light')}>
          <div className="obs-card-head" onClick={() => toggle('light')}>
            <div className="t"><Icon id="light" /> LIGHT POLLUTION</div>
            <div className="g"><span className="g-txt">{light ? `BORTLE ${light.bortle} · SQM ${light.sqm.toFixed(1)}` : 'LOADING…'}</span><Dot c={lightDot} /></div>
          </div>
          <div className="obs-card-body" {...lightPager.swipe}>
            {light ? (
              lightView === 1 ? (
                <>
                  <div className="obs-row"><span className="k">DARK SKY FINDER</span><span className="v">RINGS AT {light.rings.join(' / ')} KM</span></div>
                  <EscapeMap lp={light} retro={isRetro} />
                  {light.nearestDark
                    ? <div className="obs-row"><span className="k">NEAREST DARK SKY</span><span className="v hot">BORTLE {light.nearestDark.bortle} · {light.nearestDark.km} KM {light.nearestDark.dir}</span></div>
                    : <div className="obs-row"><span className="k">NEAREST DARK SKY</span><span className="v">{light.bortle <= 4 ? 'YOU ARE IN ONE' : 'NONE WITHIN 150 KM'}</span></div>}
                  {lightPager.dots}
                </>
              ) : (
                <>
                  <BortleScale bortle={light.bortle} retro={isRetro} />
                  <div className="obs-row"><span className="k">CLASS {light.bortle}</span><span className="v">{light.label}</span></div>
                  <div className="obs-row"><span className="k">SKY BRIGHTNESS</span><span className="v">SQM {light.sqm.toFixed(2)} MAG/ARCSEC²</span></div>
                  <div className="obs-row"><span className="k">VS NATURAL SKY</span><span className="v">{light.ratio < 1 ? `${Math.round(light.ratio * 100)}% BRIGHTER` : `${(light.ratio + 1).toFixed(1)}× BRIGHTER`}</span></div>
                  <span className="obs-tag">LORENZ ATLAS 2025 · VIIRS</span><Upd t={light.fetchedAt} tz={tz} />
                  {lightPager.dots}
                </>
              )
            ) : <Skel rows={4} />}
          </div>
        </div>

        <div className={openCls('aurora')}>
          <div className="obs-card-head" onClick={() => toggle('aurora')}>
            <div className="t"><Icon id="aurora" /> AURORA WATCH</div>
            <div className="g"><span className="g-txt">{aurora ? <span className={aurora.kpNow >= 4 ? 'hot' : ''}>KP {aurora.kpNow.toFixed(1)} · {aurora.stormLevel}</span> : 'LOADING…'}</span><Dot c={auroraDot} /></div>
          </div>
          <div className="obs-card-body" {...auroraPager.swipe}>
            {aurora ? (
              auroraView === 1 ? (
                <>
                  <div className="obs-row"><span className="k">KP FORECAST · NEXT 24H</span><span className="v">3-HOUR BLOCKS</span></div>
                  <KpChart forecast={aurora.forecast} needed={aurora.neededKp} tz={tz} />
                  <span className="obs-tag">NOAA SWPC FORECAST</span>
                  {auroraPager.dots}
                </>
              ) : (
              <>
                <div className="obs-row"><span className="k">STATUS</span><span className={`v ${aurora.kpNow >= 5 ? 'hot' : ''}`}>{aurora.stormLevel}</span></div>
                <div className="obs-row"><span className="k">VISIBILITY @ {Math.abs(loc.lat).toFixed(0)}°{loc.lat >= 0 ? 'N' : 'S'}</span><span className={`v ${aurora.kpNow >= 4 ? 'hot' : ''}`}>{aurora.visibility}</span></div>
                <div className="obs-bar"><i style={{ width: `${Math.min(100, (Math.max(aurora.kpNow, aurora.kpMax24h) / 9) * 100)}%` }} /></div>
                <div className="obs-row"><span className="k">KP FORECAST MAX 24H</span><span className="v">{aurora.kpMax24h.toFixed(1)}</span></div>
                <div className="obs-row"><span className="k">BZ</span><span className="v">{aurora.bz !== null ? `${aurora.bz} nT ${aurora.bz <= -5 ? '(favourable)' : ''}` : 'n/a'}</span></div>
                <div className="obs-row"><span className="k">SOLAR WIND</span><span className="v">{aurora.windSpeed !== null ? `${Math.round(aurora.windSpeed)} km/s` : 'n/a'}</span></div>
                <span className="obs-tag">NOAA SWPC</span><Upd t={aurora.fetchedAt} tz={tz} />
                {auroraPager.dots}
              </>
              )
            ) : <Skel rows={5} />}
          </div>
        </div>

        <div className={openCls('solar')}>
          <div className="obs-card-head" onClick={() => toggle('solar')}>
            <div className="t"><Icon id="solar" /> SOLAR WATCH</div>
            <div className="g"><span className="g-txt">{solar ? `${solar.currentClass} · ${solar.activeRegions} REGIONS` : 'LOADING…'}</span></div>
          </div>
          <div className="obs-card-body" {...solarSwipe}>
            {solar ? (
              solarView === 1 ? (
                <>
                  <div className="obs-row"><span className="k">THE SUN&apos;S FACE TODAY</span><span className="v">EACH DOT = A SUNSPOT GROUP</span></div>
                  <SunDisk regions={solar.regions} />
                  <div className="obs-row"><span className="k">RED = LIKELY TO FLARE</span><span className="v">SIZE = SPOT GROUP AREA</span></div>
                  {solarDots}
                </>
              ) : solarView === 2 ? (
                <>
                  <div className="obs-row"><span className="k">THIS WEEK&apos;S ERUPTIONS</span><span className="v">NEWEST FIRST</span></div>
                  {solar.flares.length > 0 ? solar.flares.map((f, i) => (
                    <div className="obs-row" key={i}>
                      <span className="k">{new Date(f.time).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: tz })}</span>
                      <span className={`v ${f.maxClass.startsWith('X') ? 'danger' : f.maxClass.startsWith('M') ? 'warn' : ''}`}>{f.maxClass}</span>
                    </div>
                  )) : <div className="obs-empty">NO FLARES THIS WEEK</div>}
                  {solarDots}
                </>
              ) : (
                <>
                  <div className="obs-cloudwarn solar-summary">
                    {solar.biggestFlare24h && (solar.biggestFlare24h.startsWith('X') || solar.biggestFlare24h.startsWith('M'))
                      ? `THE SUN IS ACTIVE — BIG FLARES TODAY. AURORAS POSSIBLE HERE IN 1–3 DAYS.`
                      : solar.currentClass.startsWith('C') || (solar.biggestFlare24h ?? '').startsWith('C')
                        ? 'THE SUN IS SIMMERING — SMALL FLARES, NOTHING DRAMATIC.'
                        : 'THE SUN IS QUIET TODAY.'}
                  </div>
                  <div className="obs-row"><span className="k">FLARE LEVEL NOW</span><span className={`v ${solar.currentClass.startsWith('M') || solar.currentClass.startsWith('X') ? 'warn' : ''}`}>CLASS {solar.currentClass}</span></div>
                  <div className="obs-row"><span className="k">BIGGEST FLARE 24H</span><span className="v">{solar.biggestFlare24h ?? 'NONE'}</span></div>
                  <div className="obs-row"><span className="k">SUNSPOTS TODAY</span><span className="v">~{solar.sunspotNumber} IN {solar.activeRegions} GROUPS</span></div>
                  <div className="obs-row"><span className="k">ODDS OF A BIG FLARE</span><span className="v">{solar.mProbability}%{solar.xProbability >= 5 ? ` (EXTREME: ${solar.xProbability}%)` : ''}</span></div>
                  <p className="obs-ev-blurb">Sunspots are magnetic storms on the Sun&apos;s surface; when they snap, they fire flares ranked A → B → C → M → X, each step 10× stronger. M and X flares can hurl plasma at Earth — and that&apos;s what paints auroras here a night or three later.</p>
                  <span className="obs-tag">NOAA SWPC · GOES</span><Upd t={solar.fetchedAt} tz={tz} />
                  {solarDots}
                </>
              )
            ) : <Skel rows={5} />}
          </div>
        </div>

        <div className="obs-section"><span>//</span> SPACEFLIGHT</div>

        <div className={openCls('passes')}>
          <div className="obs-card-head" onClick={() => toggle('passes')}>
            <div className="t"><Icon id="iss" /> ISS</div>
            <div className="g"><span className="g-txt">{passes ? `${darkPasses.length} visible · ${passes.passes.length} total` : 'LOADING…'}</span><Dot c={issDot} /></div>
          </div>
          <div
            className="obs-card-body"
            onTouchStart={e => { touchX.current = e.touches[0].clientX; }}
            onTouchEnd={e => {
              const dx = e.changedTouches[0].clientX - touchX.current;
              if (dx < -40) setIssView(v => Math.min(2, v + 1));
              if (dx > 40) setIssView(v => Math.max(0, v - 1));
            }}
          >
            {issView === 2 ? (
              (() => { const crewJsx = (
                  <>
                    <div className="obs-row"><span className="k">CURRENT CREW</span><span className="v">{crew ? `${crew.crew.length} HUMANS IN ORBIT` : 'LOADING…'}</span></div>
                    {crew ? (
                      <>
                        {crew.crew.filter(c => c.station === 'ISS').map(c => (
                          <div className="obs-crew" key={c.name}>
                            {c.photo ? <img src={c.photo} alt="" loading="lazy" /> : <span className="obs-crew-noimg">☺</span>}
                            <div className="obs-crew-info">
                              <div className="obs-crew-name">{c.name}</div>
                              <div className="obs-crew-sub">{c.agency}{c.nationality ? ` · ${c.nationality}` : ''} · {c.daysInSpace} DAYS UP · {c.flights} FLIGHT{c.flights === 1 ? '' : 'S'}{c.spacewalks ? ` · ${c.spacewalks} EVA` : ''}</div>
                            </div>
                          </div>
                        ))}
                        <div className="obs-row"><span className="k">TIANGONG</span><span className="v hot">{crew.crew.filter(c => c.station === 'TIANGONG').map(c => c.name.split(' ').slice(-1)[0]).join(' · ') || '—'}</span></div>
                        <span className="obs-tag">LAUNCH LIBRARY · AGENCY GROUPING</span>
                      </>
                    ) : <div className="obs-empty">HAILING STATION… (CREW FEED RATE-LIMITED — RETRIES AUTOMATICALLY)</div>}
                    {issDots}
                  </>
                ); return crewJsx; })()
            ) : passes ? (
              passes.passes.length > 0 ? (
                issView === 0 ? (
                  <>
                    {passes.passes.map((p, i) => (
                      <div className={`obs-row obs-pass${i === 0 ? ' next' : ''}${i === issPass ? ' sel' : ''}`} key={i} onClick={() => setIssPass(i)}>
                        <span className="k">{i === 0 ? '▶ ' : ''}{p.start}</span>
                        <span className={`v${p.isDark ? '' : ' faded'}`}>{p.startDir}→{p.endDir} · max {p.maxElevation}° · {p.durationMin} MIN</span>
                      </div>
                    ))}
                    <span className="obs-tag">CELESTRAK TLE · COMPUTED LOCAL</span><Upd t={passes.fetchedAt} tz={tz} />
                    {issDots}
                  </>
                ) : (
                  <>
                    <div className="obs-row"><span className="k">PASS {passes.passes[issPass].start}</span><span className="v">EDGE = HORIZON · CENTRE = OVERHEAD</span></div>
                    <SkyPath pass={passes.passes[issPass]} />
                    {issDots}
                  </>
                )
              ) : <div className="obs-empty">NO PASSES ABOVE 10° IN NEXT 48H</div>
            ) : <Skel rows={5} />}
          </div>
        </div>

        <div className={openCls('map')}>
          <div className="obs-card-head" onClick={() => { if (isDesktop) { window.location.href = '/?desktop=1'; return; } if (open !== 'map') loadCraft(); toggle('map'); }}>
            <div className="t"><Icon id="map" /> DEEP SPACE ASSETS</div>
            <div className="g"><span className="g-txt">{isDesktop ? 'open navigation console →' : craft ? `${craft.length} LIVE` : ''}</span></div>
          </div>
          <div className="obs-card-body" {...craftPager.swipe}>
            {craft ? (
              craftView === 0 ? (
                <>
                  <div className="obs-row"><span className="k">DISTANCE LADDER</span><span className="v">LOG SCALE FROM SUN</span></div>
                  <DistanceLadder craft={craft} />
                  {craftPager.dots}
                </>
              ) : (
              <>
                {craft.map(c => (
                  <div className="obs-row" key={c.name}>
                    <span className="k">{c.name.toUpperCase()}</span>
                    <span className="v">{c.distanceAU.toFixed(1)} AU · {(c.distanceAU * 149.6).toFixed(0)}M km</span>
                  </div>
                ))}
                <span className="obs-tag">NASA/JPL HORIZONS · LIVE</span>
                {craftPager.dots}
              </>
              )
            ) : (
              <>
                <div className="obs-row"><span className="k">TRACKING</span><span className="v">VOYAGER 1 · 2 · NEW HORIZONS · PSP</span></div>
                <Skel rows={4} />
              </>
            )}
          </div>
        </div>

        <div className={openCls('missions')}>
          <div className="obs-card-head" onClick={() => toggle('missions')}>
            <div className="t"><Icon id="missions" /> MISSIONS</div>
            <div className="g"><span className="g-txt">{missions && missions.missions[0] ? `${missions.missions[0].provider} · ${msnDays(missions.missions[0].net) === 0 ? 'TODAY' : `${msnDays(missions.missions[0].net)}d`}` : 'LOADING…'}</span></div>
          </div>
          <div className="obs-card-body" {...msnSwipe}>
            {missions ? (
              <>
                {msnPage === 0 ? (
                  <>
                    {missions.missions.map((m, i) => (
                      <div className="obs-row obs-pass" key={m.id} onClick={e => { e.stopPropagation(); setMsnPage(i + 1); }}>
                        <span className="k">{fmtMsnDate(m.net).split(',')[0]}</span>
                        <span className="v">{m.name.slice(0, 26)} · {m.provider.split(' ')[0]} ▸</span>
                      </div>
                    ))}
                    <span className="obs-tag">LAUNCH LIBRARY · GLOBAL</span><Upd t={missions.fetchedAt} tz={tz} />
                  </>
                ) : (() => { const m = missions.missions[msnPage - 1]; return (
                  <>
                    <div className="obs-ev-date">{fmtMsnDate(m.net)}{msnDays(m.net) === 0 ? ' · TODAY' : ` · IN ${msnDays(m.net)} DAYS`}</div>
                    <div className="obs-ev-title">{m.name}</div>
                    <span className="obs-tag">{m.provider}</span><span className="obs-tag">{m.status}</span>
                    <div className="obs-row"><span className="k">VEHICLE</span><span className="v">{m.vehicle}</span></div>
                    <div className="obs-row"><span className="k">SITE</span><span className="v">{m.site}</span></div>
                    <p className="obs-ev-blurb">{m.blurb}</p>
                  </>
                ); })()}
                <div className="obs-dots">
                  {Array.from({ length: msnMax + 1 }, (_, i) => (
                    <i key={i} className={msnPage === i ? 'on' : ''} onClick={e => { e.stopPropagation(); setMsnPage(i); }} />
                  ))}
                </div>
              </>
            ) : <Skel rows={5} />}
          </div>
        </div>

      </div>

      {open && !isDesktop && (
        <div className="obs-pile" onClick={() => setOpen('')}>
          <i /><i /><i />
          <span>▤ 9 MORE CARDS — TAP TO RETURN</span>
        </div>
      )}

      {showHints && !isDesktop && (
        <div className="obs-hints">
          <div>TAP A CARD TO OPEN · SWIPE INSIDE FOR MORE VIEWS · PULL DOWN TO REFRESH</div>
          <button onClick={dismissHints}>GOT IT</button>
        </div>
      )}

      <nav className="obs-nav">
        <a className="active" href="/tonight"><span>▤</span>TONIGHT</a>
        <a href="/?desktop=1"><span>✷</span>CONSOLE</a>
      </nav>
    </div>
  );
}
