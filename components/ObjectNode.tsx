import { CelestialObject } from "@/data/celestialObjects";
import { Planet } from "@/data/planets";

interface ObjectNodeProps {
  object: CelestialObject;
  isSelected: boolean;
  onClick: () => void;
  planets: Planet[];
}

export function getObjectPosition(
  obj: CelestialObject,
  planets: Planet[]
): { x: number; y: number } {
  if (obj.parentPlanetId) {
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
  const rad = (obj.initialAngleDeg * Math.PI) / 180;
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
}: ObjectNodeProps) {
  const { x, y } = getObjectPosition(object, planets);
  const r = object.nodeRadius;
  const isMoon = object.parentPlanetId !== null;

  const labelAngle = (object.initialAngleDeg * Math.PI) / 180;
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
