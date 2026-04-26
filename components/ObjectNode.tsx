import { CelestialObject } from "@/data/celestialObjects";
import { Planet } from "@/data/planets";

interface ObjectNodeProps {
  object: CelestialObject;
  isSelected: boolean;
  onClick: () => void;
  planets: Planet[];
  liveAngleDeg?: number;
  isLiveData?: boolean;
}

export function getObjectPosition(
  obj: CelestialObject,
  planets: Planet[],
  liveAngleDeg?: number
): { x: number; y: number } {
  if (obj.parentPlanetId) {
    // Moon branch: always schematic, liveAngleDeg ignored
    const parent = planets.find((p) => p.id === obj.parentPlanetId);
    if (parent) {
      const pRad = (parent.initialAngleDeg * Math.PI) / 180;
      const px = parent.orbitRadius * Math.cos(pRad);
      const py = parent.orbitRadius * Math.sin(pRad);
      const oRad = (obj.initialAngleDeg * Math.PI) / 180;
      return {
        x: px + obj.parentOffset * Math.cos(oRad),
        y: py + obj.parentOffset * Math.sin(oRad),
      };
    }
  }
  // Parentless body: live angle overrides schematic, orbitRadius stays schematic
  const rad = ((liveAngleDeg ?? obj.initialAngleDeg) * Math.PI) / 180;
  return {
    x: obj.orbitRadius * Math.cos(rad),
    y: obj.orbitRadius * Math.sin(rad),
  };
}

export default function ObjectNode({
  object,
  isSelected,
  onClick,
  planets,
  liveAngleDeg,
  isLiveData = false,
}: ObjectNodeProps) {
  const isMoon = object.parentPlanetId !== null;
  const { x, y } = getObjectPosition(object, planets, liveAngleDeg);
  const r = object.nodeRadius;

  // Label direction tracks live angle for parentless bodies, schematic angle for moons
  const effectiveAngle = isMoon ? object.initialAngleDeg : (liveAngleDeg ?? object.initialAngleDeg);
  const labelAngle = (effectiveAngle * Math.PI) / 180;
  const lx = Math.cos(labelAngle) * (r + 7);
  const ly = Math.sin(labelAngle) * (r + 7);
  const anchor =
    Math.abs(Math.cos(labelAngle)) < 0.25 ? 'middle'
    : Math.cos(labelAngle) > 0 ? 'start'
    : 'end';

  return (
    <g
      transform={`translate(${x},${y})`}
      style={{ cursor: 'pointer' }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      <circle cx={0} cy={0} r={Math.max(r + 10, 12)} fill="transparent" />

      {isSelected && (
        <circle
          cx={0} cy={0} r={r + 7}
          fill="none"
          style={{ stroke: 'var(--hud-green)', strokeWidth: 0.6, opacity: 0.4 }}
        />
      )}

      {isMoon ? (
        <circle
          cx={0} cy={0} r={r}
          fill={isSelected ? 'rgba(0,255,136,0.2)' : 'rgba(232,232,232,0.06)'}
          style={{
            stroke: isSelected ? 'var(--hud-green)' : 'rgba(58,58,58,0.85)',
            strokeWidth: isSelected ? 1.2 : 0.7,
            strokeDasharray: '2 2',
            filter: isSelected ? 'url(#planet-glow)' : undefined,
          }}
        />
      ) : (
        <polygon
          points={`0,${-r} ${r},0 0,${r} ${-r},0`}
          fill={isSelected ? 'rgba(0,255,136,0.2)' : 'rgba(232,232,232,0.06)'}
          style={{
            stroke: isSelected ? 'var(--hud-green)' : 'rgba(58,58,58,0.85)',
            strokeWidth: isSelected ? 1.2 : 0.7,
            filter: isSelected ? 'url(#planet-glow)' : undefined,
          }}
        />
      )}

      {isLiveData && !isMoon && (
        <circle cx={r * 0.7} cy={-(r * 0.7)} r={1.5} fill="var(--hud-green)" opacity={0.9} />
      )}

      <text
        x={lx} y={ly}
        textAnchor={anchor}
        dominantBaseline="middle"
        style={{
          fontSize: '8px',
          fill: isSelected ? 'var(--hud-green)' : 'var(--hud-green-faint)',
          fontFamily: "'Courier New', monospace",
          letterSpacing: '0.08em',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        {object.name.toUpperCase()}
      </text>
    </g>
  );
}
