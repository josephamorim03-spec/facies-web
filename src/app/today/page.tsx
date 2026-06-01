"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { NAV_OPEN_EVENT } from "@/components/Nav";
import AreaDot from "@/components/AreaDot";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Skeleton } from "@/components/Skeleton";
import { Button } from "@/components/ui/Button";
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
import { AreaIcon } from "@/components/AreaIcon";
import { InlineLogForm } from "@/app/cronograma/_components/studyReview/InlineLogForm";
import { IconMenu, IconPlus, IconRefresh } from "@/app/cronograma/_components/CronogramaIcons";
import { displayDate } from "@/app/cronograma/_lib/cronogramaShared";
import { buildWeeklyOpsMetrics } from "@/app/cronograma/_lib/weeklyOpsMetrics";
import { WeeklyOpsFullCardsSkeleton } from "@/app/cronograma/_components/WeeklyOpsCards";
import { writeCronogramaViewModeSession } from "@/app/cronograma/_lib/viewModeSession";

type Area = "GO" | "PD" | "MP" | "CG" | "CM" | "OU";

const AREA_HEX: Record<Area, string> = {
  GO: "#B65AA0",
  PD: "#2E79A8",
  CG: "#B44A4F",
  CM: "#2D8B62",
  MP: "#A97816",
  OU: "#8C928E",
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

const MOTIVATIONAL_QUOTES = [
  { quote: "Disciplina é o que transforma objetivos em realidade.", author: "Aristóteles" },
  { quote: "Sucesso é a soma de pequenos esforços, repetidos dia após dia.", author: "Robert Collier" },
  { quote: "A preparação é a chave para todas as vitórias.", author: "Alexander Graham Bell" },
  { quote: "O conhecimento é o único bem que cresce quando compartilhado.", author: "Sócrates" },
  { quote: "Confie no processo. O resultado virá.", author: "Anônimo" },
  { quote: "Cada questão resolvida é um passo mais perto da aprovação.", author: "Anônimo" },
  { quote: "Não há atalho para qualquer lugar que vale a pena ir.", author: "Beverly Sills" },
];

const AREA_FULL: Record<string, string> = {
  GO: "Ginecologia e Obstetrícia", PD: "Pediatria", CM: "Clínica Médica",
  CG: "Cirurgia Geral", MP: "Medicina Preventiva", OU: "Outras",
};

function firstName(displayName: string | null): string | null {
  const normalized = (displayName ?? "").trim();
  return normalized ? normalized.split(/\s+/)[0] : null;
}

function formatRatioPercent(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
}

function formatStudyDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.slice(0, 10);
  return parsed.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function reviewTaskHref(task: ReviewTask): string {
  const params = new URLSearchParams({
    review_task_id: task.task_id,
    date: task.due_date,
    area: task.area,
    theme: task.theme,
    expected_questions: String(Math.max(1, Number(task.expected_questions ?? 10))),
  });
  return `/banco-de-questoes?${params.toString()}`;
}


function IconShield({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 3 5 6v5c0 4.5 2.8 8.2 7 10 4.2-1.8 7-5.5 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-5" />
    </svg>
  );
}

function IconNotebook({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 7h6" />
      <path d="M9 11h6" />
      <path d="M9 15h4" />
    </svg>
  );
}

function IconArrowRight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M4 10h12" />
      <path d="m11 5 5 5-5 5" />
    </svg>
  );
}

function ProgressRing({
  pct,
  label,
  size = 128,
}: {
  pct: number;
  label?: string;
  size?: number;
}) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const safePct = Math.max(0, Math.min(100, pct));
  const offset = circumference * (1 - safePct / 100);

  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-surface-muted)" strokeWidth="8" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-success)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-serif text-3xl leading-none text-ink">{safePct}%</span>
        {label && <span className="mt-1 text-[11px] leading-tight text-muted">{label}</span>}
      </div>
    </div>
  );
}

function ScoreBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surfaceMuted">
      <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: color }} />
    </div>
  );
}

function getGreeting(firstName: string | null): string {
  const hour = new Date().getHours();
  const name = firstName ? `, ${firstName}` : "";
  if (hour < 12) return `Bom dia${name}!`;
  if (hour < 18) return `Boa tarde${name}!`;
  return `Boa noite${name}!`;
}

type TodayPageData = {
  pendingData: ReviewTask[];
  doneData: ReviewTask[];
  studyData: DirectedStudyListItem[];
  cardsOverview: OperationalTurboOverview | null;
  performanceSummary: StudyPerformanceSummary | null;
  weeklyGoal: number;
  displayName: string | null;
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
    displayName: profile.display_name,
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
  const [displayName, setDisplayName] = useState<string | null>(null);
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
      setDisplayName(data.displayName);
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

  const studentFirstName = firstName(displayName) ?? "Joseph";
  const greeting = getGreeting(studentFirstName);
  const quote = MOTIVATIONAL_QUOTES[new Date().getDate() % MOTIVATIONAL_QUOTES.length];
  const totalDoneQuestions = studies.reduce((sum, study) => sum + Math.max(0, Number(study.total_questions ?? 0)), 0);
  const totalCorrectQuestions = studies.reduce((sum, study) => sum + Math.max(0, Number(study.correct_questions ?? 0)), 0);
  const globalAccuracy = formatRatioPercent(totalCorrectQuestions, totalDoneQuestions);
  const totalWrongQuestions = Math.max(0, totalDoneQuestions - totalCorrectQuestions);
  const weeklyGoalPct = weeklyGoal > 0 ? Math.min(100, Math.round((weeklyOpsMetrics.doneQuestionsWeek / weeklyGoal) * 100)) : 0;
  const topAreaSummaries = (performanceSummary?.area_summaries ?? [])
    .filter((item) => item.total_questions > 0)
    .sort((a, b) => b.total_questions - a.total_questions)
    .slice(0, 5);
  const recentReviewStudies = studies
    .filter((study) => study.is_review)
    .slice()
    .sort((a, b) => new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime())
    .slice(0, 3);
  const nextWeakness = dailyWeaknesses[0] ?? null;
  const nextActionTask = overdueTasks[0] ?? selectedDayTasks[0] ?? null;

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
        className="rounded-xl border border-edge bg-paper p-3 shadow-sm"
        style={{ boxShadow: `inset 3px 0 0 ${accentColor}` }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <AreaDot area={area} size="md" />
          <div className="min-w-0 flex-1">
            <span className={`text-sm font-semibold leading-snug ${overdue ? "italic" : ""} ${urgent ? "text-danger" : "text-ink"}`}>
              {task.theme}
            </span>
            <span className="ml-2 text-xs text-muted">{task.expected_questions}q</span>
            {task.is_critical && <span className="text-xs text-muted ml-1">*</span>}
            {overdue && days > 0 && (
              <span className={`ml-2 text-xs font-medium ${urgent ? "text-danger" : "text-muted"}`}>
                {days}d atrás
              </span>
            )}
          </div>
          <div className="flex w-full shrink-0 gap-2 sm:w-auto">
            {overdue && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="flex-1 sm:flex-none"
                leftIcon={<IconRefresh className="h-3.5 w-3.5" />}
                onClick={() => void handlePrepareReschedule(task)}
                disabled={isPreviewing || pendingReschedule !== null}
              >
                {isPreviewing ? "..." : "Reagendar"}
              </Button>
            )}
            <Button
              type="button"
              variant={isExpanded ? "primary" : "secondary"}
              size="sm"
              className="flex-1 sm:flex-none"
              leftIcon={<IconPlus className="h-3.5 w-3.5" />}
              onClick={() => setExpandedTaskId(isExpanded ? null : task.task_id)}
            >
              Registrar
            </Button>
          </div>
        </div>
        {isExpanded && (
          <div className="mt-3 rounded-xl border border-edge bg-surface p-3 sm:ml-8">
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
    <div className="space-y-8">
      <header className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="font-serif text-4xl font-semibold leading-tight md:text-5xl">{greeting}</h1>
          <p className="mt-2 text-base text-muted">Foco hoje, especialista amanhã.</p>
        </div>
        <div className="flex items-start justify-between gap-3 md:min-w-[20rem] md:justify-end">
          <div className="hidden max-w-xs text-sm text-muted md:block">
            <p className="font-serif text-4xl leading-none text-edge">“</p>
            <p>{quote.quote}</p>
            <p className="mt-2 text-xs">- {quote.author}</p>
          </div>
          <div className="flex items-center gap-1">
            {!isDesktopNavigation && (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent(NAV_OPEN_EVENT))}
                className="rounded-lg p-2 text-muted hover:bg-surfaceMuted hover:text-ink"
                aria-label="Menu"
              >
                <IconMenu className="w-5 h-5" />
              </button>
            )}
            <Link
              href="/agenda-operacional"
              className="rounded-lg p-2 text-muted hover:bg-surfaceMuted hover:text-ink"
              aria-label="Visão mensal"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                <rect x="1" y="1" width="4.5" height="4.5" rx="0.5" />
                <rect x="7.75" y="1" width="4.5" height="4.5" rx="0.5" />
                <rect x="14.5" y="1" width="4.5" height="4.5" rx="0.5" />
                <rect x="1" y="7.75" width="4.5" height="4.5" rx="0.5" />
                <rect x="7.75" y="7.75" width="4.5" height="4.5" rx="0.5" />
                <rect x="14.5" y="7.75" width="4.5" height="4.5" rx="0.5" />
                <rect x="1" y="14.5" width="4.5" height="4.5" rx="0.5" />
                <rect x="7.75" y="14.5" width="4.5" height="4.5" rx="0.5" />
                <rect x="14.5" y="14.5" width="4.5" height="4.5" rx="0.5" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      {error && <div className="rounded-lg border border-danger bg-surface p-4 text-sm text-danger">{error}</div>}

      {!error && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="space-y-6">
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-serif text-2xl font-semibold">Plano de estudos de hoje</h2>
                <Link href="/agenda-operacional" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                  Ver plano completo
                  <IconArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="grid grid-cols-7 gap-1 rounded-lg border border-edge bg-surface p-2">
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
                      className={`flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 transition-colors ${
                        isSelected ? "bg-primary text-primaryInk" : "hover:bg-surfaceMuted"
                      }`}
                    >
                      <span className={`text-[10px] font-semibold uppercase ${isSelected ? "text-primaryInk" : "text-muted"}`}>{label}</span>
                      <span className={`font-serif text-lg leading-none ${isToday && !isSelected ? "text-primary" : ""}`}>{dayNum}</span>
                      <span className="flex min-h-[8px] items-center justify-center gap-0.5">
                        {dayTasks.slice(0, 3).map((task) => (
                          <AreaDot key={task.task_id} area={task.area as Area} />
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-3">
                {selectedDayTasks.length > 0 ? (
                  selectedDayTasks.map((task) => {
                    const isExpanded = expandedTaskId === task.task_id;
                    const accentColor = getAreaColor(task.area);
                    return (
                      <article key={task.task_id} className="overflow-hidden rounded-lg border border-edge bg-surface shadow-sm">
                        <div className="grid gap-4 p-4 sm:grid-cols-[5.5rem_minmax(0,1fr)_8rem] sm:items-center">
                          <div className="flex h-20 w-full items-center justify-center rounded-lg border border-edge bg-paper">
                            <AreaIcon area={task.area} size={40} colored />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-serif text-xl font-semibold leading-tight text-ink">{task.theme}</h3>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ color: accentColor, backgroundColor: `${accentColor}18` }}>
                                {AREA_FULL[task.area] ?? task.area}
                              </span>
                              <span className="text-xs text-muted">{task.expected_questions} questões</span>
                              {task.is_critical && <span className="text-xs font-semibold text-warning">prioritária</span>}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted">0/{task.expected_questions}</span>
                            </div>
                            <ScoreBar pct={0} color={accentColor} />
                            <div className="flex gap-2">
                              <Link href={reviewTaskHref(task)} className="inline-flex flex-1 items-center justify-center rounded-xl border border-primary bg-primary px-3 py-2 text-xs font-semibold text-primaryInk">
                                Estudar
                              </Link>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="flex-1"
                                onClick={() => setExpandedTaskId(isExpanded ? null : task.task_id)}
                              >
                                Registrar
                              </Button>
                            </div>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="border-t border-edge bg-paper p-4">
                            <InlineLogForm
                              task={task}
                              token={getAuthToken() ?? ""}
                              onDone={() => handleLogDone(task.task_id)}
                              onCancel={() => setExpandedTaskId(null)}
                            />
                          </div>
                        )}
                      </article>
                    );
                  })
                ) : (
                  <div className="rounded-lg border border-dashed border-edge bg-surface p-8 text-center">
                    <IconShield className="mx-auto h-10 w-10 text-success" />
                    <p className="mt-3 text-sm text-muted">
                      {selectedDayIso === today
                        ? "Nenhuma revisão pendente para hoje."
                        : `Nenhuma revisão pendente para ${selectedDayLabel.toLowerCase()} ${formatDayMonth(selectedDayIso)}.`}
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-edge bg-surface p-5 shadow-sm">
              <h2 className="font-serif text-2xl font-semibold">Próxima melhor ação</h2>
              <p className="mt-1 text-sm text-muted">Com base no seu desempenho recente, sugerimos:</p>
              <div className="mt-4 rounded-lg border border-edge bg-paper p-4">
                {nextWeakness ? (
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-paper">
                      <AreaIcon area={nextWeakness.area} size={32} colored />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-primary">Revisar {nextWeakness.theme}</p>
                      <p className="mt-1 text-xs text-muted">{nextWeakness.signal}</p>
                    </div>
                    <Link
                      href={`/banco-de-questoes?area=${encodeURIComponent(nextWeakness.area)}&theme=${encodeURIComponent(nextWeakness.theme)}&answer_status=unanswered_or_wrong`}
                      className="inline-flex items-center justify-center rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primaryInk"
                    >
                      Começar revisão
                    </Link>
                  </div>
                ) : nextActionTask ? (
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[var(--amber-tint)] text-warning">
                      <IconNotebook className="h-8 w-8" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-primary">Resolver {nextActionTask.theme}</p>
                      <p className="mt-1 text-xs text-muted">{nextActionTask.expected_questions} questões programadas.</p>
                    </div>
                    <Link href={reviewTaskHref(nextActionTask)} className="inline-flex items-center justify-center rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primaryInk">
                      Começar
                    </Link>
                  </div>
                ) : (
                  <p className="text-sm text-muted">Você está sem pendências imediatas. Um bloco leve de manutenção no banco de questões mantém o ritmo.</p>
                )}
              </div>
            </section>

            <section>
              <h2 className="font-serif text-lg font-semibold">Acesso rápido</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-5">
                {[
                  { href: "/banco-de-questoes", label: "Banco de questões" },
                  { href: "/provas", label: "Simulados" },
                  { href: "/revisoes", label: "Revisões" },
                  { href: "/cards-adaptativos", label: "Flashcards" },
                  { href: "/dados-e-relatorios", label: "Desempenho" },
                ].map((item) => (
                  <Link key={item.href} href={item.href} className="rounded-lg border border-edge bg-surface px-3 py-3 text-center text-xs font-semibold text-ink hover:border-primary">
                    {item.label}
                  </Link>
                ))}
              </div>
            </section>

            {overdueTasks.length > 0 && (
              <section className="rounded-2xl border border-edge bg-surface p-4 shadow-sm">
                <h2 className="font-serif text-lg font-semibold text-ink">Atrasadas - {overdueTasks.length}</h2>
                <p className="mt-1 text-sm text-muted">Priorize ou reagende para recuperar o ritmo sem perder clareza.</p>
                <ul className="mt-3 space-y-2">
                  {overdueTasks.map((task) => (
                    <TaskRow key={task.task_id} task={task} overdue />
                  ))}
                </ul>
              </section>
            )}
          </div>

          <aside className="space-y-5">
            <section className="rounded-lg border border-edge bg-surface p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-serif text-2xl font-semibold">Progresso geral</h2>
                <Link href="/dados-e-relatorios" className="text-xs font-semibold text-primary hover:underline">Ver detalhes</Link>
              </div>
              <div className="mt-5 flex items-center gap-5">
                <ProgressRing pct={globalAccuracy} label={`de ${totalDoneQuestions} questões`} />
                <div className="min-w-0 flex-1 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-ink">Acertos</span>
                    <span className="text-2xl font-semibold tabular-nums text-success">{totalCorrectQuestions}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-ink">Erros</span>
                    <span className="text-2xl font-semibold tabular-nums text-danger">{totalWrongQuestions}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-ink">Pendentes</span>
                    <span className="text-2xl font-semibold tabular-nums text-muted">{tasks.length}</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-edge bg-surface p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-serif text-2xl font-semibold">Meta semanal</h2>
                <Link href="/rotina-e-metas" className="text-xs font-semibold text-primary hover:underline">Editar meta</Link>
              </div>
              <p className="mt-4 text-sm text-ink">Responder {weeklyGoal} questões</p>
              <div className="mt-3 flex items-center gap-4">
                <ScoreBar pct={weeklyGoalPct} color="var(--color-success)" />
                <span className="w-20 shrink-0 text-right text-sm tabular-nums text-ink">{weeklyOpsMetrics.doneQuestionsWeek}/{weeklyGoal}</span>
              </div>
              <p className="mt-3 text-sm text-muted">
                {weeklyOpsMetrics.daysRemainingInWeek} dia{weeklyOpsMetrics.daysRemainingInWeek === 1 ? "" : "s"} restante{weeklyOpsMetrics.daysRemainingInWeek === 1 ? "" : "s"}
              </p>
            </section>

            <section className="rounded-lg border border-edge bg-surface p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-serif text-2xl font-semibold">Resumo de desempenho</h2>
                <Link href="/dados-e-relatorios/relatorio" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                  Ver detalhes
                  <IconArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="mt-5 space-y-3">
                {topAreaSummaries.length > 0 ? topAreaSummaries.map((areaSummary) => {
                  const pct = Math.round(areaSummary.area_accuracy_pct ?? 0);
                  const color = getAreaColor(areaSummary.area);
                  return (
                    <div key={areaSummary.area} className="space-y-1">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate text-ink">{AREA_FULL[areaSummary.area] ?? areaSummary.area}</span>
                        <span className="font-semibold tabular-nums" style={{ color }}>{pct}%</span>
                      </div>
                      <ScoreBar pct={pct} color={color} />
                    </div>
                  );
                }) : (
                  <p className="text-sm text-muted">O resumo aparece depois dos primeiros registros.</p>
                )}
              </div>
            </section>

            {turboOverview && turboOverview.due_count > 0 && (
              <section className="rounded-lg border border-edge bg-surface p-5 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[#F3F8FE] text-primary">
                    <IconNotebook className="h-8 w-8" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-serif text-xl font-semibold">Flashcards vencidos</h2>
                    <p className="text-sm text-muted">
                      {turboOverview.due_count} cards{turboOverview.estimated_minutes ? ` · ~${turboOverview.estimated_minutes} min` : ""}
                    </p>
                  </div>
                  <Link href="/cards-adaptativos" className="rounded-lg border border-primary px-3 py-2 text-xs font-semibold text-primary hover:bg-surfaceMuted">
                    Revisar
                  </Link>
                </div>
              </section>
            )}

            {recentReviewStudies.length > 0 && (
              <section className="rounded-lg border border-edge bg-surface p-5 shadow-sm">
                <h2 className="font-serif text-xl font-semibold">Últimas revisões</h2>
                <div className="mt-3 space-y-3">
                  {recentReviewStudies.map((study) => (
                    <Link
                      key={study.study_id}
                      href={study.import_session_id ? `/cronograma/importar/${study.import_session_id}/resultados` : `/banco-de-questoes?area=${encodeURIComponent(study.area)}&theme=${encodeURIComponent(study.theme)}`}
                      className="block rounded-lg border border-edge bg-paper px-3 py-3 hover:border-primary"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="min-w-0 truncate text-sm font-semibold text-ink">{study.theme}</p>
                        <span className="text-xs text-muted">{formatStudyDate(study.performed_at)}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted">{study.correct_questions}/{study.total_questions} questões · {formatPercent(study.accuracy)}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </aside>
        </div>
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
