"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { NAV_OPEN_EVENT } from "@/components/Nav";
import AreaDot from "@/components/AreaDot";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Skeleton } from "@/components/Skeleton";
import { getAuthToken } from "@/lib/auth";
import { getErrorMessage } from "@/lib/error-utils";
import { useAuthToken } from "@/lib/useAuthToken";
import { useDesktopNavigationMode } from "@/lib/useDesktopNavigationMode";
import { useToast } from "@/lib/useToast";
import {
  autoRescheduleReviewTask,
  DirectedStudyListItem,
  getOperationalTurboOverview,
  getProfile,
  getStudyPerformanceSummary,
  listDirectedStudies,
  listReviewTasks,
  type OperationalTurboOverview,
  previewAutoRescheduleReviewTask,
  ReviewTask,
  type StudyPerformanceSummary,
} from "@/lib/api";
import { InlineLogForm } from "@/app/cronograma/_components/studyReview/InlineLogForm";
import { IconMenu } from "@/app/cronograma/_components/CronogramaIcons";
import { displayDate } from "@/app/cronograma/_lib/cronogramaShared";
import { buildWeeklyOpsMetrics } from "@/app/cronograma/_lib/weeklyOpsMetrics";
import { WeeklyOpsFullCards, WeeklyOpsFullCardsSkeleton } from "@/app/cronograma/_components/WeeklyOpsCards";
import { writeCronogramaViewModeSession } from "@/app/cronograma/_lib/viewModeSession";

type Area = "GO" | "PD" | "MP" | "CG" | "CM" | "OU";

const AREA_HEX: Record<Area, string> = {
  GO: "#f472b6",
  PD: "#2293cf",
  CG: "#ef4444",
  CM: "#2fc767",
  MP: "#f59e0b",
  OU: "#AEAEA8",
};

type DailyWeaknessItem = {
  key: string;
  area: string;
  theme: string;
  accuracyPct: number | null;
  totalQuestions: number;
  signal: string;
  action: string;
  confidencePct: number | null;
  impactPct: number | null;
  source: "diagnosis" | "preliminary";
};

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getWeekDays(): { iso: string; label: string; dayNum: number }[] {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const labels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];
    return { iso, label: labels[i], dayNum: d.getDate() };
  });
}

function formatDayMonth(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return `${Math.round(Number(value))}%`;
}

function getAreaColor(area: string): string {
  return AREA_HEX[area as Area] ?? AREA_HEX.OU;
}

function buildDailyWeaknessItems(summary: StudyPerformanceSummary | null): DailyWeaknessItem[] {
  if (!summary) return [];

  const diagnosis = summary.diagnosis;
  if (diagnosis?.ready && Array.isArray(diagnosis.weaknesses) && diagnosis.weaknesses.length > 0) {
    return diagnosis.weaknesses.slice(0, 3).map((item) => ({
      key: item.key,
      area: item.area,
      theme: item.theme,
      accuracyPct: item.accuracy_pct,
      totalQuestions: item.total_questions,
      signal: item.dominant_signal || "Tema com perda relevante no histórico.",
      action: item.action_hint || "Faça um bloco curto e revise os erros no mesmo dia.",
      confidencePct: item.system_confidence_pct ?? null,
      impactPct: item.impact_score_pct ?? null,
      source: "diagnosis",
    }));
  }

  const areaSummaries = Array.isArray(summary.area_summaries) ? summary.area_summaries : [];
  return areaSummaries
    .flatMap((areaSummary) =>
      areaSummary.themes
        .filter((theme) => theme.total_questions >= 20)
        .map((theme) => ({
          key: theme.key,
          area: theme.area,
          theme: theme.theme,
          accuracyPct: theme.accuracy_pct,
          totalQuestions: theme.total_questions,
          signal:
            theme.consistency_score !== null && theme.consistency_score < 65
              ? "Tema com desempenho instável nas tentativas."
              : "Menor taxa de acerto entre os temas com amostra.",
          action: "Resolver 15-25 questões e transformar os erros em cards.",
          confidencePct: null,
          impactPct: null,
          source: "preliminary" as const,
        })),
    )
    .sort((a, b) => {
      const accA = a.accuracyPct ?? 101;
      const accB = b.accuracyPct ?? 101;
      if (accA !== accB) return accA - accB;
      return b.totalQuestions - a.totalQuestions;
    })
    .slice(0, 3);
}

function TodaySkeleton() {
  return (
    <div className="space-y-4 md:space-y-6">
      <Skeleton className="h-7 w-20 rounded-sm" />
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }).map((_, idx) => (
          <div key={`week-skeleton-${idx}`} className="flex flex-col items-center gap-1.5">
            <Skeleton className="h-2.5 w-6 rounded-sm" />
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-1.5 w-6 rounded-sm" />
          </div>
        ))}
      </div>
      <WeeklyOpsFullCardsSkeleton />
      <hr />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={`task-skeleton-${idx}`} className="flex items-center gap-3 border-b border-edge py-3 pl-3">
            <Skeleton className="h-4 w-4 rounded-full shrink-0" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-3/5 rounded-sm" />
              <Skeleton className="h-2.5 w-24 rounded-sm" />
            </div>
            <Skeleton className="h-7 w-16 rounded-sm shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

type TodayPageData = {
  pendingData: ReviewTask[];
  doneData: ReviewTask[];
  studyData: DirectedStudyListItem[];
  cardsOverview: OperationalTurboOverview | null;
  performanceSummary: StudyPerformanceSummary | null;
  weeklyGoal: number;
};

async function loadTodayPageData(token: string): Promise<TodayPageData> {
  const turboOverviewRequest = getOperationalTurboOverview(token, { previewLimit: 3 }).catch(() => null);
  const performanceSummaryRequest = getStudyPerformanceSummary(token).catch(() => null);
  const [pendingData, doneData, studyData, profile, cardsOverview, performanceSummary] = await Promise.all([
    listReviewTasks(token, { status: "pending" }),
    listReviewTasks(token, { status: "done" }),
    listDirectedStudies(token),
    getProfile(token),
    turboOverviewRequest,
    performanceSummaryRequest,
  ]);
  return {
    pendingData,
    doneData,
    studyData,
    cardsOverview,
    performanceSummary,
    weeklyGoal: Math.max(0, Number(profile.weekly_goal_questions ?? 0)),
  };
}

function groupTasksByDate(tasks: ReviewTask[]): Record<string, ReviewTask[]> {
  const grouped: Record<string, ReviewTask[]> = {};
  for (const task of tasks) {
    if (!grouped[task.due_date]) grouped[task.due_date] = [];
    grouped[task.due_date].push(task);
  }
  return grouped;
}

function getOverdueDays(dueDate: string, today: string): number {
  const due = new Date(`${dueDate}T00:00:00`);
  const now = new Date(`${today}T00:00:00`);
  return Math.max(0, Math.round((now.getTime() - due.getTime()) / 86400000));
}

export default function TodayPage() {
  const { tokenResolved } = useAuthToken();
  const isDesktopNavigation = useDesktopNavigationMode();
  const { showToast } = useToast();
  const [tasks, setTasks] = useState<ReviewTask[]>([]);
  const [doneTasks, setDoneTasks] = useState<ReviewTask[]>([]);
  const [studies, setStudies] = useState<DirectedStudyListItem[]>([]);
  const [turboOverview, setTurboOverview] = useState<OperationalTurboOverview | null>(null);
  const [performanceSummary, setPerformanceSummary] = useState<StudyPerformanceSummary | null>(null);
  const [weeklyGoal, setWeeklyGoal] = useState(200);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [previewingRescheduleTaskId, setPreviewingRescheduleTaskId] = useState<string | null>(null);
  const [pendingReschedule, setPendingReschedule] = useState<{
    taskId: string;
    theme: string;
    fromDate: string;
    toDate: string | null;
    loading: boolean;
    hasBetterDate: boolean | null;
    error: string | null;
  } | null>(null);

  const today = useMemo(() => todayISO(), []);
  const weekDays = useMemo(() => getWeekDays(), []);
  const [selectedDayIso, setSelectedDayIso] = useState(today);

  async function fetchTasks(showLoadingState: boolean = false) {
    const token = getAuthToken();

    if (showLoadingState) setLoading(true);
    try {
      const data = await loadTodayPageData(token);
      setError("");
      setTasks(data.pendingData);
      setDoneTasks(data.doneData);
      setStudies(data.studyData);
      setTurboOverview(data.cardsOverview);
      setPerformanceSummary(data.performanceSummary);
      setWeeklyGoal(data.weeklyGoal);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Erro ao carregar revisões."));
    } finally {
      if (showLoadingState) setLoading(false);
    }
  }

  useEffect(() => {
    writeCronogramaViewModeSession("week");
  }, []);

  useEffect(() => {
    if (!tokenResolved) return;
    void fetchTasks(true);
  }, [tokenResolved]);

  async function handleReschedule(taskId: string, previousDueDate: string) {
    const token = getAuthToken();

    try {
      const updatedTask = await autoRescheduleReviewTask(token, taskId);
      await fetchTasks();
      if (updatedTask.due_date !== previousDueDate) {
        showToast(`Reagendado para ${displayDate(updatedTask.due_date)}.`, "info");
      } else {
        showToast(`Sistema não encontrou data melhor. Mantido em ${displayDate(updatedTask.due_date)}.`, "info");
      }
    } catch (e: unknown) {
      showToast(getErrorMessage(e, "Erro ao reagendar."), "error");
    }
  }

  async function handlePrepareReschedule(task: ReviewTask) {
    const token = getAuthToken();

    setPreviewingRescheduleTaskId(task.task_id);
    setPendingReschedule({
      taskId: task.task_id,
      theme: task.theme,
      fromDate: task.due_date,
      toDate: null,
      loading: true,
      hasBetterDate: null,
      error: null,
    });
    try {
      const preview = await previewAutoRescheduleReviewTask(token, task.task_id);
      setPendingReschedule((current) => {
        if (!current || current.taskId !== task.task_id) return current;
        return {
          ...current,
          toDate: preview.due_date,
          loading: false,
          hasBetterDate: preview.due_date !== task.due_date,
          error: null,
        };
      });
    } catch (e: unknown) {
      setPendingReschedule((current) => {
        if (!current || current.taskId !== task.task_id) return current;
        return {
          ...current,
          loading: false,
          hasBetterDate: null,
          error: getErrorMessage(e, "Erro ao preparar reagendamento."),
        };
      });
    } finally {
      setPreviewingRescheduleTaskId(null);
    }
  }

  function handleLogDone(taskId: string) {
    setTasks((prev) => {
      const completedTask = prev.find((task) => task.task_id === taskId);
      if (completedTask) {
        setDoneTasks((currentDone) => [{ ...completedTask, status: "done", is_overdue: false }, ...currentDone]);
      }
      return prev.filter((task) => task.task_id !== taskId);
    });
    setExpandedTaskId(null);
  }

  const selectedDayTasks = useMemo(
    () => tasks.filter((task) => task.due_date === selectedDayIso),
    [selectedDayIso, tasks],
  );
  const overdueTasks = useMemo(
    () => tasks.filter((task) => task.is_overdue && task.due_date !== today),
    [tasks, today],
  );
  const selectedDayLabel = weekDays.find((day) => day.iso === selectedDayIso)?.label ?? "";
  const selectedDayHeading = selectedDayIso === today
    ? "Hoje"
    : `${selectedDayLabel} ${formatDayMonth(selectedDayIso)}`;

  const tasksByDate = useMemo(() => groupTasksByDate(tasks), [tasks]);

  const weeklyOpsMetrics = useMemo(
    () =>
      buildWeeklyOpsMetrics({
        weeklyGoal,
        pendingTasks: tasks,
        doneTasks,
        studies,
        todayIso: today,
      }),
    [doneTasks, studies, tasks, today, weeklyGoal],
  );

  const dailyWeaknesses = useMemo(
    () => buildDailyWeaknessItems(performanceSummary),
    [performanceSummary],
  );

  function TaskRow({ task, overdue }: { task: ReviewTask; overdue?: boolean }) {
    const area = task.area as Area;
    const days = overdue ? getOverdueDays(task.due_date, today) : 0;
    const urgent = days >= 7;
    const accentColor = AREA_HEX[area] ?? AREA_HEX.OU;
    const token = getAuthToken() ?? "";
    const isExpanded = expandedTaskId === task.task_id;
    const isPreviewing = previewingRescheduleTaskId === task.task_id;

    return (
      <li
        className="py-3 pl-3 border-b border-edge last:border-b-0 border-l-2"
        style={{ borderLeftColor: accentColor }}
      >
        <div className="flex items-center gap-3">
          <AreaDot area={area} size="md" />
          <div className="flex-1 min-w-0">
            <span className={`text-sm ${overdue ? "italic" : ""} ${urgent ? "text-amber-700" : overdue ? "text-muted" : ""}`}>
              {task.theme}
            </span>
            <span className="text-xs text-muted ml-2">{task.expected_questions}q</span>
            {task.is_critical && <span className="text-xs text-muted ml-1">*</span>}
            {overdue && days > 0 && (
              <span className={`text-xs ml-2 ${urgent ? "text-amber-700" : "text-muted"}`}>
                {days}d atrás
              </span>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            {overdue && (
              <button
                type="button"
                className="text-xs border border-edge px-2 py-1 hover:border-ink text-muted"
                onClick={() => void handlePrepareReschedule(task)}
                disabled={isPreviewing || pendingReschedule !== null}
              >
                {isPreviewing ? "..." : "Reagendar"}
              </button>
            )}
            <button
              className={`text-xs border px-2 py-1 transition-colors ${isExpanded ? "border-ink bg-ink text-paper" : "border-edge hover:border-ink"}`}
              onClick={() => setExpandedTaskId(isExpanded ? null : task.task_id)}
            >
              Registrar
            </button>
          </div>
        </div>
        {isExpanded && (
          <div className="mt-3 ml-7">
            <InlineLogForm
              task={task}
              token={token}
              onDone={() => handleLogDone(task.task_id)}
              onCancel={() => setExpandedTaskId(null)}
            />
          </div>
        )}
      </li>
    );
  }

  if (loading) return <TodaySkeleton />;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-[1.75rem_1fr_1.75rem] items-center gap-2">
        <div className="flex justify-start">
          {!isDesktopNavigation ? (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent(NAV_OPEN_EVENT))}
              className="p-1 -ml-1 text-ink shrink-0"
              aria-label="Menu"
            >
              <IconMenu className="w-5 h-5" />
            </button>
          ) : (
            <span className="block h-7 w-7" aria-hidden="true" />
          )}
        </div>
        <h1 className="text-center text-[10px] font-semibold uppercase leading-none tracking-[0.08em] text-ink">SEMANA</h1>
        <div className="flex justify-end">
          <Link
            href="/agenda-operacional"
            className="p-1 text-muted hover:text-ink shrink-0"
            aria-label="Visão mensal"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden="true">
              <rect x="1"    y="1"    width="4.5" height="4.5" rx="0.5"/>
              <rect x="7.75" y="1"    width="4.5" height="4.5" rx="0.5"/>
              <rect x="14.5" y="1"    width="4.5" height="4.5" rx="0.5"/>
              <rect x="1"    y="7.75" width="4.5" height="4.5" rx="0.5"/>
              <rect x="7.75" y="7.75" width="4.5" height="4.5" rx="0.5"/>
              <rect x="14.5" y="7.75" width="4.5" height="4.5" rx="0.5"/>
              <rect x="1"    y="14.5" width="4.5" height="4.5" rx="0.5"/>
              <rect x="7.75" y="14.5" width="4.5" height="4.5" rx="0.5"/>
              <rect x="14.5" y="14.5" width="4.5" height="4.5" rx="0.5"/>
            </svg>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {weekDays.map(({ iso, label, dayNum }) => {
          const isToday = iso === today;
          const isSelected = iso === selectedDayIso;
          const dayTasks = tasksByDate[iso] ?? [];
          return (
            <button
              key={iso}
              type="button"
              onClick={() => setSelectedDayIso(iso)}
              aria-pressed={isSelected}
              className="flex flex-col items-center gap-1 rounded-sm py-1"
            >
              <span className={`text-xs uppercase tracking-wide ${isSelected ? "text-ink" : "text-muted"}`}>{label}</span>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-serif ${
                  isSelected
                    ? "bg-ink text-paper font-medium"
                    : isToday
                      ? "border border-ink text-ink font-medium"
                      : "text-ink"
                }`}
              >
                {dayNum}
              </div>
              <div className="flex flex-wrap justify-center gap-0.5 min-h-[6px]">
                {dayTasks.slice(0, 3).map((task) => (
                  <AreaDot key={task.task_id} area={task.area as Area} />
                ))}
                {dayTasks.length > 3 && <span className="text-[9px] text-muted">+{dayTasks.length - 3}</span>}
              </div>
            </button>
          );
        })}
      </div>

      {!error && <WeeklyOpsFullCards metrics={weeklyOpsMetrics} />}

      {!error && dailyWeaknesses.length > 0 && (
        <section className="border border-edge p-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-muted">Radar de fraquezas</p>
              <h2 className="text-sm font-serif text-ink">Prioridades para orientar o estudo</h2>
            </div>
            <Link href="/dados-e-relatorios/relatorio" className="text-xs underline text-muted hover:text-ink shrink-0">
              Ver relatório
            </Link>
          </div>
          <ul className="space-y-2">
            {dailyWeaknesses.map((item) => (
              <li
                key={item.key}
                className="border-l-2 pl-3 py-1.5"
                style={{ borderLeftColor: getAreaColor(item.area) }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {item.area} - {item.theme}
                    </p>
                    <p className="text-xs text-muted break-words [overflow-wrap:anywhere]">
                      {item.signal}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums" style={{ color: getAreaColor(item.area) }}>
                      {formatPercent(item.accuracyPct)}
                    </p>
                    <p className="text-[10px] text-muted">{item.totalQuestions}q</p>
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted break-words [overflow-wrap:anywhere]">
                  Ação: {item.action}
                </p>
                {(item.confidencePct !== null || item.impactPct !== null || item.source === "preliminary") && (
                  <p className="mt-1 text-[10px] text-muted">
                    {item.source === "preliminary"
                      ? "Leitura preliminar até o diagnóstico completo ativar."
                      : `Confiança ${formatPercent(item.confidencePct)} · impacto ${formatPercent(item.impactPct)}`}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {!error && turboOverview && turboOverview.due_count > 0 && (
        <section className="border border-edge overflow-hidden">
          <div className="p-3 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-muted">Cards adaptativos</p>
                <div className="flex items-baseline gap-2">
                  <p className="font-serif text-3xl leading-none text-ink tabular-nums">{turboOverview.due_count}</p>
                  <p className="text-xs text-muted">
                    {turboOverview.estimated_minutes ? `~${turboOverview.estimated_minutes} min` : "para revisar"}
                  </p>
                </div>
                {turboOverview.reason_counts.slice(0, 2).length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {turboOverview.reason_counts.slice(0, 2).map((item) => (
                      <span key={item.reason} className="text-[10px] border border-edge px-1.5 py-0.5 text-muted leading-none">
                        {item.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <Link
                href="/cards-adaptativos"
                className="shrink-0 border border-ink px-3 py-2 text-xs hover:bg-ink hover:text-paper"
              >
                Revisar
              </Link>
            </div>
            {turboOverview.priority_preview.length > 0 && (
              <ul className="space-y-1.5 border-t border-edge pt-3">
                {turboOverview.priority_preview.map((item) => (
                  <li key={item.note_id} className="flex items-start gap-2 text-xs">
                    <span
                      className="mt-1 h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: getAreaColor(item.area) }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {item.area} - {item.theme}
                      </p>
                      <p className="text-muted break-words [overflow-wrap:anywhere]">
                        {item.insight_question}
                      </p>
                      <p className="text-[10px] text-muted">
                        {item.context.label}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      <hr />

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!error && selectedDayTasks.length === 0 && overdueTasks.length === 0 && (
        <div className="text-center py-8 md:py-12 space-y-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="w-10 h-10 mx-auto text-edge"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M8 12.5l2.5 2.5L16 9.5" />
          </svg>
          <p className="text-sm text-muted">
            {selectedDayIso === today
              ? "Nenhuma revisão pendente para hoje."
              : `Nenhuma revisão pendente para ${selectedDayLabel.toLowerCase()} ${formatDayMonth(selectedDayIso)}.`}
          </p>
          <p className="text-xs text-muted">Bom trabalho.</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Link
              href="/agenda-operacional"
              className="text-xs border border-edge px-3 py-1.5 hover:border-ink transition-colors"
            >
              Ver agenda completa
            </Link>
          </div>
        </div>
      )}

      {!error && selectedDayTasks.length === 0 && overdueTasks.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-base font-serif">
            {selectedDayHeading} <span className="text-sm font-sans text-muted font-normal">- 0 revisões</span>
          </h2>
          <p className="text-sm text-muted">Nenhuma revisão pendente para este dia.</p>
        </section>
      )}

      {!error && selectedDayTasks.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-base font-serif">
            {selectedDayHeading} <span className="text-sm font-sans text-muted font-normal">- {selectedDayTasks.length} {selectedDayTasks.length === 1 ? "revisão" : "revisões"}</span>
          </h2>
          <ul>
            {selectedDayTasks.map((task) => (
              <TaskRow key={task.task_id} task={task} />
            ))}
          </ul>
        </section>
      )}

      {!error && overdueTasks.length > 0 && (
        <section className="rounded-sm border border-amber-200 bg-[var(--amber-tint)] p-3 space-y-2">
          <h2 className="text-sm font-serif text-amber-800">Atrasadas - {overdueTasks.length}</h2>
          <ul>
            {overdueTasks.map((task) => (
              <TaskRow key={task.task_id} task={task} overdue />
            ))}
          </ul>
        </section>
      )}

      <ConfirmDialog
        open={pendingReschedule !== null}
        title="Reagendar tarefa"
        message={pendingReschedule ? (
          <div className="space-y-1">
            <p className="text-sm leading-snug">{pendingReschedule.theme}</p>
            {pendingReschedule.loading ? (
              <p className="text-sm text-muted">Buscando melhor data de reagendamento...</p>
            ) : pendingReschedule.error ? (
              <p className="text-sm text-red-600">{pendingReschedule.error}</p>
            ) : pendingReschedule.hasBetterDate ? (
              <>
                <p className="text-sm text-muted">
                  Vai de <strong>{displayDate(pendingReschedule.fromDate)}</strong> para{" "}
                  <strong>{displayDate(pendingReschedule.toDate ?? pendingReschedule.fromDate)}</strong>.
                </p>
                <p className="text-sm text-muted">Deseja confirmar o reagendamento?</p>
              </>
            ) : (
              <p className="text-sm text-muted">
                Sistema não encontrou data melhor. A revisão permanece em{" "}
                <strong>{displayDate(pendingReschedule.fromDate)}</strong>.
              </p>
            )}
          </div>
        ) : null}
        cancelLabel="Cancelar"
        confirmLabel={
          pendingReschedule?.loading
            ? "Aguarde"
            : pendingReschedule?.hasBetterDate
              ? "Reagendar"
              : "OK"
        }
        onCancel={() => setPendingReschedule(null)}
        onConfirm={() => {
          if (!pendingReschedule) return;
          if (pendingReschedule.loading) return;
          if (!pendingReschedule.hasBetterDate || !pendingReschedule.toDate) {
            setPendingReschedule(null);
            return;
          }
          const taskId = pendingReschedule.taskId;
          const previousDueDate = pendingReschedule.fromDate;
          setPendingReschedule(null);
          void handleReschedule(taskId, previousDueDate);
        }}
      />
    </div>
  );
}
