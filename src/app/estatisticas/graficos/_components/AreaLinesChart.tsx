"use client";

import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { AREA_COLORS } from "@/app/desempenho/_lib/perfilAnalytics";
import type { Area as AreaKey } from "@/app/desempenho/_lib/perfilShared";
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
  } = state;

  if (activeAreaLines.length === 0) return null;

  return (
    <section data-testid="chart-area-lines" className="space-y-2 pt-4 border-t border-edge">
      <h2 className="text-sm font-medium">Evolução de Acerto por Área</h2>
      <div className="flex flex-wrap gap-x-3 gap-y-1 items-center">
        {activeAreaLines.map((area) => {
          const isLocked = lockedAreaLine === area;
          const isOtherLocked = lockedAreaLine !== null && !isLocked;
          return (
            <button
              key={area}
              type="button"
              onClick={(e) => { e.stopPropagation(); actions.setLockedAreaLine(lockedAreaLine === area ? null : area); }}
              className="flex items-center gap-1 text-[11px] font-medium transition-opacity"
              style={{ color: isOtherLocked ? CHART_MUTED : AREA_COLORS[area], opacity: isOtherLocked ? 0.4 : 1 }}
            >
              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: AREA_COLORS[area] }} />
              {area}
            </button>
          );
        })}
        {lockedAreaLine !== null && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); actions.setLockedAreaLine(null); }}
            className="ml-auto text-[11px] text-muted hover:text-ink transition-colors"
          >
            × limpar
          </button>
        )}
      </div>
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
              const isOtherLocked = lockedAreaLine !== null && !isLocked;
              const opacity = lockedAreaLine === null ? 0.55 : isLocked ? 1 : 0.15;
              return (
                <Line
                  key={area}
                  dataKey={area}
                  type="monotone"
                  stroke={AREA_COLORS[area]}
                  strokeWidth={isLocked ? 2.2 : 1.2}
                  strokeOpacity={opacity}
                  dot={(props: any) => {
                    const val = props?.payload?.[area];
                    if (val === null || val === undefined) return <g key={`dot-${area}-${props.index}`} />;
                    if (!isLocked) {
                      return (
                        <circle key={`dot-${area}-${props.index}`} cx={props.cx} cy={props.cy} r={2} fill={AREA_COLORS[area]} fillOpacity={opacity} stroke="none" />
                      );
                    }
                    return (
                      <g key={`dot-${area}-${props.index}`}>
                        <circle cx={props.cx} cy={props.cy} r={3.5} fill={AREA_COLORS[area]} stroke="none" />
                      </g>
                    );
                  }}
                  activeDot={false}
                  connectNulls={false}
                  isAnimationActive={isLocked}
                  animationDuration={300}
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
            className="pointer-events-none absolute z-20 whitespace-nowrap text-[10px] font-bold leading-none"
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
