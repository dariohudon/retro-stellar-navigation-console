"use client";

import { useRef, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Planet } from '@/data/planets';
import { CelestialObject } from '@/data/celestialObjects';
import { Sector } from '@/data/sectors';
import { EphemerisResponse, DisplayMode, EphemerisStatus } from '@/lib/ephemeris/types';
import { getPlanet3DPosition } from '@/lib/space/positioning';
import OrbitPath3D from './OrbitPath3D';
import PlanetBody3D from './PlanetBody3D';

// ── Prop interface (mirrors SolarSystemMap) ──────────────────────────────────
interface OrbitalMap3DProps {
  planets: Planet[];
  objects: CelestialObject[];
  sectors: Sector[];
  selectedPlanet: Planet | null;
  selectedObject: CelestialObject | null;
  selectedSector: Sector | null;
  onSelectPlanet: (p: Planet) => void;
  onSelectObject: (o: CelestialObject) => void;
  onSelectSector: (s: Sector) => void;
  mode: DisplayMode;
  ephemerisData: EphemerisResponse | null;
  ephemerisStatus: EphemerisStatus;
  onRefreshEphemeris: (force?: boolean) => void;
}

// ── Sol node (inside Canvas) ─────────────────────────────────────────────────
function SolNode() {
  return (
    <group>
      {/* Outer glow sphere */}
      <mesh>
        <sphereGeometry args={[25, 32, 32]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.07} />
      </mesh>
      {/* Core body */}
      <mesh>
        <sphereGeometry args={[20, 32, 32]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>
      {/* Point light — illuminates wireframe planets slightly */}
      <pointLight color="#FFFFFF" intensity={0.8} distance={2000} />
    </group>
  );
}

// ── Ecliptic reference grid (inside Canvas) ───────────────────────────────────
function EclipticGrid() {
  const geometry = useMemo(() => {
    const positions: number[] = [];
    const step = 80;
    const extent = 640;
    for (let v = -extent; v <= extent; v += step) {
      // horizontal lines
      positions.push(-extent, 0, v,  extent, 0, v);
      // vertical lines
      positions.push(v, 0, -extent,  v, 0, extent);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    return geo;
  }, []);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#1C1C1C" transparent opacity={0.8} />
    </lineSegments>
  );
}

// ── Scene (inside Canvas) ─────────────────────────────────────────────────────
interface SceneProps {
  planets: Planet[];
  selectedPlanet: Planet | null;
  onSelectPlanet: (p: Planet) => void;
  liveAngles: Record<string, number>;
}

function Scene({ planets, selectedPlanet, onSelectPlanet, liveAngles }: SceneProps) {
  const controlsRef = useRef<any>(null);

  return (
    <>
      <ambientLight intensity={0.35} />
      <EclipticGrid />
      <SolNode />

      {planets.map(planet => {
        const pos = getPlanet3DPosition(planet, liveAngles[planet.id]);
        const isSelected = selectedPlanet?.id === planet.id;
        return (
          <group key={planet.id}>
            <OrbitPath3D radius={planet.orbitRadius} isSelected={isSelected} />
            <PlanetBody3D
              id={planet.id}
              name={planet.name}
              x={pos.x}
              z={pos.z}
              nodeRadius={planet.nodeRadius}
              isSelected={isSelected}
              onClick={() => onSelectPlanet(planet)}
            />
          </group>
        );
      })}

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.06}
        minDistance={80}
        maxDistance={2800}
        target={[0, 0, 0]}
        makeDefault
      />
    </>
  );
}

// ── Status bar button style ──────────────────────────────────────────────────
function mapBtn(active = false): React.CSSProperties {
  return {
    background: 'transparent',
    border: `1px solid ${active ? 'var(--hud-border-bright)' : 'var(--hud-border)'}`,
    color: active ? 'var(--hud-amber)' : 'var(--hud-green-dim)',
    fontFamily: "'Courier New', monospace",
    fontSize: '8px',
    letterSpacing: '0.15em',
    padding: '1px 6px',
    cursor: 'pointer',
    textTransform: 'uppercase' as const,
  };
}

// ── Main component ───────────────────────────────────────────────────────────
export default function OrbitalMap3D({
  planets,
  selectedPlanet,
  onSelectPlanet,
  mode,
  ephemerisData,
  ephemerisStatus,
  onRefreshEphemeris,
}: OrbitalMap3DProps) {
  // Compute live angles (same logic as SolarSystemMap)
  const liveAngles = useMemo<Record<string, number>>(() => {
    if (mode !== 'live' || !ephemerisData) return {};
    const out: Record<string, number> = {};
    for (const [id, pos] of Object.entries(ephemerisData.positions)) {
      if (pos.isLive) out[id] = pos.angleDeg;
    }
    return out;
  }, [mode, ephemerisData]);

  const targetName = selectedPlanet?.name ?? null;

  // Live bar label
  const liveLabel = useMemo(() => {
    if (mode === 'schematic') return null;
    if (ephemerisStatus === 'loading') return { text: 'LIVE — REQUESTING JPL HORIZONS', color: 'var(--hud-green-dim)' };
    if (ephemerisStatus === 'error')   return { text: 'LIVE — FALLBACK MODE', color: 'var(--hud-warning)' };
    if (ephemerisStatus === 'live' && ephemerisData) {
      const n = Object.values(ephemerisData.positions).filter(p => p.isLive).length;
      return { text: `LIVE — ${n}/8 BODIES — JPL HORIZONS`, color: 'var(--hud-green-mid)' };
    }
    return null;
  }, [mode, ephemerisStatus, ephemerisData]);

  return (
    <div
      className="flex-1 flex flex-col"
      style={{
        background: 'var(--hud-bg)',
        borderLeft: '1px solid var(--hud-border)',
        borderRight: '1px solid var(--hud-border)',
      }}
    >
      {/* ── Top status bar ──────────────────────────── */}
      <div style={{
        flexShrink: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '3px 10px',
        fontSize: '8px',
        letterSpacing: '0.13em',
        color: 'var(--hud-green-dim)',
        borderBottom: '1px solid var(--hud-border)',
        background: 'var(--hud-panel-bg)',
        textTransform: 'uppercase',
        gap: '8px',
      }}>
        <span style={{
          color: liveLabel?.color ?? 'var(--hud-green-dim)',
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {liveLabel ? liveLabel.text : '3D ORBITAL VIEW — ROTATE · SCROLL · PAN'}
          {ephemerisStatus === 'loading' && <span className="blink">_</span>}
        </span>

        <span style={{ flexShrink: 0, color: 'var(--hud-green-faint)' }}>
          DRAG=ROTATE · SCROLL=ZOOM · SHIFT+DRAG=PAN
        </span>

        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          {mode === 'live' && (
            <button
              onClick={() => onRefreshEphemeris(true)}
              disabled={ephemerisStatus === 'loading'}
              style={mapBtn()}
            >
              REFRESH
            </button>
          )}
          <button
            onClick={() => {
              // Reload with default camera — implemented by remounting via key would work;
              // for now this is a placeholder label
            }}
            style={mapBtn()}
            title="Use OrbitControls to reset view"
          >
            RESET
          </button>
        </div>
      </div>

      {/* ── 3D Canvas ────────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Canvas
          camera={{ position: [0, 380, 720], fov: 46, near: 1, far: 10000 }}
          style={{ width: '100%', height: '100%', background: '#050505' }}
          gl={{ antialias: true }}
        >
          <Scene
            planets={planets}
            selectedPlanet={selectedPlanet}
            onSelectPlanet={onSelectPlanet}
            liveAngles={liveAngles}
          />
        </Canvas>
      </div>

      {/* ── Bottom status bar ────────────────────────── */}
      <div style={{
        flexShrink: 0,
        display: 'flex',
        justifyContent: 'space-between',
        padding: '3px 10px',
        fontSize: '8px',
        letterSpacing: '0.12em',
        color: 'var(--hud-green-dim)',
        borderTop: '1px solid var(--hud-border)',
        background: 'var(--hud-panel-bg)',
        textTransform: 'uppercase',
      }}>
        <span>
          TARGET:{' '}
          {targetName ? (
            <span style={{ color: 'var(--hud-green)' }}>{targetName.toUpperCase()}</span>
          ) : '—'}
        </span>
        <span>3D ORBITAL // ECLIPTIC FRAME</span>
        <span style={{ color: mode === 'live' ? 'var(--hud-green)' : 'var(--hud-green-dim)' }}>
          {mode.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
