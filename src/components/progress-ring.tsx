// Small circular progress indicator — used wherever a percent-complete
// needs to read at a glance (per-rotation checklists, compliance, etc.)
// rather than as a dense table. Pure SVG, no dependency.
export function ProgressRing({
  percent,
  size = 44,
  strokeWidth = 4,
  color = "#17153B",
  trackColor = "rgba(10,63,56,0.12)",
  label,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold" style={{ color }}>
          {label ?? `${Math.round(clamped)}%`}
        </span>
      </div>
    </div>
  );
}
