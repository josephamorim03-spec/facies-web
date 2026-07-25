import { AREA_FULL_LABELS, AREA_HEX } from "../../../../lib/areaIdentity.ts";
import type { Area as AreaKey } from "../../../desempenho/_lib/perfilShared.ts";

export const CHART_AREA_COLORS: Record<AreaKey, string> = {
  GO: AREA_HEX.GO,
  PD: AREA_HEX.PD,
  MP: AREA_HEX.MP,
  CG: AREA_HEX.CG,
  CM: AREA_HEX.CM,
  OU: AREA_HEX.OU,
};

export const CHART_AREA_LABELS: Record<AreaKey, string> = {
  GO: AREA_FULL_LABELS.GO,
  PD: AREA_FULL_LABELS.PD,
  MP: AREA_FULL_LABELS.MP,
  CG: AREA_FULL_LABELS.CG,
  CM: AREA_FULL_LABELS.CM,
  OU: AREA_FULL_LABELS.OU,
};

export type ChartTakeaway = {
  title: string;
  message: string;
  deltaLabel: string;
  tone: "neutral" | "positive" | "attention";
};

type ChartWeek = {
  week_label: string;
  total: number;
  accuracy_pct: number | null;
  areas: Record<string, { total?: number; correct?: number; accuracy_pct?: number | null } | undefined>;
};

export type SelectedWeekBreakdownRow = {
  area: AreaKey;
  label: string;
  color: string;
  count: number;
  sharePct: number;
};

export function getChartAreaColor(area: AreaKey): string {
  return CHART_AREA_COLORS[area];
}

export function getChartAreaLabel(area: AreaKey): string {
  return CHART_AREA_LABELS[area] ?? area;
}

export function formatDeltaPp(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "sem delta";
  if (Math.abs(value) < 0.5) return "estavel";
  const rounded = Math.round(Math.abs(value));
  return `${value > 0 ? "+" : "-"}${rounded} pp`;
}

function accuracyForWeeks(weeks: ChartWeek[]): number | null {
  const total = weeks.reduce((sum, week) => sum + Math.max(0, Number(week.total ?? 0)), 0);
  if (total <= 0) return null;
  const correct = weeks.reduce((sum, week) => {
    const acc = typeof week.accuracy_pct === "number" ? week.accuracy_pct : null;
    return sum + (acc === null ? 0 : Math.round((Math.max(0, Number(week.total ?? 0)) * acc) / 100));
  }, 0);
  return Math.round((correct / total) * 100);
}

export function buildChartTakeaway(input: { weeks: ChartWeek[] }): ChartTakeaway {
  const weeksWithData = input.weeks.filter((week) => Number(week.total ?? 0) > 0);
  if (weeksWithData.length < 2) {
    return {
      title: "Poucos dados ainda",
      message: "",
      deltaLabel: "dados iniciais",
      tone: "neutral",
    };
  }

  const midpoint = Math.max(1, Math.floor(weeksWithData.length / 2));
  const before = accuracyForWeeks(weeksWithData.slice(0, midpoint));
  const after = accuracyForWeeks(weeksWithData.slice(midpoint));
  if (before === null || after === null) {
    return {
      title: "Dados parciais",
      message: "",
      deltaLabel: "parcial",
      tone: "neutral",
    };
  }

  const delta = after - before;
  const deltaLabel = formatDeltaPp(delta);
  if (delta > 3) {
    return {
      title: "Melhora recente",
      message: "Acerto recente acima da primeira metade do período.",
      deltaLabel,
      tone: "positive",
    };
  }
  if (delta < -3) {
    return {
      title: "Queda recente",
      message: "Acerto recente abaixo da primeira metade do período.",
      deltaLabel,
      tone: "attention",
    };
  }
  return {
    title: "Estável",
    message: "",
    deltaLabel,
    tone: "neutral",
  };
}

export type AreaInsightRow = {
  area: AreaKey;
  label: string;
  color: string;
  recentAccuracyPct: number | null;
  deltaPp: number | null;
  volume: number;
};

// Polaridade (divergente): success ↑ / danger ↓ / muted ~estável. Nunca cor sozinha.
export function deltaTone(value: number | null | undefined): "positive" | "attention" | "neutral" {
  if (value === null || value === undefined || !Number.isFinite(value) || Math.abs(value) < 0.5) {
    return "neutral";
  }
  return value > 0 ? "positive" : "attention";
}

// Lista-resumo por área: acerto recente + delta (delta_by_area) + volume acumulado.
export function buildAreaInsightRows(input: {
  weeks: ChartWeek[];
  deltaByArea: Record<string, number | null>;
  areas: AreaKey[];
}): AreaInsightRow[] {
  const { weeks, deltaByArea, areas } = input;
  return areas.map((area) => {
    let recentAccuracyPct: number | null = null;
    for (let i = weeks.length - 1; i >= 0; i -= 1) {
      const acc = weeks[i]?.areas?.[area]?.accuracy_pct;
      if (acc !== null && acc !== undefined && Number.isFinite(acc)) {
        recentAccuracyPct = Math.round(acc);
        break;
      }
    }
    const volume = weeks.reduce(
      (sum, week) => sum + Math.max(0, Number(week.areas?.[area]?.total ?? 0)),
      0,
    );
    const rawDelta = deltaByArea[area];
    const deltaPp =
      rawDelta === null || rawDelta === undefined || !Number.isFinite(rawDelta) ? null : rawDelta;
    return {
      area,
      label: getChartAreaLabel(area),
      color: getChartAreaColor(area),
      recentAccuracyPct,
      deltaPp,
      volume,
    };
  });
}

export function buildSelectedWeekBreakdown(week: ChartWeek | null): SelectedWeekBreakdownRow[] {
  if (!week || Number(week.total ?? 0) <= 0) return [];
  return (Object.keys(CHART_AREA_COLORS) as AreaKey[])
    .map((area) => {
      const count = Math.max(0, Number(week.areas?.[area]?.total ?? 0));
      return {
        area,
        label: getChartAreaLabel(area),
        color: getChartAreaColor(area),
        count,
        sharePct: Math.round((count / Math.max(1, Number(week.total ?? 0))) * 100),
      };
    })
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);
}
