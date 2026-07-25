"use client";

import { useEffect, useState } from "react";
import { formatDeltaPp, deltaTone, type AreaInsightRow } from "../_lib/chartInsights";
import { useResolveAreaBlock } from "../_hooks/useResolveAreaBlock";

const TONE_CLASS: Record<"positive" | "attention" | "neutral", string> = {
  positive: "text-success",
  attention: "text-danger",
  neutral: "text-muted",
};

const TONE_ARROW: Record<"positive" | "attention" | "neutral", string> = {
  positive: "↑",
  attention: "↓",
  neutral: "→",
};

export function AreaInsightList({
  rows,
  prefersReducedMotion,
}: {
  rows: AreaInsightRow[];
  prefersReducedMotion: boolean;
}) {
  const { resolveBlock, busyArea, error } = useResolveAreaBlock();
  // Sob reduced-motion o estado inicial já é "visível" (initializer), então o
  // efeito só agenda a entrada suave no caso animado — sem setState síncrono.
  const [entered, setEntered] = useState(prefersReducedMotion);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [prefersReducedMotion]);

  if (rows.length === 0) return null;

  return (
    <section data-testid="chart-area-insights" className="space-y-2 pt-4 border-t border-edge">
      <h2 className="text-sm font-medium">Resumo por área</h2>
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="space-y-1.5">
        {rows.map((row, index) => {
          const tone = deltaTone(row.deltaPp);
          const isBusy = busyArea === row.area;
          const acertoLabel = row.recentAccuracyPct === null ? "—" : `${row.recentAccuracyPct}%`;
          return (
            <li
              key={row.area}
              className={`rounded-lg border border-edge bg-surface px-3 py-2 transition-all duration-200 ease-out motion-reduce:transition-none motion-reduce:transform-none ${
                entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
              }`}
              style={
                prefersReducedMotion ? undefined : { transitionDelay: `${index * 35}ms` }
              }
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: row.color }}
                  aria-hidden="true"
                />
                <span className="w-7 shrink-0 text-xs font-semibold" style={{ color: row.color }}>
                  {row.area}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs text-muted">{row.label}</span>
                <button
                  type="button"
                  onClick={() => void resolveBlock(row.area)}
                  disabled={busyArea !== null}
                  aria-label={`Resolver bloco de erros de ${row.label}`}
                  className="shrink-0 rounded-lg border border-edge bg-paper px-2.5 py-1.5 text-[11px] font-semibold text-ink transition hover:border-primary hover:text-primary disabled:opacity-50"
                >
                  {isBusy ? "Abrindo…" : "Resolver bloco"}
                </button>
              </div>
              <div className="mt-1 flex items-center gap-3 pl-[18px] text-[11px] tabular-nums">
                <span>
                  <span className="font-semibold text-ink">{acertoLabel}</span>{" "}
                  <span className="text-muted">acerto</span>
                </span>
                {row.deltaPp !== null ? (
                  <span className={`font-semibold ${TONE_CLASS[tone]}`}>
                    {TONE_ARROW[tone]} {formatDeltaPp(row.deltaPp)}
                  </span>
                ) : null}
                <span className="text-muted">{row.volume} q</span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
