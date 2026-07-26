"use client";

import { useGraficosData } from "./_hooks/useGraficosData";
import { AccuracyChart } from "./_components/AccuracyChart";
import { AreaLinesChart } from "./_components/AreaLinesChart";
import { VolumeChart } from "./_components/VolumeChart";
import { SlopeComparison } from "./_components/SlopeComparison";
import { CardsAnalysis } from "./_components/CardsAnalysis";

export function GraficosSection() {
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
    return <div className="text-sm text-muted">{state.error}</div>;
  }

  if (!state.hasData) {
    return (
      <div className="space-y-4">
        <p className="text-xs text-muted text-center">Dados das últimas 12 semanas</p>
        <p className="text-sm text-muted">
          Sem dados suficientes ainda. Os gráficos ficam disponíveis após
          algumas semanas de estudo registradas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted text-center">Dados das últimas 12 semanas</p>
      <AccuracyChart state={state} refs={refs} actions={actions} />
      <AreaLinesChart state={state} refs={refs} actions={actions} />
      <VolumeChart state={state} refs={refs} actions={actions} />
      <SlopeComparison state={state} actions={actions} />
      <CardsAnalysis state={state} />
    </div>
  );
}
