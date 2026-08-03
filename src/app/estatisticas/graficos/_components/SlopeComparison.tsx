"use client";

import { AREA_COLORS } from "@/app/desempenho/_lib/perfilAnalytics";
import type { GraficosState, GraficosActions } from "../_hooks/useGraficosData";

type Props = {
  state: GraficosState;
  actions: GraficosActions;
};

export function SlopeComparison({ state, actions }: Props) {
  const { slopeData, slopePeriodLabels, lockedSlopeArea } = state;

  if (slopeData.length === 0) return null;

  return (
    <section data-testid="chart-area-slope" className="space-y-3">
      <h2 className="text-sm font-medium">Comparativo de Evolução por Área</h2>
      <p className="text-xs text-muted">
        Acerto acumulado em duas metades das semanas registradas
      </p>
      <div className="flex items-center gap-2 text-[10px] text-muted">
        <span className="w-8 shrink-0" />
        <span className="w-10 text-right shrink-0 tabular-nums">{slopePeriodLabels.before}</span>
        <span className="flex-1 text-center">→</span>
        <span className="w-10 shrink-0 tabular-nums">{slopePeriodLabels.after}</span>
        <span className="w-10 text-right shrink-0">var.</span>
      </div>
      <div className="space-y-3">
        {slopeData.map(({ area, first, second, delta }) => {
          const isLocked = lockedSlopeArea === area;
          const isOtherLocked = lockedSlopeArea !== null && !isLocked;
          const color = AREA_COLORS[area];
          const deltaClass = delta !== null && delta > 0 ? "text-success" : delta !== null && delta < 0 ? "text-danger" : "text-muted";
          return (
            <div
              key={area}
              role="button"
              tabIndex={0}
              onClick={() => actions.setLockedSlopeArea(lockedSlopeArea === area ? null : area)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") actions.setLockedSlopeArea(lockedSlopeArea === area ? null : area); }}
              className="flex items-center gap-2 cursor-pointer transition-opacity select-none"
              style={{ opacity: isOtherLocked ? 0.22 : 1 }}
            >
              <span className="w-8 text-[10px] font-semibold shrink-0" style={{ color }}>{area}</span>
              <span className="w-10 text-right text-xs tabular-nums shrink-0">{first !== null ? `${first}%` : "—"}</span>
              <div className="flex-1 flex items-center">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color, opacity: first !== null ? 1 : 0.2 }} />
                <div className="flex-1 h-px" style={{ backgroundColor: color, opacity: isLocked ? 0.9 : 0.45 }} />
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color, opacity: second !== null ? 1 : 0.2 }} />
              </div>
              <span className="w-10 text-xs tabular-nums shrink-0">{second !== null ? `${second}%` : "—"}</span>
              <span className={`w-10 text-right text-[10px] font-semibold tabular-nums shrink-0 ${deltaClass}`}>
                {delta !== null
                  ? delta > 0 ? `↑ ${delta}%` : delta < 0 ? `↓ ${Math.abs(delta)}%` : "= 0%"
                  : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
