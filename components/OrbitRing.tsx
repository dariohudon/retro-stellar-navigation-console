interface OrbitRingProps {
  radius: number;
  isSelected: boolean;
}

export default function OrbitRing({ radius, isSelected }: OrbitRingProps) {
  return (
    <circle
      cx={0}
      cy={0}
      r={radius}
      fill="none"
      style={{
        stroke: isSelected ? "var(--hud-green)" : "rgba(58,58,58,0.8)",
        strokeWidth: isSelected ? 0.8 : 0.4,
        strokeDasharray: isSelected ? "8 5" : "3 7",
        opacity: isSelected ? 1 : 1,
      }}
    />
  );
}
