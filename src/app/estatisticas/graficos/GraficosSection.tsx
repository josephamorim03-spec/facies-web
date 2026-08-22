"use client";

import type { ReactNode } from "react";
import { useGraficosData } from "./_hooks/useGraficosData";
import { AccuracyChart } from "./_components/AccuracyChart";
import { AreaAccuracySnapshot } from "./_components/AreaAccuracySnapshot";
import { AreaLinesChart } from "./_components/AreaLinesChart";
import { VolumeChart } from "./_components/VolumeChart";
import { SlopeComparison } from "./_components/SlopeComparison";
import { CardsAnalysis } from "./_components/CardsAnalysis";
import type { QuestionBankPerformance } from "@/lib/api";

function ChartCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={`paper-surface p-4 sm:p-5 ${className}`}>
      {children}
    </article>
  );
}

/** Rótulo do período, derivado das semanas — antes era o texto fixo
 * "Últimas 12 semanas" em dois lugares, que mentiria assim que o seletor
 * existisse. */
function periodLabel(weeks: number): string {
  if (weeks <= 4) return `Últimas ${weeks} semanas`;
  if (weeks % 52 === 0) return weeks === 52 ? "Último ano" : `Últimos ${weeks / 52} anos`;
  return `Últimas ${weeks} semanas`;
}

export function GraficosSection({
  performance = null,
  weeks = 12,
}: { performance?: QuestionBankPerformance | null; weeks?: number } = {}) {
  const [state, refs, actions] = useGraficosData({ weeks });
  const rangeLabel = periodLabel(weeks);

  if (state.loading) {
    return (
      <div className="space-y-4">
        <div className="border border-edge p-3 space-y-2">
          <div className="h-3 w-32 paper-skeleton" />
          <div className="h-[180px] paper-skeleton" />
        </div>
        <div className="border border-edge p-3 space-y-2">
          <div className="h-3 w-28 paper-skeleton" />
          <div className="h-[180px] paper-skeleton" />
        </div>
        <div className="border border-edge p-3 space-y-2">
          <div className="h-3 w-36 paper-skeleton" />
          <div className="h-[220px] paper-skeleton" />
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <ChartCard>
        <p className="text-sm text-muted">Não foi possível carregar os gráficos agora. {state.error}</p>
        <button
          type="button"
          onClick={actions.retryCharts}
          className="mt-3 rounded-control border border-edge bg-paper px-3 py-2 text-xs font-semibold text-ink transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Tentar novamente
        </button>
      </ChartCard>
    );
  }

  if (!state.hasData) {
    return (
      <ChartCard>
        <p className="paper-eyebrow">{rangeLabel}</p>
        <p className="mt-2 text-sm leading-6 text-muted">
          Ainda não há questões suficientes neste período para gerar os gráficos. Conclua uma sessão para começar sua leitura de evolução.
        </p>
      </ChartCard>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="lg:col-span-2">
        <ChartCard>
          <p className="paper-eyebrow mb-3">{rangeLabel}</p>
          <AccuracyChart state={state} refs={refs} actions={actions} />
        </ChartCard>
      </div>
      {performance ? (
        <ChartCard>
          <AreaAccuracySnapshot performance={performance} />
        </ChartCard>
      ) : null}
      {state.activeAreaLines.length > 0 ? (
        <ChartCard>
          <AreaLinesChart state={state} refs={refs} actions={actions} />
        </ChartCard>
      ) : null}
      <ChartCard>
        <VolumeChart state={state} refs={refs} actions={actions} />
      </ChartCard>
      {state.slopeData.length > 0 ? (
        <ChartCard>
          <SlopeComparison state={state} actions={actions} />
        </ChartCard>
      ) : null}
      <ChartCard>
        <CardsAnalysis state={state} />
      </ChartCard>
    </div>
  );
}
