"use client";

import { AREA_BG_CLASS } from "@/lib/areaColors";
import { Meter } from "@/components/ui/Meter";
import type { GraficosState } from "../_hooks/useGraficosData";
import { CabecalhoDoGrafico } from "./CabecalhoDoGrafico";

type Props = {
  state: GraficosState;
};

export function CardsAnalysis({ state }: Props) {
  const { turboAreaLoading, turboAreaStats, cardAnalysisRows } = state;

  return (
    <section data-testid="chart-cards-analysis" className="space-y-3">
      <CabecalhoDoGrafico titulo="Análise de cards" medida="revisões e acerto" />
      {turboAreaLoading ? (
        <div className="space-y-2">
          <div className="h-3 w-44 paper-skeleton" />
          <div className="h-2.5 w-full paper-skeleton" />
          <div className="h-2.5 w-5/6 paper-skeleton" />
        </div>
      ) : turboAreaStats && turboAreaStats.total_reviews > 0 ? (
        <>
          {/* Os três números são o `Registro` do `/voce`: mono em 25px sobre o
              rótulo em mono de 11. Eram `text-xl font-semibold` — 20/600 em
              sans, um degrau que o desenho não tem, e a contagem em sans é a
              inversão de família que o `spec-do-app` vigia. */}
          <div className="grid grid-cols-3 divide-x divide-edge py-1 text-center">
            <div className="px-2">
              <p className="font-mono text-dado-menor tabular-nums text-ink">{turboAreaStats.total_reviews}</p>
              <p className="paper-eyebrow mt-1">revisões</p>
            </div>
            <div className="px-2">
              <p className="font-mono text-dado-menor tabular-nums text-ink">{turboAreaStats.total_notes}</p>
              <p className="paper-eyebrow mt-1">cards</p>
            </div>
            <div className="px-2">
              <p className="font-mono text-dado-menor tabular-nums text-ink">
                {Math.round((turboAreaStats.total_correct / turboAreaStats.total_reviews) * 100)}%
              </p>
              <p className="paper-eyebrow mt-1">acerto</p>
            </div>
          </div>
          <p className="paper-eyebrow">barra: volume · rótulo: acerto</p>
          <div className="space-y-2">
            {cardAnalysisRows.map((item) => (
              <Meter
                key={item.area}
                label={item.area}
                labelClassName="w-8 font-mono text-ink"
                pct={item.volumePct}
                fillClassName={AREA_BG_CLASS[item.area] ?? "bg-edge"}
                value={`${item.reviewsTotal} rev.${item.accuracyPct !== null ? ` · ${item.accuracyPct}%` : ""}`}
                valueClassName="w-28 text-right font-mono text-muted tabular-nums"
              />
            ))}
          </div>
        </>
      ) : (
        <p className="text-nota leading-6 text-muted">Nenhum card revisado ainda.</p>
      )}
    </section>
  );
}
