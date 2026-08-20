import type { ReactNode } from "react";

type MeterProps = {
  /** Left column (area code, pattern name, …). Width/color via labelClassName. */
  label: ReactNode;
  /** Right column (percentage, "n rev. · x%", …). Width/align via valueClassName. */
  value: ReactNode;
  /** Fill 0–100 (clamped). */
  pct: number;
  labelClassName?: string;
  valueClassName?: string;
  /** Bar fill color class (e.g. "bg-muted" or an AREA_BG_CLASS). */
  fillClassName?: string;
  className?: string;
};

/**
 * Shared "label · progress bar · value" row used across the stats/desempenho
 * surfaces. Centralizes the previously copy-pasted
 * `h-1.5 flex-1 … + shrink-0 value` idiom so spacing and future
 * responsive tweaks live in one place. Columns keep their fixed widths (bars
 * stay aligned across a list); tune the label/value width via the *ClassName
 * props.
 */
export function Meter({
  label,
  value,
  pct,
  labelClassName = "",
  valueClassName = "",
  fillClassName = "bg-muted",
  className = "",
}: MeterProps) {
  const width = Math.max(0, Math.min(100, pct));
  return (
    <div className={`flex items-center gap-2 text-xs ${className}`}>
      <span className={`shrink-0 ${labelClassName}`}>{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden bg-edge">
        <div className={`h-full ${fillClassName}`} style={{ width: `${width}%` }} />
      </div>
      <span className={`shrink-0 ${valueClassName}`}>{value}</span>
    </div>
  );
}
