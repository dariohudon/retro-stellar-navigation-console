import { Planet } from "@/data/planets";

interface PlanetNodeProps {
  planet: Planet;
  isSelected: boolean;
  onClick: () => void;
  liveAngleDeg?: number;   // when set, overrides planet.initialAngleDeg (LIVE mode)
  isLiveData?: boolean;    // true = live position confirmed from ephemeris
}

export default function PlanetNode({
  planet,
  isSelected,
  onClick,
  liveAngleDeg,
  isLiveData = false,
}: PlanetNodeProps) {
  const effectiveAngle = liveAngleDeg ?? planet.initialAngleDeg;
  const rad = (effectiveAngle * Math.PI) / 180;
  const x = planet.orbitRadius * Math.cos(rad);
  const y = planet.orbitRadius * Math.sin(rad);
  const r = planet.nodeRadius;

  // Nudge label away from the sun centre
  const labelDist = r + 8;
  const lx = Math.cos(rad) * labelDist;
  const ly = Math.sin(rad) * labelDist;
  const anchor =
    Math.abs(Math.cos(rad)) < 0.3
      ? "middle"
      : Math.cos(rad) > 0
      ? "start"
      : "end";

  return (
    <g
      transform={`translate(${x},${y})`}
      style={{ cursor: "pointer" }}
      onClick={onClick}
    >
      {/* Expanded invisible hit area */}
      <circle cx={0} cy={0} r={Math.max(r + 12, 16)} fill="transparent" />

      {/* Outer pulse ring when selected */}
      {isSelected && (
        <circle
          cx={0} cy={0} r={r + 9}
          fill="none"
          style={{ stroke: "var(--hud-green)", strokeWidth: 0.6, opacity: 0.35 }}
        />
      )}

      {/* Orbit tick ring */}
      <circle
        cx={0} cy={0} r={r + 3}
        fill="none"
        style={{
          stroke: isSelected ? "var(--hud-green)" : "var(--hud-green-faint)",
          strokeWidth: 0.5,
        }}
      />

      {/* Planet body */}
      <circle
        cx={0} cy={0} r={r}
        style={{
          fill: isSelected ? "rgba(0,255,136,0.25)" : "rgba(232,232,232,0.07)",
          stroke: isSelected ? "var(--hud-green)" : "var(--hud-green-dim)",
          strokeWidth: isSelected ? 1.5 : 0.8,
          filter: isSelected ? "url(#planet-glow)" : undefined,
        }}
      />

      {/* Saturn ring */}
      {planet.id === "saturn" && (
        <ellipse
          cx={0} cy={0} rx={r + 7} ry={3}
          fill="none"
          style={{
            stroke: isSelected ? "var(--hud-green)" : "var(--hud-green-dim)",
            strokeWidth: 1,
            opacity: 0.65,
          }}
        />
      )}

      {/* Live-data indicator dot — small bright dot in top-right of planet body */}
      {isLiveData && (
        <circle cx={r * 0.7} cy={-(r * 0.7)} r={1.5} fill="var(--hud-green)" opacity={0.9} />
      )}

      {/* Label */}
      <text
        x={lx} y={ly}
        textAnchor={anchor}
        dominantBaseline="middle"
        style={{
          fontSize: "9px",
          fill: isSelected ? "var(--hud-green)" : "var(--hud-green-dim)",
          fontFamily: "'Courier New', monospace",
          letterSpacing: "0.1em",
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        {planet.name.toUpperCase()}
      </text>
    </g>
  );
}
