"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useNavbar } from "@/lib/NavbarContext";
import AreaDot from "@/components/AreaDot";
import { Skeleton } from "@/components/Skeleton";
import { Button } from "@/components/ui/Button";
import { getAuthToken } from "@/lib/auth";
import { getErrorMessage } from "@/lib/error-utils";
import { useAuthToken } from "@/lib/useAuthToken";
import { useToast } from "@/lib/useToast";
import {
  acceptScheduleSuggestionItem,
  acceptScheduleSuggestionAll,
  DirectedStudyListItem,
  getOperationalTurboOverview,
  getProfile,
  getQuestionBankLongitudinalDiagnosis,
  listScheduleSuggestions,
  getStudyPerformanceSummary,
  listDirectedStudies,
  listReviewTasks,
  rejectScheduleSuggestion,
  type ScheduleSuggestion,
  type OperationalTurboOverview,
  type QuestionBankLongitudinalDiagnosis,
  ReviewTask,
  type StudyPerformanceSummary,
  triggerScheduleSuggestion,
} from "@/lib/api";
import { AreaIcon } from "@/components/AreaIcon";
import { RescheduleSuggestionDialog } from "@/app/cronograma/_components/RescheduleSuggestionDialog";
import { InlineLogForm } from "@/app/cronograma/_components/studyReview/InlineLogForm";
import { IconPlus, IconRefresh } from "@/app/cronograma/_components/CronogramaIcons";
import { buildWeeklyOpsMetrics } from "@/app/cronograma/_lib/weeklyOpsMetrics";
import { WeeklyOpsFullCardsSkeleton } from "@/app/cronograma/_components/WeeklyOpsCards";
import { writeCronogramaViewModeSession } from "@/app/cronograma/_lib/viewModeSession";
import BancoSidebarCard from "./_components/BancoSidebarCard";

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
  daysSinceLastStudy: number | null;
  totalQuestions: number;
  signal: string;
  action: string;
  confidencePct: number | null;
  impactPct: number | null;
  source: "diagnosis" | "preliminary" | "banco";
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

  const areaSummaries = Array.isArray(summary.area_summaries) ? summary.area_summaries : [];
  const studyGapByThemeKey = new Map(
    areaSummaries.flatMap((areaSummary) =>
      areaSummary.themes.map((theme) => [theme.key, theme.days_since_last_study ?? null] as const),
    ),
  );

  const diagnosis = summary.diagnosis;
  if (diagnosis?.ready && Array.isArray(diagnosis.weaknesses) && diagnosis.weaknesses.length > 0) {
    return diagnosis.weaknesses.slice(0, 3).map((item) => ({
      key: item.key,
      area: item.area,
      theme: item.theme,
      accuracyPct: item.accuracy_pct,
      daysSinceLastStudy: studyGapByThemeKey.get(item.key) ?? null,
      totalQuestions: item.total_questions,
      signal: item.dominant_signal || "Tema com perda relevante no histórico.",
      action: item.action_hint || "Faça um bloco curto e revise os erros no mesmo dia.",
      confidencePct: item.system_confidence_pct ?? null,
      impactPct: item.impact_score_pct ?? null,
      source: "diagnosis",
    }));
  }

  return areaSummaries
    .flatMap((areaSummary) =>
      areaSummary.themes
        .filter((theme) => theme.total_questions >= 20)
        .map((theme) => ({
          key: theme.key,
          area: theme.area,
          theme: theme.theme,
          accuracyPct: theme.accuracy_pct,
          daysSinceLastStudy: theme.days_since_last_study ?? null,
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
    <div className="space-y-5 md:space-y-8">
      {/* greeting */}
      <div className="space-y-1.5">
        <Skeleton className="h-7 w-44 rounded-sm" />
        <Skeleton className="h-3.5 w-52 rounded-sm" />
      </div>
      <div className="grid gap-4 md:gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        {/* left column */}
        <div className="space-y-4 md:space-y-6">
          {/* week selector */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 7 }).map((_, idx) => (
              <div key={`week-sk-${idx}`} className="flex flex-col items-center gap-1.5">
                <Skeleton className="h-2.5 w-6 rounded-sm" />
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-1.5 w-6 rounded-sm" />
              </div>
            ))}
          </div>
          <WeeklyOpsFullCardsSkeleton />
          <hr className="border-edge" />
          {/* task list */}
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={`task-sk-${idx}`} className="flex items-center gap-3 border-b border-edge py-3 pl-3">
                <Skeleton className="h-4 w-4 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-3/5 rounded-sm" />
                  <Skeleton className="h-2.5 w-24 rounded-sm" />
                </div>
                <Skeleton className="h-7 w-16 shrink-0 rounded-sm" />
              </div>
            ))}
          </div>
        </div>
        {/* right aside — desempenho */}
        <div className="space-y-5">
          {/* Progresso geral */}
          <div className="rounded-lg border border-edge bg-surface p-5">
            <div className="flex items-start justify-between">
              <Skeleton className="h-6 w-36 rounded-sm" />
              <Skeleton className="h-3 w-16 rounded-sm" />
            </div>
            <div className="mt-5 flex items-center gap-5">
              <Skeleton className="h-20 w-20 shrink-0 rounded-full" />
              <div className="flex-1 space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={`prog-sk-${i}`} className="flex items-center justify-between gap-3">
                    <Skeleton className="h-3 w-16 rounded-sm" />
                    <Skeleton className="h-6 w-10 rounded-sm" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Meta semanal */}
          <div className="rounded-lg border border-edge bg-surface p-5">
            <div className="flex items-start justify-between">
              <Skeleton className="h-6 w-32 rounded-sm" />
              <Skeleton className="h-3 w-16 rounded-sm" />
            </div>
            <Skeleton className="mt-4 h-3 w-40 rounded-sm" />
            <div className="mt-3 flex items-center gap-4">
              <Skeleton className="h-3 flex-1 rounded-full" />
              <Skeleton className="h-3 w-16 shrink-0 rounded-sm" />
            </div>
            <Skeleton className="mt-3 h-3 w-28 rounded-sm" />
          </div>
          {/* Resumo de desempenho */}
          <div className="rounded-lg border border-edge bg-surface p-5">
            <div className="flex items-start justify-between">
              <Skeleton className="h-6 w-48 rounded-sm" />
              <Skeleton className="h-3 w-16 rounded-sm" />
            </div>
            <div className="mt-5 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={`area-sk-${i}`} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-32 rounded-sm" />
                    <Skeleton className="h-3 w-8 rounded-sm" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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

function IconCards({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="4" y="7" width="12" height="12" rx="1.5" />
      <rect x="8" y="5" width="12" height="12" rx="1.5" />
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
  const { setTitle, setActions } = useNavbar();
  const { showToast } = useToast();
  const [tasks, setTasks] = useState<ReviewTask[]>([]);
  const [doneTasks, setDoneTasks] = useState<ReviewTask[]>([]);
  const [studies, setStudies] = useState<DirectedStudyListItem[]>([]);
  const [turboOverview, setTurboOverview] = useState<OperationalTurboOverview | null>(null);
  const [performanceSummary, setPerformanceSummary] = useState<StudyPerformanceSummary | null>(null);
  const [longitudinal, setLongitudinal] = useState<QuestionBankLongitudinalDiagnosis | null>(null);
  const [weeklyGoal, setWeeklyGoal] = useState(200);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [bulkSuggestionDialogOpen, setBulkSuggestionDialogOpen] = useState(false);
  const [bulkSuggestionLoading, setBulkSuggestionLoading] = useState(false);
  const [bulkSuggestionError, setBulkSuggestionError] = useState<string | null>(null);
  const [bulkSuggestionActionKey, setBulkSuggestionActionKey] = useState<string | null>(null);
  const [bulkSuggestions, setBulkSuggestions] = useState<ScheduleSuggestion[]>([]);

  const today = useMemo(() => todayISO(), []);
  const weekDays = useMemo(() => getWeekDays(), []);
  const [selectedDayIso, setSelectedDayIso] = useState(today);

  async function fetchTasks(showLoadingState: boolean = false) {
    const token = getAuthToken();
    const longitudinalRequest = getQuestionBankLongitudinalDiagnosis(token).catch(() => null);

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

    void longitudinalRequest.then((diagnosis) => {
      setLongitudinal(diagnosis);
    });
  }

  useEffect(() => {
    writeCronogramaViewModeSession("week");
  }, []);

  useEffect(() => {
    if (!tokenResolved) return;
    void fetchTasks(true);
  }, [tokenResolved]);

  async function handlePrepareBulkReschedule() {
    const token = getAuthToken();

    setBulkSuggestionDialogOpen(true);
    setBulkSuggestionLoading(true);
    setBulkSuggestionError(null);
    setBulkSuggestions([]);
    try {
      const existingSuggestions = await listScheduleSuggestions(token);
      const knownSuggestionIds = new Set(existingSuggestions.map((suggestion) => suggestion.suggestion_id));
      await triggerScheduleSuggestion(token);
      const refreshedSuggestions = await listScheduleSuggestions(token);
      const newSuggestions = refreshedSuggestions.filter(
        (suggestion) => suggestion.status === "pending" && !knownSuggestionIds.has(suggestion.suggestion_id),
      );
      if (newSuggestions.length === 0) {
        setBulkSuggestionError("Nenhuma sugestao nova de reagendamento foi gerada.");
      } else {
        setBulkSuggestions(newSuggestions);
      }
    } catch (e: unknown) {
      setBulkSuggestionError(getErrorMessage(e, "Erro ao preparar reagendamento em massa."));
    } finally {
      setBulkSuggestionLoading(false);
    }
  }

  async function handleAcceptSuggestionItem(suggestionId: string, taskId: string) {
    const token = getAuthToken();

    setBulkSuggestionActionKey(`item:${suggestionId}:${taskId}`);
    try {
      const updatedSuggestion = await acceptScheduleSuggestionItem(token, suggestionId, taskId);
      await fetchTasks();
      setBulkSuggestionError(null);
      if (updatedSuggestion.status === "pending") {
        const nextSuggestions = bulkSuggestions.map((suggestion) => (
          suggestion.suggestion_id === suggestionId ? updatedSuggestion : suggestion
        ));
        setBulkSuggestions(nextSuggestions);
      } else {
        const nextSuggestions = bulkSuggestions.filter((suggestion) => suggestion.suggestion_id !== suggestionId);
        setBulkSuggestions(nextSuggestions);
        if (nextSuggestions.length === 0) {
          setBulkSuggestionDialogOpen(false);
        }
      }
    } catch (e: unknown) {
      setBulkSuggestionError(getErrorMessage(e, "Erro ao aceitar item do reagendamento."));
    } finally {
      setBulkSuggestionActionKey(null);
    }
  }

  async function handleAcceptAllSuggestions(suggestionId: string) {
    const token = getAuthToken();

    setBulkSuggestionActionKey(`all:${suggestionId}`);
    try {
      await acceptScheduleSuggestionAll(token, suggestionId);
      await fetchTasks();
      setBulkSuggestionError(null);
      const nextSuggestions = bulkSuggestions.filter((suggestion) => suggestion.suggestion_id !== suggestionId);
      setBulkSuggestions(nextSuggestions);
      if (nextSuggestions.length === 0) {
        setBulkSuggestionDialogOpen(false);
      }
      showToast("Atrasadas reagendadas.", "info");
    } catch (e: unknown) {
      setBulkSuggestionError(getErrorMessage(e, "Erro ao aceitar reagendamento."));
    } finally {
      setBulkSuggestionActionKey(null);
    }
  }

  async function handleRejectSuggestions(suggestionId: string) {
    const token = getAuthToken();

    setBulkSuggestionActionKey(`reject:${suggestionId}`);
    try {
      await rejectScheduleSuggestion(token, suggestionId);
      setBulkSuggestionError(null);
      const nextSuggestions = bulkSuggestions.filter((suggestion) => suggestion.suggestion_id !== suggestionId);
      setBulkSuggestions(nextSuggestions);
      if (nextSuggestions.length === 0) {
        setBulkSuggestionDialogOpen(false);
      }
    } catch (e: unknown) {
      setBulkSuggestionError(getErrorMessage(e, "Erro ao ignorar sugestao."));
    } finally {
      setBulkSuggestionActionKey(null);
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

  const dailyWeaknesses = useMemo((): DailyWeaknessItem[] => {
    const studyItems = buildDailyWeaknessItems(performanceSummary);
    const bancoItems: DailyWeaknessItem[] = (longitudinal?.nodes ?? [])
      .filter((node) => node.exposure_count >= 2 && node.mastery_score < 0.5)
      .sort((a, b) => a.mastery_score - b.mastery_score)
      .slice(0, 2)
      .map((node) => ({
        key: `banco_${node.knowledge_node_id}`,
        area: "",
        theme: node.node_name ?? "Tópico do banco",
        accuracyPct: Math.round(node.mastery_score * 100),
        daysSinceLastStudy: node.days_since_last_seen,
        totalQuestions: node.correct_count + node.error_count,
        signal: "Domínio baixo no banco adaptativo.",
        action: "Inicie uma sessão focada no banco adaptativo.",
        confidencePct: null,
        impactPct: null,
        source: "banco",
      }));

    if (bancoItems.length === 0) {
      return studyItems;
    }

    return [...studyItems, ...bancoItems]
      .sort((a, b) => (a.accuracyPct ?? 101) - (b.accuracyPct ?? 101))
      .slice(0, 3);
  }, [longitudinal, performanceSummary]);

  const studentFirstName = firstName(displayName) ?? "Joseph";
  const greeting = getGreeting(studentFirstName);
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
  const nextActionSignals = [
    nextWeakness && nextWeakness.accuracyPct !== null && nextWeakness.accuracyPct < 60
      ? { key: "recent-error", label: "erro recente", className: "border-red-200 bg-red-50 text-red-700" }
      : null,
    turboOverview && turboOverview.due_count > 10
      ? { key: "urgent-review", label: "revisão urgente", className: "border-amber-200 bg-amber-50 text-amber-700" }
      : null,
    nextWeakness && nextWeakness.daysSinceLastStudy !== null && nextWeakness.daysSinceLastStudy > 7
      ? { key: "stalled-theme", label: "tema parado", className: "border-edge bg-surfaceMuted text-muted" }
      : null,
  ].filter((item): item is { key: string; label: string; className: string } => item !== null);

  function TaskRow({ task, overdue }: { task: ReviewTask; overdue?: boolean }) {
    const area = task.area as Area;
    const days = overdue ? getOverdueDays(task.due_date, today) : 0;
    const urgent = days >= 7;
    const accentColor = AREA_HEX[area] ?? AREA_HEX.OU;
    const token = getAuthToken() ?? "";
    const isExpanded = expandedTaskId === task.task_id;

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

  useEffect(() => {
    setTitle("Hoje");
    setActions(
      <Link
        href="/calendario"
        className="p-1.5 text-muted hover:text-ink"
        aria-label="Visão mensal"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
          <circle cx="5" cy="5" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="19" cy="5" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="5" cy="19" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="19" cy="19" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      </Link>,
    );
    return () => { setTitle(null); setActions(null); };
  }, [setTitle, setActions]);

  if (loading) return <TodaySkeleton />;

  return (
    <div className="space-y-5 md:space-y-8">
      <header>
        <div className="min-w-0">
          <h1 className="font-serif text-4xl font-semibold leading-tight md:text-5xl">{greeting}</h1>
          <p className="mt-2 text-base text-muted">Preparação inteligente para a residência.</p>
        </div>
      </header>

      {error && <div className="rounded-lg border border-danger bg-surface p-4 text-sm text-danger">{error}</div>}

      {!error && (
        <div className="grid gap-4 md:gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="space-y-4 md:space-y-6">
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-serif text-2xl font-semibold">Plano de estudos de hoje</h2>
                <Link href="/calendario" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
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
                      className={`flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 transition-colors sm:min-h-[4.25rem] sm:gap-1 sm:py-2 ${
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
                        <div className="p-4">
                          {/* Mobile layout: icon inline with text */}
                          <div className="flex items-start gap-3 sm:hidden">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-edge bg-paper">
                              <AreaIcon area={task.area} size={28} colored />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-serif text-base font-semibold leading-snug text-ink">{task.theme}</h3>
                              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ color: accentColor, backgroundColor: `${accentColor}18` }}>
                                  {AREA_FULL[task.area] ?? task.area}
                                </span>
                                <span className="text-xs text-muted">{task.expected_questions} questões</span>
                                {task.is_critical && <span className="text-xs font-semibold text-warning">prioritária</span>}
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 space-y-2 sm:hidden">
                            <ScoreBar pct={0} color={accentColor} />
                            <div className="flex gap-2">
                              <Link href={reviewTaskHref(task)} className="inline-flex flex-1 items-center justify-center rounded-xl border border-primary bg-primary px-3 py-2 text-xs font-semibold text-primaryInk">
                                Estudar
                              </Link>
                              <Button type="button" variant="secondary" size="sm" className="flex-1" onClick={() => setExpandedTaskId(isExpanded ? null : task.task_id)}>
                                Registrar
                              </Button>
                            </div>
                          </div>
                          {/* Desktop layout: 3-column grid */}
                          <div className="hidden sm:grid sm:grid-cols-[5.5rem_minmax(0,1fr)_8rem] sm:items-center sm:gap-4">
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
                                <Button type="button" variant="secondary" size="sm" className="flex-1" onClick={() => setExpandedTaskId(isExpanded ? null : task.task_id)}>
                                  Registrar
                                </Button>
                              </div>
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
                  <div className="flex items-center gap-3 rounded-lg border border-dashed border-edge bg-surface px-3 py-3 sm:justify-center sm:px-4">
                    <IconShield className="h-5 w-5 shrink-0 text-muted sm:h-6 sm:w-6" />
                    <p className="text-sm leading-snug text-muted">
                      {selectedDayIso === today
                        ? "Nenhuma revisão pendente para hoje."
                        : `Nenhuma revisão pendente para ${selectedDayLabel.toLowerCase()} ${formatDayMonth(selectedDayIso)}.`}
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section className="surface-hero overflow-hidden">
              <div className="px-5 pb-3 pt-5">
                <h2 className="font-serif text-2xl font-semibold">Próxima melhor ação</h2>
                <p className="mt-1 text-sm text-muted">Baseado nos seus erros e revisões pendentes:</p>
                {nextActionSignals.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {nextActionSignals.map((signal) => (
                      <span
                        key={signal.key}
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${signal.className}`}
                      >
                        {signal.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="mx-5 mb-5 overflow-hidden rounded-xl border border-edge/60">
                {nextWeakness ? (() => {
                  const areaColor = AREA_HEX[nextWeakness.area as Area] ?? AREA_HEX.OU;
                  const weaknessHref = `/banco-de-questoes?area=${encodeURIComponent(nextWeakness.area)}&theme=${encodeURIComponent(nextWeakness.theme)}&answer_status=unanswered_or_wrong`;
                  return (
                    <div className="flex flex-col sm:flex-row">
                      {/* Mobile: icon block centered at top */}
                      <div
                        className="flex items-center justify-center py-6 sm:hidden"
                        style={{ backgroundColor: `${areaColor}18` }}
                      >
                        <AreaIcon area={nextWeakness.area} size={48} colored />
                      </div>
                      {/* Desktop: icon column on left */}
                      <div
                        className="hidden shrink-0 items-center justify-center sm:flex sm:w-20 sm:self-stretch"
                        style={{ backgroundColor: `${areaColor}18` }}
                      >
                        <AreaIcon area={nextWeakness.area} size={38} colored />
                      </div>
                      {/* Text */}
                      <div className="flex min-w-0 flex-1 flex-col gap-1 px-4 py-3">
                        <p className="font-semibold text-ink">Revisar {nextWeakness.theme}</p>
                        <p className="text-xs text-muted">{nextWeakness.signal}</p>
                        {nextWeakness.accuracyPct !== null && (
                          <p className="text-xs font-medium" style={{ color: areaColor }}>
                            Acerto atual: {nextWeakness.accuracyPct}%
                          </p>
                        )}
                      </div>
                      {/* Button mobile */}
                      <div className="px-4 pb-4 sm:hidden">
                        <Link
                          href={weaknessHref}
                          className="block w-full rounded-lg border border-primary bg-primary py-2.5 text-center text-sm font-semibold text-primaryInk"
                        >
                          Começar revisão
                        </Link>
                      </div>
                      {/* Button desktop */}
                      <div className="hidden shrink-0 items-center pr-4 sm:flex">
                        <Link
                          href={weaknessHref}
                          className="inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primaryInk"
                        >
                          Começar revisão
                        </Link>
                      </div>
                    </div>
                  );
                })() : nextActionTask ? (
                  <div className="flex flex-col sm:flex-row">
                    {/* Mobile: icon block centered at top */}
                    <div className="flex items-center justify-center bg-[var(--amber-tint)] py-6 text-warning sm:hidden">
                      <IconNotebook className="h-12 w-12" />
                    </div>
                    {/* Desktop: icon column on left */}
                    <div className="hidden shrink-0 items-center justify-center bg-[var(--amber-tint)] text-warning sm:flex sm:w-20 sm:self-stretch">
                      <IconNotebook className="h-9 w-9" />
                    </div>
                    {/* Text */}
                    <div className="flex min-w-0 flex-1 flex-col gap-1 px-4 py-3">
                      <p className="font-semibold text-ink">Resolver {nextActionTask.theme}</p>
                      <p className="text-xs text-muted">{nextActionTask.expected_questions} questões programadas.</p>
                    </div>
                    {/* Button mobile */}
                    <div className="px-4 pb-4 sm:hidden">
                      <Link
                        href={reviewTaskHref(nextActionTask)}
                        className="block w-full rounded-lg border border-primary bg-primary py-2.5 text-center text-sm font-semibold text-primaryInk"
                      >
                        Começar
                      </Link>
                    </div>
                    {/* Button desktop */}
                    <div className="hidden shrink-0 items-center pr-4 sm:flex">
                      <Link
                        href={reviewTaskHref(nextActionTask)}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primaryInk"
                      >
                        Começar
                      </Link>
                    </div>
                  </div>
                ) : (
                  <p className="px-4 py-4 text-sm text-muted">Você está sem pendências imediatas. Um bloco leve de manutenção no banco de questões mantém o ritmo.</p>
                )}
              </div>
            </section>

            {overdueTasks.length > 0 && (
              <section className="rounded-2xl border border-edge bg-surface p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-serif text-2xl font-semibold">Atrasadas — {overdueTasks.length}</h2>
                    <p className="mt-1 text-sm text-muted">Reagende o bloco inteiro para reorganizar a fila sem aprovar uma por uma.</p>
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    className="shrink-0"
                    leftIcon={<IconRefresh className="h-3.5 w-3.5" />}
                    loading={bulkSuggestionLoading}
                    disabled={bulkSuggestionActionKey !== null}
                    onClick={() => void handlePrepareBulkReschedule()}
                  >
                    {overdueTasks.length > 1 ? "Reagendar todas" : "Reagendar atrasada"}
                  </Button>
                </div>
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

            <BancoSidebarCard longitudinal={longitudinal} />

            {turboOverview && turboOverview.due_count > 0 && (
              <section
                className="rounded-lg border bg-surface p-5 shadow-sm"
                style={{ borderColor: "color-mix(in srgb, var(--color-accent) 28%, var(--color-edge))" }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-accent"
                    style={{ backgroundColor: "color-mix(in srgb, var(--color-accent) 12%, transparent)" }}
                  >
                    <IconCards className="h-8 w-8" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-serif text-2xl font-semibold">Flashcards vencidos</h2>
                    <p className="text-sm text-muted">
                      {turboOverview.due_count} cards{turboOverview.estimated_minutes ? ` · ~${turboOverview.estimated_minutes} min` : ""}
                    </p>
                  </div>
                  <Link
                    href="/cards-adaptativos"
                    className="rounded-lg border border-accent px-3 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent hover:text-accentInk"
                  >
                    Revisar
                  </Link>
                </div>
              </section>
            )}

            {recentReviewStudies.length > 0 && (
              <section className="rounded-lg border border-edge bg-surface p-5 shadow-sm">
                <h2 className="font-serif text-2xl font-semibold">Últimas revisões</h2>
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

      <RescheduleSuggestionDialog
        open={bulkSuggestionDialogOpen}
        suggestions={bulkSuggestions}
        actionKey={bulkSuggestionActionKey}
        title="Reagendar atrasadas"
        loading={bulkSuggestionLoading}
        error={bulkSuggestionError}
        emptyMessage="Nenhuma sugestao nova de reagendamento foi gerada."
        onClose={() => setBulkSuggestionDialogOpen(false)}
        onAcceptItem={handleAcceptSuggestionItem}
        onAcceptAll={handleAcceptAllSuggestions}
        onReject={handleRejectSuggestions}
      />
    </div>
  );
}
