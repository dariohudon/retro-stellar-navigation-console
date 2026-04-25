import {
  NeoObject,
  NeoResponse,
  NeoStatus,
  getNeoStatus,
  getNeoStatusColor,
  getNeoStatusLabel,
} from '@/lib/neo/types';
import HudPanel from './HudPanel';

type WindowDays = 1 | 7 | 30;

interface NeoThreatConsoleProps {
  neoData:        NeoResponse | null;
  neoStatus:      'idle' | 'loading' | 'live' | 'error';
  windowDays:     WindowDays;
  onChangeWindow: (days: WindowDays) => void;
  onRefresh:      (force: boolean) => void;
  selectedNeo:    NeoObject | null;
  onSelectNeo:    (neo: NeoObject | null) => void;
}

// ── Section title ─────────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: '11px',
      letterSpacing: '0.13em',
      textTransform: 'uppercase',
      color: 'var(--hud-green-mid)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      paddingBottom: '4px',
      marginBottom: '5px',
    }}>
      {children}
    </div>
  );
}

// ── Window tab ────────────────────────────────────────────────────────────────
function WindowTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        background: active ? 'rgba(255,200,87,0.1)' : 'transparent',
        border: 'none',
        borderBottom: `2px solid ${active ? '#FFC857' : 'transparent'}`,
        color: active ? '#FFC857' : 'var(--hud-green-faint)',
        fontFamily: "'Courier New', monospace",
        fontSize: '13px',
        letterSpacing: '0.08em',
        padding: '4px 0',
        cursor: 'pointer',
        textTransform: 'uppercase' as const,
      }}
    >
      {label}
    </button>
  );
}

// ── Status count ──────────────────────────────────────────────────────────────
function StatusCount({ status, count }: { status: NeoStatus; count: number }) {
  const color = getNeoStatusColor(status);
  const label = getNeoStatusLabel(status);
  const marker =
    status === 'POTENTIALLY_HAZARDOUS' ? '■' :
    status === 'CLOSE_APPROACH'        ? '▲' :
    status === 'WATCHLIST'             ? '○' : '·';
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '11px',
      letterSpacing: '0.07em',
      lineHeight: 1.9,
      color: count > 0 ? color : 'var(--hud-green-faint)',
    }}>
      <span>{marker} {label}</span>
      <span>{count}</span>
    </div>
  );
}

// ── Single NEO item ───────────────────────────────────────────────────────────
function NeoItem({ neo, isSelected, onClick }: {
  neo: NeoObject; isSelected: boolean; onClick: () => void;
}) {
  const status = getNeoStatus(neo);
  const color  = getNeoStatusColor(status);

  const today    = new Date().toISOString().slice(0, 10);
  const diffDays = Math.round(
    (new Date(neo.closeApproachDate).getTime() - new Date(today).getTime()) / 86_400_000
  );
  const dateLbl = diffDays === 0 ? 'TODAY' : `+${diffDays}D`;

  return (
    <button
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        background: isSelected ? 'rgba(0,255,136,0.07)' : 'transparent',
        border: 'none',
        borderLeft: `3px solid ${isSelected ? '#00FF88' : color}`,
        borderBottom: '1px solid rgba(255,255,255,0.03)',
        padding: '4px 7px',
        cursor: 'pointer',
        marginBottom: '1px',
      }}
    >
      {/* Name + date */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        fontFamily: "'Courier New', monospace",
        fontSize: '13px',
        letterSpacing: '0.05em',
        color: isSelected ? '#00FF88' : 'var(--hud-green-mid)',
        lineHeight: 1.5,
        textTransform: 'uppercase',
      }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: '4px' }}>
          {neo.name.length > 15 ? neo.name.slice(0, 15) + '…' : neo.name}
        </span>
        <span style={{ flexShrink: 0, fontSize: '10px', color: isSelected ? '#00FF88' : color }}>
          {dateLbl}
        </span>
      </div>
      {/* Velocity + distance */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontFamily: "'Courier New', monospace",
        fontSize: '11px',
        color: 'var(--hud-green-dim)',
        letterSpacing: '0.04em',
        lineHeight: 1.5,
      }}>
        <span>{neo.velocityKmS.toFixed(1)} km/s</span>
        <span style={{ color: isSelected ? '#00FF88' : color }}>
          {neo.missDistanceLunar.toFixed(2)} LD
        </span>
      </div>
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function NeoThreatConsole({
  neoData,
  neoStatus,
  windowDays,
  onChangeWindow,
  onRefresh,
  selectedNeo,
  onSelectNeo,
}: NeoThreatConsoleProps) {
  const objects = neoData?.objects ?? [];

  // Top 25 for multi-day windows; show all for TODAY
  const DISPLAY_LIMIT = 25;
  const displayObjects = windowDays === 1 ? objects : objects.slice(0, DISPLAY_LIMIT);
  const isTruncated    = displayObjects.length < objects.length;

  const counts: Record<NeoStatus, number> = {
    POTENTIALLY_HAZARDOUS: 0,
    CLOSE_APPROACH: 0,
    WATCHLIST: 0,
    TRACKING: 0,
  };
  for (const o of objects) counts[getNeoStatus(o)]++;

  const cacheAge  = neoData?.cacheAgeSeconds ?? 0;
  const ageLabel  = cacheAge < 60 ? `${cacheAge}s` : cacheAge < 3600 ? `${Math.floor(cacheAge / 60)}m` : `${(cacheAge / 3600).toFixed(1)}h`;

  return (
    <div style={{ width: '240px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
      <HudPanel title="NEO THREAT CONSOLE">

        {/* Time window tabs */}
        <div style={{ display: 'flex', marginBottom: '10px', borderBottom: '1px solid var(--hud-border)' }}>
          <WindowTab label="TODAY" active={windowDays === 1}  onClick={() => onChangeWindow(1)}  />
          <WindowTab label="7D"    active={windowDays === 7}  onClick={() => onChangeWindow(7)}  />
          <WindowTab label="30D"   active={windowDays === 30} onClick={() => onChangeWindow(30)} />
        </div>

        {/* Loading / error */}
        {neoStatus === 'loading' && (
          <div style={{ fontSize: '12px', color: 'var(--hud-green-dim)', letterSpacing: '0.08em', marginBottom: '8px' }}>
            QUERYING NASA NEOWS<span className="blink">_</span>
          </div>
        )}
        {neoStatus === 'error' && (
          <div style={{ fontSize: '12px', color: 'var(--hud-warning)', letterSpacing: '0.08em', marginBottom: '8px' }}>
            ⚠ NASA API UNAVAILABLE
          </div>
        )}

        {/* Threat assessment */}
        {objects.length > 0 && (
          <>
            <SectionTitle>THREAT ASSESSMENT:</SectionTitle>
            <div style={{ marginBottom: '10px' }}>
              <StatusCount status="POTENTIALLY_HAZARDOUS" count={counts.POTENTIALLY_HAZARDOUS} />
              <StatusCount status="CLOSE_APPROACH"        count={counts.CLOSE_APPROACH}        />
              <StatusCount status="WATCHLIST"             count={counts.WATCHLIST}             />
              <StatusCount status="TRACKING"              count={counts.TRACKING}              />
            </div>
          </>
        )}

        {/* Contact list */}
        {objects.length > 0 && (
          <>
            <SectionTitle>
              {isTruncated
                ? `CONTACTS: TOP ${DISPLAY_LIMIT} / ${objects.length}`
                : `CONTACTS: ${objects.length}`}
            </SectionTitle>
            <div>
              {displayObjects.map(neo => (
                <NeoItem
                  key={neo.id}
                  neo={neo}
                  isSelected={selectedNeo?.id === neo.id}
                  onClick={() => onSelectNeo(selectedNeo?.id === neo.id ? null : neo)}
                />
              ))}
            </div>
            {isTruncated && (
              <div style={{ fontSize: '10px', color: 'var(--hud-green-faint)', letterSpacing: '0.08em', padding: '4px 7px', fontFamily: "'Courier New', monospace" }}>
                {objects.length - DISPLAY_LIMIT} MORE — USE 30D FOR FULL VIEW
              </div>
            )}
          </>
        )}

        {/* Empty state */}
        {neoStatus !== 'loading' && objects.length === 0 && (
          <div style={{ fontSize: '12px', color: 'var(--hud-green-faint)', letterSpacing: '0.08em', lineHeight: 2 }}>
            <div>NO CONTACTS IN</div>
            <div>SELECTED WINDOW</div>
          </div>
        )}

        {/* Footer */}
        {neoData && (
          <>
            <div style={{ height: '1px', background: 'var(--hud-border)', margin: '9px 0' }} />
            <div style={{ fontSize: '9px', color: 'var(--hud-green-faint)', letterSpacing: '0.08em', lineHeight: 1.9 }}>
              <div>SRC: {neoData.source}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{neoData.fromCache ? `CACHE: ${ageLabel} AGO` : 'LIVE'}</span>
                <button
                  onClick={() => onRefresh(true)}
                  disabled={neoStatus === 'loading'}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--hud-border)',
                    color: neoStatus === 'loading' ? 'var(--hud-green-faint)' : 'var(--hud-green-dim)',
                    fontFamily: "'Courier New', monospace",
                    fontSize: '9px',
                    letterSpacing: '0.1em',
                    padding: '1px 5px',
                    cursor: neoStatus === 'loading' ? 'not-allowed' : 'pointer',
                    textTransform: 'uppercase' as const,
                  }}
                >
                  REFRESH
                </button>
              </div>
              <div>{neoData.startDate} → {neoData.endDate}</div>
            </div>
          </>
        )}

      </HudPanel>
    </div>
  );
}
