import { Planet } from '@/data/planets';

export interface Position3D {
  x: number;
  y: number;  // always 0 — ecliptic plane
  z: number;
}

// Convert schematic orbital data to 3D world position.
// The ecliptic plane maps to XZ in Three.js (Y is up).
export function getPlanet3DPosition(
  planet: Planet,
  liveAngleDeg?: number
): Position3D {
  const deg = liveAngleDeg ?? planet.initialAngleDeg;
  const rad = (deg * Math.PI) / 180;
  return {
    x: planet.orbitRadius * Math.cos(rad),
    y: 0,
    z: planet.orbitRadius * Math.sin(rad),
  };
}

// Scale 2D nodeRadius to a visible 3D sphere radius
export function get3DRadius(nodeRadius: number): number {
  return Math.max(6, nodeRadius * 1.6);
}
