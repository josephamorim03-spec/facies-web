"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useNavbar } from "@/lib/NavbarContext";
import AreaDot from "@/components/AreaDot";
import { Button } from "@/components/ui/Button";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Alert } from "@/components/ui/Alert";
import { areaHex } from "@/lib/areaColors";
import { displayAreaLabel, resolveDisplayArea, type DisplayArea } from "@/lib/areaDisplay";
import { getAuthToken } from "@/lib/auth";
import { invalidateLearningQueries } from "@/lib/queryKeys";
import { getErrorMessage } from "@/lib/error-utils";
import { useAuthToken } from "@/lib/useAuthToken";
import { useToast } from "@/lib/useToast";
import { TopBarActionLink } from "@/components/TopBarActionLink";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CalendarDays, Trash2 } from "lucide-react";
import {
  acceptScheduleSuggestionItem,
  acceptScheduleSuggestionAll,
  CalendarEventOut,
  DirectedStudyListItem,
  getOperationalTurboSessionDailyCompletedCards,
  getOperationalTurboOverview,
  getProfile,
  getQuestionBankLongitudinalDiagnosis,
  getStudentToday,
  listEvents,
  listScheduleSuggestions,
  getStudyPerformanceSummary,
  listDirectedStudies,
  listQuestionBankSessions,
  deleteQuestionBankSession,
  listReviewTasks,
  rejectScheduleSuggestion,
  type QuestionBankSession,
  type ScheduleSuggestion,
  type OperationalTurboOverview,
  type QuestionBankLongitudinalDiagnosis,
  ReviewTask,
  type StudyPerformanceSummary,
  type StudentToday,
  type TrainerPrescription,
  triggerScheduleSuggestion,
} from "@/lib/api";
import { AreaIcon } from "@/components/AreaIcon";
import { RescheduleSuggestionDialog } from "@/app/cronograma/_components/RescheduleSuggestionDialog";
import { IconRefresh } from "@/app/cronograma/_components/CronogramaIcons";
import { buildWeeklyOpsMetrics } from "@/app/cronograma/_lib/weeklyOpsMetrics";
import { writeCronogramaViewModeSession } from "@/app/cronograma/_lib/viewModeSession";
import { buildDayActivitySummary } from "@/app/cronograma/_lib/dayActivitySummary";
import BancoSidebarCard from "./_components/BancoSidebarCard";
import { CardsDuePanel } from "./_components/CardsDuePanel";
import { TodayDaySummarySection } from "./_components/TodayDaySummary";
import { TodayPageSkeleton } from "./_components/TodayPageSkeleton";
import { TodayBackupActions } from "./_components/TodayBackupActions";
import { TodayDetails } from "./_components/TodayDetails";
import { TodayEmptyState } from "./_components/TodayEmptyState";
import { TodayLoadNote } from "./_components/TodayLoadNote";
import { TodayPrimaryAction } from "./_components/TodayPrimaryAction";
import { TodaySchedulePreview } from "./_components/TodaySchedulePreview";
import { TrainerActionCTA } from "@/components/trainer/TrainerActionCTA";
import { EmptyState } from "@/components/ui/EmptyState";
import { OutcomeCard } from "@/components/ui/OutcomeCard";
import { StudyActionCard } from "@/components/ui/StudyActionCard";
import { DataFreshness, LearningStatus } from "@/components/student/StudentExperienceUI";
import { useStudentExperience } from "@/lib/StudentExperienceContext";

type Area = DisplayArea;

// CTA label for the trainer prescription's primary action, by action kind.
const PRIMARY_ACTION_CTA: Record<string, string> = {
  resume_session: "Continuar sessão",
  targeted_practice: "Praticar questões",
  scheduled_topic_practice: "Praticar tema",
  flashcard_review: "Revisar cards",
  simulation: "Iniciar simulado",
  manual_study: "Abrir caderno",
};

// Rótulos curtos de fatores/ganhos — o "motivo" é respondido pelo conteúdo do
// card (não por um painel "por que recebi isso").
const TRAINER_FACTOR_LABEL: Record<string, string> = {
  deficit: "lacuna",
  forgetting: "esquecimento",
  urgency: "urgência",
  transfer_gap: "transferência",
  uncertainty: "incerteza",
  exam_weight: "peso na prova",
  under_coverage: "pouco praticado",
};
const TRAINER_OUTCOME_LABEL: Record<string, string> = {
  retention: "retenção",
  transfer: "transferência",
  speed: "velocidade",
  calibration: "calibração",
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
  const displayArea = resolveDisplayArea(task.area, task.theme, task.subtheme);
  const params = new URLSearchParams({
    review_task_id: task.task_id,
    activity_id: task.task_id,
    source: "calendar-review",
    date: task.due_date,
    area: displayArea,
    theme: task.theme,
    expected_questions: String(Math.max(1, Number(task.expected_questions ?? 10))),
  });
  if (task.knowledge_node_id) params.set("knowledge_node_id", task.knowledge_node_id);
  return `/banco?${params.toString()}`;
}


function IconShield({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 3 5 6v5c0 4.5 2.8 8.2 7 10 4.2-1.8 7-5.5 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-5" />
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
  eventData: CalendarEventOut[];
  cardsDoneToday: number;
  cardsOverview: OperationalTurboOverview | null;
  performanceSummary: StudyPerformanceSummary | null;
  activeSessions: QuestionBankSession[];
  weeklyGoal: number;
  displayName: string | null;
};

// Sessão em andamento mais recente para o card "Continue de onde parou".
function sortActiveSessions(sessions: QuestionBankSession[]): QuestionBankSession[] {
  return sessions
    .filter((session) => session.status === "active")
    .slice()
    .sort(
      (a, b) =>
        Date.parse(b.updated_at ?? b.created_at) - Date.parse(a.updated_at ?? a.created_at),
    );
}

async function loadTodayPageData(token: string): Promise<TodayPageData> {
  const today = todayISO();
  const turboOverviewRequest = getOperationalTurboOverview(token, { previewLimit: 3 }).catch(() => null);
  const performanceSummaryRequest = getStudyPerformanceSummary(token).catch(() => null);
  const activeSessionRequest = listQuestionBankSessions(token, { status: "active", limit: 10 }).catch(
    () => [] as QuestionBankSession[],
  );
  const cardsDoneTodayRequest = getOperationalTurboSessionDailyCompletedCards(token, 1)
    .then((data) => data.by_day.find((row) => row.day === today)?.cards_completed ?? 0)
    .catch(() => 0);
  const [pendingData, doneData, studyData, eventData, profile, cardsDoneToday, cardsOverview, performanceSummary, recentSessions] =
    await Promise.all([
      listReviewTasks(token, { status: "pending", date: today }),
      listReviewTasks(token, { status: "done", date: today }),
      listDirectedStudies(token),
      listEvents(token),
      getProfile(token),
      cardsDoneTodayRequest,
      turboOverviewRequest,
      performanceSummaryRequest,
      activeSessionRequest,
    ]);
  return {
    pendingData,
    doneData,
    studyData,
    eventData,
    cardsDoneToday: Math.max(0, Number(cardsDoneToday ?? 0)),
    cardsOverview,
    performanceSummary,
    activeSessions: sortActiveSessions(recentSessions),
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

export default function LegacyTodayPage() {
  const queryClient = useQueryClient();
  const { tokenResolved } = useAuthToken();
  const { setTitle, setActions } = useNavbar();
  const { showToast } = useToast();
  const { enabled: experienceEnabled, experience } = useStudentExperience();
  const [tasks, setTasks] = useState<ReviewTask[]>([]);
  const [doneTasks, setDoneTasks] = useState<ReviewTask[]>([]);
  const [studies, setStudies] = useState<DirectedStudyListItem[]>([]);
  const [events, setEvents] = useState<CalendarEventOut[]>([]);
  const [cardsDoneToday, setCardsDoneToday] = useState(0);
  const [turboOverview, setTurboOverview] = useState<OperationalTurboOverview | null>(null);
  const [performanceSummary, setPerformanceSummary] = useState<StudyPerformanceSummary | null>(null);
  const [longitudinal, setLongitudinal] = useState<QuestionBankLongitudinalDiagnosis | null>(null);
  const [activeSessions, setActiveSessions] = useState<QuestionBankSession[]>([]);
  const [discardSession, setDiscardSession] = useState<QuestionBankSession | null>(null);
  const [studentToday, setStudentToday] = useState<StudentToday | null>(null);
  const [studentTodayFailed, setStudentTodayFailed] = useState(false);
  const [prescription] = useState<TrainerPrescription | null>(null);
  const [weeklyGoal, setWeeklyGoal] = useState(200);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [secondaryLoading, setSecondaryLoading] = useState(false);
  const [daySummaryError, setDaySummaryError] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [bulkSuggestionDialogOpen, setBulkSuggestionDialogOpen] = useState(false);
  const [bulkSuggestionLoading, setBulkSuggestionLoading] = useState(false);
  const [bulkSuggestionError, setBulkSuggestionError] = useState<string | null>(null);
  const [bulkSuggestionActionKey, setBulkSuggestionActionKey] = useState<string | null>(null);
  const [bulkSuggestions, setBulkSuggestions] = useState<ScheduleSuggestion[]>([]);

  const today = useMemo(() => todayISO(), []);
  const weekDays = useMemo(() => getWeekDays(), []);
  const [selectedDayIso, setSelectedDayIso] = useState(today);
  const planningTodayHref = `/cronograma?day=${today}`;

  async function fetchTasks(showLoadingState: boolean = false) {
    const token = getAuthToken();
    const studentTodayRequest = getStudentToday(token).catch(() => null);
    const longitudinalRequest = getQuestionBankLongitudinalDiagnosis(token).catch(() => null);
    const pageDataRequest = loadTodayPageData(token);

    if (showLoadingState && !studentToday) setLoading(true);
    setSecondaryLoading(true);
    setDaySummaryError(null);

    void pageDataRequest
      .then((data) => {
        setTasks(data.pendingData);
        setDoneTasks(data.doneData);
        setStudies(data.studyData);
        setEvents(data.eventData);
        setCardsDoneToday(data.cardsDoneToday);
        setTurboOverview(data.cardsOverview);
        setPerformanceSummary(data.performanceSummary);
        setActiveSessions(data.activeSessions);
        setWeeklyGoal(data.weeklyGoal);
        setDisplayName(data.displayName);
      })
      .catch((cause: unknown) => {
        const message = getErrorMessage(cause, "Erro ao carregar atividades de hoje.");
        setDaySummaryError(message);
        if (!studentToday) setError(message);
      })
      .finally(() => setSecondaryLoading(false));

    try {
      const todayData = await studentTodayRequest;
      setError("");
      setStudentToday(todayData);
      setStudentTodayFailed(todayData === null);
    } catch (e: unknown) {
      setStudentTodayFailed(true);
      if (!studentToday) {
        setStudentToday(null);
        setError(getErrorMessage(e, "Erro ao carregar revisões."));
      }
    } finally {
      if (showLoadingState) setLoading(false);
    }

    void longitudinalRequest.then((diagnosis) => {
      setLongitudinal(diagnosis);
    });

  }

  async function discardActiveSession() {
    if (!discardSession) return;
    const token = getAuthToken();
    try {
      const result = await deleteQuestionBankSession(token, discardSession.session_id);
      setActiveSessions((current) =>
        current.filter((session) => session.session_id !== discardSession.session_id),
      );
      void invalidateLearningQueries(queryClient);
      setDiscardSession(null);
      showToast(
        result.adaptive_evidence_retained
          ? "Sessão removida. As respostas já corrigidas continuam ajustando suas recomendações."
          : "Sessão descartada sem enviar respostas.",
        "success",
      );
    } catch (cause) {
      setDiscardSession(null);
      showToast(getErrorMessage(cause), "error");
    }
  }

  useEffect(() => {
    writeCronogramaViewModeSession("week");
  }, []);

  useEffect(() => {
    if (!tokenResolved) return;
    void fetchTasks(true);
    // fetchTasks intentionally reads the current cached state to avoid a full reload during background refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const studentFirstName = firstName(displayName);
  const greeting = getGreeting(studentFirstName);
  const legacyTotalDoneQuestions = studies.reduce((sum, study) => sum + Math.max(0, Number(study.total_questions ?? 0)), 0);
  const legacyTotalCorrectQuestions = studies.reduce((sum, study) => sum + Math.max(0, Number(study.correct_questions ?? 0)), 0);
  const hasCanonicalExperience = experienceEnabled && experience !== null;
  const totalDoneQuestions = hasCanonicalExperience
    ? Number(experience.activity.questions_answered.value ?? 0)
    : legacyTotalDoneQuestions;
  const totalCorrectQuestions = hasCanonicalExperience
    ? Number(experience.activity.questions_correct.value ?? 0)
    : legacyTotalCorrectQuestions;
  const globalAccuracy = formatRatioPercent(totalCorrectQuestions, totalDoneQuestions);
  const totalWrongQuestions = Math.max(0, totalDoneQuestions - totalCorrectQuestions);
  const canonicalWeeklyGoal = hasCanonicalExperience
    ? Number(experience.activity.weekly_goal_questions.value ?? 0)
    : weeklyGoal;
  const canonicalWeeklyDone = hasCanonicalExperience
    ? Number(experience.activity.questions_answered.value ?? 0)
    : weeklyOpsMetrics.doneQuestionsWeek;
  const weeklyGoalPct = hasCanonicalExperience
    ? Number(experience.activity.weekly_progress_pct.value ?? 0)
    : weeklyGoal > 0
      ? Math.min(100, Math.round((weeklyOpsMetrics.doneQuestionsWeek / weeklyGoal) * 100))
      : 0;
  const topAreaSummaries = (performanceSummary?.area_summaries ?? [])
    .filter((item) => item.total_questions > 0)
    .sort((a, b) => b.total_questions - a.total_questions)
    .slice(0, 5);
  const recentReviewStudies = studies
    .filter((study) => study.is_review)
    .slice()
    .sort((a, b) => new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime())
    .slice(0, 3);
  // The single best next step is decided by the trainer policy engine
  // (server-side), not reconstructed here. `/hoje` renders the prescription.
  const primaryAction = prescription?.primary_action ?? null;
  const nextActionSignals = (prescription?.signals ?? []).map((signal) => ({
    key: signal.key,
    label: signal.label,
    className:
      signal.severity === "critical"
        ? "border-danger/40 text-danger"
        : signal.severity === "warning"
          ? "border-warning/40 text-warning"
          : "border-edge text-muted",
  }));

  // O "motivo" é a voz do tutor (serif): a mesma fonte da ação, para não soar como
  // um segundo cérebro. "tone" só pinta o eyebrow da nota.
  const heroAction = primaryAction
    ? {
        area: resolveDisplayArea(primaryAction.start_payload?.area, primaryAction.title, primaryAction.rationale),
        title: primaryAction.title,
        reason: primaryAction.rationale,
        tone: primaryAction.signals.some((s) => s.severity === "critical")
          ? ("attention" as const)
          : ("neutral" as const),
        minutes: primaryAction.estimated_minutes,
        metric: null as string | null,
        href: primaryAction.href ?? "/banco",
        ctaLabel: PRIMARY_ACTION_CTA[primaryAction.kind] ?? "Começar",
      }
    : null;
  const todayActivitySummary = useMemo(
    () =>
      buildDayActivitySummary({
        dateIso: today,
        pendingTasks: tasks,
        doneTasks,
        studies,
        events,
        activeSessions,
        cardsCompleted: cardsDoneToday,
        primaryHref: studentToday?.primary_action.href ?? heroAction?.href ?? null,
      }),
    [activeSessions, cardsDoneToday, doneTasks, events, heroAction?.href, studentToday?.primary_action.href, studies, tasks, today],
  );

  function TaskRow({ task, overdue }: { task: ReviewTask; overdue?: boolean }) {
    const area = resolveDisplayArea(task.area, task.theme, task.subtheme);
    const days = overdue ? getOverdueDays(task.due_date, today) : 0;
    const urgent = days >= 7;
    const accentColor = areaHex(area);

    return (
      <li
        className="rounded-surface border border-edge bg-paper p-3 shadow-soft"
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
            <Link
              href={reviewTaskHref(task)}
              className="inline-flex flex-1 items-center justify-center rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primaryInk transition hover:brightness-105 sm:flex-none"
            >
              Estudar
            </Link>
          </div>
        </div>
      </li>
    );
  }

  useEffect(() => {
    setTitle("Hoje");
    setActions(
      <TopBarActionLink href={planningTodayHref} label="Abrir planejamento de hoje" title="Abrir planejamento de hoje">
        <CalendarDays className="h-5 w-5" aria-hidden="true" />
      </TopBarActionLink>,
    );
    return () => { setTitle(null); setActions(null); };
  }, [planningTodayHref, setTitle, setActions]);

  // Mesmo skeleton que o `loading.tsx` da rota ja renderizou: a troca rota ->
  // cliente nao muda de forma. Antes eram duas copias quase identicas que ja
  // tinham divergido entre si.
  if (loading) return <TodayPageSkeleton />;

  if (!error && studentToday) {
    const isRestState = ["rest", "rest_or_short_block"].includes(
      studentToday.primary_action.kind,
    );
    return (
      <div className="space-y-5 md:space-y-6">
        <header className="space-y-1">
          <h1 className="font-serif text-3xl font-semibold leading-tight text-ink md:text-4xl">{greeting}</h1>
        </header>

        {isRestState ? (
          <TodayEmptyState />
        ) : (
          <TodayPrimaryAction action={studentToday.primary_action} />
        )}

        <TodayDaySummarySection
          summary={secondaryLoading && todayActivitySummary.total === 0 ? null : todayActivitySummary}
          loading={secondaryLoading}
          error={daySummaryError}
          planningHref={planningTodayHref}
        />

        {activeSessions.map((activeSession) => (
          <section
            key={activeSession.session_id}
            className="flex flex-col gap-3 border-y border-edge py-4 sm:flex-row sm:items-center sm:justify-between"
            aria-label="Sessão em andamento"
          >
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                Continue de onde parou
              </p>
              <p className="mt-1 truncate font-serif text-lg font-semibold leading-tight text-ink">
                {activeSession.theme ?? activeSession.full_exam_name ?? "Sessão do banco"}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {activeSession.answered_count}/{activeSession.total_questions} respondidas
              </p>
            </div>
            <div className="flex w-full shrink-0 gap-2 sm:w-auto">
              <button
                type="button"
                onClick={() => setDiscardSession(activeSession)}
                className="inline-flex min-h-11 items-center justify-center p-3 text-muted transition hover:text-danger"
                title="Descartar sessão"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Descartar sessão</span>
              </button>
              <Link
                href={`/banco/sessao/${activeSession.session_id}`}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-control border border-primary px-5 text-sm font-semibold text-primary transition hover:bg-surfaceMuted sm:flex-none"
              >
                Continuar
              </Link>
            </div>
          </section>
        ))}

        <TodayLoadNote load={studentToday.today_load} />

        <TodayBackupActions actions={studentToday.backup_actions} />

        <TodaySchedulePreview
          preview={studentToday.schedule_preview}
          loading={bulkSuggestionLoading}
          disabled={bulkSuggestionActionKey !== null}
          onPrepareReschedule={() => void handlePrepareBulkReschedule()}
        />

        <TodayDetails today={studentToday}>
          <CardsDuePanel overview={turboOverview} />
          <BancoSidebarCard longitudinal={longitudinal} />
        </TodayDetails>

        <ConfirmDialog
          open={discardSession !== null}
          title="Descartar sessão?"
          message={
            discardSession?.feedback_timing === "immediate" &&
            discardSession.answered_count > 0
              ? "A sessão sumirá do histórico. Como o gabarito já foi exibido, as respostas dadas continuarão sendo contabilizadas somente para adaptar futuras recomendações."
              : "A sessão e as respostas ainda não enviadas serão apagadas. Ela não aparecerá no histórico nem afetará seus resultados."
          }
          cancelLabel="Manter sessão"
          confirmLabel="Descartar"
          onCancel={() => setDiscardSession(null)}
          onConfirm={() => void discardActiveSession()}
        />

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

  return (
    <div className="space-y-5 md:space-y-8">
      <header>
        <div className="min-w-0">
          <h1 className="font-serif text-4xl font-semibold leading-tight md:text-5xl">{greeting}</h1>
        </div>
      </header>

      {error && <Alert variant="danger">{error}</Alert>}
      {!error && studentTodayFailed && (
        <Alert variant="warning">Mostrando dados anteriores.</Alert>
      )}

      {!error && (
        <>
          {/* Próxima ação — o único melhor passo, entregue pronto no topo */}
          <section aria-label="Sua próxima ação">
            {heroAction ? (
              <StudyActionCard
                eyebrow={`Sua próxima ação${prescription ? ` · ${prescription.plan_progress.completed_actions}/${prescription.plan_progress.total_actions} etapas` : ""}`}
                title={heroAction.title}
                reason={heroAction.reason}
                minutes={heroAction.minutes}
                expectedResult={primaryAction?.outcome_targets.map((target) => TRAINER_OUTCOME_LABEL[target] ?? target).join(" · ") || heroAction.metric}
                leading={<AreaIcon area={heroAction.area} size={44} colored />}
                metadata={
                  <>
                    {primaryAction?.why_factors.slice(0, 3).map((wf) => TRAINER_FACTOR_LABEL[wf.factor] ?? wf.factor).join(" · ")}
                    {nextActionSignals.map((signal) => (
                      <span key={signal.key} className={`rounded-full border px-2 py-0.5 font-medium ${signal.className}`}>{signal.label}</span>
                    ))}
                  </>
                }
                action={primaryAction && prescription ? (
                  <TrainerActionCTA
                    action={primaryAction}
                    recommendationId={prescription.recommendation_id}
                    sourcePage="/hoje"
                    label={heroAction.ctaLabel}
                    className="w-full px-5 py-3 sm:w-auto"
                  />
                ) : null}
              />
            ) : (
              <EmptyState
                title="Suficiente por hoje"
                description="Carga do dia concluída."
                icon={<IconShield className="h-6 w-6 text-success" />}
                action={<Link href="/banco" className="paper-control inline-flex min-h-11 items-center gap-2 border border-edge px-4 text-sm font-semibold text-ink">Manutenção opcional <IconArrowRight className="h-4 w-4" /></Link>}
              />
            )}
          </section>

          <TodayDaySummarySection
            summary={secondaryLoading && todayActivitySummary.total === 0 ? null : todayActivitySummary}
            loading={secondaryLoading}
            error={daySummaryError}
            planningHref={planningTodayHref}
          />

          {prescription?.previous_outcome && (
            <OutcomeCard
              narrative={prescription.previous_outcome.narrative}
              evidence={prescription.previous_outcome.evidence.map((item) => ({
                ...item,
                unit: item.unit ? `${item.unit === "%" ? "" : " "}${item.unit}` : null,
                kind: item.kind === "observed" ? "observed" : "estimated",
              }))}
            />
          )}

          {prescription && prescription.secondary_actions.length > 0 && (
            <section className="space-y-3" aria-label="Outras ações adequadas">
              <div>
                <h2 className="font-serif text-xl font-semibold text-ink">Outras ações adequadas</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {prescription.secondary_actions.map((action) => (
                  <article key={action.action_id ?? action.kind} className="flex flex-col gap-3 rounded-xl border border-edge bg-paper p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-ink">{action.title}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-muted">{action.rationale}</p>
                    </div>
                    <TrainerActionCTA
                      action={action}
                      recommendationId={prescription.recommendation_id}
                      sourcePage="/hoje"
                      label="Escolher"
                      className="shrink-0"
                    />
                  </article>
                ))}
              </div>
            </section>
          )}

          {activeSessions
            .filter((session) => !heroAction || !heroAction.href.includes(session.session_id))
            .map((activeSession) => (
              <section
                key={activeSession.session_id}
                className="flex flex-col gap-3 rounded-surface border border-edge bg-surface p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between"
                style={{ boxShadow: `inset 3px 0 0 ${areaHex(resolveDisplayArea(activeSession.area, activeSession.theme, activeSession.full_exam_name))}` }}
                aria-label="Sessão em andamento"
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                    Continue de onde parou
                  </p>
                  <p className="mt-1 truncate font-serif text-lg font-semibold leading-tight text-ink">
                    {activeSession.theme ?? activeSession.full_exam_name ?? "Sessão do banco"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {activeSession.answered_count}/{activeSession.total_questions} respondidas
                    {activeSession.resolution_mode === "simulation" ? " · simulado" : ""}
                  </p>
                </div>
                <div className="flex w-full shrink-0 gap-2 sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setDiscardSession(activeSession)}
                    className="inline-flex min-h-11 items-center justify-center p-3 text-muted transition hover:text-danger"
                    title="Descartar sessão"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">Descartar sessão</span>
                  </button>
                  <Link
                    href={`/banco/sessao/${activeSession.session_id}`}
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-primary px-5 text-sm font-semibold text-primary transition hover:bg-surfaceMuted sm:flex-none"
                  >
                    Continuar
                    <IconArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </section>
            ))}

          <div className="grid gap-4 md:gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="space-y-4 md:space-y-6">
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-serif text-2xl font-semibold">Plano de estudos de hoje</h2>
                <Link href="/cronograma" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
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
                          <AreaDot key={task.task_id} area={resolveDisplayArea(task.area, task.theme, task.subtheme)} />
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-3">
                {selectedDayTasks.length > 0 ? (
                  selectedDayTasks.map((task) => {
                    const displayArea = resolveDisplayArea(task.area, task.theme, task.subtheme);
                    const accentColor = areaHex(displayArea);
                    return (
                      <article key={task.task_id} className="overflow-hidden rounded-surface border border-edge bg-surface shadow-soft">
                        <div className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-edge bg-paper sm:h-14 sm:w-14">
                              <AreaIcon area={displayArea} size={30} colored />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-serif text-base font-semibold leading-snug text-ink sm:text-lg">{task.theme}</h3>
                              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ color: accentColor, backgroundColor: `color-mix(in srgb, ${accentColor} 14%, transparent)` }}>
                                  {displayAreaLabel(displayArea)}
                                </span>
                                <span className="text-xs text-muted">{task.expected_questions} questões</span>
                                {task.is_critical && <span className="text-xs font-semibold text-warning">prioritária</span>}
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            <Link href={reviewTaskHref(task)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-control border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primaryInk transition hover:brightness-[1.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                              Estudar
                            </Link>
                          </div>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className="paper-dashed flex items-center gap-3 bg-surface px-3 py-3 sm:justify-center sm:px-4">
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

            {overdueTasks.length > 0 && (
              <section className="rounded-surface border border-edge bg-surface p-4 shadow-soft">
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
            {/* Progresso — uma leitura calma (acerto + meta), não cinco cards concorrentes */}
            <section className="rounded-surface border border-edge bg-surface p-5 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-serif text-2xl font-semibold">Progresso desta semana</h2>
                  {hasCanonicalExperience ? (
                    <DataFreshness
                      status={experience.status}
                      generatedAt={experience.generated_at}
                      missingSources={experience.missing_sources}
                    />
                  ) : null}
                </div>
                <Link href="/evolucao" className="text-xs font-semibold text-primary hover:underline">Ver detalhes</Link>
              </div>
              <div className="mt-5 flex items-center gap-5">
                <ProgressRing pct={globalAccuracy} label={`de ${totalDoneQuestions} questões`} />
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-ink">Acertos</span>
                    <span className="text-xl font-semibold tabular-nums text-success">{totalCorrectQuestions}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-ink">Erros</span>
                    <span className="text-xl font-semibold tabular-nums text-danger">{totalWrongQuestions}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-ink">Respondidas</span>
                    <span className="text-xl font-semibold tabular-nums text-muted">{totalDoneQuestions}</span>
                  </div>
                </div>
              </div>
              <div className="mt-5 border-t border-edge pt-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-ink">Meta semanal</span>
                  <Link href="/preferencias" className="text-xs font-semibold text-primary hover:underline">Editar</Link>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <ScoreBar pct={weeklyGoalPct} color="var(--color-success)" />
                  <span className="w-16 shrink-0 text-right text-sm tabular-nums text-ink">{canonicalWeeklyDone}/{canonicalWeeklyGoal}</span>
                </div>
                <p className="mt-2 text-xs text-muted">
                  {weeklyOpsMetrics.daysRemainingInWeek} dia{weeklyOpsMetrics.daysRemainingInWeek === 1 ? "" : "s"} restante{weeklyOpsMetrics.daysRemainingInWeek === 1 ? "" : "s"} · meta de {canonicalWeeklyGoal} questões
                </p>
              </div>
            </section>

            {hasCanonicalExperience ? <LearningStatus load={experience.review_load} /> : null}

            <CardsDuePanel overview={turboOverview} />

            {/* Aprofundamento opt-in — fica fora do caminho até o aluno pedir */}
            <details className="group rounded-lg border border-edge bg-surface">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-semibold text-ink">
                <span>Ver mais sobre seu desempenho</span>
                <IconArrowRight className="h-4 w-4 text-muted transition-transform group-open:rotate-90" />
              </summary>
              <div className="space-y-5 border-t border-edge p-5">
                {topAreaSummaries.length > 0 && (
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-serif text-lg font-semibold">Resumo por área</h3>
                      <Link href="/evolucao" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                        Relatório
                        <IconArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                    <div className="mt-3 space-y-3">
                      {topAreaSummaries.map((areaSummary) => {
                        const pct = Math.round(areaSummary.area_accuracy_pct ?? 0);
                        const resolvedArea = resolveDisplayArea(areaSummary.area);
                        const color = areaHex(resolvedArea);
                        return (
                          <div key={areaSummary.area} className="space-y-1">
                            <div className="flex items-center justify-between gap-3 text-sm">
                              <span className="min-w-0 truncate text-ink">{AREA_FULL[resolvedArea] ?? displayAreaLabel(resolvedArea)}</span>
                              <span className="font-semibold tabular-nums" style={{ color }}>{pct}%</span>
                            </div>
                            <ScoreBar pct={pct} color={color} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <BancoSidebarCard longitudinal={longitudinal} />

                {recentReviewStudies.length > 0 && (
                  <div>
                    <h3 className="font-serif text-lg font-semibold">Últimas revisões</h3>
                    <div className="mt-3 space-y-3">
                      {recentReviewStudies.map((study) => (
                        <Link
                          key={study.study_id}
                          href={study.import_session_id ? `/cronograma/importar/${study.import_session_id}/resultados` : `/banco?area=${encodeURIComponent(study.area)}&theme=${encodeURIComponent(study.theme)}`}
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
                  </div>
                )}

                {topAreaSummaries.length === 0 && recentReviewStudies.length === 0 && (
                  <p className="text-sm text-muted">O resumo aparece depois dos primeiros registros.</p>
                )}
              </div>
            </details>
          </aside>
          </div>
        </>
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
      <ConfirmDialog
        open={discardSession !== null}
        title="Descartar sessão?"
        message={
          discardSession?.feedback_timing === "immediate" &&
          discardSession.answered_count > 0
            ? "A sessão sumirá do histórico. Como o gabarito já foi exibido, as respostas dadas continuarão sendo contabilizadas somente para adaptar futuras recomendações."
            : "A sessão e as respostas ainda não enviadas serão apagadas. Ela não aparecerá no histórico nem afetará seus resultados."
        }
        cancelLabel="Manter sessão"
        confirmLabel="Descartar"
        onCancel={() => setDiscardSession(null)}
        onConfirm={() => void discardActiveSession()}
      />
    </div>
  );
}
