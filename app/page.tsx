"use client";

import { useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { PLANETS, Planet } from "@/data/planets";
import { CELESTIAL_OBJECTS, CelestialObject } from "@/data/celestialObjects";
import { SECTORS, Sector } from "@/data/sectors";
import {
  DisplayMode,
  EphemerisStatus,
  EphemerisResponse,
} from "@/lib/ephemeris/types";
import { NeoObject, NeoResponse } from "@/lib/neo/types";
import NavigationConsole from "@/components/NavigationConsole";
import NeoThreatConsole from "@/components/NeoThreatConsole";
import SolarSystemMap from "@/components/SolarSystemMap";
import PlanetInfoPanel from "@/components/PlanetInfoPanel";

type MapMode    = '2d' | '3d';
type LeftPanel  = 'nav' | 'neo';
type WindowDays = 1 | 7 | 30;

const OrbitalMap3D = dynamic(
  () => import("@/components/OrbitalMap3D"),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '8px',
        color: 'var(--hud-green-faint)', fontSize: '10px',
        letterSpacing: '0.2em', fontFamily: "'Courier New', monospace",
        textTransform: 'uppercase',
        background: 'var(--hud-bg)',
        borderLeft: '1px solid var(--hud-border)',
        borderRight: '1px solid var(--hud-border)',
      }}>
        <span>INITIALIZING 3D RENDER ENGINE</span>
        <span className="blink">_</span>
      </div>
    ),
  }
);

function modeBtn(active: boolean, isGreen = false): React.CSSProperties {
  return {
    background: active
      ? (isGreen ? 'rgba(0,255,136,0.1)' : 'rgba(232,232,232,0.07)')
      : 'transparent',
    border: `1px solid ${active
      ? (isGreen ? 'var(--hud-green)' : 'var(--hud-amber)')
      : 'var(--hud-border)'}`,
    color: active
      ? (isGreen ? 'var(--hud-green)' : 'var(--hud-amber)')
      : 'var(--hud-green-dim)',
    fontFamily: "'Courier New', monospace",
    fontSize: '10px',
    letterSpacing: '0.15em',
    padding: '3px 9px',
    cursor: 'pointer',
    textTransform: 'uppercase' as const,
  };
}

export default function Home() {
  // ── Planet/object/sector selection ───────────────────────────────────────
  const [selectedPlanet,  setSelectedPlanet]  = useState<Planet | null>(null);
  const [selectedObject,  setSelectedObject]  = useState<CelestialObject | null>(null);
  const [selectedSector,  setSelectedSector]  = useState<Sector | null>(null);
  const [selectedNeo,     setSelectedNeo]     = useState<NeoObject | null>(null);

  const selectPlanet = (p: Planet) => {
    setSelectedPlanet(p); setSelectedObject(null); setSelectedSector(null); setSelectedNeo(null);
  };
  const selectObject = (o: CelestialObject) => {
    setSelectedObject(o); setSelectedPlanet(null); setSelectedSector(null); setSelectedNeo(null);
  };
  const selectSector = (s: Sector) => {
    setSelectedSector(s); setSelectedPlanet(null); setSelectedObject(null); setSelectedNeo(null);
  };
  const selectNeo = (neo: NeoObject | null) => {
    setSelectedNeo(neo); setSelectedPlanet(null); setSelectedObject(null); setSelectedSector(null);
  };

  // ── Ephemeris mode ────────────────────────────────────────────────────────
  const [mode,            setMode]            = useState<DisplayMode>('schematic');
  const [ephemerisData,   setEphemerisData]   = useState<EphemerisResponse | null>(null);
  const [ephemerisStatus, setEphemerisStatus] = useState<EphemerisStatus>('idle');

  const fetchEphemeris = useCallback(async (force = false) => {
    setEphemerisStatus('loading');
    try {
      const res  = await fetch(force ? '/api/ephemeris?force=true' : '/api/ephemeris');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: EphemerisResponse = await res.json();
      setEphemerisData(data);
      setEphemerisStatus(data.isLive ? 'live' : 'error');
    } catch { setEphemerisStatus('error'); }
  }, []);

  const handleModeToggle = useCallback((newMode: DisplayMode) => {
    setMode(newMode);
    if (newMode === 'live' && !ephemerisData && ephemerisStatus === 'idle') fetchEphemeris();
  }, [ephemerisData, ephemerisStatus, fetchEphemeris]);

  // ── Map view mode ─────────────────────────────────────────────────────────
  const [mapMode, setMapMode] = useState<MapMode>('2d');

  // ── NEO state ─────────────────────────────────────────────────────────────
  const [leftPanel,    setLeftPanel]    = useState<LeftPanel>('nav');
  const [neoWindowDays, setNeoWindowDays] = useState<WindowDays>(7);
  const [neoData,      setNeoData]      = useState<NeoResponse | null>(null);
  const [neoStatus,    setNeoStatus]    = useState<'idle' | 'loading' | 'live' | 'error'>('idle');
  const neoFetched = useRef(false);

  const fetchNeo = useCallback(async (days: WindowDays, force = false) => {
    setNeoStatus('loading');
    try {
      const res  = await fetch(`/api/neo?days=${days}${force ? '&force=true' : ''}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: NeoResponse = await res.json();
      setNeoData(data);
      setNeoStatus(data.isLive ? 'live' : 'error');
    } catch { setNeoStatus('error'); }
  }, []);

  const handleSetLeftPanel = (panel: LeftPanel) => {
    setLeftPanel(panel);
    if (panel === 'neo' && !neoFetched.current) {
      neoFetched.current = true;
      fetchNeo(neoWindowDays);
    }
  };

  const handleNeoWindowChange = (days: WindowDays) => {
    setNeoWindowDays(days);
    fetchNeo(days);
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const totalBodies  = PLANETS.length + CELESTIAL_OBJECTS.length;
  const activeTarget = selectedNeo?.name
    ?? selectedPlanet?.name ?? selectedObject?.name ?? selectedSector?.name ?? null;

  const neoObjects = neoData?.objects ?? [];

  const mapProps = {
    planets: PLANETS, objects: CELESTIAL_OBJECTS, sectors: SECTORS,
    selectedPlanet, selectedObject, selectedSector,
    onSelectPlanet: selectPlanet, onSelectObject: selectObject, onSelectSector: selectSector,
    mode, ephemerisData, ephemerisStatus, onRefreshEphemeris: fetchEphemeris,
  };

  return (
    <div className="flex flex-col h-full"
      style={{ background: "var(--hud-bg)", color: "var(--hud-green-mid)" }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <header style={{
        borderBottom: "1px solid var(--hud-border)",
        padding: "5px 14px",
        background: "var(--hud-panel-bg)",
        flexShrink: 0,
      }}>
        <div className="flex items-center justify-between">

          {/* Left cluster */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {/* Data mode */}
            {(['schematic', 'live'] as DisplayMode[]).map(m => (
              <button key={m} onClick={() => handleModeToggle(m)} style={modeBtn(mode === m, m === 'live')}>
                {m === 'live' ? '● LIVE' : '◌ SCHEMATIC'}
              </button>
            ))}
            {mode === 'live' && (
              <span style={{
                fontSize: '10px', letterSpacing: '0.1em',
                color: ephemerisStatus === 'live' || ephemerisStatus === 'loading'
                  ? 'var(--hud-green-dim)' : 'var(--hud-warning)',
              }}>
                {ephemerisStatus === 'loading' && <span>FETCHING<span className="blink">_</span></span>}
                {ephemerisStatus === 'live'    && '// JPL HORIZONS'}
                {ephemerisStatus === 'error'   && '// FALLBACK'}
              </span>
            )}

            <span style={{ color: 'var(--hud-border)', fontSize: '10px', margin: '0 4px' }}>│</span>

            {/* Map view */}
            {(['2d', '3d'] as MapMode[]).map(m => (
              <button key={m} onClick={() => setMapMode(m)} style={modeBtn(mapMode === m, false)}>
                {m === '2d' ? '◫ 2D' : '◈ 3D'}
              </button>
            ))}

            <span style={{ color: 'var(--hud-border)', fontSize: '10px', margin: '0 4px' }}>│</span>

            {/* Left panel toggle */}
            {(['nav', 'neo'] as LeftPanel[]).map(p => (
              <button
                key={p}
                onClick={() => handleSetLeftPanel(p)}
                style={{
                  background: leftPanel === p
                    ? (p === 'neo' ? 'rgba(255,200,87,0.1)' : 'rgba(232,232,232,0.07)')
                    : 'transparent',
                  border: `1px solid ${leftPanel === p
                    ? (p === 'neo' ? 'var(--hud-warning)' : 'var(--hud-amber)')
                    : 'var(--hud-border)'}`,
                  color: leftPanel === p
                    ? (p === 'neo' ? 'var(--hud-warning)' : 'var(--hud-amber)')
                    : 'var(--hud-green-dim)',
                  fontFamily: "'Courier New', monospace",
                  fontSize: '10px',
                  letterSpacing: '0.15em',
                  padding: '3px 9px',
                  cursor: 'pointer',
                  textTransform: 'uppercase' as const,
                }}
              >
                {p === 'neo' ? '⚠ NEO' : '◱ NAV'}
              </button>
            ))}
          </div>

          {/* Centre */}
          <div style={{ fontSize: "13px", letterSpacing: "0.3em", color: "var(--hud-amber)", textTransform: "uppercase" }}>
            ◈ RETRO STELLAR NAVIGATION CONSOLE ◈
          </div>

          {/* Right */}
          <div style={{ fontSize: "10px", letterSpacing: "0.12em", color: "var(--hud-green-dim)", textTransform: "uppercase", textAlign: "right" }}>
            BODIES: {totalBodies}<br />
            {activeTarget ? `TARGET: ${activeTarget.slice(0, 18).toUpperCase()}` : "AWAITING LOCK"}
          </div>
        </div>
      </header>

      {/* ── Three-column layout ─────────────────────────────── */}
      <main className="flex flex-1 overflow-hidden">

        {/* Left panel */}
        {leftPanel === 'nav' ? (
          <NavigationConsole
            planets={PLANETS} objects={CELESTIAL_OBJECTS} sectors={SECTORS}
            selectedPlanet={selectedPlanet} selectedObject={selectedObject} selectedSector={selectedSector}
            onSelectPlanet={selectPlanet} onSelectObject={selectObject} onSelectSector={selectSector}
          />
        ) : (
          <NeoThreatConsole
            neoData={neoData} neoStatus={neoStatus}
            windowDays={neoWindowDays} onChangeWindow={handleNeoWindowChange}
            onRefresh={fetchNeo.bind(null, neoWindowDays)}
            selectedNeo={selectedNeo} onSelectNeo={selectNeo}
          />
        )}

        {/* Map */}
        {mapMode === '2d' ? (
          <SolarSystemMap
            {...mapProps}
            neoObjects={neoObjects}
            selectedNeo={selectedNeo}
            onSelectNeo={selectNeo}
          />
        ) : (
          <OrbitalMap3D {...mapProps} />
        )}

        {/* Right panel */}
        <PlanetInfoPanel
          selectedPlanet={selectedPlanet} selectedObject={selectedObject}
          selectedSector={selectedSector} mode={mode} ephemerisData={ephemerisData}
          selectedNeo={selectedNeo}
        />
      </main>

      {/* ── Data source footer ────────────────────────── */}
      <DataSourceFooter
        mode={mode}
        ephemerisStatus={ephemerisStatus}
        ephemerisData={ephemerisData}
        neoStatus={neoStatus}
        neoData={neoData}
      />
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtAge(secs: number): string {
  if (secs < 60)   return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  return `${(secs / 3600).toFixed(1)}h`;
}

function fmtUtcTime(iso: string): string {
  try { return new Date(iso).toUTCString().slice(17, 22) + ' UTC'; }
  catch { return ''; }
}

// ── Data source footer component ─────────────────────────────────────────────

interface DataSourceFooterProps {
  mode:             DisplayMode;
  ephemerisStatus:  EphemerisStatus;
  ephemerisData:    EphemerisResponse | null;
  neoStatus:        'idle' | 'loading' | 'live' | 'error';
  neoData:          NeoResponse | null;
}

function SourceChip({ label, value, color, detail }: {
  label: string;
  value: string;
  color: string;
  detail?: string;
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '10px',
      fontFamily: "'Courier New', monospace",
      letterSpacing: '0.07em',
      textTransform: 'uppercase',
    }}>
      <span style={{ color: 'var(--hud-green-faint)' }}>{label}:</span>
      <span style={{ color }}>{value}</span>
      {detail && <span style={{ color: 'var(--hud-green-faint)', letterSpacing: '0.06em' }}>{detail}</span>}
    </div>
  );
}

function DataSourceFooter({
  mode,
  ephemerisStatus,
  ephemerisData,
  neoStatus,
  neoData,
}: DataSourceFooterProps) {
  // ── Ephemeris chip ────────────────────────────────────────────────────────
  let ephText  = 'STATIC LAYOUT';
  let ephColor = 'var(--hud-green-faint)';
  let ephDetail: string | undefined;

  if (mode === 'live') {
    if (ephemerisStatus === 'loading') {
      ephText  = 'JPL HORIZONS — FETCHING';
      ephColor = 'var(--hud-green-dim)';
    } else if (ephemerisStatus === 'error') {
      ephText  = 'JPL HORIZONS — FALLBACK';
      ephColor = 'var(--hud-warning)';
    } else if (ephemerisData) {
      if (ephemerisData.isLive) {
        const time = fmtUtcTime(ephemerisData.timestamp);
        if (ephemerisData.fromCache) {
          ephText   = 'NASA/JPL HORIZONS';
          ephColor  = 'var(--hud-warning)';
          ephDetail = `CACHE ${fmtAge(ephemerisData.cacheAgeSeconds)} AGO // ${time}`;
        } else {
          ephText   = 'NASA/JPL HORIZONS';
          ephColor  = 'var(--hud-green)';
          ephDetail = `LIVE // ${time}`;
        }
      } else {
        ephText  = 'JPL HORIZONS — STATIC FALLBACK';
        ephColor = 'var(--hud-warning)';
      }
    } else {
      // mode=live but no data fetched yet
      ephText  = 'JPL HORIZONS — AWAITING';
      ephColor = 'var(--hud-green-dim)';
    }
  }

  // ── NEO chip (only shown if a fetch has started) ──────────────────────────
  let showNeo   = neoStatus !== 'idle';
  let neoText   = 'NASA NeoWs';
  let neoColor  = 'var(--hud-green-faint)';
  let neoDetail: string | undefined;

  if (neoStatus === 'loading') {
    neoText  = 'NASA NeoWs — FETCHING';
    neoColor = 'var(--hud-green-dim)';
  } else if (neoStatus === 'error') {
    neoText  = 'NASA NeoWs — FALLBACK';
    neoColor = 'var(--hud-warning)';
  } else if (neoData) {
    const count = neoData.objects.length;
    if (neoData.isLive) {
      if (neoData.fromCache) {
        neoText   = 'NASA NeoWs';
        neoColor  = 'var(--hud-warning)';
        neoDetail = `CACHE ${fmtAge(neoData.cacheAgeSeconds)} AGO // ${count} OBJ`;
      } else {
        neoText   = 'NASA NeoWs';
        neoColor  = 'var(--hud-green)';
        neoDetail = `LIVE // ${count} OBJ`;
      }
    } else {
      neoText  = 'NASA NeoWs — FALLBACK';
      neoColor = 'var(--hud-warning)';
    }
  }

  return (
    <footer style={{
      flexShrink: 0,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '3px 14px',
      borderTop: '1px solid var(--hud-border)',
      background: 'var(--hud-panel-bg)',
    }}>
      {/* Left: app signature */}
      <span style={{
        fontSize: '9px',
        fontFamily: "'Courier New', monospace",
        letterSpacing: '0.1em',
        color: 'var(--hud-green-faint)',
        textTransform: 'uppercase',
      }}>
        STELLARNAV // RETRO STELLAR NAVIGATION CONSOLE
      </span>

      {/* Right: live data sources */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
        <SourceChip
          label="EPHEMERIS"
          value={ephText}
          color={ephColor}
          detail={ephDetail}
        />
        {showNeo && (
          <SourceChip
            label="NEO"
            value={neoText}
            color={neoColor}
            detail={neoDetail}
          />
        )}
      </div>
    </footer>
  );
}
