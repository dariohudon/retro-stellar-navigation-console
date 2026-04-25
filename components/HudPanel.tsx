interface HudPanelProps {
  title: string;
  children: React.ReactNode;
}

export default function HudPanel({ title, children }: HudPanelProps) {
  return (
    <div className="hud-panel">
      <div className="hud-panel-title">{title}</div>
      <div className="hud-panel-body">{children}</div>
    </div>
  );
}
