import type { HTMLAttributes, ReactNode } from "react";

export type StatusTone = "neutral" | "info" | "positive" | "attention" | "critical";

const TONES: Record<StatusTone, string> = {
  neutral: "border-edge bg-paper text-muted",
  info: "border-info/35 bg-info/5 text-info",
  positive: "border-success/35 bg-success/5 text-success",
  attention: "border-warning/35 bg-warning/5 text-warning",
  critical: "border-danger/35 bg-danger/5 text-danger",
};

type StatusBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: StatusTone;
  children: ReactNode;
};

export function StatusBadge({ tone = "neutral", className = "", children, ...props }: StatusBadgeProps) {
  return (
    <span {...props} className={`inline-flex min-h-6 items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONES[tone]} ${className}`.trim()}>
      {children}
    </span>
  );
}
