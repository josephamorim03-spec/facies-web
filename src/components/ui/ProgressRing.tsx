type ProgressRingProps = {
  /** 0–100; clamped. */
  pct: number;
  label?: string;
  size?: number;
  strokeWidth?: number;
  /** CSS color for the progress arc. Pass a theme CSS var so it adapts to light/dark. */
  color?: string;
  trackColor?: string;
  className?: string;
};

/**
 * Circular progress indicator with a centered percentage.
 * Theme-aware by default (uses CSS variables for the arc and track).
 */
export function ProgressRing({
  pct,
  label,
  size = 128,
  strokeWidth = 8,
  color = "var(--color-success)",
  trackColor = "var(--color-surface-muted)",
  className = "",
}: ProgressRingProps) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const safePct = Math.max(0, Math.min(100, Math.round(pct)));
  const offset = circumference * (1 - safePct / 100);

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ? `${safePct}% — ${label}` : `${safePct}%`}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
        <span className="font-serif text-2xl leading-none text-ink sm:text-3xl">{safePct}%</span>
        {label && <span className="mt-1 text-[11px] leading-tight text-muted [overflow-wrap:anywhere]">{label}</span>}
      </div>
    </div>
  );
}
