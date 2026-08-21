import type { HTMLAttributes, ReactNode } from "react";
import { TONE_BADGE, type Tone } from "@/lib/toneClasses";

export type StatusTone = Tone;

type StatusBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: StatusTone;
  children: ReactNode;
};

export function StatusBadge({ tone = "neutral", className = "", children, ...props }: StatusBadgeProps) {
  return (
    <span {...props} className={`inline-flex min-h-6 items-center gap-1 border px-2.5 py-0.5 text-xs font-medium ${TONE_BADGE[tone]} ${className}`.trim()}>
      {children}
    </span>
  );
}
