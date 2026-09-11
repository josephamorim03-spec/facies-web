"use client";

import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  ReferenceLine,
  ReferenceArea,
  CartesianGrid,
} from "recharts";
import {
  CHART_INK,
  CHART_EDGE,
  CHART_MUTED,
  CHART_SVG_LABEL,
  CHART_TICK,
  WEEKLY_CHART_MARGIN,
  CHART_X_AXIS_PADDING,
  CHART_Y_AXIS_WIDTH,
  renderWeekTickLabel,
  type WeekTickProps,
} from "../_lib/chartGeometry";
import type { GraficosState, GraficosRefs, GraficosActions } from "../_hooks/useGraficosData";
import { useChartEntrance } from "../_hooks/useChartEntrance";
import { CabecalhoDoGrafico } from "./CabecalhoDoGrafico";

type Props = {
  state: GraficosState;
  refs: GraficosRefs;
  actions: GraficosActions;
};

export function AccuracyChart({ state, refs, actions }: Props) {
  const entering = useChartEntrance();
  const {
    weeks,
    volumeXAxisTicks,
    weekIndexByLabel,
    accuracyActiveWeekIndex,
    activeAccuracyWeekWithData,
    activeAccuracyOverlayLabel,
  } = state;

  const accSeries = weeks
    .map((w) => (typeof w.accuracy_pct === "number" && Number.isFinite(w.accuracy_pct) ? w.accuracy_pct : null))
    .filter((v): v is number => v !== null);
  const delta = accSeries.length >= 2 ? Math.round(accSeries[accSeries.length - 1] - accSeries[0]) : null;
  const deltaTone = delta === null || Math.abs(delta) < 1 ? "text-muted" : delta > 0 ? "text-success" : "text-danger";
  const deltaArrow = delta === null || Math.abs(delta) < 1 ? "→" : delta > 0 ? "↑" : "↓";

  return (
    // eslint-disable-next-line react-hooks/refs
    <section ref={refs.accuracySectionRef}
      data-testid="chart-weekly-accuracy"
      className="space-y-3"
    >
      {/* Era "Evolução de Acerto Geral", em versal de manchete de relatório. O
          nome é o que a gaveta da Evolução já reservou para este gráfico —
          duas telas a chamar a mesma coisa pelo mesmo nome. */}
      <CabecalhoDoGrafico titulo="Acerto ao longo do tempo" medida="acerto por semana" />
      {/* eslint-disable-next-line react-hooks/refs */}
      <div ref={refs.accuracyFrameRef} className="relative overflow-visible">
        {delta !== null && (
          <span
            className={`pointer-events-none absolute z-20 font-mono text-micro tabular-nums ${deltaTone}`}
            // Ancorado a DIREITA. Encostado na esquerda ele caia exatamente
            // sobre o tick "100%" do eixo — dois numeros colados que se leem
            // como um so. A direita a area esta sempre livre: a serie de acerto
            // nunca encosta no topo do grafico.
            style={{ right: 4, top: 2 }}
          >
            {deltaArrow} {delta > 0 ? "+" : ""}{delta} pp
          </span>
        )}
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={weeks} margin={WEEKLY_CHART_MARGIN}>
            {/* O degradê saiu: área com desvanecimento é o oposto do traço
                chapado. Virou hachura de 1px — diz "abaixo da linha" sem simular
                profundidade, e sobrevive à impressão em tinta. */}
            <defs>
              <pattern id="accuracyFill" width="4" height="4" patternUnits="userSpaceOnUse">
                <path d="M0 4L4 0" stroke={CHART_INK} strokeWidth={0.5} strokeOpacity={0.4} />
              </pattern>
            </defs>
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
            <YAxis domain={[0, 100]} tick={CHART_TICK} unit="%" width={CHART_Y_AXIS_WIDTH} />
            <ReferenceArea
              y1={60}
              y2={75}
              fill="var(--color-primary)"
              fillOpacity={0.06}
              stroke="none"
              label={{ value: "referência", position: "insideLeft", ...CHART_SVG_LABEL }}
            />
            {activeAccuracyWeekWithData && (
              <ReferenceLine x={activeAccuracyWeekWithData.week_label} stroke={CHART_INK} strokeOpacity={0.28} />
            )}
            <Area
              // Reta, não suavizada. `monotone` desenha uma curva que INVENTA
              // valores entre as semanas medidas — num gráfico de acurácia isso
              // é leitura errada, não acabamento.
              type="linear"
              dataKey="accuracy_pct"
              stroke={CHART_INK}
              strokeWidth={1}
              strokeLinecap="butt"
              fill="url(#accuracyFill)"
              connectNulls={false}
              isAnimationActive={entering}
              animationDuration={700}
              animationEasing="ease-out"
              dot={(props: any) => {
                const payload = props.payload;
                if (!payload || payload.accuracy_pct === null || Number(payload.total ?? 0) <= 0) return null;
                const isActive = props.index === accuracyActiveWeekIndex;
                if (!isActive) {
                  return (
                    <rect
                      x={props.cx - 1.5}
                      y={props.cy - 1.5}
                      width={3}
                      height={3}
                      fill={CHART_INK}
                      stroke="none"
                    />
                  );
                }
                return (
                  <g>
                    {/* Ponto ativo = alvo quadrado: moldura vazada de 1px em
                        volta do pixel cheio. O halo com alpha que estava aqui
                        era brilho, e brilho e a linguagem do grafico moderno. */}
                    <rect
                      x={props.cx - 4.5}
                      y={props.cy - 4.5}
                      width={9}
                      height={9}
                      fill="none"
                      stroke={CHART_INK}
                      strokeWidth={1}
                    />
                    <rect
                      x={props.cx - 2.5}
                      y={props.cy - 2.5}
                      width={5}
                      height={5}
                      fill={CHART_INK}
                      stroke="none"
                    />
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
            className="pointer-events-none absolute z-20 whitespace-nowrap font-mono text-micro leading-none tabular-nums text-ink"
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
