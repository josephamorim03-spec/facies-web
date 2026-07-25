"use client";

import { useState } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  ReferenceLine,
  ReferenceArea,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  Tooltip,
} from "recharts";
import type { Area as AreaKey } from "@/app/desempenho/_lib/perfilShared";
import { CHART_EDGE, CHART_MUTED, CHART_Y_AXIS_WIDTH } from "../_lib/chartGeometry";
import {
  computeMatrixMidlines,
  QUADRANT_LABELS,
  type PriorityMatrixRow,
} from "../_lib/matrixInsights";
import { useResolveAreaBlock } from "../_hooks/useResolveAreaBlock";

type Props = {
  rows: PriorityMatrixRow[] | null;
  loading: boolean;
  error: string | null;
  prefersReducedMotion: boolean;
};

function MatrixTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: PriorityMatrixRow }> }) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-edge bg-paper px-3 py-2 text-xs shadow-sm">
      <p className="font-semibold" style={{ color: row.color }}>
        {row.area} · {row.label}
      </p>
      <p className="mt-1 tabular-nums text-ink">Acerto: {row.accuracyPct}%</p>
      <p className="tabular-nums text-ink">Incidência: {Math.round(row.incidenceScore * 100)}</p>
      <p className="tabular-nums text-muted">Volume: {row.volume} q</p>
    </div>
  );
}

export function PriorityMatrixChart({ rows, loading, error, prefersReducedMotion }: Props) {
  const { resolveBlock, busyArea, error: ctaError } = useResolveAreaBlock();
  const [selected, setSelected] = useState<AreaKey | null>(null);

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse" data-testid="chart-priority-matrix-loading">
        <div className="h-3 w-40 rounded-sm bg-edge" />
        <div className="h-[300px] rounded-sm bg-edge/40" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-muted" data-testid="chart-priority-matrix-error">
        {error}
      </p>
    );
  }

  if (!rows || rows.length < 2) {
    return (
      <p className="text-sm text-muted" data-testid="chart-priority-matrix-empty">
        Ainda reunindo dados por área para montar a matriz. Ela aparece quando há acerto e
        incidência em pelo menos duas áreas.
      </p>
    );
  }

  const mid = computeMatrixMidlines(rows);
  const selectedRow = rows.find((row) => row.area === selected) ?? null;

  const quadrants = [
    { key: "priorizar" as const, x1: 0, x2: mid.accuracyMid, y1: mid.incidenceMid, y2: 1.03, position: "insideTopLeft" as const, wash: true },
    { key: "manter" as const, x1: mid.accuracyMid, x2: 100, y1: mid.incidenceMid, y2: 1.03, position: "insideTopRight" as const, wash: false },
    { key: "reforcar" as const, x1: 0, x2: mid.accuracyMid, y1: 0, y2: mid.incidenceMid, position: "insideBottomLeft" as const, wash: false },
    { key: "consolidar" as const, x1: mid.accuracyMid, x2: 100, y1: 0, y2: mid.incidenceMid, position: "insideBottomRight" as const, wash: false },
  ];

  function handleSelect(area: AreaKey | null) {
    setSelected((prev) => (prev === area ? null : area));
  }

  return (
    <section data-testid="chart-priority-matrix" className="space-y-3">
      <p className="text-xs leading-5 text-muted">
        <span className="font-semibold text-ink">Priorizar</span> = alta incidência, baixo acerto.
        Bolha = volume.
      </p>
      {ctaError ? (
        <p className="text-xs text-danger" role="alert">
          {ctaError}
        </p>
      ) : null}
      <div className="overflow-hidden">
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ top: 16, right: 16, left: 4, bottom: 28 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_EDGE} />
            {quadrants.map((quadrant) => (
              <ReferenceArea
                key={quadrant.key}
                x1={quadrant.x1}
                x2={quadrant.x2}
                y1={quadrant.y1}
                y2={quadrant.y2}
                ifOverflow="visible"
                fill={quadrant.wash ? "var(--color-primary)" : "none"}
                fillOpacity={quadrant.wash ? 0.07 : 0}
                stroke="none"
                label={{
                  value: QUADRANT_LABELS[quadrant.key],
                  position: quadrant.position,
                  fontSize: 9,
                  fontWeight: 600,
                  fill: CHART_MUTED,
                }}
              />
            ))}
            <ReferenceLine x={mid.accuracyMid} stroke={CHART_EDGE} strokeDasharray="4 4" />
            <ReferenceLine y={mid.incidenceMid} stroke={CHART_EDGE} strokeDasharray="4 4" />
            <XAxis
              type="number"
              dataKey="accuracyPct"
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tick={{ fontSize: 10, fill: CHART_MUTED }}
              unit="%"
              label={{ value: "Acerto →", position: "insideBottom", offset: -14, fontSize: 10, fill: CHART_MUTED }}
            />
            <YAxis
              type="number"
              dataKey="incidenceScore"
              domain={[0, 1.03]}
              ticks={[0, 0.25, 0.5, 0.75, 1]}
              tickFormatter={(value: number) => `${Math.round(value * 100)}`}
              tick={{ fontSize: 10, fill: CHART_MUTED }}
              width={CHART_Y_AXIS_WIDTH}
              label={{ value: "Incidência ↑", angle: -90, position: "insideLeft", fontSize: 10, fill: CHART_MUTED }}
            />
            <ZAxis type="number" dataKey="volume" range={[90, 520]} name="Volume" />
            <Tooltip cursor={{ strokeDasharray: "3 3", stroke: CHART_EDGE }} content={<MatrixTooltip />} />
            <Scatter
              data={rows}
              isAnimationActive={!prefersReducedMotion}
              animationDuration={280}
              animationEasing="ease-out"
              onClick={(node: unknown) => {
                const area = (node as { payload?: PriorityMatrixRow } | undefined)?.payload?.area;
                handleSelect(area ?? null);
              }}
            >
              {rows.map((row) => (
                <Cell
                  key={row.area}
                  fill={row.color}
                  fillOpacity={selected === null || selected === row.area ? 0.82 : 0.28}
                  stroke="var(--color-paper)"
                  strokeWidth={2}
                  style={{ cursor: "pointer" }}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      {selectedRow ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-edge bg-surface px-3 py-2">
          <span className="text-xs">
            <span className="font-semibold" style={{ color: selectedRow.color }}>
              {selectedRow.area}
            </span>{" "}
            <span className="text-muted">{selectedRow.label}</span>
          </span>
          <button
            type="button"
            onClick={() => void resolveBlock(selectedRow.area)}
            disabled={busyArea !== null}
            aria-label={`Resolver bloco de erros de ${selectedRow.label}`}
            className="rounded-lg border border-edge bg-paper px-2.5 py-1.5 text-[11px] font-semibold text-ink transition hover:border-primary hover:text-primary disabled:opacity-50"
          >
            {busyArea === selectedRow.area ? "Abrindo…" : "Resolver bloco desta área"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
