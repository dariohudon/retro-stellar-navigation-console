import { Planet } from "@/data/planets";
import { CelestialObject } from "@/data/celestialObjects";
import { Sector, SECTORS } from "@/data/sectors";
import { EphemerisResponse, DisplayMode } from "@/lib/ephemeris/types";
import { NeoObject, getNeoStatus, getNeoStatusColor, getNeoStatusLabel } from "@/lib/neo/types";
import HudPanel from "./HudPanel";

interface PlanetInfoPanelProps {
  selectedPlanet: Planet | null;
  selectedObject: CelestialObject | null;
  selectedSector: Sector | null;
  mode: DisplayMode;
  ephemerisData: EphemerisResponse | null;
  selectedNeo: NeoObject | null;
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function Row({
  label,
  value,
  bright,
}: {
  label: string;
  value: string | number;
  bright?: boolean;
}) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      fontSize: "14px",
      letterSpacing: "0.04em",
      lineHeight: 1.9,
    }}>
      <span style={{ color: "var(--hud-green-dim)", flexShrink: 0, marginRight: "8px", fontSize: "12px", letterSpacing: "0.05em" }}>
        {label}
      </span>
      <span style={{ color: bright ? "var(--hud-amber)" : "var(--hud-green-mid)", textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}

function BigName({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: "28px",
      letterSpacing: "0.2em",
      color: "var(--hud-amber)",
      textTransform: "uppercase",
      marginTop: "4px",
      marginBottom: "12px",
      lineHeight: 1,
    }}>
      {children}
    </div>
  );
}

function Lbl({ children, mt }: { children: React.ReactNode; mt?: string }) {
  return (
    <div
      className="hud-label"
      style={{ marginBottom: "4px", marginTop: mt ?? "2px" }}
    >
      {children}
    </div>
  );
}

function FieldIntel({ text }: { text: string }) {
  return (
    <div style={{
      fontSize: "13px",
      color: "var(--hud-green-dim)",
      lineHeight: 1.75,
      letterSpacing: "0.02em",
      marginTop: "2px",
    }}>
      {text}
    </div>
  );
}

function NavLockBadge({ label = "NAV LOCK CONFIRMED" }: { label?: string }) {
  return (
    <div style={{
      textAlign: "center",
      fontSize: "13px",
      letterSpacing: "0.15em",
      color: "var(--hud-green)",
      textTransform: "uppercase",
      padding: "8px 0",
    }}>
      ◈ {label} ◈
    </div>
  );
}

// ── Planet view ───────────────────────────────────────────────────────────────
function PlanetView({
  planet,
  mode,
  ephemerisData,
}: {
  planet: Planet;
  mode: DisplayMode;
  ephemerisData: EphemerisResponse | null;
}) {
  const livePos = mode === "live" ? ephemerisData?.positions[planet.id] : null;
  const dataIsLive = livePos?.isLive === true;
  const dataMode = mode === "schematic" ? "SCHEMATIC" : dataIsLive ? "LIVE" : "FALLBACK";
  const dataModeColor =
    dataMode === "LIVE"     ? "var(--hud-green)" :
    dataMode === "FALLBACK" ? "var(--hud-warning)" :
                              "var(--hud-green-faint)";

  return (
    <div>
      <Lbl mt="0">PLANETARY BODY:</Lbl>
      <BigName>{planet.name}</BigName>

      <Row label="CLASSIFICATION" value={planet.type.toUpperCase()} />

      {/* Data-mode badge */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: "12px",
        letterSpacing: "0.1em",
        padding: "5px 0",
        marginBottom: "2px",
      }}>
        <span style={{ color: "var(--hud-green-faint)" }}>DATA MODE</span>
        <span style={{ color: dataModeColor }}>{dataMode}</span>
      </div>

      <hr className="hud-separator" />
      <Lbl>ORBITAL STATUS:</Lbl>

      {dataIsLive && livePos ? (
        <>
          <Row label="DISTANCE AU (LIVE)" value={livePos.distanceAU.toFixed(4)} bright />
          <Row label="DISTANCE AU (REF)"  value={planet.distanceAU.toFixed(2)} />
        </>
      ) : (
        <Row label="DISTANCE AU" value={planet.distanceAU.toFixed(2)} bright />
      )}
      <Row label="DISTANCE KM"   value={planet.distanceKm} />
      <Row label="PERIOD (DAYS)" value={planet.orbitalPeriodDays.toLocaleString()} bright />
      <Row label="PERIOD (YRS)"  value={planet.orbitalPeriodYears} />

      {dataIsLive && livePos && (
        <>
          <hr className="hud-separator" />
          <Lbl>LIVE POSITION (AU):</Lbl>
          <Row label="X  ECL J2000" value={livePos.x.toFixed(4)} bright />
          <Row label="Y  ECL J2000" value={livePos.y.toFixed(4)} bright />
          <Row label="Z  ECL J2000" value={livePos.z.toFixed(5)} />
          <Row label="EPOCH UTC"    value={new Date(livePos.timestamp).toUTCString().slice(5, 22)} />
          {livePos.refFrame && (
            <div style={{ fontSize: '10px', color: 'var(--hud-green-faint)', letterSpacing: '0.07em', marginTop: '2px' }}>
              REF: {livePos.refFrame.replace('_', ' ')} — JPL HORIZONS
            </div>
          )}
        </>
      )}

      {mode === "live" && !dataIsLive && (
        <>
          <hr className="hud-separator" />
          <div style={{ fontSize: "9px", color: "var(--hud-warning)", letterSpacing: "0.08em", lineHeight: 1.7 }}>
            {livePos?.error
              ? `HORIZONS ERR: ${livePos.error.slice(0, 45)}`
              : "LIVE POSITION UNAVAILABLE"}
          </div>
        </>
      )}

      <hr className="hud-separator" />
      <Lbl>NATURAL SATELLITES:</Lbl>
      <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "4px", marginBottom: "10px" }}>
        <span style={{ fontSize: "42px", letterSpacing: "0.05em", color: "var(--hud-amber)", lineHeight: 1 }}>
          {planet.moons}
        </span>
        <span style={{ fontSize: "12px", color: "var(--hud-green-dim)", letterSpacing: "0.08em" }}>
          CONFIRMED
        </span>
      </div>

      <hr className="hud-separator" />
      <Lbl>FIELD INTEL:</Lbl>
      <FieldIntel text={planet.description} />

      <hr className="hud-separator" />
      <NavLockBadge />
    </div>
  );
}

// ── Celestial object view ─────────────────────────────────────────────────────
function ObjectView({ object }: { object: CelestialObject }) {
  const sectorName = SECTORS.find((s) => s.id === object.sector)?.name ?? object.sector;

  return (
    <div>
      <Lbl mt="0">OBJECT DESIGNATION:</Lbl>
      <BigName>{object.name}</BigName>

      <Row label="CLASSIFICATION" value={object.type.toUpperCase()} />
      <Row label="SECTOR"         value={sectorName.toUpperCase()} />
      {object.parentPlanetId && (
        <Row label="PARENT BODY" value={object.parentPlanetId.toUpperCase()} bright />
      )}

      <hr className="hud-separator" />
      <Lbl>ORBITAL DATA:</Lbl>
      <Row label="DISTANCE" value={object.distanceAU} bright />
      <Row label="REGION"   value={object.orbitRegion.toUpperCase()} />

      <hr className="hud-separator" />
      <Lbl>PHYSICAL:</Lbl>
      <Row label="DIAMETER" value={object.diameter} bright />

      <hr className="hud-separator" />
      <Lbl>FIELD INTEL:</Lbl>
      <FieldIntel text={object.description} />

      <hr className="hud-separator" />
      <Lbl>NOTABLE:</Lbl>
      <div style={{ fontSize: "13px", color: "var(--hud-green-dim)", lineHeight: 1.7, letterSpacing: "0.02em", marginTop: "2px" }}>
        {object.notableFacts.map((fact, i) => (
          <div key={i}>· {fact}</div>
        ))}
      </div>

      <hr className="hud-separator" />
      <div style={{ fontSize: "11px", color: "var(--hud-green-faint)", letterSpacing: "0.07em", marginBottom: "4px" }}>
        SOURCE: {object.sourceLabel}
      </div>
      <NavLockBadge />
    </div>
  );
}

// ── Sector view ───────────────────────────────────────────────────────────────
function SectorView({ sector }: { sector: Sector }) {
  return (
    <div>
      <Lbl mt="0">NAVIGATIONAL SECTOR:</Lbl>
      <BigName>{sector.name}</BigName>

      <Row label="CLASSIFICATION" value="NAV ZONE" />
      <Row label="AU RANGE"       value={sector.auRange} bright />

      <hr className="hud-separator" />
      <Lbl>PRIMARY BODIES:</Lbl>
      <div style={{ fontSize: "13px", color: "var(--hud-green-mid)", letterSpacing: "0.03em", lineHeight: 1.75, marginTop: "2px", marginBottom: "6px" }}>
        {sector.primaryBodies.split(", ").map((b) => (
          <div key={b}>· {b}</div>
        ))}
      </div>

      <hr className="hud-separator" />
      <Lbl>SECTOR INTEL:</Lbl>
      <FieldIntel text={sector.description} />

      <hr className="hud-separator" />
      <NavLockBadge label="SECTOR LOCKED" />
    </div>
  );
}

// ── Idle view ─────────────────────────────────────────────────────────────────
function IdleView() {
  return (
    <div style={{ fontSize: "14px", color: "var(--hud-green-dim)", letterSpacing: "0.05em", lineHeight: 2.0, textTransform: "uppercase" }}>
      <div>BODY: —</div>
      <div>CLASSIFICATION: —</div>
      <div>DISTANCE: —</div>
      <div>SECTOR: —</div>
      <br />
      <div style={{ color: "var(--hud-green-faint)", fontSize: "13px" }}>
        SELECT A TARGET ON THE<br />
        MAP OR USE THE NAV<br />
        CONSOLE TO ACQUIRE<br />
        LOCK<span className="blink">_</span>
      </div>
    </div>
  );
}

// ── NEO detail view ───────────────────────────────────────────────────────────
function NeoView({ neo }: { neo: NeoObject }) {
  const status     = getNeoStatus(neo);
  const statusColor = getNeoStatusColor(status);
  const statusLabel = getNeoStatusLabel(status);

  const today    = new Date().toISOString().slice(0, 10);
  const diffDays = Math.round(
    (new Date(neo.closeApproachDate).getTime() - new Date(today).getTime()) / 86_400_000
  );
  const whenLabel = diffDays === 0 ? 'TODAY' : diffDays === 1 ? '+1 DAY' : `+${diffDays} DAYS`;

  return (
    <div>
      <Lbl mt="0">NEO DESIGNATION:</Lbl>
      <BigName>{neo.name.length > 14 ? neo.name.slice(0, 14) + '…' : neo.name}</BigName>

      <Row label="TACTICAL STATUS" value={statusLabel} />
      <Row label="HAZARDOUS" value={neo.isPotentiallyHazardous ? 'CONFIRMED' : 'NEGATIVE'} />

      <hr className="hud-separator" />
      <Lbl>CLOSE APPROACH:</Lbl>
      <Row label="DATE" value={neo.closeApproachDateFull} bright />
      <Row label="WHEN" value={whenLabel} />
      <Row label="ORBITING" value={neo.orbitingBody.toUpperCase()} />

      <hr className="hud-separator" />
      <Lbl>PROXIMITY:</Lbl>
      <Row label="MISS DIST (LD)" value={neo.missDistanceLunar.toFixed(3)} bright />
      <Row label="MISS DIST (Mkm)" value={(neo.missDistanceKm / 1e6).toFixed(3)} />

      <hr className="hud-separator" />
      <Lbl>KINEMATICS:</Lbl>
      <Row label="VELOCITY" value={`${neo.velocityKmS.toFixed(2)} km/s`} bright />

      <hr className="hud-separator" />
      <Lbl>PHYSICAL:</Lbl>
      <Row label="DIAM MIN" value={`${neo.diameterMinKm.toFixed(3)} km`} />
      <Row label="DIAM MAX" value={`${neo.diameterMaxKm.toFixed(3)} km`} bright />
      <Row label="ABS MAG H" value={neo.absoluteMagnitude.toFixed(1)} />

      <hr className="hud-separator" />
      <div style={{ fontSize: '11px', color: 'var(--hud-green-faint)', letterSpacing: '0.07em', marginBottom: '4px' }}>
        SOURCE: NASA NeoWS API
      </div>

      <div style={{
        textAlign: 'center',
        fontSize: '13px',
        letterSpacing: '0.15em',
        color: statusColor,
        padding: '8px 0',
        textTransform: 'uppercase',
      }}>
        ◈ {statusLabel} ◈
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────
export default function PlanetInfoPanel({
  selectedPlanet,
  selectedObject,
  selectedSector,
  mode,
  ephemerisData,
  selectedNeo,
}: PlanetInfoPanelProps) {
  return (
    <div style={{ width: "270px", flexShrink: 0, display: "flex", flexDirection: "column" }}>
      <HudPanel title="TARGET DATA">
        {selectedNeo ? (
          <NeoView neo={selectedNeo} />
        ) : selectedPlanet ? (
          <PlanetView planet={selectedPlanet} mode={mode} ephemerisData={ephemerisData} />
        ) : selectedObject ? (
          <ObjectView object={selectedObject} />
        ) : selectedSector ? (
          <SectorView sector={selectedSector} />
        ) : (
          <IdleView />
        )}
      </HudPanel>
    </div>
  );
}
