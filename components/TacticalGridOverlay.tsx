// Radial bearing grid — 12 spokes at 30° intervals with degree labels.
// Rendered below sector bands so it never occludes bodies or labels.
// Only mounts when the GRID toggle is active in SolarSystemMap.

const SPOKE_RADIUS = 575;
const LABEL_RADIUS = 592;
const SPOKE_COUNT  = 12; // every 30°

function labelAnchor(rad: number): 'start' | 'middle' | 'end' {
  const c = Math.cos(rad);
  return Math.abs(c) < 0.25 ? 'middle' : c > 0 ? 'start' : 'end';
}

export default function TacticalGridOverlay() {
  return (
    <g>
      {Array.from({ length: SPOKE_COUNT }, (_, i) => {
        const deg      = i * (360 / SPOKE_COUNT);
        const rad      = (deg * Math.PI) / 180;
        const isMain   = deg % 90 === 0;
        const isMajor  = deg % 60 === 0;
        const x2       = SPOKE_RADIUS * Math.cos(rad);
        const y2       = SPOKE_RADIUS * Math.sin(rad);
        const lx       = LABEL_RADIUS * Math.cos(rad);
        const ly       = LABEL_RADIUS * Math.sin(rad);

        return (
          <g key={deg}>
            <line
              x1={0} y1={0} x2={x2} y2={y2}
              stroke={isMain ? 'rgba(90,90,90,0.55)' : 'rgba(58,58,58,0.35)'}
              strokeWidth={isMain ? 0.5 : 0.35}
              strokeDasharray={isMain ? undefined : '3 7'}
            />
            {isMajor && (
              <text
                x={lx} y={ly}
                textAnchor={labelAnchor(rad)}
                dominantBaseline="middle"
                style={{
                  fontSize: '6px',
                  fill: 'rgba(122,122,122,0.55)',
                  fontFamily: "'Courier New', monospace",
                  letterSpacing: '0.05em',
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
              >
                {String(deg).padStart(3, '0')}°
              </text>
            )}
          </g>
        );
      })}

      {/* Overlay indicator label */}
      <text
        x={572} y={-572}
        textAnchor="end"
        dominantBaseline="auto"
        style={{
          fontSize: '6.5px',
          fill: 'rgba(122,122,122,0.35)',
          fontFamily: "'Courier New', monospace",
          letterSpacing: '0.1em',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        BEARING GRID ACTIVE
      </text>
    </g>
  );
}
