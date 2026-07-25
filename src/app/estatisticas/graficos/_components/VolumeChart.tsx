"use client";

import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
} from "recharts";
import { SelectedWeekBreakdown } from "./ChartNarrative";
import {
  CHART_INK,
  CHART_EDGE,
  CHART_MUTED,
  WEEKLY_CHART_MARGIN,
  CHART_X_AXIS_PADDING,
  CHART_Y_AXIS_WIDTH,
  VOLUME_SEGMENT_LABEL_LEFT_PX,
  clamp,
  renderWeekTickLabel,
  type WeekTickProps,
} from "../_lib/chartGeometry";
import type { GraficosState, GraficosRefs, GraficosActions } from "../_hooks/useGraficosData";
import { getChartAreaColor } from "../_lib/chartInsights";
import { renderTargetReferenceLine } from "./TargetReferenceLine";

type Props = {
  state: GraficosState;
  refs: GraficosRefs;
  actions: GraficosActions;
};

export function VolumeChart({ state, refs, actions }: Props) {
  const { volumeSectionRef, volumeOverlayRef } = refs;
  const {
    volumeData,
    volumeXAxisTicks,
    weekIndexByLabel,
    volumeActiveWeekIndex,
    activeVolumeWeek,
    activeVolumeSegments,
    volumeSegmentLabelPositions,
    prefersReducedMotion,
    weeklyGoal,
  } = state;

  const hasActiveSegments = volumeSegmentLabelPositions.length > 0;
  const showMetaLine = weeklyGoal !== null && weeklyGoal > 0;

  return (
    <section
      ref={volumeSectionRef}
      data-testid="chart-weekly-volume"
      className="space-y-2 pt-4 border-t border-edge"
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <h2 className="text-sm font-medium">Volume</h2>
        {showMetaLine ? (
          <span className="text-[11px] text-muted tabular-nums" data-testid="volume-meta-caption">
            meta semanal: {weeklyGoal} q
          </span>
        ) : null}
      </div>
      <div className="relative overflow-visible">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart
            data={volumeData}
            margin={WEEKLY_CHART_MARGIN}
            barCategoryGap="7%"
            barGap={0}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_EDGE} />
            <XAxis
              dataKey="week_label"
              type="category"
              scale="band"
              allowDuplicatedCategory={false}
              ticks={volumeXAxisTicks}
              interval={0}
              padding={CHART_X_AXIS_PADDING}
              tick={(props: WeekTickProps) =>
                renderWeekTickLabel(props, weekIndexByLabel, {
                  activeWeekIndex: volumeActiveWeekIndex,
                  activeFill: "#ffffff",
                  defaultFill: CHART_MUTED,
                })
              }
            />
            <YAxis
              tick={hasActiveSegments ? false : { fontSize: 10, fill: CHART_MUTED }}
              allowDecimals={false}
              width={CHART_Y_AXIS_WIDTH}
            />
            <Bar
              dataKey="total"
              shape={actions.renderVolumeBar as any}
              isAnimationActive={!prefersReducedMotion}
              animationDuration={200}
              animationEasing="ease-out"
            >
              <LabelList
                dataKey="total"
                content={(props: any) => {
                  if (props.index !== volumeActiveWeekIndex) return null;
                  const bx = Number(props.x ?? 0);
                  const by = Number(props.y ?? 0);
                  const bw = Number(props.width ?? 0);
                  const bv = Number(props.value ?? 0);
                  if (!Number.isFinite(bx) || !Number.isFinite(by) || !Number.isFinite(bw) || bv <= 0) return null;
                  return (
                    <g>
                      <line x1={bx} x2={bx + bw} y1={by} y2={by} stroke={CHART_INK} strokeWidth={1.2} strokeOpacity={0.7} />
                      <text
                        x={bx + bw / 2} y={by - 5}
                        textAnchor="middle" dominantBaseline="auto"
                        fontSize={11} fontWeight={700} fill={CHART_INK}
                      >
                        {bv}
                      </text>
                    </g>
                  );
                }}
              />
            </Bar>
            {showMetaLine ? renderTargetReferenceLine(weeklyGoal) : null}
          </BarChart>
        </ResponsiveContainer>
        <div ref={volumeOverlayRef}
          data-testid="volume-interaction-overlay"
          className="absolute inset-y-0 left-0 z-10"
          style={{ right: 0, touchAction: "none" }}
          onPointerDown={actions.handleVolumePointerDown}
          onPointerMove={actions.handleVolumePointerMove}
          onPointerUp={actions.handleVolumePointerUp}
          onPointerCancel={actions.handleVolumePointerUp}
          onPointerLeave={actions.handleVolumePointerLeave}
        />
        {hasActiveSegments && (
          <div
            aria-hidden="true"
            className="absolute top-0 left-0 hidden h-full pointer-events-none z-20 sm:block"
            style={{ width: CHART_Y_AXIS_WIDTH }}
          >
            {volumeSegmentLabelPositions.map(({ area, midY, count }) => (
              <div
                key={area}
                className="absolute flex items-center gap-1 text-[9px] font-medium leading-none"
                style={{
                  top: clamp(midY - 5, 0, 170),
                  left: VOLUME_SEGMENT_LABEL_LEFT_PX,
                  color: getChartAreaColor(area),
                }}
              >
                <span className="opacity-80">{area}</span>
                <span className="tabular-nums font-semibold">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <SelectedWeekBreakdown week={activeVolumeWeek} />
      {/* Em telas estreitas os rótulos por segmento (posicionados em px na coluna
          de 40px) sobrepõem/cortam. Abaixo de sm eles saem de cima do gráfico e
          viram uma legenda legível. */}
      {hasActiveSegments && (
        <ul className="flex flex-wrap gap-x-3 gap-y-1 sm:hidden" aria-label="Volume por área na semana ativa">
          {volumeSegmentLabelPositions.map(({ area, count }) => (
            <li key={area} className="flex items-center gap-1 text-[11px] font-medium leading-none tabular-nums">
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: getChartAreaColor(area) }}
              />
              <span className="opacity-80">{area}</span>
              <span className="font-semibold">{count}</span>
            </li>
          ))}
        </ul>
      )}
      {activeVolumeSegments.length > 0 && (
        <div data-testid="volume-active-segments" data-areas={activeVolumeSegments.join(",")} className="sr-only">
          {activeVolumeSegments.join(",")}
        </div>
      )}
    </section>
  );
}
