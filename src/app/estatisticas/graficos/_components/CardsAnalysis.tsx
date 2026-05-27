"use client";

import { AREA_BG_CLASS, AREA_TEXT_CLASS } from "@/lib/areaColors";
import type { GraficosState } from "../_hooks/useGraficosData";

type Props = {
  state: GraficosState;
};

export function CardsAnalysis({ state }: Props) {
  const { turboAreaLoading, turboAreaStats, cardAnalysisRows } = state;

  return (
    <section data-testid="chart-cards-analysis" className="space-y-3 pt-4 border-t border-edge">
      <h2 className="text-sm font-medium">Análise de cards</h2>
      {turboAreaLoading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-3 w-44 rounded-sm bg-edge" />
          <div className="h-2.5 w-full rounded-sm bg-edge" />
          <div className="h-2.5 w-5/6 rounded-sm bg-edge" />
        </div>
      ) : turboAreaStats && turboAreaStats.total_reviews > 0 ? (
        <>
          <div className="grid grid-cols-3 divide-x divide-edge py-1 text-center">
            <div className="px-2">
              <p className="text-xl font-semibold tabular-nums">{turboAreaStats.total_reviews}</p>
              <p className="text-[10px] text-muted">revisões</p>
            </div>
            <div className="px-2">
              <p className="text-xl font-semibold tabular-nums">{turboAreaStats.total_notes}</p>
              <p className="text-[10px] text-muted">cards</p>
            </div>
            <div className="px-2">
              <p className="text-xl font-semibold tabular-nums">
                {Math.round((turboAreaStats.total_correct / turboAreaStats.total_reviews) * 100)}%
              </p>
              <p className="text-[10px] text-muted">acerto</p>
            </div>
          </div>
          <p className="text-[10px] text-muted">Barra: volume · Rótulo: acerto</p>
          <div className="space-y-2">
            {cardAnalysisRows.map((item) => (
              <div key={item.area} className="flex items-center gap-2 text-xs">
                <span className={`w-8 shrink-0 font-semibold ${AREA_TEXT_CLASS[item.area] ?? "text-ink"}`}>
                  {item.area}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-edge">
                  <div
                    className={`h-full rounded-full ${AREA_BG_CLASS[item.area] ?? "bg-edge"}`}
                    style={{ width: `${item.volumePct}%` }}
                  />
                </div>
                <span className="w-28 shrink-0 text-right text-muted tabular-nums">
                  {item.reviewsTotal} rev.{item.accuracyPct !== null ? ` · ${item.accuracyPct}%` : ""}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-xs text-muted">Nenhum card revisado ainda.</p>
      )}
    </section>
  );
}
