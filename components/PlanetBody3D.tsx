"use client";

import { Html } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import { AXIAL_TILTS } from '@/lib/space/axisTilts';
import { get3DRadius } from '@/lib/space/positioning';

interface PlanetBody3DProps {
  id: string;
  name: string;
  x: number;
  z: number;
  nodeRadius: number;
  isSelected: boolean;
  onClick: () => void;
}

export default function PlanetBody3D({
  id,
  name,
  x,
  z,
  nodeRadius,
  isSelected,
  onClick,
}: PlanetBody3DProps) {
  const r = get3DRadius(nodeRadius);
  const tiltRad = ((AXIAL_TILTS[id] ?? 0) * Math.PI) / 180;
  const isSaturn = id === 'saturn';

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onClick();
  };

  return (
    <group position={[x, 0, z]}>

      {/* ── Selection ring (in orbital/XZ plane, not tilted with planet) ── */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r + 6, 0.8, 8, 64]} />
          <meshBasicMaterial color="#00FF88" />
        </mesh>
      )}

      {/* ── Axially-tilted group: sphere + rings ── */}
      <group rotation={[tiltRad, 0, 0]}>

        {/* Planet sphere */}
        <mesh onClick={handleClick}>
          <sphereGeometry args={[r, 14, 14]} />
          <meshBasicMaterial
            color={isSelected ? '#00FF88' : '#D0D0D0'}
            wireframe
          />
        </mesh>

        {/* Saturn ring (in equatorial/XZ plane within tilted group) */}
        {isSaturn && (
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry args={[r + 9, 1.0, 3, 64]} />
            <meshBasicMaterial
              color={isSelected ? '#00FF88' : '#888888'}
              transparent
              opacity={0.65}
            />
          </mesh>
        )}

        {/* Pole axis indicator — thin line through sphere (subtle) */}
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array([0, -(r + 4), 0, 0, r + 4, 0]), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color={isSelected ? '#00FF88' : '#3A3A3A'}
            transparent
            opacity={0.5}
          />
        </lineSegments>

      </group>

      {/* ── Label (HTML, faces camera, scales with distance) ── */}
      <Html
        center
        position={[0, r + 18, 0]}
        distanceFactor={500}
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          fontSize: '11px',
          fontFamily: "'Courier New', Courier, monospace",
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: isSelected ? '#00FF88' : '#7A7A7A',
          textShadow: isSelected ? '0 0 8px rgba(0,255,136,0.55)' : 'none',
        }}
      >
        {name}
      </Html>

    </group>
  );
}
