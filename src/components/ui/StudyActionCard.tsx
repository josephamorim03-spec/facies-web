import type { ReactNode } from "react";
import { Surface } from "./Surface";

type StudyActionCardProps = {
  eyebrow: string;
  title: string;
  reason: string;
  minutes?: number | null;
  expectedResult?: string | null;
  metadata?: ReactNode;
  action: ReactNode;
  leading?: ReactNode;
  className?: string;
};

export function StudyActionCard({
  eyebrow,
  title,
  reason,
  minutes,
  expectedResult,
  metadata,
  action,
  leading,
  className = "",
}: StudyActionCardProps) {
  return (
    <Surface as="section" className={`overflow-hidden ${className}`.trim()} aria-label={eyebrow}>
      <div className="flex flex-col sm:flex-row sm:items-stretch">
        {leading ? <div className="flex shrink-0 items-center justify-center border-b border-edge bg-paper px-5 py-5 sm:w-24 sm:border-b-0 sm:border-r">{leading}</div> : null}
        <div className="min-w-0 flex-1 px-5 py-5 sm:px-6 sm:py-6">
          <p className="paper-eyebrow">{eyebrow}</p>
          <h2 className="mt-1.5 font-serif text-2xl font-semibold leading-tight text-ink md:text-3xl">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{reason}</p>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted">
            {typeof minutes === "number" ? <span className="font-medium tabular-nums">≈ {minutes} min</span> : null}
            {expectedResult ? <span><span className="text-muted/75">Resultado:</span> <strong className="font-medium text-ink">{expectedResult}</strong></span> : null}
            {metadata}
          </div>
        </div>
        <div className="flex items-center border-t border-edge px-5 py-4 sm:border-l sm:border-t-0">{action}</div>
      </div>
    </Surface>
  );
}
