"use client";

import { useState } from "react";
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
import { SegmentedToggle } from "@/components/ui/SegmentedToggle";
import { AreaSmallMultiples } from "./AreaSmallMultiples";
import { useChartEntrance } from "../_hooks/useChartEntrance";

type Props = {
  state: GraficosState;
  refs: GraficosRefs;
  actions: GraficosActions;
};

export function AreaLinesChart({ state, refs, actions }: Props) {
  const entering = useChartEntrance();
  const {
    activeAreaLines,
    areaLineData,
    volumeXAxisTicks,
    weekIndexByLabel,
    lockedAreaLine,
    lockedAreaOverlayLabels,
  } = state;
  const [view, setView] = useState<"grid" | "lines">("grid");

  if (activeAreaLines.length === 0) return null;

  return (
    <section data-testid="chart-area-lines" className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Evolução de Acerto por Área</h2>
        <SegmentedToggle
          value={view}
          onChange={setView}
          ariaLabel="Visão do acerto por área"
          options={[
            { value: "grid", label: "Por área" },
            { value: "lines", label: "Linhas" },
          ]}
        />
      </div>

      {view === "grid" ? (
        <AreaSmallMultiples activeAreaLines={activeAreaLines} areaLineData={areaLineData} />
      ) : (
      <>
      <div className="flex flex-wrap gap-x-3 gap-y-1 items-center">
        {activeAreaLines.map((area) => {
          const isLocked = lockedAreaLine === area;
          const isOtherLocked = lockedAreaLine !== null && !isLocked;
          return (
            <button
              key={area}
              type="button"
              onClick={(e) => { e.stopPropagation(); actions.setLockedAreaLine(lockedAreaLine === area ? null : area); }}
              className="flex items-center gap-1 text-micro font-medium transition-opacity"
              style={{ color: isOtherLocked ? CHART_MUTED : AREA_COLORS[area], opacity: isOtherLocked ? 0.4 : 1 }}
            >
              <span className="inline-block w-2 h-2 " style={{ backgroundColor: AREA_COLORS[area] }} />
              {area}
            </button>
          );
        })}
        {lockedAreaLine !== null && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); actions.setLockedAreaLine(null); }}
            className="ml-auto text-micro text-muted hover:text-ink transition-colors"
          >
            × limpar
          </button>
        )}
      </div>
      {/* eslint-disable-next-line react-hooks/refs */}
      <div ref={refs.areaLinesFrameRef} className="relative overflow-visible">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={areaLineData} margin={WEEKLY_CHART_MARGIN}>
            <CartesianGrid strokeDasharray="1 3" stroke={CHART_EDGE} />
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
              const opacity = lockedAreaLine === null ? 0.9 : isLocked ? 1 : 0.15;
              return (
                <Line
                  key={area}
                  dataKey={area}
                  type="linear"
                  stroke={AREA_COLORS[area]}
                  strokeWidth={isLocked ? 2 : 1}
                  strokeOpacity={opacity}
                  dot={(props: any) => {
                    const val = props.payload?.[area];
                    if (val === null || val === undefined) return <g key={`dot-${area}-${props.index}`} />;
                    if (!isLocked) {
                      return (
                        <rect key={`dot-${area}-${props.index}`} x={props.cx - 1.5} y={props.cy - 1.5} width={3} height={3} fill={AREA_COLORS[area]} fillOpacity={opacity} stroke="none" />
                      );
                    }
                    return (
                      <g key={`dot-${area}-${props.index}`}>
                        <rect x={props.cx - 2.5} y={props.cy - 2.5} width={5} height={5} fill={AREA_COLORS[area]} stroke="none" />
                      </g>
                    );
                  }}
                  activeDot={false}
                  connectNulls={false}
                  // Anima só na entrada. Antes animava ao travar a série, o que
                  // redesenhava a linha inteira a cada clique na legenda; agora
                  // o realce é uma transição de opacidade em CSS (globals.css).
                  className="chart-series-line"
                  isAnimationActive={entering}
                  animationDuration={700}
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
            className="pointer-events-none absolute z-20 hidden whitespace-nowrap text-nano font-bold leading-none sm:block"
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
      </>
      )}
    </section>
  );
}
