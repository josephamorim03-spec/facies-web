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
    <article className={`rounded-xl border border-edge bg-surface p-4 shadow-[0_1px_0_color-mix(in_srgb,var(--color-ink)_8%,transparent)] sm:p-5 ${className}`}>
      {children}
    </article>
  );
}

export function GraficosSection({ performance = null }: { performance?: QuestionBankPerformance | null } = {}) {
  const [state, refs, actions] = useGraficosData();

  if (state.loading) {
    return (
      <div className="space-y-4">
        <div className="border border-edge rounded-sm p-3 space-y-2 animate-pulse">
          <div className="h-3 w-32 bg-edge rounded-sm" />
          <div className="h-[180px] bg-edge/40 rounded-sm" />
        </div>
        <div className="border border-edge rounded-sm p-3 space-y-2 animate-pulse">
          <div className="h-3 w-28 bg-edge rounded-sm" />
          <div className="h-[180px] bg-edge/40 rounded-sm" />
        </div>
        <div className="border border-edge rounded-sm p-3 space-y-2 animate-pulse">
          <div className="h-3 w-36 bg-edge rounded-sm" />
          <div className="h-[220px] bg-edge/40 rounded-sm" />
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
          className="mt-3 rounded-lg border border-edge bg-paper px-3 py-2 text-xs font-semibold text-ink transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Tentar novamente
        </button>
      </ChartCard>
    );
  }

  if (!state.hasData) {
    return (
      <ChartCard>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Últimas 12 semanas</p>
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
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Últimas 12 semanas</p>
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
