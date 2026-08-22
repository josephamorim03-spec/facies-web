"use client";

import { AREA_BG_CLASS } from "@/lib/areaColors";
import { Meter } from "@/components/ui/Meter";
import type { GraficosState } from "../_hooks/useGraficosData";

type Props = {
  state: GraficosState;
};

export function CardsAnalysis({ state }: Props) {
  const { turboAreaLoading, turboAreaStats, cardAnalysisRows } = state;

  return (
    <section data-testid="chart-cards-analysis" className="space-y-3">
      <h2 className="text-sm font-medium">Análise de cards</h2>
      {turboAreaLoading ? (
        <div className="space-y-2">
          <div className="h-3 w-44 paper-skeleton" />
          <div className="h-2.5 w-full paper-skeleton" />
          <div className="h-2.5 w-5/6 paper-skeleton" />
        </div>
      ) : turboAreaStats && turboAreaStats.total_reviews > 0 ? (
        <>
          <div className="grid grid-cols-3 divide-x divide-edge py-1 text-center">
            <div className="px-2">
              <p className="text-xl font-semibold tabular-nums">{turboAreaStats.total_reviews}</p>
              <p className="text-micro text-muted">revisões</p>
            </div>
            <div className="px-2">
              <p className="text-xl font-semibold tabular-nums">{turboAreaStats.total_notes}</p>
              <p className="text-micro text-muted">cards</p>
            </div>
            <div className="px-2">
              <p className="text-xl font-semibold tabular-nums">
                {Math.round((turboAreaStats.total_correct / turboAreaStats.total_reviews) * 100)}%
              </p>
              <p className="text-micro text-muted">acerto</p>
            </div>
          </div>
          <p className="text-micro text-muted">Barra: volume · Rótulo: acerto</p>
          <div className="space-y-2">
            {cardAnalysisRows.map((item) => (
              <Meter
                key={item.area}
                label={item.area}
                labelClassName="w-8 font-semibold text-ink"
                pct={item.volumePct}
                fillClassName={AREA_BG_CLASS[item.area] ?? "bg-edge"}
                value={`${item.reviewsTotal} rev.${item.accuracyPct !== null ? ` · ${item.accuracyPct}%` : ""}`}
                valueClassName="w-28 text-right text-muted tabular-nums"
              />
            ))}
          </div>
        </>
      ) : (
        <p className="text-xs text-muted">Nenhum card revisado ainda.</p>
      )}
    </section>
  );
}
