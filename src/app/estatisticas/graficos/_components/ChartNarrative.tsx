"use client";

import type { Area as AreaKey } from "@/app/desempenho/_lib/perfilShared";
import type { WeeklyTimeline } from "@/lib/api";
import {
  buildChartTakeaway,
  buildSelectedWeekBreakdown,
  getChartAreaColor,
  getChartAreaLabel,
} from "../_lib/chartInsights";

export function ChartTakeaway({ weeks }: { weeks: WeeklyTimeline["weeks"] }) {
  const takeaway = buildChartTakeaway({ weeks });
  const toneClass = takeaway.tone === "positive"
    ? "border-success/40 bg-success/5"
    : takeaway.tone === "attention"
      ? "border-warning/40 bg-warning/5"
      : "border-edge bg-surface";
  return (
    <aside className={`rounded-lg border px-4 py-3 ${toneClass}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-ink">{takeaway.title}</h3>
          {takeaway.message ? (
            <p className="mt-1 text-sm leading-5 text-muted">{takeaway.message}</p>
          ) : null}
        </div>
        <p className="shrink-0 rounded-lg border border-edge bg-paper px-3 py-2 text-sm font-semibold tabular-nums text-ink">
          {takeaway.deltaLabel}
        </p>
      </div>
    </aside>
  );
}

export function ChartLegend({
  areas,
  selectedArea,
  onSelectArea,
}: {
  areas: AreaKey[];
  selectedArea: AreaKey | null;
  onSelectArea: (area: AreaKey | null) => void;
}) {
  if (areas.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Legenda por area">
      {areas.map((area) => {
        const selected = selectedArea === area;
        const muted = selectedArea !== null && !selected;
        return (
          <button
            key={area}
            type="button"
            aria-pressed={selected}
            onClick={(event) => {
              event.stopPropagation();
              onSelectArea(selected ? null : area);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-edge bg-paper px-2.5 py-1 text-[11px] font-semibold transition"
            style={{
              color: muted ? "var(--color-muted)" : getChartAreaColor(area),
              opacity: muted ? 0.45 : 1,
              borderColor: selected ? getChartAreaColor(area) : "var(--color-edge)",
            }}
            title={getChartAreaLabel(area)}
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: getChartAreaColor(area) }}
              aria-hidden="true"
            />
            <span>{area}</span>
            <span className="hidden text-muted sm:inline">{getChartAreaLabel(area)}</span>
          </button>
        );
      })}
      {selectedArea ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onSelectArea(null);
          }}
          className="ml-auto text-[11px] font-semibold text-muted hover:text-ink"
        >
          limpar
        </button>
      ) : null}
    </div>
  );
}

export function SelectedWeekBreakdown({ week }: { week: WeeklyTimeline["weeks"][number] | null }) {
  const rows = buildSelectedWeekBreakdown(week);
  if (rows.length === 0) return null;
  return (
    <div className="rounded-lg border border-edge bg-surface px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        Semana selecionada
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <div key={row.area} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: row.color }}
              aria-hidden="true"
            />
            <span className="font-semibold" style={{ color: row.color }}>{row.area}</span>
            <span className="min-w-0 flex-1 truncate text-muted">{row.label}</span>
            <span className="tabular-nums text-ink">{row.count} q</span>
            <span className="tabular-nums text-muted">{row.sharePct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
