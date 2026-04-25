import { NeoObject, getNeoStatus, getNeoStatusColor } from '@/lib/neo/types';

interface NeoMarkerProps {
  earthX: number;
  earthY: number;
  earthR: number;    // planet node radius
  neoObjects: NeoObject[];
  selectedNeo: NeoObject | null;
  onSelectNeo: (neo: NeoObject) => void;
}

export default function NeoMarker({
  earthX,
  earthY,
  earthR,
  neoObjects,
  selectedNeo,
  onSelectNeo,
}: NeoMarkerProps) {
  if (neoObjects.length === 0) return null;

  // Sort by severity so most dangerous are shown first
  const statusRank: Record<string, number> = {
    POTENTIALLY_HAZARDOUS: 0,
    CLOSE_APPROACH: 1,
    WATCHLIST: 2,
    TRACKING: 3,
  };
  const sorted = [...neoObjects].sort(
    (a, b) => statusRank[getNeoStatus(a)] - statusRank[getNeoStatus(b)]
  );

  // Most severe object determines badge colour
  const topStatus = getNeoStatus(sorted[0]);
  const badgeColor = getNeoStatusColor(topStatus);

  // Up to 5 individual markers on a ring around Earth
  const visible = sorted.slice(0, 5);
  const ringR   = earthR + 22;

  // Badge sits top-right of Earth
  const badgeX = earthX + earthR + 8;
  const badgeY = earthY - earthR - 8;

  return (
    <g>
      {/* Approach zone dashed ring */}
      <circle
        cx={earthX} cy={earthY} r={ringR + 2}
        fill="none"
        style={{
          stroke: badgeColor,
          strokeWidth: 0.5,
          strokeDasharray: '2 5',
          opacity: 0.25,
        }}
      />

      {/* Individual NEO diamond markers */}
      {visible.map((neo, i) => {
        const angle  = (-60 + i * 30) * (Math.PI / 180);
        const mx     = earthX + ringR * Math.cos(angle);
        const my     = earthY + ringR * Math.sin(angle);
        const status = getNeoStatus(neo);
        const color  = getNeoStatusColor(status);
        const isSel  = selectedNeo?.id === neo.id;
        const sz     = 3.5;

        return (
          <g
            key={neo.id}
            transform={`translate(${mx},${my})`}
            style={{ cursor: 'pointer' }}
            onClick={(e) => { e.stopPropagation(); onSelectNeo(neo); }}
          >
            {/* Hit area */}
            <circle cx={0} cy={0} r={8} fill="transparent" />
            {/* Selection halo */}
            {isSel && (
              <circle cx={0} cy={0} r={sz + 5} fill="none"
                style={{ stroke: '#00FF88', strokeWidth: 0.7, opacity: 0.4 }} />
            )}
            {/* Diamond */}
            <polygon
              points={`0,${-sz} ${sz},0 0,${sz} ${-sz},0`}
              fill={isSel ? 'rgba(0,255,136,0.3)' : `${color}22`}
              style={{
                stroke: isSel ? '#00FF88' : color,
                strokeWidth: isSel ? 1.1 : 0.8,
              }}
            />
          </g>
        );
      })}

      {/* Count / status badge */}
      <g transform={`translate(${badgeX},${badgeY})`} style={{ pointerEvents: 'none' }}>
        <rect
          x={0} y={-5} width={32} height={10} rx={1}
          fill={`${badgeColor}18`}
          style={{ stroke: badgeColor, strokeWidth: 0.5, opacity: 0.6 }}
        />
        <text
          x={16} y={1}
          textAnchor="middle"
          style={{
            fontSize: '7px',
            fill: badgeColor,
            fontFamily: "'Courier New', monospace",
            letterSpacing: '0.06em',
          }}
        >
          ⚠ {neoObjects.length} NEO
        </text>
      </g>
    </g>
  );
}
