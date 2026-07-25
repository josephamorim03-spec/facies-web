import type { Area as AreaKey } from "@/app/desempenho/_lib/perfilShared";
import type { QuestionBankTopic } from "@/lib/api";
import { getChartAreaColor, getChartAreaLabel } from "./chartInsights.ts";

// Matriz prioridade × desempenho (nível grande área): X = acerto, Y = incidência
// (prioridade editorial agregada do catálogo), tamanho da bolha = volume resolvido.

export type MatrixQuadrant = "priorizar" | "reforcar" | "manter" | "consolidar";

export type PriorityMatrixRow = {
  area: AreaKey;
  label: string;
  color: string;
  accuracyPct: number; // eixo X, 0..100
  volume: number; // tamanho da bolha
  incidenceScore: number; // eixo Y, 0..1 (min-max entre as áreas plotadas)
};

export const QUADRANT_LABELS: Record<MatrixQuadrant, string> = {
  priorizar: "Priorizar",
  reforcar: "Reforçar",
  manter: "Manter",
  consolidar: "Consolidar",
};

// Incidência bruta por área a partir dos tópicos do catálogo. Preferimos a
// "demanda da banca" (editorial) ponderada por volume de questões; caímos para
// aparições em prova (board_frequency) e, por fim, cobertura do catálogo.
export function rawAreaIncidence(topics: QuestionBankTopic[]): number {
  let weightedDemand = 0;
  let demandWeight = 0;
  let boardFreqSum = 0;
  let questionSum = 0;
  for (const topic of topics) {
    const questionCount = Math.max(0, Number(topic.question_count ?? 0));
    questionSum += questionCount;
    const demand = Number(topic.bank_demand_score ?? 0);
    if (Number.isFinite(demand) && demand > 0) {
      const weight = Math.max(1, questionCount);
      weightedDemand += demand * weight;
      demandWeight += weight;
    }
    for (const value of Object.values(topic.board_frequency ?? {})) {
      boardFreqSum += Number(value) || 0;
    }
  }
  if (demandWeight > 0) return weightedDemand / demandWeight;
  if (boardFreqSum > 0) return boardFreqSum;
  return questionSum;
}

export function buildPriorityMatrixRows(input: {
  areaSummaries: Array<{ area: AreaKey; accuracyPct: number | null; volume: number }>;
  rawIncidenceByArea: Partial<Record<AreaKey, number>>;
}): PriorityMatrixRow[] {
  const { areaSummaries, rawIncidenceByArea } = input;
  const usable = areaSummaries.filter(
    (summary) =>
      summary.accuracyPct !== null &&
      Number.isFinite(summary.accuracyPct) &&
      summary.volume > 0,
  );
  const maxRaw = usable.reduce(
    (max, summary) => Math.max(max, rawIncidenceByArea[summary.area] ?? 0),
    0,
  );
  return usable.map((summary) => {
    const raw = rawIncidenceByArea[summary.area] ?? 0;
    return {
      area: summary.area,
      label: getChartAreaLabel(summary.area),
      color: getChartAreaColor(summary.area),
      accuracyPct: Math.round(summary.accuracyPct as number),
      volume: summary.volume,
      incidenceScore: maxRaw > 0 ? raw / maxRaw : 0,
    };
  });
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// X: 50% de acerto (âncora interpretável). Y: mediana da incidência plotada
// (a incidência é relativa/normalizada, então a mediana divide melhor que um fixo).
export function computeMatrixMidlines(rows: PriorityMatrixRow[]): {
  accuracyMid: number;
  incidenceMid: number;
} {
  return {
    accuracyMid: 50,
    incidenceMid: rows.length > 0 ? median(rows.map((row) => row.incidenceScore)) : 0.5,
  };
}

export function assignQuadrant(
  row: PriorityMatrixRow,
  mid: { accuracyMid: number; incidenceMid: number },
): MatrixQuadrant {
  const lowAccuracy = row.accuracyPct < mid.accuracyMid;
  const highIncidence = row.incidenceScore >= mid.incidenceMid;
  if (lowAccuracy && highIncidence) return "priorizar";
  if (!lowAccuracy && highIncidence) return "manter";
  if (lowAccuracy && !highIncidence) return "reforcar";
  return "consolidar";
}
