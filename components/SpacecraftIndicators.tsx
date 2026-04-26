import { SpacecraftResponse, SpacecraftPosition } from '@/lib/spacecraft/types';
import { DisplayMode } from '@/lib/ephemeris/types';

interface SpacecraftIndicatorsProps {
  spacecraftData:      SpacecraftResponse;
  mode:                DisplayMode;
  selectedSpacecraft:  SpacecraftPosition | null;
  onSelectSpacecraft:  (sc: SpacecraftPosition) => void;
}

const PARKER_RADIUS = 80;    // schematic SVG units — inner solar system, not actual AU
const EDGE_RADIUS   = 548;   // SVG units — bearing markers near outer map boundary

const EDGE_ASSETS: { id: string; abbr: string }[] = [
  { id: 'voyager1',    abbr: 'VGR1' },
  { id: 'voyager2',    abbr: 'VGR2' },
  { id: 'newhorizons', abbr: 'NH'   },
];

function labelAnchor(rad: number): 'start' | 'middle' | 'end' {
  const c = Math.cos(rad);
  return Math.abs(c) < 0.28 ? 'middle' : c > 0 ? 'start' : 'end';
}

// ── Parker Solar Probe — inner-system crosshair ───────────────────────────────
function ParkerMarker({
  asset,
  isSelected,
  onSelect,
}: {
  asset:      SpacecraftPosition;
  isSelected: boolean;
  onSelect:   () => void;
}) {
  const rad   = (asset.angleDeg * Math.PI) / 180;
  const cx    = PARKER_RADIUS * Math.cos(rad);
  const cy    = PARKER_RADIUS * Math.sin(rad);
  const lx    = (PARKER_RADIUS + 9) * Math.cos(rad);
  const ly    = (PARKER_RADIUS + 9) * Math.sin(rad);
  const color = isSelected ? 'var(--hud-green)' : 'var(--hud-green-faint)';

  return (
    <g style={{ cursor: 'pointer' }} onClick={onSelect}>
      {/* Invisible hit area */}
      <circle cx={cx} cy={cy} r={12} fill="transparent" />
      {/* Selection halo */}
      {isSelected && (
        <circle cx={cx} cy={cy} r={10} fill="none"
          style={{ stroke: 'var(--hud-green)', strokeWidth: 0.6, opacity: 0.4 }} />
      )}
      {/* Crosshair arms */}
      <line x1={cx - 4} y1={cy}     x2={cx + 4} y2={cy}     stroke={color} strokeWidth="0.8" />
      <line x1={cx}     y1={cy - 4} x2={cx}     y2={cy + 4} stroke={color} strokeWidth="0.8" />
      {/* Centre dot */}
      <circle cx={cx} cy={cy} r={1.2} fill={color} />
      {/* Label */}
      <text
        x={lx} y={ly}
        textAnchor={labelAnchor(rad)}
        dominantBaseline="middle"
        style={{
          fontSize: '7px',
          fill: color,
          fontFamily: "'Courier New', monospace",
          letterSpacing: '0.08em',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        PSP
      </text>
    </g>
  );
}

// ── Deep-space edge bearing marker ────────────────────────────────────────────
function EdgeMarker({
  asset,
  abbr,
  isSelected,
  onSelect,
}: {
  asset:      SpacecraftPosition;
  abbr:       string;
  isSelected: boolean;
  onSelect:   () => void;
}) {
  const rad = (asset.angleDeg * Math.PI) / 180;
  const dx  = Math.cos(rad);
  const dy  = Math.sin(rad);
  const px  = -dy;
  const py  =  dx;

  const cx = EDGE_RADIUS * dx;
  const cy = EDGE_RADIUS * dy;

  const tipX  = (EDGE_RADIUS + 4) * dx;
  const tipY  = (EDGE_RADIUS + 4) * dy;
  const armLX = (EDGE_RADIUS - 2) * dx + px * 3.5;
  const armLY = (EDGE_RADIUS - 2) * dy + py * 3.5;
  const armRX = (EDGE_RADIUS - 2) * dx - px * 3.5;
  const armRY = (EDGE_RADIUS - 2) * dy - py * 3.5;

  const lx    = (EDGE_RADIUS + 12) * dx;
  const ly    = (EDGE_RADIUS + 12) * dy;
  const color = isSelected ? 'var(--hud-green)' : 'var(--hud-green-faint)';

  return (
    <g style={{ cursor: 'pointer' }} onClick={onSelect}>
      {/* Invisible hit area */}
      <circle cx={cx} cy={cy} r={10} fill="transparent" />
      {/* Selection halo */}
      {isSelected && (
        <circle cx={cx} cy={cy} r={9} fill="none"
          style={{ stroke: 'var(--hud-green)', strokeWidth: 0.6, opacity: 0.4 }} />
      )}
      {/* Outward chevron */}
      <polygon
        points={`${tipX},${tipY} ${armLX},${armLY} ${armRX},${armRY}`}
        fill={isSelected ? 'rgba(0,255,136,0.1)' : 'rgba(122,122,122,0.1)'}
        stroke={color}
        strokeWidth="0.8"
      />
      {/* Label */}
      <text
        x={lx} y={ly}
        textAnchor={labelAnchor(rad)}
        dominantBaseline="middle"
        style={{
          fontSize: '7px',
          fill: color,
          fontFamily: "'Courier New', monospace",
          letterSpacing: '0.05em',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        {abbr} {asset.distanceAU.toFixed(0)} AU
      </text>
    </g>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SpacecraftIndicators({
  spacecraftData,
  mode,
  selectedSpacecraft,
  onSelectSpacecraft,
}: SpacecraftIndicatorsProps) {
  if (mode !== 'live') return null;

  const assets = spacecraftData.assets;
  const parker = assets['parker'];

  return (
    <g>
      {/* Parker Solar Probe — schematic inner-system position */}
      {parker?.isLive && (
        <ParkerMarker
          asset={parker}
          isSelected={selectedSpacecraft?.id === 'parker'}
          onSelect={() => onSelectSpacecraft(parker)}
        />
      )}

      {/* Voyager 1 / Voyager 2 / New Horizons — edge bearing markers */}
      {EDGE_ASSETS.map(({ id, abbr }) => {
        const asset = assets[id];
        if (!asset?.isLive) return null;
        return (
          <EdgeMarker
            key={id}
            asset={asset}
            abbr={abbr}
            isSelected={selectedSpacecraft?.id === id}
            onSelect={() => onSelectSpacecraft(asset)}
          />
        );
      })}

      {/* Legend entry — extends existing map legend at y=565 */}
      <g transform="translate(-570, 576)">
        <polygon
          points="0,-3 4,0 0,3"
          fill="none"
          stroke="var(--hud-green-faint)"
          strokeWidth="0.8"
        />
        <text
          x={8} y={1}
          dominantBaseline="middle"
          style={{
            fontSize: '7px',
            fill: 'var(--hud-green-faint)',
            fontFamily: "'Courier New', monospace",
          }}
        >
          DEEP-SPACE BEARING
        </text>
      </g>
    </g>
  );
}
