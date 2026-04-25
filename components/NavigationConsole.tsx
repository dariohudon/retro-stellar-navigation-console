import { Planet } from "@/data/planets";
import { CelestialObject } from "@/data/celestialObjects";
import { Sector } from "@/data/sectors";
import HudPanel from "./HudPanel";

interface NavigationConsoleProps {
  planets: Planet[];
  objects: CelestialObject[];
  sectors: Sector[];
  selectedPlanet: Planet | null;
  selectedObject: CelestialObject | null;
  selectedSector: Sector | null;
  onSelectPlanet: (p: Planet) => void;
  onSelectObject: (o: CelestialObject) => void;
  onSelectSector: (s: Sector) => void;
}

const PLANET_TYPE_CODES: Record<string, string> = {
  Terrestrial: "TRR",
  "Gas Giant": "GAS",
  "Ice Giant": "ICE",
};

const OBJECT_TYPE_CODES: Record<string, string> = {
  "Natural Satellite": "SAT",
  "Galilean Moon":     "SAT",
  "Captured KBO":      "SAT",
  "Dwarf Planet":      "DWF",
  "Trans-Neptunian Object": "TNO",
  "Scattered Disc Object":  "SDO",
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: '13px',
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: 'var(--hud-green-mid)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      paddingBottom: '4px',
      marginBottom: '4px',
    }}>
      {children}
    </div>
  );
}

function navBtn(active: boolean): React.CSSProperties {
  return {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    textAlign: "left",
    background: active ? "rgba(232,232,232,0.07)" : "transparent",
    border: "none",
    borderLeft: `3px solid ${active ? "var(--hud-green)" : "transparent"}`,
    color: active ? "var(--hud-green)" : "var(--hud-green-dim)",
    fontFamily: "'Courier New', monospace",
    fontSize: "15px",
    letterSpacing: "0.05em",
    padding: "4px 7px",
    cursor: "pointer",
    textTransform: "uppercase",
    lineHeight: 1.6,
  };
}

function TypeBadge({ code }: { code: string }) {
  return (
    <span style={{
      fontSize: "11px",
      letterSpacing: "0.04em",
      color: "var(--hud-green-faint)",
      flexShrink: 0,
    }}>
      {code}
    </span>
  );
}

function Sep() {
  return <hr style={{ border: 'none', borderTop: '1px solid var(--hud-border)', margin: '8px 0' }} />;
}

export default function NavigationConsole({
  planets,
  objects,
  sectors,
  selectedPlanet,
  selectedObject,
  selectedSector,
  onSelectPlanet,
  onSelectObject,
  onSelectSector,
}: NavigationConsoleProps) {
  const anySelected = selectedPlanet ?? selectedObject ?? selectedSector ?? null;

  const lockLabel = selectedPlanet
    ? selectedPlanet.name.toUpperCase()
    : selectedObject
    ? selectedObject.name.toUpperCase()
    : selectedSector
    ? selectedSector.name.toUpperCase()
    : null;

  const lockSub = selectedPlanet
    ? `${selectedPlanet.distanceAU.toFixed(2)} AU — PLANET`
    : selectedObject
    ? `${selectedObject.distanceAU} — ${selectedObject.type.toUpperCase()}`
    : selectedSector
    ? `${selectedSector.auRange} — SECTOR`
    : null;

  return (
    <div style={{ width: "240px", flexShrink: 0, display: "flex", flexDirection: "column" }}>
      <HudPanel title="NAVIGATION CONSOLE">

        <SectionTitle>JUMP TO SECTOR:</SectionTitle>
        <div style={{ marginBottom: "2px" }}>
          {sectors.map((s) => {
            const active = selectedSector?.id === s.id;
            return (
              <button key={s.id} onClick={() => onSelectSector(s)} style={navBtn(active)}>
                <span>{active ? "▶ " : "  "}{s.name}</span>
                <TypeBadge code={s.auRange.replace(" – ", "–").split("–")[0].trim()} />
              </button>
            );
          })}
        </div>

        <Sep />

        <SectionTitle>JUMP TO PLANET:</SectionTitle>
        <div style={{ marginBottom: "2px" }}>
          {planets.map((p) => {
            const active = selectedPlanet?.id === p.id;
            return (
              <button key={p.id} onClick={() => onSelectPlanet(p)} style={navBtn(active)}>
                <span>{active ? "▶ " : "  "}{p.name}</span>
                <TypeBadge code={PLANET_TYPE_CODES[p.type] ?? "UNK"} />
              </button>
            );
          })}
        </div>

        <Sep />

        <SectionTitle>JUMP TO OBJECT:</SectionTitle>
        <div style={{ marginBottom: "2px" }}>
          {objects.map((o) => {
            const active = selectedObject?.id === o.id;
            return (
              <button key={o.id} onClick={() => onSelectObject(o)} style={navBtn(active)}>
                <span>{active ? "▶ " : "  "}{o.name}</span>
                <TypeBadge code={OBJECT_TYPE_CODES[o.type] ?? "OBJ"} />
              </button>
            );
          })}
        </div>

        <Sep />

        <SectionTitle>NAV STATUS:</SectionTitle>
        <div style={{ fontSize: "14px", letterSpacing: "0.07em", marginBottom: "4px", lineHeight: 1.75 }}>
          {anySelected ? (
            <>
              <div style={{ color: "var(--hud-green)", letterSpacing: "0.1em" }}>LOCK ACQUIRED</div>
              <div style={{ color: "var(--hud-green-mid)", marginTop: "2px" }}>{lockLabel}</div>
              <div style={{ fontSize: "12px", color: "var(--hud-green-dim)", marginTop: "2px" }}>{lockSub}</div>
            </>
          ) : (
            <div style={{ color: "var(--hud-green-dim)" }}>
              AWAITING TARGET<span className="blink">_</span>
            </div>
          )}
        </div>

        <Sep />

        <SectionTitle>SYSTEM STATUS:</SectionTitle>
        <div style={{ fontSize: "13px", color: "var(--hud-green-dim)", letterSpacing: "0.06em", lineHeight: 1.9 }}>
          <div>STAR    <span style={{ float: "right", color: "var(--hud-green-mid)" }}>G-TYPE / SOL</span></div>
          <div>PLANETS <span style={{ float: "right", color: "var(--hud-green-mid)" }}>{planets.length} CONFIRMED</span></div>
          <div>OBJECTS <span style={{ float: "right", color: "var(--hud-green-mid)" }}>{objects.length} CATALOGUED</span></div>
          <div>SECTORS <span style={{ float: "right", color: "var(--hud-green-mid)" }}>{sectors.length} DEFINED</span></div>
          <div>SIGNAL  <span style={{ float: "right", color: "var(--hud-green)" }}>NOMINAL</span></div>
        </div>

        <Sep />

        <div style={{ fontSize: "11px", color: "var(--hud-green-faint)", letterSpacing: "0.08em", textAlign: "center", lineHeight: 1.8 }}>
          <div>STELLARNAV CONSOLE</div>
          <div>REV 2.0 // PHASE III</div>
        </div>

      </HudPanel>
    </div>
  );
}
