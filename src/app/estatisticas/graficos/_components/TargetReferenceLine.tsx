import { ReferenceLine } from "recharts";
import { CHART_INK } from "../_lib/chartGeometry";

// O Recharts reconhece linhas de referência pelo TIPO do elemento filho do gráfico,
// então isto é uma factory que devolve um <ReferenceLine> (chamada inline dentro do
// chart) — um componente wrapper não seria detectado pelo gráfico.
// `ifOverflow="extendDomain"` garante que a linha da meta apareça mesmo quando a
// meta é maior que o volume máximo da janela.
export function renderTargetReferenceLine(y: number) {
  return (
    <ReferenceLine
      y={y}
      stroke={CHART_INK}
      strokeOpacity={0.4}
      strokeDasharray="5 4"
      strokeWidth={1.25}
      ifOverflow="extendDomain"
    />
  );
}
