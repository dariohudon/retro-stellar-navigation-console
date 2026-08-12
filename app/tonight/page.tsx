'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import './tonight.css';
import type { AuroraData } from '@/lib/observatory/aurora';
import type { ConditionsData } from '@/lib/observatory/conditions';
import type { TonightData } from '@/lib/observatory/tonight';
import type { PassesData } from '@/lib/observatory/passes';

interface NeoItem {
  name: string;
  isHazardous: boolean;
  missDistanceLunar: number;
  diameterM: number;
  closeApproachDate: string;
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

function useClock() {
  const [now, setNow] = useState('');
  useEffect(() => {
    const tick = () =>
      setNow(new Date().toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Edmonton' }));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function TonightPage() {
  const clock = useClock();
  const [open, setOpen] = useState<string>('');
  const [splash, setSplash] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 1200);
    return () => clearTimeout(t);
  }, []);
  const [isDesktop, setIsDesktop] = useState(false);
  const [theme, setTheme] = useState<'day' | 'green' | 'night'>('day');
  const [craft, setCraft] = useState<Array<{ name: string; distanceAU: number }> | null>(null);
  const [issView, setIssView] = useState<'list' | 'path'>('list');
  const [issPass, setIssPass] = useState(0);
  const touchX = useRef(0);

  useEffect(() => {
    const t = localStorage.getItem('obs-theme');
    if (t === 'green' || t === 'night') setTheme(t);
  }, []);
  const pickTheme = (t: 'day' | 'green' | 'night') => {
    setTheme(t);
    localStorage.setItem('obs-theme', t);
  };

  const loadCraft = useCallback(() => {
    if (!craft)
      fetch('/api/spacecraft')
        .then(r => r.json())
        .then(d => {
          const assets = Object.values(d.assets ?? {}) as Array<{ name: string; distanceAU: number }>;
          setCraft(assets.map(a => ({ name: a.name, distanceAU: a.distanceAU })));
        })
        .catch(() => setCraft([]));
  }, [craft]);
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
    fetch('/api/aurora').then(r => r.json()).then(d => !d.error && setAurora(d)).catch(() => {});
    fetch('/api/conditions').then(r => r.json()).then(d => !d.error && setConditions(d)).catch(() => {});
    fetch('/api/tonight').then(r => r.json()).then(d => !d.error && setTonight(d)).catch(() => {});
  }, []);

  const loadPasses = useCallback(() => {
    if (!passes) fetch('/api/passes').then(r => r.json()).then(d => !d.error && setPasses(d)).catch(() => {});
  }, [passes]);

  const loadNeo = useCallback(() => {
    if (!neo)
      fetch('/api/neo?days=7')
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
  }, [neo]);

  useEffect(() => {
    if (isDesktop) { loadPasses(); loadNeo(); loadCraft(); }
  }, [isDesktop, loadPasses, loadNeo, loadCraft]);

  const toggle = (id: string) => {
    if (isDesktop) return;
    const next = open === id ? '' : id;
    setOpen(next);
    if (next === 'passes') loadPasses();
    if (next === 'neo') loadNeo();
  };

  const openCls = (id: string) => `obs-card${open === id || isDesktop ? ' open' : ''}`;

  const issDots = (
    <div className="obs-dots">
      <i className={issView === 'list' ? 'on' : ''} onClick={e => { e.stopPropagation(); setIssView('list'); }} />
      <i className={issView === 'path' ? 'on' : ''} onClick={e => { e.stopPropagation(); setIssView('path'); }} />
    </div>
  );

  return (
    <div className={`obs-root${theme !== 'day' ? ` ${theme}` : ''}`}>
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
        <h1>⟨ OBSERVATORY ⟩</h1>
        <div className="obs-loc">
          <span className="obs-coords">51.04°N 114.07°W · </span>{clock} MT
          <div className="obs-theme-picker">
            <button className={theme === 'day' ? 'on' : ''} onClick={() => pickTheme('day')}>DAY</button>
            <button className={theme === 'green' ? 'on' : ''} onClick={() => pickTheme('green')}>GRN</button>
            <button className={theme === 'night' ? 'on' : ''} onClick={() => pickTheme('night')}>RED</button>
          </div>
        </div>
      </header>

      <div className="obs-status">
        <div>KP <b className={aurora && aurora.kpNow >= 4 ? 'hot' : ''}>{aurora ? aurora.kpNow.toFixed(1) : '—'}</b></div>
        <div>CLOUD <b>{conditions ? `${conditions.cloudNow.total}%` : '—'}</b></div>
        <div>MOON <b>{tonight ? `${tonight.moon.illumination}%` : '—'}</b></div>
        <div>DARK <b>{tonight && tonight.darknessStart ? `${tonight.darknessStart}–${tonight.darknessEnd ?? '…'}` : '—'}</b></div>
      </div>

      <div className={`obs-stack${open && !isDesktop ? ' has-open' : ''}`}>

        <div className={openCls('aurora')}>
          <div className="obs-card-head" onClick={() => toggle('aurora')}>
            <div className="t">▲ AURORA WATCH</div>
            <div className="g">{aurora ? <span className={aurora.kpNow >= 4 ? 'hot' : ''}>KP {aurora.kpNow.toFixed(1)} · {aurora.stormLevel}</span> : 'LOADING…'}</div>
          </div>
          <div className="obs-card-body">
            {aurora ? (
              <>
                <div className="obs-row"><span className="k">STATUS</span><span className={`v ${aurora.kpNow >= 5 ? 'hot' : ''}`}>{aurora.stormLevel}</span></div>
                <div className="obs-row"><span className="k">VISIBILITY @ 51°N</span><span className={`v ${aurora.kpNow >= 4 ? 'hot' : ''}`}>{aurora.visibility}</span></div>
                <div className="obs-bar"><i style={{ width: `${Math.min(100, (Math.max(aurora.kpNow, aurora.kpMax24h) / 9) * 100)}%` }} /></div>
                <div className="obs-row"><span className="k">KP FORECAST MAX 24H</span><span className="v">{aurora.kpMax24h.toFixed(1)}</span></div>
                <div className="obs-row"><span className="k">BZ</span><span className="v">{aurora.bz !== null ? `${aurora.bz} nT ${aurora.bz <= -5 ? '(favourable)' : ''}` : 'n/a'}</span></div>
                <div className="obs-row"><span className="k">SOLAR WIND</span><span className="v">{aurora.windSpeed !== null ? `${Math.round(aurora.windSpeed)} km/s` : 'n/a'}</span></div>
                <span className="obs-tag">NOAA SWPC</span>
              </>
            ) : <div className="obs-empty">ACQUIRING SPACE WEATHER…</div>}
          </div>
        </div>

        <div className={openCls('sky')}>
          <div className="obs-card-head" onClick={() => toggle('sky')}>
            <div className="t">◑ TONIGHT&apos;S SKY</div>
            <div className="g">{tonight ? `${tonight.planets.filter(p => p.visible).length} planets up · moon ${tonight.moon.illumination}%` : 'LOADING…'}</div>
          </div>
          <div className="obs-card-body">
            {tonight ? (
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
                <span className="obs-tag">ASTRONOMY-ENGINE · LOCAL</span>
              </>
            ) : <div className="obs-empty">COMPUTING EPHEMERIS…</div>}
          </div>
        </div>

        <div className={openCls('conditions')}>
          <div className="obs-card-head" onClick={() => toggle('conditions')}>
            <div className="t">☁ CONDITIONS</div>
            <div className="g">{conditions ? <span className={conditions.score >= 7 ? 'hot' : ''}>{conditions.summary} · {conditions.score}/10</span> : 'LOADING…'}</div>
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
                <div className="obs-row"><span className="k">SITE</span><span className="v">CALGARY · BORTLE 7</span></div>
                <span className="obs-tag">OPEN-METEO</span>
              </>
            ) : <div className="obs-empty">FETCHING FORECAST…</div>}
          </div>
        </div>

        <div className={openCls('passes')}>
          <div className="obs-card-head" onClick={() => toggle('passes')}>
            <div className="t">✦ ISS PASSES</div>
            <div className="g">{passes ? `${passes.passes.length} in 48h` : 'tap to compute'}</div>
          </div>
          <div
            className="obs-card-body"
            onTouchStart={e => { touchX.current = e.touches[0].clientX; }}
            onTouchEnd={e => {
              const dx = e.changedTouches[0].clientX - touchX.current;
              if (dx < -40) setIssView('path');
              if (dx > 40) setIssView('list');
            }}
          >
            {passes ? (
              passes.passes.length > 0 ? (
                issView === 'list' ? (
                  <>
                    {passes.passes.map((p, i) => (
                      <div className={`obs-row obs-pass${i === issPass ? ' sel' : ''}`} key={i} onClick={() => setIssPass(i)}>
                        <span className="k">{p.start}</span>
                        <span className="v">{p.startDir}→{p.endDir} · max {p.maxElevation}° · {p.durationMin} min</span>
                      </div>
                    ))}
                    <span className="obs-tag">CELESTRAK TLE · COMPUTED LOCAL</span>
                    {issDots}
                  </>
                ) : (
                  <>
                    <div className="obs-row"><span className="k">PASS</span><span className="v">{passes.passes[issPass].start} · {passes.passes[issPass].durationMin} MIN</span></div>
                    <SkyPath pass={passes.passes[issPass]} />
                    {issDots}
                  </>
                )
              ) : <div className="obs-empty">NO PASSES ABOVE 10° IN NEXT 48H</div>
            ) : <div className="obs-empty">PROPAGATING ORBIT…</div>}
          </div>
        </div>

        <div className={openCls('neo')}>
          <div className="obs-card-head" onClick={() => toggle('neo')}>
            <div className="t">◎ NEO WATCH</div>
            <div className="g">{neo ? `${neo.length} approaches 7d` : 'tap to load'}</div>
          </div>
          <div className="obs-card-body">
            {neo ? (
              neo.length > 0 ? neo.map((n, i) => (
                <div className="obs-row" key={i}>
                  <span className="k">{n.name}</span>
                  <span className={`v ${n.isHazardous ? 'danger' : ''}`}>
                    {n.missDistanceLunar ? `${n.missDistanceLunar.toFixed(1)} LD` : ''}{n.diameterM ? ` · ${Math.round(n.diameterM)} m` : ''}{n.closeApproachDate ? ` · ${n.closeApproachDate.slice(5)}` : ''}
                  </span>
                </div>
              )) : <div className="obs-empty">NO CLOSE APPROACHES</div>
            ) : <div className="obs-empty">QUERYING NEOWS…</div>}
          </div>
        </div>

        <div className={openCls('map')}>
          <div className="obs-card-head" onClick={() => { if (isDesktop) { window.location.href = '/?desktop=1'; return; } if (open !== 'map') loadCraft(); toggle('map'); }}>
            <div className="t">✷ DEEP SPACE ASSETS</div>
            <div className="g">{isDesktop ? 'open navigation console →' : craft ? `${craft.length} live` : 'tap for live tracking'}</div>
          </div>
          <div className="obs-card-body">
            {craft ? (
              <>
                {craft.map(c => (
                  <div className="obs-row" key={c.name}>
                    <span className="k">{c.name.toUpperCase()}</span>
                    <span className="v">{c.distanceAU.toFixed(1)} AU · {(c.distanceAU * 149.6).toFixed(0)}M km</span>
                  </div>
                ))}
                <span className="obs-tag">NASA/JPL HORIZONS · LIVE</span>
              </>
            ) : (
              <>
                <div className="obs-row"><span className="k">TRACKING</span><span className="v">VOYAGER 1 · 2 · NEW HORIZONS · PSP</span></div>
                <div className="obs-empty">CONTACTING DEEP SPACE NETWORK…</div>
              </>
            )}
          </div>
        </div>

      </div>

      {open && !isDesktop && (
        <div className="obs-pile" onClick={() => setOpen('')}>
          <i /><i /><i />
          <span>▤ 5 MORE CARDS — TAP TO RETURN</span>
        </div>
      )}

      <nav className="obs-nav">
        <a className="active" href="/tonight"><span>▤</span>TONIGHT</a>
        <a href="/?desktop=1"><span>✷</span>CONSOLE</a>
      </nav>
    </div>
  );
}
