"use client";

import type { ReactNode } from "react";

import { AccuracyChart } from "./_components/AccuracyChart";
import { AreaInsightList } from "./_components/AreaInsightList";
import { AreaLinesChart } from "./_components/AreaLinesChart";
import { CardsAnalysis } from "./_components/CardsAnalysis";
import { ChartTakeaway } from "./_components/ChartNarrative";
import { PriorityMatrixChart } from "./_components/PriorityMatrixChart";
import { SlopeComparison } from "./_components/SlopeComparison";
import { VolumeChart } from "./_components/VolumeChart";
import { useGraficosData } from "./_hooks/useGraficosData";

function ChartDisclosure({
  title,
  children,
  defaultOpen = false,
  onOpen,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  onOpen?: () => void;
}) {
  return (
    <details
      className="group rounded-lg border border-edge bg-paper"
      open={defaultOpen}
      onToggle={(event) => {
        if (event.currentTarget.open) onOpen?.();
      }}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-ink">
        <span>{title}</span>
        <span className="text-muted transition group-open:rotate-90" aria-hidden="true">
          &gt;
        </span>
      </summary>
      <div className="border-t border-edge p-3">
        {children}
      </div>
    </details>
  );
}

export function GraficosSection() {
  const [state, refs, actions] = useGraficosData();

  if (state.loading) {
    return (
      <div className="space-y-4">
        <div className="space-y-2 rounded-lg border border-edge p-3 animate-pulse">
          <div className="h-3 w-32 rounded-sm bg-edge" />
          <div className="h-[180px] rounded-sm bg-edge/40" />
        </div>
        <div className="space-y-2 rounded-lg border border-edge p-3 animate-pulse">
          <div className="h-3 w-28 rounded-sm bg-edge" />
          <div className="h-[180px] rounded-sm bg-edge/40" />
        </div>
        <div className="space-y-2 rounded-lg border border-edge p-3 animate-pulse">
          <div className="h-3 w-36 rounded-sm bg-edge" />
          <div className="h-[220px] rounded-sm bg-edge/40" />
        </div>
      </div>
    );
  }

  if (state.error) {
    return <div className="text-sm text-muted">{state.error}</div>;
  }

  if (!state.hasData) {
    return (
      <div className="space-y-4">
        <p className="text-xs text-muted text-center">Dados das ultimas 12 semanas</p>
        <p className="text-sm text-muted">Sem dados ainda. Volte após algumas semanas de estudo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted text-center">Dados das ultimas 12 semanas</p>
      <ChartDisclosure title="Acerto e tendencia" defaultOpen>
        <div className="space-y-3">
          <ChartTakeaway weeks={state.weeks} />
          <AccuracyChart state={state} refs={refs} actions={actions} />
        </div>
      </ChartDisclosure>
      <ChartDisclosure title="Areas">
        <div className="space-y-2">
          <AreaLinesChart state={state} refs={refs} actions={actions} />
          <AreaInsightList
            rows={state.areaInsightRows}
            prefersReducedMotion={state.prefersReducedMotion}
          />
        </div>
      </ChartDisclosure>
      <ChartDisclosure title="Prioridade x desempenho" onOpen={actions.loadPriorityMatrix}>
        <PriorityMatrixChart
          rows={state.priorityMatrixRows}
          loading={state.priorityMatrixLoading}
          error={state.priorityMatrixError}
          prefersReducedMotion={state.prefersReducedMotion}
        />
      </ChartDisclosure>
      <ChartDisclosure title="Volume">
        <VolumeChart state={state} refs={refs} actions={actions} />
      </ChartDisclosure>
      <ChartDisclosure title="Ritmo e revisao">
        <div className="space-y-4">
          <SlopeComparison state={state} actions={actions} />
          <CardsAnalysis state={state} />
        </div>
      </ChartDisclosure>
    </div>
  );
}
