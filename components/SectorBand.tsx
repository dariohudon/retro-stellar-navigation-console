import { Sector } from "@/data/sectors";

interface SectorBandProps {
  sector: Sector;
  isSelected: boolean;
  onClick: () => void;
}

// Per-sector boundary ring styles — encodes the character of each zone
// Outer dash pattern follows the spec:
//   Inner System   → solid (faint)
//   Asteroid Belt  → dotted (dense)
//   Outer Planets  → long dash
//   Kuiper Belt    → sparse dots
//   Deep System    → very sparse long dash (barely-there boundary)
interface SectorStyle {
  outerDash:      string;
  outerStroke:    number;
  outerOpacity:   number;
  innerDash:      string;
  innerStroke:    number;
  innerOpacity:   number;
  fillOpacity:    number;
}

const STYLES: Record<string, SectorStyle> = {
  'inner':         { outerDash: 'none',   outerStroke: 0.5, outerOpacity: 0.35, innerDash: 'none', innerStroke: 0,   innerOpacity: 0,    fillOpacity: 0.012 },
  'asteroid-belt': { outerDash: '2 3',    outerStroke: 0.7, outerOpacity: 0.55, innerDash: 'none', innerStroke: 0.5, innerOpacity: 0.45, fillOpacity: 0.014 },
  'outer':         { outerDash: '12 6',   outerStroke: 0.6, outerOpacity: 0.45, innerDash: 'none', innerStroke: 0.5, innerOpacity: 0.42, fillOpacity: 0.010 },
  'kuiper':        { outerDash: '2 7',    outerStroke: 0.5, outerOpacity: 0.38, innerDash: 'none', innerStroke: 0.5, innerOpacity: 0.40, fillOpacity: 0.008 },
  'deep':          { outerDash: '14 18',  outerStroke: 0.4, outerOpacity: 0.22, innerDash: 'none', innerStroke: 0.4, innerOpacity: 0.30, fillOpacity: 0.005 },
};

function ringPath(inner: number, outer: number): string {
  if (inner <= 0) {
    return [
      `M ${outer} 0`,
      `A ${outer} ${outer} 0 1 0 ${-outer} 0`,
      `A ${outer} ${outer} 0 1 0 ${outer} 0 Z`,
    ].join(' ');
  }
  return [
    `M ${outer} 0`,
    `A ${outer} ${outer} 0 1 0 ${-outer} 0`,
    `A ${outer} ${outer} 0 1 0 ${outer} 0 Z`,
    `M ${inner} 0`,
    `A ${inner} ${inner} 0 1 1 ${-inner} 0`,
    `A ${inner} ${inner} 0 1 1 ${inner} 0 Z`,
  ].join(' ');
}

// Label cascades outward along 305°, near outer edge of each sector
const LABEL_DEG = 305;
const LABEL_RAD = (LABEL_DEG * Math.PI) / 180;

export default function SectorBand({ sector, isSelected, onClick }: SectorBandProps) {
  const { id, innerRadius, outerRadius } = sector;
  const style = STYLES[id] ?? STYLES['inner'];

  // Label near the outer edge (85–90% of the way from inner to outer)
  const labelR = innerRadius <= 0
    ? outerRadius * 0.68
    : innerRadius + (outerRadius - innerRadius) * 0.82;
  const lx = labelR * Math.cos(LABEL_RAD);
  const ly = labelR * Math.sin(LABEL_RAD);

  return (
    <g
      style={{ cursor: 'pointer' }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      {/* Band fill — extremely faint, just enough to feel zoned */}
      <path
        d={ringPath(innerRadius, outerRadius)}
        fillRule="evenodd"
        fill={isSelected
          ? 'rgba(0,255,136,0.04)'
          : `rgba(232,232,232,${style.fillOpacity})`}
      />

      {/* Inner boundary ring — visible separator between zones */}
      {innerRadius > 0 && (
        <circle
          cx={0} cy={0} r={innerRadius}
          fill="none"
          style={{
            stroke: isSelected ? 'rgba(0,255,136,0.6)' : `rgba(255,255,255,${style.innerOpacity})`,
            strokeWidth: isSelected ? 0.8 : style.innerStroke,
          }}
        />
      )}

      {/* Outer boundary ring — sector-specific dash style */}
      <circle
        cx={0} cy={0} r={outerRadius}
        fill="none"
        style={{
          stroke: isSelected ? 'rgba(0,255,136,0.65)' : `rgba(255,255,255,${style.outerOpacity})`,
          strokeWidth: isSelected ? 0.9 : style.outerStroke,
          strokeDasharray: isSelected ? 'none' : style.outerDash,
        }}
      />

      {/* Sector label — near outer edge, along 305° diagonal */}
      <text
        x={lx} y={ly}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fontSize: '7px',
          fill: isSelected ? 'rgba(0,255,136,0.9)' : 'rgba(160,160,160,0.55)',
          fontFamily: "'Courier New', monospace",
          letterSpacing: '0.13em',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {sector.name.toUpperCase()}
      </text>
    </g>
  );
}
