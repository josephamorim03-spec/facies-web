"use client";

import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { ChartLegend } from "./ChartNarrative";
import {
  CHART_EDGE,
  CHART_MUTED,
  WEEKLY_CHART_MARGIN,
  CHART_X_AXIS_PADDING,
  CHART_Y_AXIS_WIDTH,
  renderWeekTickLabel,
  type WeekTickProps,
} from "../_lib/chartGeometry";
import type { GraficosState, GraficosRefs, GraficosActions } from "../_hooks/useGraficosData";
import { getChartAreaColor } from "../_lib/chartInsights";

type Props = {
  state: GraficosState;
  refs: GraficosRefs;
  actions: GraficosActions;
};

export function AreaLinesChart({ state, refs, actions }: Props) {
  const {
    activeAreaLines,
    areaLineData,
    volumeXAxisTicks,
    weekIndexByLabel,
    lockedAreaLine,
    lockedAreaOverlayLabels,
    prefersReducedMotion,
  } = state;

  if (activeAreaLines.length === 0) return null;

  return (
    <section data-testid="chart-area-lines" className="space-y-2 pt-4 border-t border-edge">
      <h2 className="text-sm font-medium">Acerto por área</h2>
      <ChartLegend
        areas={activeAreaLines}
        selectedArea={lockedAreaLine}
        onSelectArea={actions.setLockedAreaLine}
      />
      {/* eslint-disable-next-line react-hooks/refs */}
      <div ref={refs.areaLinesFrameRef} className="relative overflow-visible">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={areaLineData} margin={WEEKLY_CHART_MARGIN}>
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
            {activeAreaLines.map((area) => {
              const isLocked = lockedAreaLine === area;
              const color = getChartAreaColor(area);
              const opacity = lockedAreaLine === null ? 0.68 : isLocked ? 1 : 0.2;
              return (
                <Line
                  key={area}
                  dataKey={area}
                  type="monotone"
                  stroke={color}
                  strokeWidth={isLocked ? 2.3 : 1.35}
                  strokeOpacity={opacity}
                  dot={(props: any) => {
                    const val = props?.payload?.[area];
                    if (val === null || val === undefined) return <g key={`dot-${area}-${props.index}`} />;
                    if (!isLocked) {
                      return (
                        <circle key={`dot-${area}-${props.index}`} cx={props.cx} cy={props.cy} r={2} fill={color} fillOpacity={opacity} stroke="none" />
                      );
                    }
                    return (
                      <g key={`dot-${area}-${props.index}`}>
                        <circle cx={props.cx} cy={props.cy} r={3.5} fill={color} stroke="none" />
                      </g>
                    );
                  }}
                  activeDot={false}
                  connectNulls={false}
                  isAnimationActive={isLocked && !prefersReducedMotion}
                  animationDuration={200}
                  animationEasing="ease-out"
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
        {lockedAreaOverlayLabels.map((label) => (
          <span
            key={label.key}
            data-testid="area-line-overlay-percent-label"
            data-week-index={label.weekIndex}
            /* Overlay denso (12 pontos × até 6 séries): fora de cima do gráfico
               no mobile pra não vazar/sobrepor; a linha destacada + legenda bastam. */
            className="pointer-events-none absolute z-20 hidden whitespace-nowrap text-[10px] font-bold leading-none sm:block"
            style={{
              left: label.placement.left,
              top: label.placement.top,
              transform: label.placement.transform,
              color: label.color,
            }}
          >
            {label.text}
          </span>
        ))}
        <div className="absolute inset-0 z-10" style={{ touchAction: "auto" }} onClick={() => actions.setLockedAreaLine(null)} />
      </div>
    </section>
  );
}
