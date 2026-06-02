"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type {
  DirectedStudyListItem,
  OperationalTurboAreaStats,
  ReviewTask,
  StudyPerformanceSummary,
} from "@/lib/api";
import { AREA_BG_CLASS, AREA_TEXT_CLASS } from "@/lib/areaColors";
import {
  AREA_LABELS,
  AREAS,
  DIAG_MIN_THEME_QUESTIONS,
  DIAG_MIN_TOTAL_QUESTIONS,
  filterStudies,
  filterTasks,
} from "../../desempenho/_lib/perfilAnalytics";
import { Area, Period } from "../../desempenho/_lib/perfilShared";
import { useEstatisticasPageState } from "../_hooks/useEstatisticasPageState";
import { GraficosSection } from "../graficos/GraficosSection";

type TrendDirection = "up" | "flat" | "down";

type StaleThemeItem = {
  key: string;
  area: string;
  theme: string;
  lastContact: string;
  daysWithoutContact: number;
};

function toLocalDateISO(value: string | null | undefined): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
}

function todayLocalISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function dayDiff(todayIso: string, targetIso: string): number {
  if (!targetIso) return 10_000;
  const today = new Date(`${todayIso}T00:00:00`);
  const target = new Date(`${targetIso}T00:00:00`);
  if (Number.isNaN(today.getTime()) || Number.isNaN(target.getTime())) return 10_000;
  return Math.floor((today.getTime() - target.getTime()) / 86_400_000);
}

function compareTrend(
  recent: number | null,
  previous: number | null,
  toleranceRatio: number = 0.08,
): TrendDirection {
  if (recent === null || previous === null) return "flat";
  if (Math.abs(previous) < 1e-6) {
    if (recent > 0) return "up";
    return "flat";
  }
  const deltaRatio = (recent - previous) / Math.abs(previous);
  if (deltaRatio > toleranceRatio) return "up";
  if (deltaRatio < -toleranceRatio) return "down";
  return "flat";
}

function trendLabel(trend: TrendDirection): string {
  if (trend === "up") return "melhora";
  if (trend === "down") return "queda";
  return "estável";
}

function trendArrow(trend: TrendDirection): string {
  if (trend === "up") return "↑";
  if (trend === "down") return "↓";
  return "→";
}

function trendArrowClass(trend: TrendDirection): string {
  if (trend === "up") return "text-green-600";
  if (trend === "down") return "text-red-600";
  return "text-muted";
}

const HEALTH_STATUS_COLOR: Record<string, string> = {
  Boa: "text-emerald-600 dark:text-emerald-400",
  "Atenção": "text-amber-600 dark:text-amber-400",
  "Crítica": "text-red-600 dark:text-red-400",
};

function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${Math.round(value)}%`;
}

function RelatorioParagraph({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted leading-relaxed">{children}</p>;
}

function SectionCard({
  title,
  children,
  emphasized = false,
  noBreak = false,
  testId,
}: {
  title: string;
  children: React.ReactNode;
  emphasized?: boolean;
  noBreak?: boolean;
  testId?: string;
}) {
  return (
    <section
      data-testid={testId}
      data-no-break={noBreak || undefined}
      className={`space-y-3 rounded-2xl border border-edge px-4 py-4${emphasized ? " shadow-sm" : ""}`}
    >
      <h2 className="text-center text-xs font-bold uppercase tracking-[0.14em] text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

function RelatorioSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-[1.75rem_1fr_1.75rem] items-center gap-2">
        <div className="h-5 w-5 rounded-sm bg-edge" />
        <div className="mx-auto h-3 w-20 rounded-sm bg-edge" />
        <div className="ml-auto h-5 w-5 rounded-sm bg-edge" />
      </div>
      {Array.from({ length: 5 }).map((_, idx) => (
        <div key={`relatorio-skeleton-${idx}`} className="space-y-2 rounded-2xl border border-edge p-4">
          <div className="h-3 w-28 rounded-sm bg-edge" />
          <div className="h-2.5 w-full rounded-sm bg-edge" />
          <div className="h-2.5 w-5/6 rounded-sm bg-edge" />
          <div className="h-2.5 w-2/3 rounded-sm bg-edge" />
        </div>
      ))}
    </div>
  );
}

export type RelatorioBodyProps = {
  pending: ReviewTask[];
  done: ReviewTask[];
  studies: DirectedStudyListItem[];
  performanceSummary: StudyPerformanceSummary | null;
  weeklyGoal: number;
  turboAreaStats: OperationalTurboAreaStats | null;
};

export function RelatorioBody({
  pending,
  done,
  studies,
  performanceSummary,
  weeklyGoal,
  turboAreaStats,
}: RelatorioBodyProps) {
  const [expandedDiagItems, setExpandedDiagItems] = useState<Set<string>>(new Set());
  const [showAllStaleThemes, setShowAllStaleThemes] = useState(false);

  function toggleDiagItem(key: string) {
    setExpandedDiagItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function buildSnapshot(targetPeriod: Period) {
    const doneTasks = filterTasks(done, targetPeriod);
    const periodStudies = filterStudies(studies, targetPeriod);
    const periodDoneTaskIds = new Set(doneTasks.map((task) => task.task_id));
    const countableStudies = periodStudies.filter(
      (study) =>
        !study.is_review ||
        !study.origin_review_task_id ||
        periodDoneTaskIds.has(study.origin_review_task_id),
    );
    const topicStudies = countableStudies.filter((study) => study.study_kind !== "full_exam");
    return { countableStudies, topicStudies };
  }

  const areaThemeSummaries = useMemo(() => {
    const areaSummariesByArea = new Map(
      (performanceSummary?.area_summaries ?? []).map((summary) => [summary.area, summary]),
    );
    return Object.fromEntries(
      AREAS.map((area) => [
        area,
        areaSummariesByArea.get(area) ?? {
          area,
          area_accuracy_pct: null,
          total_questions: 0,
          themes: [],
        },
      ]),
    ) as Record<Area, StudyPerformanceSummary["area_summaries"][number]>;
  }, [performanceSummary]);

  const diagnosis: StudyPerformanceSummary["diagnosis"] = useMemo(
    () =>
      performanceSummary?.diagnosis ?? {
        ready: false,
        reason: "insufficient_total",
        total_questions: 0,
        min_theme_questions: DIAG_MIN_THEME_QUESTIONS,
        strengths: [],
        weaknesses: [],
      },
    [performanceSummary],
  );

  const todayIso = useMemo(() => todayLocalISO(), []);
  const weeklySnapshot = useMemo(() => buildSnapshot("semanal"), [studies, done]); // eslint-disable-line react-hooks/exhaustive-deps, react-hooks/preserve-manual-memoization
  const weekDoneQuestions = weeklySnapshot.countableStudies.reduce(
    (sum, study) => sum + Math.max(0, Number(study.total_questions ?? 0)),
    0,
  );
  const weekProgressRemaining = Math.max(0, weeklyGoal - weekDoneQuestions);

  const allTopicStudies = useMemo(
    () => studies.filter((study) => study.study_kind !== "full_exam"),
    [studies],
  );
  const reviewTopicStudies = useMemo(
    () => allTopicStudies.filter((study) => Boolean(study.is_review)),
    [allTopicStudies],
  );

  function windowTotals(
    entries: Array<Pick<DirectedStudyListItem, "performed_at" | "total_questions" | "correct_questions">>,
    startDayInclusive: number,
    endDayExclusive: number,
  ): { total: number; correct: number; activeDays: number } {
    let total = 0;
    let correct = 0;
    const activeDays = new Set<string>();
    for (const entry of entries) {
      const day = toLocalDateISO(entry.performed_at);
      const diff = dayDiff(todayIso, day);
      if (diff < startDayInclusive || diff >= endDayExclusive) continue;
      const totalQuestions = Math.max(0, Number(entry.total_questions ?? 0));
      total += totalQuestions;
      correct += Math.max(0, Number(entry.correct_questions ?? 0));
      if (totalQuestions > 0) activeDays.add(day);
    }
    return { total, correct, activeDays: activeDays.size };
  }

  const topicRecent = windowTotals(allTopicStudies, 0, 14);
  const topicPrevious = windowTotals(allTopicStudies, 14, 28);
  const reviewRecent = windowTotals(reviewTopicStudies, 0, 14);
  const reviewPrevious = windowTotals(reviewTopicStudies, 14, 28);

  const retentionRecent =
    reviewRecent.total > 0 ? Math.round((reviewRecent.correct / reviewRecent.total) * 100) : null;
  const retentionPrevious =
    reviewPrevious.total > 0 ? Math.round((reviewPrevious.correct / reviewPrevious.total) * 100) : null;
  const retentionDelta =
    retentionRecent !== null && retentionPrevious !== null ? retentionRecent - retentionPrevious : null;
  const retentionTrend = compareTrend(retentionRecent, retentionPrevious, 0.04);
  const retentionDeltaClass =
    retentionDelta === null || retentionDelta === 0
      ? "text-muted"
      : retentionDelta > 0
        ? "text-green-600"
        : "text-red-600";

  const volumeTrend = compareTrend(topicRecent.total, topicPrevious.total, 0.12);
  const accuracyRecent = topicRecent.total > 0 ? (topicRecent.correct / topicRecent.total) * 100 : null;
  const accuracyPrevious = topicPrevious.total > 0 ? (topicPrevious.correct / topicPrevious.total) * 100 : null;
  const accuracyTrend = compareTrend(accuracyRecent, accuracyPrevious, 0.04);
  const consistencyTrend = compareTrend(topicRecent.activeDays, topicPrevious.activeDays, 0.12);

  const backlogCount = pending.length;
  const overdueCount = pending.filter((task) => task.is_overdue).length;

  const staleThemes = useMemo((): StaleThemeItem[] => {
    const lastContactByTheme = new Map<string, { area: string; theme: string; lastContact: string }>();
    for (const study of allTopicStudies) {
      const day = toLocalDateISO(study.performed_at);
      if (!day) continue;
      const key = `${study.area}::${study.theme}`;
      const previous = lastContactByTheme.get(key);
      if (!previous || previous.lastContact < day) {
        lastContactByTheme.set(key, { area: study.area, theme: study.theme, lastContact: day });
      }
    }
    return Array.from(lastContactByTheme.entries())
      .map(([key, value]) => ({
        key,
        area: value.area,
        theme: value.theme,
        lastContact: value.lastContact,
        daysWithoutContact: dayDiff(todayIso, value.lastContact),
      }))
      .filter((item) => item.daysWithoutContact >= 8)
      .sort(
        (a, b) =>
          b.daysWithoutContact - a.daysWithoutContact ||
          a.area.localeCompare(b.area, "pt-BR") ||
          a.theme.localeCompare(b.theme, "pt-BR"),
      );
  }, [allTopicStudies, todayIso]);

  const staleThemesCount = staleThemes.length;
  const visibleStaleThemes = showAllStaleThemes ? staleThemes : staleThemes.slice(0, 8);

  let healthStatus = "Boa";
  let healthText = "Volume estável e sem sinais fortes de acumulação.";
  if (backlogCount >= 60 || overdueCount >= 20) {
    healthStatus = "Crítica";
    healthText = `Acúmulo alto (${overdueCount} atrasadas, ${staleThemesCount} temas sem contato).`;
  } else if (backlogCount >= 30 || overdueCount >= 8 || staleThemesCount >= 5) {
    healthStatus = "Atenção";
    healthText = `${overdueCount} revisões atrasadas e ${staleThemesCount} temas sem contato há mais de 7 dias.`;
  }

  let trendText = "Você manteve ritmo equilibrado nas últimas semanas.";
  if (volumeTrend !== "down" && consistencyTrend === "down") {
    trendText = "Produção mantida, mas concentrada em poucos dias. Distribua melhor na semana.";
  } else if (volumeTrend === "down") {
    trendText = `Volume caiu nas últimas 2 semanas.${weekProgressRemaining > 0 ? ` Faltam cerca de ${weekProgressRemaining} questões para a meta semanal.` : ""}`;
  } else if (accuracyTrend === "up" && retentionTrend === "up") {
    trendText = "Desempenho e retenção melhoraram no período recente.";
  } else if (overdueCount > 0) {
    trendText = `Ritmo estável, mas ${overdueCount} revisões atrasadas podem pesar.`;
  }

  const { hasPreliminaryDiagnosis, preliminaryStrengths, preliminaryWeaknesses } = useMemo(() => {
    const sorted = AREAS
      .map((area) => ({
        area,
        label: AREA_LABELS[area] ?? area,
        accuracy: areaThemeSummaries[area].area_accuracy_pct,
        total: areaThemeSummaries[area].total_questions,
      }))
      .filter((item) => item.total >= 5 && item.accuracy !== null)
      .sort((a, b) => (b.accuracy ?? -1) - (a.accuracy ?? -1));
    const strongCount = Math.min(2, Math.ceil(sorted.length / 2));
    const strengths = sorted.slice(0, strongCount);
    const usedAreas = new Set(strengths.map((item) => item.area));
    const weaknesses = [...sorted].reverse().filter((item) => !usedAreas.has(item.area)).slice(0, 2);
    return {
      hasPreliminaryDiagnosis: sorted.length >= 2,
      preliminaryStrengths: strengths,
      preliminaryWeaknesses: weaknesses,
    };
  }, [areaThemeSummaries]);

  return (
    <div className="space-y-4 pt-4 pb-6 print:space-y-3 print:pt-2 print:pb-2">
      <SectionCard
        title="Diagnóstico"
        emphasized
        testId="relatorio-section-diagnostico"
      >
        {!diagnosis.ready && (
          <div className="space-y-3">
            <div className="rounded-xl border border-edge bg-paper/70 p-3">
              <RelatorioParagraph>
                {diagnosis.reason === "insufficient_total"
                  ? `Diagnóstico disponível a partir de ${DIAG_MIN_TOTAL_QUESTIONS} questões no total. Você tem ${diagnosis.total_questions} registradas.`
                  : `Você já tem ${diagnosis.total_questions} questões registradas. O diagnóstico por tema ativa quando ao menos 2 temas atingem ${diagnosis.min_theme_questions} questões individualmente.`}
              </RelatorioParagraph>
            </div>

            {hasPreliminaryDiagnosis && (
              <div className="space-y-3">
                <RelatorioParagraph>
                  {diagnosis.reason === "insufficient_total"
                    ? `Diagnóstico por área — análise preliminar com os dados disponíveis. O diagnóstico por tema ativa com ${DIAG_MIN_TOTAL_QUESTIONS} questões no total.`
                    : `Diagnóstico por área — maiores e menores médias por grande área. Ao concentrar questões nos temas principais, o diagnóstico por tema ativa automaticamente.`}
                </RelatorioParagraph>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2 rounded-xl border border-edge border-l-2 border-l-emerald-600/40 bg-paper/70 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">Pontos fortes</p>
                    <ul className="space-y-1.5">
                      {preliminaryStrengths.map((item) => (
                        <li key={`pstrong-${item.area}`} className="border-b border-edge pb-1.5 last:border-b-0">
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="text-xs text-muted">
                            {formatPct(item.accuracy)} de acerto · {item.total} questões
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-2 rounded-xl border border-edge border-l-2 border-l-red-600/40 bg-paper/70 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">Pontos fracos</p>
                    <ul className="space-y-1.5">
                      {preliminaryWeaknesses.map((item) => (
                        <li key={`pweak-${item.area}`} className="border-b border-edge pb-1.5 last:border-b-0">
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="text-xs text-muted">
                            {formatPct(item.accuracy)} de acerto · {item.total} questões
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {diagnosis.ready && (
          <div className="space-y-3">
            <RelatorioParagraph>
              Diagnóstico ativo com filtro de robustez por tema.
            </RelatorioParagraph>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2 rounded-sm border border-emerald-700/40 bg-emerald-50/50 p-3 dark:border-emerald-600/40 dark:bg-emerald-950/20">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">Pontos fortes</p>
                <ul className="space-y-3">
                  {diagnosis.strengths.length === 0 && (
                    <li className="text-xs text-muted">Nenhum ponto forte identificado ainda.</li>
                  )}
                  {diagnosis.strengths.map((item) => {
                    const rowKey = `strong-${item.key}`;
                    return (
                      <li key={rowKey} className="space-y-1 border-b border-edge pb-3 last:border-b-0">
                        <p className="text-sm font-medium">
                          {(AREA_LABELS[item.area as Area] ?? item.area)} · {item.theme}
                        </p>
                        <p className="text-xs text-muted">
                          {item.dominant_signal ?? "Desempenho forte e estável."}
                        </p>
                        <p className="text-xs text-muted">
                          → {item.action_hint ?? "Manter revisão espaçada."}
                        </p>
                        <button
                          type="button"
                          onClick={() => toggleDiagItem(rowKey)}
                          className="text-xs underline underline-offset-2 print:hidden"
                        >
                          {expandedDiagItems.has(rowKey) ? "ocultar dados" : "ver dados"}
                        </button>
                        <div className={`space-y-0.5 border-l border-edge pl-2 text-xs text-muted${expandedDiagItems.has(rowKey) ? "" : " hidden print:block"}`}>
                            <p>
                              Acerto {formatPct(item.accuracy_pct)} · Retenção {formatPct(item.retention_pct)} · Estabilidade {formatPct(item.consistency_pct)}
                            </p>
                            <p>
                              Tendência {trendArrow((item.trend ?? "flat") as TrendDirection)} {trendLabel((item.trend ?? "flat") as TrendDirection)} · {item.total_questions} questões
                            </p>
                          </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="space-y-2 rounded-sm border border-red-700/40 bg-red-50/50 p-3 dark:border-red-600/40 dark:bg-red-950/20">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-800 dark:text-red-300">Pontos fracos</p>
                <ul className="space-y-3">
                  {diagnosis.weaknesses.length === 0 && (
                    <li className="text-xs text-muted">Nenhum ponto fraco identificado ainda.</li>
                  )}
                  {diagnosis.weaknesses.map((item) => {
                    const rowKey = `weak-${item.key}`;
                    return (
                      <li key={rowKey} className="space-y-1 border-b border-edge pb-3 last:border-b-0">
                        <p className="text-sm font-medium">
                          {(AREA_LABELS[item.area as Area] ?? item.area)} · {item.theme}
                        </p>
                        <p className="text-xs text-muted">
                          {item.dominant_signal ?? "Fraqueza recorrente com prioridade de intervenção."}
                        </p>
                        <p className="text-xs text-muted">
                          → {item.action_hint ?? "Reforçar fundamentos e revisar erros recentes."}
                        </p>
                        <button
                          type="button"
                          onClick={() => toggleDiagItem(rowKey)}
                          className="text-xs underline underline-offset-2 print:hidden"
                        >
                          {expandedDiagItems.has(rowKey) ? "ocultar dados" : "ver dados"}
                        </button>
                        <div className={`space-y-0.5 border-l border-edge pl-2 text-xs text-muted${expandedDiagItems.has(rowKey) ? "" : " hidden print:block"}`}>
                            <p>
                              Acerto {formatPct(item.accuracy_pct)} · Retenção {formatPct(item.retention_pct)} · Estabilidade {formatPct(item.consistency_pct)}
                            </p>
                            <p>
                              Tendência {trendArrow((item.trend ?? "flat") as TrendDirection)} {trendLabel((item.trend ?? "flat") as TrendDirection)} · {item.total_questions} questões
                            </p>
                          </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Retenção" noBreak testId="relatorio-section-retencao">
        <p className="text-xs text-muted">Mede quanto você lembra nas revisões.</p>
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-semibold tabular-nums">
            {retentionRecent === null ? "—" : `${retentionRecent}%`}
          </span>
          {retentionDelta !== null && (
            <span className={`text-sm font-medium ${retentionDeltaClass}`}>
              {retentionDelta > 0 ? "+" : ""}{retentionDelta}pp
            </span>
          )}
          <span className="text-xs text-muted">últ. 2 semanas</span>
        </div>
        <RelatorioParagraph>
          {retentionRecent === null
            ? "Dados insuficientes para leitura de memória recente."
            : retentionRecent >= 70
              ? "Boa retenção no período recente, com espaço para manter reforços de baixa frequência."
              : "Retenção abaixo do ideal. Priorize revisões dos temas menos frequentes."}
        </RelatorioParagraph>
      </SectionCard>

      {turboAreaStats && turboAreaStats.total_reviews > 0 && (() => {
        const cardRows = (turboAreaStats.by_area ?? [])
          .filter((item) => item.reviews_total > 0)
          .sort((a, b) => b.reviews_total - a.reviews_total)
          .map((item) => ({
            area: item.area,
            reviewsTotal: item.reviews_total,
            accuracyPct: Math.round((item.reviews_correct / item.reviews_total) * 100),
            volumePct: Math.round((item.reviews_total / (turboAreaStats.total_reviews || 1)) * 100),
          }));
        return (
          <SectionCard title="Cards" noBreak testId="relatorio-section-cards">
            <div className="grid grid-cols-3 divide-x divide-edge py-1 text-center">
              <div className="px-2">
                <p className="text-xl font-semibold tabular-nums">{turboAreaStats.total_reviews}</p>
                <p className="text-xs text-muted">revisões</p>
              </div>
              <div className="px-2">
                <p className="text-xl font-semibold tabular-nums">{turboAreaStats.total_notes}</p>
                <p className="text-xs text-muted">cards</p>
              </div>
              <div className="px-2">
                <p className="text-xl font-semibold tabular-nums">
                  {Math.round((turboAreaStats.total_correct / turboAreaStats.total_reviews) * 100)}%
                </p>
                <p className="text-xs text-muted">acerto</p>
              </div>
            </div>
            <div className="space-y-2 pt-1">
              {cardRows.map((item) => (
                <div key={item.area} className="flex items-center gap-2 text-xs">
                  <span className={`w-8 shrink-0 font-semibold ${AREA_TEXT_CLASS[item.area] ?? "text-ink"}`}>
                    {item.area}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-edge">
                    <div
                      className={`h-full rounded-full ${AREA_BG_CLASS[item.area] ?? "bg-edge"}`}
                      style={{ width: `${item.volumePct}%` }}
                    />
                  </div>
                  <span className="w-28 shrink-0 text-right text-muted tabular-nums">
                    {item.reviewsTotal} rev. · {item.accuracyPct}%
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>
        );
      })()}

      <SectionCard
        title="Tendência Recente"
        noBreak
        testId="relatorio-section-tendencia"
      >
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
          <p className="text-sm">
            Volume: <span className={trendArrowClass(volumeTrend)}>{trendArrow(volumeTrend)}</span>{" "}
            <span className="text-muted">{trendLabel(volumeTrend)}</span>
          </p>
          <p className="text-sm">
            Acerto: <span className={trendArrowClass(accuracyTrend)}>{trendArrow(accuracyTrend)}</span>{" "}
            <span className="text-muted">{trendLabel(accuracyTrend)}</span>
          </p>
          <p className="text-sm">
            Retenção: <span className={trendArrowClass(retentionTrend)}>{trendArrow(retentionTrend)}</span>{" "}
            <span className="text-muted">{trendLabel(retentionTrend)}</span>
          </p>
          <p className="text-sm">
            Regularidade: <span className={trendArrowClass(consistencyTrend)}>{trendArrow(consistencyTrend)}</span>{" "}
            <span className="text-muted">{trendLabel(consistencyTrend)}</span>
          </p>
        </div>
        <RelatorioParagraph>
          Regularidade mede em quantos dias você distribuiu o estudo recentemente.
        </RelatorioParagraph>
        <RelatorioParagraph>{trendText}</RelatorioParagraph>
      </SectionCard>

      <SectionCard
        title="Saúde Do Estudo"
        testId="relatorio-section-saude"
      >
        <div className="space-y-2">
          <p className="text-sm">
            Status:{" "}
            <span className={`font-medium ${HEALTH_STATUS_COLOR[healthStatus] ?? "text-muted"}`}>
              {healthStatus}
            </span>
          </p>
          <div className="grid grid-cols-3 divide-x divide-edge py-1 text-center">
            <div className="px-2">
              <p className="text-xl font-semibold tabular-nums">{backlogCount}</p>
              <p className="text-xs text-muted">pendentes</p>
            </div>
            <div className="px-2">
              <p className={`text-xl font-semibold tabular-nums ${overdueCount > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}>{overdueCount}</p>
              <p className="text-xs text-muted">atrasadas</p>
            </div>
            <div className="px-2">
              <p className="text-xl font-semibold tabular-nums">{staleThemesCount}</p>
              <p className="text-xs text-muted">sem contato</p>
            </div>
          </div>
        </div>
        <RelatorioParagraph>{healthText}</RelatorioParagraph>

        {staleThemesCount > 0 && (
          <div className="space-y-2 rounded-xl border border-edge bg-paper/70 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Temas sem contato
              </p>
              <button
                type="button"
                onClick={() => setShowAllStaleThemes((prev) => !prev)}
                className="text-xs underline underline-offset-2 print:hidden"
              >
                {showAllStaleThemes ? "Ocultar temas" : `Ver temas (${staleThemesCount})`}
              </button>
            </div>
            {!showAllStaleThemes && staleThemesCount > visibleStaleThemes.length && (
              <p className="text-xs text-muted">
                Mostrando {visibleStaleThemes.length} de {staleThemesCount} temas.
              </p>
            )}
            <ul className="space-y-1.5">
                {visibleStaleThemes.map((item) => (
                  <li
                    key={item.key}
                    data-testid="relatorio-stale-theme-row"
                    className="flex items-start justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {(AREA_LABELS[item.area as Area] ?? item.area)} · {item.theme}
                      </p>
                      <p className="text-muted">Último contato: {item.lastContact}</p>
                    </div>
                    <span className="shrink-0 font-medium text-ink">{item.daysWithoutContact}d</span>
                  </li>
                ))}
              </ul>
          </div>
        )}
      </SectionCard>

    </div>
  );
}

export default function RelatorioClientPage() {
  const {
    pending,
    done,
    studies,
    performanceSummary,
    turboAreaStats,
    displayName,
    loading,
    error,
    weeklyGoal,
  } = useEstatisticasPageState();

  if (loading) return <RelatorioSkeleton />;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div className="space-y-0">
      <div className="grid grid-cols-[1.75rem_1fr_1.75rem] items-center gap-2 print:hidden">
        <div className="flex justify-start">
          <span className="block h-7 w-7" aria-hidden="true" />
        </div>
        <div className="flex justify-center">
          <h1 className="text-[10px] font-semibold uppercase leading-none tracking-[0.08em] text-ink">
            RELATÓRIOS
          </h1>
        </div>
        <div className="flex justify-end">
          <Link
            href="/dados-e-relatorios"
            className="shrink-0 p-1 -mr-1 flex items-center justify-end text-muted hover:text-ink"
            aria-label="Voltar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
        </div>
      </div>

      <div className="hidden print:block mb-5 border-b border-edge pb-4">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/kroslogo-menu.png" alt="" aria-hidden="true" className="w-5 h-5 shrink-0" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
            Relatório de Progresso
          </p>
        </div>
        <div className="mt-1.5 flex items-baseline gap-2">
          {displayName && <p className="text-sm font-semibold text-ink">{displayName}</p>}
          <p className="text-xs text-muted">Gerado em {new Date().toLocaleDateString("pt-BR")}</p>
        </div>
      </div>

      <div className="flex justify-end pt-2 print:hidden">
        <button
          type="button"
          onClick={() => {
              const prev = document.title;
              document.title = displayName ? ` ${displayName}` : "Relatório de Progresso";
              requestAnimationFrame(() => {
                window.print();
                document.title = prev;
              });
            }}
          className="text-xs text-muted underline underline-offset-2 hover:text-ink"
        >
          Exportar PDF para mentor
        </button>
      </div>

      <RelatorioBody
        pending={pending}
        done={done}
        studies={studies}
        performanceSummary={performanceSummary}
        weeklyGoal={weeklyGoal}
        turboAreaStats={turboAreaStats}
      />

      <div className="print:pt-2 print:pb-2" data-print-charts>
        <h2 className="text-center text-xs font-bold uppercase tracking-[0.14em] text-ink mb-4">
          Gráficos
        </h2>
        <GraficosSection />
      </div>
    </div>
  );
}
