"use client";

import { useRef, useState, useCallback, useMemo, useEffect } from "react";
import { Planet } from "@/data/planets";
import { CelestialObject } from "@/data/celestialObjects";
import { Sector } from "@/data/sectors";
import { EphemerisResponse, DisplayMode, EphemerisStatus } from "@/lib/ephemeris/types";
import OrbitRing from "./OrbitRing";
import PlanetNode from "./PlanetNode";
import ObjectNode from "./ObjectNode";
import SectorBand from "./SectorBand";
import NeoMarker from "./NeoMarker";
import SpacecraftIndicators from "./SpacecraftIndicators";
import { NeoObject } from "@/lib/neo/types";
import { SpacecraftResponse, SpacecraftPosition } from "@/lib/spacecraft/types";

interface SolarSystemMapProps {
  planets: Planet[];
  objects: CelestialObject[];
  sectors: Sector[];
  selectedPlanet: Planet | null;
  selectedObject: CelestialObject | null;
  selectedSector: Sector | null;
  onSelectPlanet: (p: Planet) => void;
  onSelectObject: (o: CelestialObject) => void;
  onSelectSector: (s: Sector) => void;
  // Ephemeris / mode
  mode: DisplayMode;
  ephemerisData: EphemerisResponse | null;
  ephemerisStatus: EphemerisStatus;
  onRefreshEphemeris: (force?: boolean) => void;
  extendedEphemerisData?: EphemerisResponse | null;
  spacecraftData?:        SpacecraftResponse | null;
  selectedSpacecraft?:    SpacecraftPosition | null;
  onSelectSpacecraft?:    (sc: SpacecraftPosition) => void;
  // NEO
  neoObjects: NeoObject[];
  selectedNeo: NeoObject | null;
  onSelectNeo: (neo: NeoObject) => void;
}

const VB = { x: -600, y: -600, w: 1200, h: 1200 };

const BELT_DOTS = Array.from({ length: 28 }, (_, i) => {
  const angle = ((i * (360 / 28)) + (i % 5) * 11) * (Math.PI / 180);
  const r = 215 + (i % 5) * 7;
  return { x: r * Math.cos(angle), y: r * Math.sin(angle) };
});

const KUIPER_DOTS = Array.from({ length: 18 }, (_, i) => {
  const angle = ((i * (360 / 18)) + (i % 4) * 15) * (Math.PI / 180);
  const r = 491 + (i % 4) * 10;
  return { x: r * Math.cos(angle), y: r * Math.sin(angle) };
});

export default function SolarSystemMap({
  planets,
  objects,
  sectors,
  selectedPlanet,
  selectedObject,
  selectedSector,
  onSelectPlanet,
  onSelectObject,
  onSelectSector,
  mode,
  ephemerisData,
  ephemerisStatus,
  onRefreshEphemeris,
  extendedEphemerisData,
  spacecraftData,
  selectedSpacecraft,
  onSelectSpacecraft,
  neoObjects,
  selectedNeo,
  onSelectNeo,
}: SolarSystemMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(0.86);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOrigin = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  const toSvgDelta = useCallback((clientDx: number, clientDy: number) => {
    const el = svgRef.current;
    if (!el) return { dx: 0, dy: 0 };
    const rect = el.getBoundingClientRect();
    return {
      dx: (clientDx / rect.width) * VB.w,
      dy: (clientDy / rect.height) * VB.h,
    };
  }, []);

  const stopDrag  = useCallback(() => setIsDragging(false), []);
  const resetView = useCallback(() => { setZoom(0.86); setPan({ x: 0, y: 0 }); }, []);

  // ── Non-passive wheel listener — prevents browser page-zoom ──────────────
  // React's synthetic onWheel is passive by default; preventDefault() is ignored.
  // We attach a native listener with { passive: false } so we own the event.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 0.9;
      const rect = el.getBoundingClientRect();
      const cx = VB.x + ((e.clientX - rect.left) / rect.width) * VB.w;
      const cy = VB.y + ((e.clientY - rect.top) / rect.height) * VB.h;
      // Functional updates: no stale-closure risk, no deps needed
      setZoom(prevZoom => {
        const newZoom = Math.max(0.25, Math.min(6, prevZoom * factor));
        const ratio = newZoom / prevZoom;
        setPan(prevPan => ({
          x: cx * (1 - ratio) + prevPan.x * ratio,
          y: cy * (1 - ratio) + prevPan.y * ratio,
        }));
        return newZoom;
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []); // empty — functional updates keep this stable forever

  // ── Zoom helpers (button controls) ────────────────────────────────────────
  const zoomIn  = useCallback(() => setZoom(z => Math.min(6,    z * 1.25)), []);
  const zoomOut = useCallback(() => setZoom(z => Math.max(0.25, z / 1.25)), []);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't fire when user is typing in an input
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomIn(); }
      if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomOut(); }
      if (e.key === '0')                  { e.preventDefault(); resetView(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomIn, zoomOut, resetView]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      setIsDragging(true);
      dragOrigin.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
    },
    [pan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!isDragging) return;
      const dx = e.clientX - dragOrigin.current.mx;
      const dy = e.clientY - dragOrigin.current.my;
      if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
      const { dx: sdx, dy: sdy } = toSvgDelta(dx, dy);
      setPan({ x: dragOrigin.current.px + sdx, y: dragOrigin.current.py + sdy });
    },
    [isDragging, toSvgDelta]
  );

  // Build live angle lookup — populated in LIVE mode for planets + parentless extended bodies
  const liveAngles = useMemo<Record<string, number>>(() => {
    if (mode !== 'live') return {};
    const out: Record<string, number> = {};
    if (ephemerisData) {
      for (const [id, pos] of Object.entries(ephemerisData.positions)) {
        if (pos.isLive) out[id] = pos.angleDeg;
      }
    }
    if (extendedEphemerisData) {
      for (const [id, pos] of Object.entries(extendedEphemerisData.positions)) {
        // Only parentless bodies — moons must never get a heliocentric live angle
        if (pos.isLive && objects.some(o => o.id === id && o.parentPlanetId === null)) {
          out[id] = pos.angleDeg;
        }
      }
    }
    return out;
  }, [mode, ephemerisData, extendedEphemerisData, objects]);

  // Status bar text for the live mode indicator
  const liveBarContent = useMemo(() => {
    if (mode === 'schematic') return null;
    if (ephemerisStatus === 'loading') return { text: 'LIVE — REQUESTING JPL HORIZONS', color: 'var(--hud-green-dim)' };
    if (ephemerisStatus === 'error')   return { text: 'LIVE — FALLBACK MODE — HORIZONS UNREACHABLE', color: 'var(--hud-warning)' };
    if (ephemerisStatus === 'live' && ephemerisData) {
      const utc = new Date(ephemerisData.timestamp).toUTCString().slice(5, 22);
      const age = ephemerisData.cacheAgeSeconds;
      const cacheLabel = ephemerisData.fromCache ? ` — CACHE ${Math.floor(age / 60)}m${age % 60}s` : ' — FRESH';
      const liveCount = Object.values(ephemerisData.positions).filter(p => p.isLive).length;
      return {
        text: `LIVE — UTC ${utc}${cacheLabel} — ${liveCount}/8 BODIES`,
        color: 'var(--hud-green-mid)',
      };
    }
    return null;
  }, [mode, ephemerisStatus, ephemerisData]);

  const targetName =
    selectedPlanet?.name ?? selectedObject?.name ?? selectedSector?.name ?? null;

  return (
    <div
      className="flex-1 relative overflow-hidden flex flex-col"
      style={{
        background: "var(--hud-bg)",
        borderLeft: "1px solid var(--hud-border)",
        borderRight: "1px solid var(--hud-border)",
      }}
    >
      {/* ── Top status bar ──────────────────────────────── */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "5px 10px",
          fontSize: "12px",
          letterSpacing: "0.08em",
          color: "var(--hud-green-dim)",
          borderBottom: "1px solid var(--hud-border)",
          background: "var(--hud-panel-bg)",
          textTransform: "uppercase",
          gap: "8px",
        }}
      >
        {/* Left: map label or live status */}
        <span style={{ color: liveBarContent?.color ?? 'var(--hud-green-dim)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {liveBarContent
            ? liveBarContent.text
            : 'TACTICAL MAP — HELIOCENTRIC REF'}
          {ephemerisStatus === 'loading' && <span className="blink">_</span>}
        </span>

        {/* Center: zoom controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
          <button onClick={zoomOut} style={mapCtrlBtn()} title="Zoom out (-)">−</button>
          <span style={{
            fontSize: '12px', letterSpacing: '0.07em',
            color: 'var(--hud-green-mid)',
            minWidth: '44px', textAlign: 'center',
            fontFamily: "'Courier New', monospace",
          }}>
            {(zoom * 100).toFixed(0)}%
          </span>
          <button onClick={zoomIn}  style={mapCtrlBtn()} title="Zoom in (+)">+</button>
        </div>

        {/* Right: action buttons */}
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          {mode === 'live' && (
            <button
              onClick={() => onRefreshEphemeris(true)}
              disabled={ephemerisStatus === 'loading'}
              style={hudBtn(ephemerisStatus === 'loading')}
            >
              REFRESH
            </button>
          )}
          <button onClick={resetView} style={hudBtn()} title="Reset view (0)">RESET</button>
        </div>
      </div>

      {/* ── SVG tactical map ────────────────────────────── */}
      <svg
        ref={svgRef}
        className="flex-1"
        viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}
        style={{ display: "block", cursor: isDragging ? "grabbing" : "crosshair", width: "100%" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
      >
        <defs>
          <pattern id="grid" x={0} y={0} width={80} height={80} patternUnits="userSpaceOnUse">
            <path d="M 80 0 L 0 0 0 80" fill="none" stroke="rgba(58,58,58,0.6)" strokeWidth="0.4" />
          </pattern>

          <filter id="sun-glow" x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>

          <filter id="planet-glow" x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>

          {/* Grid */}
          <rect x={-6000} y={-6000} width={12000} height={12000} fill="url(#grid)" />

          {/* Sector bands */}
          {sectors.map(s => (
            <SectorBand
              key={s.id}
              sector={s}
              isSelected={selectedSector?.id === s.id}
              onClick={() => onSelectSector(s)}
            />
          ))}

          {/* Ecliptic reference lines */}
          <line x1={-580} y1={0} x2={580} y2={0} stroke="rgba(58,58,58,0.5)" strokeWidth={0.4} />
          <line x1={0} y1={-580} x2={0} y2={580} stroke="rgba(58,58,58,0.5)" strokeWidth={0.4} />

          {/* Belt dots */}
          {BELT_DOTS.map((d, i) => (
            <circle key={`bd${i}`} cx={d.x} cy={d.y} r={0.9} fill="rgba(184,184,184,0.28)" />
          ))}
          {KUIPER_DOTS.map((d, i) => (
            <circle key={`kd${i}`} cx={d.x} cy={d.y} r={0.8} fill="rgba(184,184,184,0.15)" />
          ))}

          {/* Orbit rings */}
          {planets.map(p => (
            <OrbitRing
              key={p.id}
              radius={p.orbitRadius}
              isSelected={selectedPlanet?.id === p.id}
            />
          ))}

          {/* Sol */}
          <g>
            <circle cx={0} cy={0} r={26} fill="rgba(255,255,255,0.07)" filter="url(#sun-glow)" />
            <circle cx={0} cy={0} r={20} fill="rgba(255,255,255,0.10)" style={{ stroke: "var(--hud-amber)", strokeWidth: 1.2 }} />
            {[-1, 1].flatMap(sign => [
              <line key={`cx${sign}`} x1={sign * 24} y1={0} x2={sign * 30} y2={0} stroke="rgba(232,232,232,0.3)" strokeWidth={0.7} />,
              <line key={`cy${sign}`} x1={0} y1={sign * 24} x2={0} y2={sign * 30} stroke="rgba(232,232,232,0.3)" strokeWidth={0.7} />,
            ])}
            <text x={0} y={36} textAnchor="middle" style={{ fontSize: "10px", fill: "var(--hud-amber)", fontFamily: "'Courier New', monospace", letterSpacing: "0.25em" }}>SOL</text>
          </g>

          {/* Planet nodes — pass live angle when available */}
          {planets.map(p => (
            <PlanetNode
              key={p.id}
              planet={p}
              isSelected={selectedPlanet?.id === p.id}
              onClick={() => onSelectPlanet(p)}
              liveAngleDeg={liveAngles[p.id]}
              isLiveData={mode === 'live' && liveAngles[p.id] !== undefined}
            />
          ))}

          {/* Celestial object nodes */}
          {objects.map(o => (
            <ObjectNode
              key={o.id}
              object={o}
              isSelected={selectedObject?.id === o.id}
              onClick={() => onSelectObject(o)}
              planets={planets}
              liveAngleDeg={liveAngles[o.id]}
              isLiveData={mode === 'live' && liveAngles[o.id] !== undefined}
            />
          ))}

          {/* NEO approach markers — cluster around Earth */}
          {(() => {
            const earth = planets.find(p => p.id === 'earth');
            if (!earth || neoObjects.length === 0) return null;
            const angleDeg  = liveAngles['earth'] ?? earth.initialAngleDeg;
            const rad       = (angleDeg * Math.PI) / 180;
            const ex        = earth.orbitRadius * Math.cos(rad);
            const ey        = earth.orbitRadius * Math.sin(rad);
            return (
              <NeoMarker
                earthX={ex} earthY={ey} earthR={earth.nodeRadius}
                neoObjects={neoObjects}
                selectedNeo={selectedNeo}
                onSelectNeo={onSelectNeo}
              />
            );
          })()}

          {/* Spacecraft indicators — Parker inner-system + deep-space edge bearings */}
          {spacecraftData && onSelectSpacecraft && (
            <SpacecraftIndicators
              spacecraftData={spacecraftData}
              mode={mode}
              selectedSpacecraft={selectedSpacecraft ?? null}
              onSelectSpacecraft={onSelectSpacecraft}
            />
          )}

          {/* Scale indicator */}
          <g transform="translate(-570, 540)">
            <text x={0} y={-10} style={{ fontSize: "7px", fill: "var(--hud-green-faint)", fontFamily: "'Courier New', monospace", letterSpacing: "0.12em" }}>
              SCHEMATIC — NOT TO SCALE
            </text>
            <line x1={0} y1={0} x2={80} y2={0} stroke="rgba(58,58,58,0.8)" strokeWidth={0.8} />
            <line x1={0} y1={-4} x2={0} y2={4} stroke="rgba(58,58,58,0.8)" strokeWidth={0.8} />
            <line x1={80} y1={-4} x2={80} y2={4} stroke="rgba(58,58,58,0.8)" strokeWidth={0.8} />
          </g>

          {/* Legend */}
          <g transform="translate(-570, 565)">
            <circle cx={4} cy={0} r={3} fill="rgba(232,232,232,0.07)" style={{ stroke: "rgba(122,122,122,0.55)", strokeWidth: 0.8 }} />
            <text x={12} y={1} dominantBaseline="middle" style={{ fontSize: "7px", fill: "var(--hud-green-faint)", fontFamily: "'Courier New', monospace" }}>PLANET</text>
            <polygon points="20,0 24,4 28,0 24,-4" transform="translate(40,0)" fill="rgba(232,232,232,0.07)" style={{ stroke: "rgba(122,122,122,0.55)", strokeWidth: 0.8 }} />
            <text x={70} y={1} dominantBaseline="middle" style={{ fontSize: "7px", fill: "var(--hud-green-faint)", fontFamily: "'Courier New', monospace" }}>BODY/DWARF</text>
            <circle cx={114} cy={0} r={2.5} fill="rgba(232,232,232,0.07)" style={{ stroke: "rgba(122,122,122,0.45)", strokeWidth: 0.8, strokeDasharray: "2 2" }} />
            <text x={122} y={1} dominantBaseline="middle" style={{ fontSize: "7px", fill: "var(--hud-green-faint)", fontFamily: "'Courier New', monospace" }}>MOON/SAT</text>
            {mode === 'live' && (
              <>
                <circle cx={170} cy={-2} r={1.5} fill="var(--hud-green)" opacity={0.9} />
                <text x={178} y={1} dominantBaseline="middle" style={{ fontSize: "7px", fill: "var(--hud-green-faint)", fontFamily: "'Courier New', monospace" }}>LIVE POS</text>
              </>
            )}
          </g>

          {/* Corner labels */}
          <text x={-590} y={-578} style={{ fontSize: "8px", fill: "var(--hud-green-faint)", fontFamily: "'Courier New', monospace" }}>α:0° δ:+90°</text>
          <text x={590} y={-578} textAnchor="end" style={{ fontSize: "8px", fill: "var(--hud-green-faint)", fontFamily: "'Courier New', monospace" }}>EPOCH J2000.0</text>
          <text x={-590} y={590} style={{ fontSize: "8px", fill: "var(--hud-green-faint)", fontFamily: "'Courier New', monospace" }}>HELIOCENTRIC REF</text>
          <text x={590} y={590} textAnchor="end" style={{ fontSize: "8px", fill: "var(--hud-green-faint)", fontFamily: "'Courier New', monospace" }}>α:0° δ:-90°</text>
        </g>
      </svg>

      {/* ── Bottom status bar ────────────────────────────── */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          justifyContent: "space-between",
          padding: "5px 10px",
          fontSize: "12px",
          letterSpacing: "0.08em",
          color: "var(--hud-green-dim)",
          borderTop: "1px solid var(--hud-border)",
          background: "var(--hud-panel-bg)",
          textTransform: "uppercase",
        }}
      >
        <span>
          TARGET:{" "}
          {targetName
            ? <span style={{ color: "var(--hud-green)" }}>{targetName.toUpperCase()}</span>
            : "—"}
        </span>
        <span>
          MODE:{" "}
          <span style={{ color: mode === 'live' ? 'var(--hud-green)' : 'var(--hud-green-dim)' }}>
            {mode.toUpperCase()}
          </span>
        </span>
        <span>SURVEY MODE: ACTIVE</span>
      </div>
    </div>
  );
}

// Status-bar text button (REFRESH / RESET)
function hudBtn(disabled = false): React.CSSProperties {
  return {
    background: 'transparent',
    border: '1px solid var(--hud-border)',
    color: disabled ? 'var(--hud-green-faint)' : 'var(--hud-green-dim)',
    fontFamily: "'Courier New', monospace",
    fontSize: '13px',
    letterSpacing: '0.08em',
    padding: '3px 9px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    textTransform: 'uppercase' as const,
  };
}

// Zoom +/- button
function mapCtrlBtn(): React.CSSProperties {
  return {
    background: 'transparent',
    border: '1px solid var(--hud-border)',
    color: 'var(--hud-green-mid)',
    fontFamily: "'Courier New', monospace",
    fontSize: '13px',
    fontWeight: 'bold',
    lineHeight: 1,
    width: '20px',
    height: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
    flexShrink: 0,
  };
}
