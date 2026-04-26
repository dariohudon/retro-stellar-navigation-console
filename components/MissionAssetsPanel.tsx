import { SpacecraftPosition, SpacecraftResponse } from '@/lib/spacecraft/types';
import { EphemerisStatus } from '@/lib/ephemeris/types';
import HudPanel from './HudPanel';

interface MissionAssetsPanelProps {
  spacecraftData:   SpacecraftResponse | null;
  spacecraftStatus: EphemerisStatus;
  onRefresh:        (force?: boolean) => void;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: '13px',
      letterSpacing: '0.1em',
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

function AssetCard({
  asset,
  fromCache,
}: {
  asset: SpacecraftPosition;
  fromCache: boolean;
}) {
  const borderColor = asset.isLive
    ? (fromCache ? 'var(--hud-warning)' : 'var(--hud-green)')
    : 'var(--hud-border)';

  const statusColor = asset.missionStatus === 'active'
    ? (asset.isLive ? 'var(--hud-green)' : 'var(--hud-green-dim)')
    : 'var(--hud-green-faint)';

  return (
    <div style={{
      borderLeft: `3px solid ${borderColor}`,
      borderBottom: '1px solid rgba(255,255,255,0.03)',
      padding: '5px 7px',
      marginBottom: '2px',
    }}>
      {/* Name + distance */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        fontFamily: "'Courier New', monospace",
        fontSize: '15px',
        letterSpacing: '0.04em',
        color: asset.isLive ? 'var(--hud-green-mid)' : 'var(--hud-green-dim)',
        textTransform: 'uppercase',
        lineHeight: 1.5,
      }}>
        <span>{asset.name}</span>
        <span style={{
          fontSize: '13px',
          color: asset.isLive ? 'var(--hud-amber)' : 'var(--hud-green-faint)',
          flexShrink: 0,
          marginLeft: '6px',
        }}>
          {asset.isLive ? `${asset.distanceAU.toFixed(2)} AU` : '— AU'}
        </span>
      </div>

      {/* Agency + launch year + mission status */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontFamily: "'Courier New', monospace",
        fontSize: '12px',
        color: 'var(--hud-green-dim)',
        letterSpacing: '0.04em',
        lineHeight: 1.5,
        marginTop: '1px',
      }}>
        <span>{asset.agency} · {asset.launchYear}</span>
        <span style={{ fontSize: '11px', letterSpacing: '0.06em', color: statusColor }}>
          {asset.missionStatus.toUpperCase()}
        </span>
      </div>

      {/* Note */}
      {asset.note && (
        <div style={{
          fontFamily: "'Courier New', monospace",
          fontSize: '11px',
          color: 'var(--hud-green-faint)',
          letterSpacing: '0.03em',
          lineHeight: 1.5,
          marginTop: '2px',
        }}>
          {asset.note}
        </div>
      )}
    </div>
  );
}

export default function MissionAssetsPanel({
  spacecraftData,
  spacecraftStatus,
  onRefresh,
}: MissionAssetsPanelProps) {
  // Sort by distanceAU descending when live (Voyager 1 first); preserve order otherwise
  const assets: SpacecraftPosition[] = spacecraftData
    ? Object.values(spacecraftData.assets).sort((a, b) =>
        a.isLive && b.isLive ? b.distanceAU - a.distanceAU : 0
      )
    : [];

  const cacheAge = spacecraftData?.cacheAgeSeconds ?? 0;
  const ageLabel =
    cacheAge < 60   ? `${cacheAge}s` :
    cacheAge < 3600 ? `${Math.floor(cacheAge / 60)}m` :
                      `${(cacheAge / 3600).toFixed(1)}h`;

  return (
    <div style={{ width: '240px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
      <HudPanel title="MISSION ASSETS">

        {/* Loading */}
        {spacecraftStatus === 'loading' && (
          <div style={{ fontSize: '14px', color: 'var(--hud-green-dim)', letterSpacing: '0.07em', marginBottom: '8px' }}>
            QUERYING JPL HORIZONS<span className="blink">_</span>
          </div>
        )}

        {/* Error — no data available */}
        {spacecraftStatus === 'error' && !spacecraftData && (
          <div style={{ fontSize: '13px', color: 'var(--hud-warning)', letterSpacing: '0.07em', lineHeight: 1.75, marginBottom: '8px' }}>
            <div>⚠ HORIZONS UNAVAILABLE</div>
            <div style={{ color: 'var(--hud-green-dim)', fontSize: '12px', marginTop: '2px' }}>
              CHECK SERVER LOG
            </div>
          </div>
        )}

        {/* Asset list */}
        {assets.length > 0 && (
          <>
            <SectionTitle>ACTIVE DEEP-SPACE:</SectionTitle>
            <div style={{ marginBottom: '4px' }}>
              {assets.map(asset => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  fromCache={spacecraftData?.fromCache ?? false}
                />
              ))}
            </div>
          </>
        )}

        {/* Empty / idle state */}
        {spacecraftStatus !== 'loading' && assets.length === 0 && (
          <div style={{ fontSize: '14px', color: 'var(--hud-green-faint)', letterSpacing: '0.07em', lineHeight: 2 }}>
            <div>NO MISSION DATA</div>
            <div>AVAILABLE</div>
          </div>
        )}

        {/* Footer */}
        {spacecraftData && (
          <>
            <div style={{ height: '1px', background: 'var(--hud-border)', margin: '9px 0' }} />
            <div style={{ fontSize: '11px', color: 'var(--hud-green-faint)', letterSpacing: '0.07em', lineHeight: 1.9 }}>
              <div>SRC: {spacecraftData.source}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>
                  {spacecraftData.fromCache ? `CACHE: ${ageLabel} AGO` : 'LIVE'}
                </span>
                <button
                  onClick={() => onRefresh(true)}
                  disabled={spacecraftStatus === 'loading'}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--hud-border)',
                    color: spacecraftStatus === 'loading' ? 'var(--hud-green-faint)' : 'var(--hud-green-dim)',
                    fontFamily: "'Courier New', monospace",
                    fontSize: '11px',
                    letterSpacing: '0.08em',
                    padding: '2px 6px',
                    cursor: spacecraftStatus === 'loading' ? 'not-allowed' : 'pointer',
                    textTransform: 'uppercase' as const,
                  }}
                >
                  REFRESH
                </button>
              </div>
            </div>
          </>
        )}

      </HudPanel>
    </div>
  );
}
