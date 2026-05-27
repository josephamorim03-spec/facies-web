"use client";

import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import {
  CHART_INK,
  CHART_EDGE,
  CHART_MUTED,
  WEEKLY_CHART_MARGIN,
  CHART_X_AXIS_PADDING,
  CHART_Y_AXIS_WIDTH,
  renderWeekTickLabel,
  type WeekTickProps,
} from "../_lib/chartGeometry";
import type { GraficosState, GraficosRefs, GraficosActions } from "../_hooks/useGraficosData";

type Props = {
  state: GraficosState;
  refs: GraficosRefs;
  actions: GraficosActions;
};

export function AccuracyChart({ state, refs, actions }: Props) {
  const {
    weeks,
    volumeXAxisTicks,
    weekIndexByLabel,
    accuracyActiveWeekIndex,
    activeAccuracyWeekWithData,
    activeAccuracyOverlayLabel,
  } = state;

  return (
    // eslint-disable-next-line react-hooks/refs
    <section ref={refs.accuracySectionRef}
      data-testid="chart-weekly-accuracy"
      className="space-y-2 pb-4"
    >
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-medium">Evolução de Acerto Geral</h2>
      </div>
      {/* eslint-disable-next-line react-hooks/refs */}
      <div ref={refs.accuracyFrameRef} className="relative overflow-visible">
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={weeks} margin={WEEKLY_CHART_MARGIN}>
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
                renderWeekTickLabel(props, weekIndexByLabel, { defaultFill: CHART_MUTED })
              }
            />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: CHART_MUTED }} unit="%" width={CHART_Y_AXIS_WIDTH} />
            {activeAccuracyWeekWithData && (
              <ReferenceLine x={activeAccuracyWeekWithData.week_label} stroke={CHART_INK} strokeOpacity={0.28} />
            )}
            <Area
              type="monotone"
              dataKey="accuracy_pct"
              stroke={CHART_INK}
              strokeWidth={1.5}
              fill={CHART_INK}
              fillOpacity={0.06}
              connectNulls={false}
              dot={(props: any) => {
                const payload = props?.payload;
                if (!payload || payload.accuracy_pct === null || Number(payload.total ?? 0) <= 0) return null;
                const isActive = props.index === accuracyActiveWeekIndex;
                if (!isActive) {
                  return <circle cx={props.cx} cy={props.cy} r={2} fill={CHART_INK} stroke="none" />;
                }
                return (
                  <g>
                    <circle cx={props.cx} cy={props.cy} r={6.5} fill={CHART_INK} fillOpacity={0.16} />
                    <circle cx={props.cx} cy={props.cy} r={4.5} fill={CHART_INK} stroke="none" />
                  </g>
                );
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
        {/* eslint-disable react-hooks/refs */}
        <div ref={refs.accuracyOverlayRef}
          data-testid="accuracy-interaction-overlay"
          className="absolute inset-0 z-10"
          style={{ touchAction: "none" }}
          onPointerDown={actions.handleAccuracyPointerDown}
          onPointerMove={actions.handleAccuracyPointerMove}
          onPointerUp={actions.handleAccuracyPointerUp}
          onPointerCancel={actions.handleAccuracyPointerUp}
          onPointerLeave={actions.handleAccuracyPointerLeave}
        />
        {/* eslint-enable react-hooks/refs */}
        {activeAccuracyOverlayLabel && (
          <span
            data-testid="accuracy-overlay-percent-label"
            className="pointer-events-none absolute z-20 whitespace-nowrap text-[10px] font-bold leading-none text-ink"
            style={{
              left: activeAccuracyOverlayLabel.placement.left,
              top: activeAccuracyOverlayLabel.placement.top,
              transform: activeAccuracyOverlayLabel.placement.transform,
            }}
          >
            {activeAccuracyOverlayLabel.text}
          </span>
        )}
      </div>
    </section>
  );
}
