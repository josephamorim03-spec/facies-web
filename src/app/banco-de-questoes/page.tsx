"use client";

import { Suspense, useCallback, useEffect, useMemo, useState, type JSX } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  browseQuestionBankQuestions,
  browseQuestionBankTopics,
  createQuestionBankSession,
  getReviewAgenda,
  getQuestionBankNextAction,
  getQuestionBankPerformance,
  previewQuestionBankAvailability,
  type QuestionBankAnswerStatus,
  type QuestionBankAvailability,
  type QuestionBankNextAction,
  type QuestionBankPerformance,
  type QuestionBankQuestion,
  type QuestionBankResolutionMode,
  type QuestionBankSessionCreatePayload,
  type QuestionBankTopic,
  type FullExamType,
  type StudyKind,
} from "@/lib/api";
import { useNavbar } from "@/lib/NavbarContext";
import { useAuthToken } from "@/lib/useAuthToken";
import { Alert } from "@/components/ui/Alert";
import FiltersBar from "./_components/FiltersBar";
import QuestionList from "./_components/QuestionList";
import CreateSessionPanel from "./_components/CreateSessionPanel";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function IconBookOpen({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H7a3 3 0 0 0-3 3V5.5Z" />
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20" />
      <path d="M8 7h8" />
      <path d="M8 11h7" />
    </svg>
  );
}

function IconTrophy({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M5 5H3v2a4 4 0 0 0 4 4" />
      <path d="M19 5h2v2a4 4 0 0 1-4 4" />
    </svg>
  );
}

function IconTarget({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3" />
      <path d="M22 12h-3" />
      <path d="M12 22v-3" />
      <path d="M2 12h3" />
      <path d="m16 8 4-4" />
    </svg>
  );
}

function IconChevronRight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m7 4 6 6-6 6" />
    </svg>
  );
}

type SessionIntentCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  active: boolean;
  Icon: (props: { className?: string }) => JSX.Element;
  onClick: () => void;
};

function SessionIntentCard({ eyebrow, title, description, active, Icon, onClick }: SessionIntentCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "group flex items-center gap-4 rounded-xl border bg-surface p-4 text-left transition-all hover:shadow-[var(--soft-shadow)] md:flex-col md:items-start md:justify-between md:min-h-[8rem] md:p-5",
        active ? "border-primary bg-surfaceMuted shadow-sm" : "border-edge hover:border-primary",
      )}
    >
      <Icon className={cx("h-7 w-7 shrink-0 md:h-8 md:w-8", active ? "text-primary" : "text-muted")} />
      <div className="min-w-0 flex-1 md:flex-none">
        <p className={cx("text-[10px] font-semibold uppercase tracking-[0.12em]", active ? "text-primary" : "text-muted")}>{eyebrow}</p>
        <h2 className={cx("font-serif text-base font-semibold leading-tight md:text-lg", active ? "text-ink" : "text-muted group-hover:text-ink")}>{title}</h2>
        <p className="mt-0.5 text-xs leading-relaxed text-muted md:mt-1 md:text-sm">{description}</p>
      </div>
      <IconChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 md:hidden" />
    </button>
  );
}

function topicPathLabel(topic: QuestionBankTopic): string {
  if (topic.path_label?.trim()) return topic.path_label.trim();
  if ((topic.node_path?.length ?? 0) > 0) return topic.node_path.join(" / ");
  return topic.node_name;
}

function adaptivePercent(topic: QuestionBankTopic): number {
  const raw = Number(topic.adaptive_weight_score || topic.adaptive_weight || 0);
  return Math.max(0, Math.min(100, raw <= 1 ? Math.round(raw * 100) : Math.round(raw)));
}

function strongestAdaptiveSignal(topic: QuestionBankTopic): string {
  const factors = Object.entries(topic.adaptive_weight_factors ?? {})
    .filter(([, value]) => Number.isFinite(Number(value)))
    .sort(([, a], [, b]) => Number(b) - Number(a));
  const top = factors[0]?.[0] ?? "";
  if (top === "student_error_need") return "erro recente";
  if (top === "due_pressure") return "revisão vencendo";
  if (top === "bank_demand") return "alta cobrança";
  if (top === "difficulty_fit") return "dificuldade adequada";
  if (top === "novelty") return "novidade";
  return "prioridade adaptativa";
}

type RecommendedTopicsPanelProps = {
  topics: QuestionBankTopic[];
  selectedTopics: QuestionBankTopic[];
  activeIntent: "learning" | "simulation" | "weakness" | "near_miss";
  onToggleTopic: (topic: QuestionBankTopic) => void;
};

function RecommendedTopicsPanel({
  topics,
  selectedTopics,
  activeIntent,
  onToggleTopic,
}: RecommendedTopicsPanelProps) {
  const selectedIds = new Set(selectedTopics.map((topic) => topic.knowledge_node_id));
  const recommended = [...topics]
    .filter((topic) => topic.question_count > 0)
    .sort((a, b) => {
      const scoreDelta = adaptivePercent(b) - adaptivePercent(a);
      if (scoreDelta !== 0) return scoreDelta;
      const depthDelta = (Number(b.depth ?? 0) - Number(a.depth ?? 0));
      if (depthDelta !== 0) return depthDelta;
      return b.question_count - a.question_count;
    })
    .slice(0, 6);

  if (recommended.length === 0) return null;

  const intentCopy =
    activeIntent === "simulation"
      ? "Recorte de prova para medir desempenho."
      : activeIntent === "weakness"
        ? "Onde poucas questões fecham mais lacuna."
        : activeIntent === "near_miss"
          ? "Itens no limiar entre acerto e erro."
          : "Priorizadas pelo seu histórico.";

  return (
    <section className="km-card rounded-lg p-5" aria-label="Microcompetências recomendadas">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Próximo melhor foco</p>
          <h2 className="mt-1 font-serif text-2xl font-semibold leading-tight">Microcompetências sugeridas</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">{intentCopy}</p>
        </div>
        <span className="rounded-full border border-edge bg-surface px-3 py-1 text-xs font-semibold text-muted">
          peso adaptativo
        </span>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {recommended.map((topic) => {
          const selected = selectedIds.has(topic.knowledge_node_id);
          const percent = adaptivePercent(topic);
          return (
            <button
              key={topic.knowledge_node_id}
              type="button"
              onClick={() => onToggleTopic(topic)}
              aria-pressed={selected}
              className={cx(
                "rounded-xl border p-3 text-left transition-colors",
                selected ? "border-primary bg-[var(--amber-tint)]" : "border-edge bg-paper hover:border-primary",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                    {topic.node_code ?? "micro"} · {topic.question_count} questões
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-ink">{topic.node_name}</p>
                </div>
                <span className={cx("shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold", selected ? "bg-primary text-primaryInk" : "bg-surfaceMuted text-muted")}>
                  {percent}%
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surfaceMuted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-2 truncate text-xs text-muted">{topicPathLabel(topic)}</p>
              <p className="mt-1 text-xs font-medium text-ink">{strongestAdaptiveSignal(topic)}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

type EntryContext = {
  reviewTaskId: string | null;
  dateISO: string | null;
  area: string | null;
  theme: string | null;
  expectedQuestions: number | null;
};

const FALLBACK_NEXT_ACTION: QuestionBankNextAction = {
  kind: "fresh_practice",
  title: "Praticar questões novas",
  subtitle: "Um bloco adaptativo curto mantém o ritmo e cobre novas microcompetências.",
  meta: "~20 min · treino com correção item a item",
  cta_label: "Começar treino",
  area: null,
  area_label: null,
  signals: [],
  start_payload: {
    mode: "adaptive",
    resolution_mode: "training",
    answer_status: "unanswered",
    only_unanswered: true,
    limit: 10,
  },
  generated_at: "",
};

function signalClassName(severity: QuestionBankNextAction["signals"][number]["severity"]) {
  if (severity === "critical") return "border-danger/40 text-danger";
  if (severity === "warning") return "border-warning/40 text-warning";
  if (severity === "success") return "border-success/40 text-success";
  return "border-edge text-muted";
}

type SearchParamReader = { get(name: string): string | null };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function emptyEntryContext(): EntryContext {
  return { reviewTaskId: null, dateISO: null, area: null, theme: null, expectedQuestions: null };
}

function todayAtLocalNoonISO(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0).toISOString();
}

function todayLocalDateISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function localNoonISO(dateISO: string | null): string {
  const trimmed = (dateISO ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return todayAtLocalNoonISO();
  return new Date(`${trimmed}T12:00:00`).toISOString();
}

function parsePositiveInt(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseEntryContext(params: SearchParamReader | null): EntryContext {
  if (!params) return emptyEntryContext();
  return {
    reviewTaskId: params.get("review_task_id")?.trim() || null,
    dateISO: params.get("date")?.trim() || null,
    area: params.get("area")?.trim().toUpperCase() || null,
    theme: params.get("theme")?.trim() || null,
    expectedQuestions: parsePositiveInt(params.get("expected_questions")),
  };
}

// ─── Page shell ──────────────────────────────────────────────────────────────

export default function BancoDeQuestoesPage() {
  return (
    <Suspense fallback={<main className="p-6 text-sm text-muted">Carregando...</main>}>
      <BancoDeQuestoesContent />
    </Suspense>
  );
}

function BancoDeQuestoesContent() {
  const router = useRouter();
  const { setActions } = useNavbar();
  const { token, tokenResolved } = useAuthToken();
  const routeSearchParams = useSearchParams();
  const routeSearchKey = routeSearchParams.toString();
  const initialContext = useMemo(() => parseEntryContext(new URLSearchParams(routeSearchKey)), [routeSearchKey]);

  // Entry context (from URL)
  const [entryContext, setEntryContext] = useState<EntryContext>(() => initialContext);

  // Filter state
  const [area, setArea] = useState(() => initialContext.area ?? "");
  const [search, setSearch] = useState(() => initialContext.theme ?? "");
  const [institution, setInstitution] = useState("");
  const [boardCodes, setBoardCodes] = useState<string[]>([]);
  const [boardInput, setBoardInput] = useState("");
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [answerStatus, setAnswerStatus] = useState<QuestionBankAnswerStatus>("all");
  const [limit, setLimit] = useState(() => Math.max(1, Math.min(50, initialContext.expectedQuestions ?? 10)));
  const [resolutionMode, setResolutionMode] = useState<QuestionBankResolutionMode>("simulation");
  const [studyKind, setStudyKind] = useState<StudyKind>("topic");
  const [fullExamName, setFullExamName] = useState("");
  const [fullExamYear, setFullExamYear] = useState(() => String(new Date().getFullYear()));
  const [fullExamType, setFullExamType] = useState<FullExamType>("acesso_direto");

  // Topic state
  const [selectedTopics, setSelectedTopics] = useState<QuestionBankTopic[]>([]);
  const [topics, setTopics] = useState<QuestionBankTopic[]>([]);

  // Preview state
  const [availability, setAvailability] = useState<QuestionBankAvailability | null>(null);
  const [questions, setQuestions] = useState<QuestionBankQuestion[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextAction, setNextAction] = useState<QuestionBankNextAction | null>(null);
  const [nextActionLoading, setNextActionLoading] = useState(true);
  const [performance, setPerformance] = useState<QuestionBankPerformance | null>(null);
  const [dueTopicTaskCount, setDueTopicTaskCount] = useState(0);
  const [manualOpen, setManualOpen] = useState(false);

  // Derived
  const maxSelectable = Math.max(1, Math.min(50, availability?.max_selectable ?? 50));
  const clampedLimit = Math.max(1, Math.min(limit, maxSelectable));
  const reviewTrailDefault = Boolean(entryContext.reviewTaskId) || selectedTopics.length === 1;
  const [generateReviewTrail, setGenerateReviewTrail] = useState(reviewTrailDefault);
  useEffect(() => {
    setGenerateReviewTrail(reviewTrailDefault);
  }, [reviewTrailDefault]);
  const fullExamYearNumber = Number(fullExamYear);
  const fullExamReady = fullExamName.trim().length > 0 && Number.isInteger(fullExamYearNumber) && fullExamYearNumber > 0;

  const selectedTopicSummary = selectedTopics.length > 0
    ? selectedTopics.map((t) => t.node_name).join(", ")
    : search.trim() || "Filtro atual";

  const appliedFilterCount = [
    area,
    search.trim(),
    institution.trim(),
    boardCodes.length > 0 ? "boards" : "",
    selectedYears.length > 0 ? "years" : "",
    answerStatus !== "all" ? answerStatus : "",
    selectedTopics.length > 0 ? "topics" : "",
  ].filter(Boolean).length;

  const activeIntent =
    answerStatus === "near_miss"
      ? "near_miss"
      : answerStatus === "wrong" || answerStatus === "needs_review"
        ? "weakness"
        : studyKind === "full_exam" || resolutionMode === "simulation"
          ? "simulation"
          : "learning";

  // Reset on URL change
  useEffect(() => {
    const context = parseEntryContext(new URLSearchParams(routeSearchKey));
    setEntryContext(context);
    setArea(context.area ?? "");
    setSearch(context.theme ?? "");
    setLimit(Math.max(1, Math.min(50, context.expectedQuestions ?? 10)));
    setStudyKind("topic");
    setSelectedTopics([]);
    setQuestions([]);
  }, [routeSearchKey]);

  useEffect(() => {
    if (!routeSearchKey) {
      setActions(null);
      return () => { setActions(null); };
    }
    setActions(
      <button
        type="button"
        onClick={() => router.back()}
        className="p-1.5 text-muted hover:text-ink"
        aria-label="Voltar"
        title="Voltar"
      >
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path d="m12 4-6 6 6 6" />
        </svg>
      </button>,
    );

    return () => {
      setActions(null);
    };
  }, [routeSearchKey, router, setActions]);

  // ─── Filter params factory ───────────────────────────────────────────────

  const filterParams = useCallback((overrides?: { limit?: number }) => ({
    knowledge_node_ids: selectedTopics.length > 0 ? selectedTopics.map((t) => t.knowledge_node_id) : undefined,
    area: area || undefined,
    search: search.trim() || undefined,
    institution: institution.trim() || undefined,
    board_codes: boardCodes.length > 0 ? boardCodes : undefined,
    years: selectedYears.length > 0 ? selectedYears : undefined,
    answer_status: answerStatus,
    only_unanswered: false,
    limit: overrides?.limit,
  }), [answerStatus, area, boardCodes, institution, search, selectedTopics, selectedYears]);

  // ─── Data fetching ───────────────────────────────────────────────────────

  const refreshAvailability = useCallback(async () => {
    setLoadingPreview(true);
    setError(null);
    try {
      const next = await previewQuestionBankAvailability(token, { ...filterParams(), mode: "adaptive" });
      setAvailability(next);
      if (next.max_selectable > 0 && limit > next.max_selectable) setLimit(next.max_selectable);
    } catch (err) {
      setAvailability(null);
      setError(err instanceof Error ? err.message : "Não foi possível calcular a disponibilidade.");
    } finally {
      setLoadingPreview(false);
    }
  }, [filterParams, limit, token]);

  const refreshTopics = useCallback(async () => {
    try {
      const found = await browseQuestionBankTopics(token, {
        area: area || undefined,
        search: search.trim() || undefined,
        institution: institution.trim() || undefined,
        board_codes: boardCodes.length > 0 ? boardCodes : undefined,
        years: selectedYears.length > 0 ? selectedYears : undefined,
        include_empty: true,
        limit: 1000,
      });
      setTopics(found);
    } catch {
      setTopics([]);
    }
  }, [area, boardCodes, institution, search, selectedYears, token]);

  useEffect(() => {
    if (!tokenResolved) return;
    const timer = window.setTimeout(() => {
      void refreshAvailability();
      void refreshTopics();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [refreshAvailability, refreshTopics, tokenResolved]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  function clearSelection() {
    setSelectedTopics([]);
    setQuestions([]);
  }

  function handleAreaChange(next: string) {
    setArea(next);
    clearSelection();
  }

  function handleSearchChange(next: string) {
    setSearch(next);
    clearSelection();
  }

  function handleInstitutionChange(next: string) {
    setInstitution(next);
    clearSelection();
  }

  function handleSelectedYearsChange(next: number[]) {
    setSelectedYears(next);
    clearSelection();
  }

  function handleAnswerStatusChange(next: QuestionBankAnswerStatus) {
    setAnswerStatus(next);
    setQuestions([]);
  }

  function toggleTopic(topic: QuestionBankTopic) {
    setSelectedTopics((prev) => {
      const exists = prev.some((t) => t.knowledge_node_id === topic.knowledge_node_id);
      return exists ? prev.filter((t) => t.knowledge_node_id !== topic.knowledge_node_id) : [...prev, topic];
    });
    setQuestions([]);
  }

  function addBoardCode() {
    const code = boardInput.trim().toUpperCase();
    if (!code) return;
    setBoardCodes((prev) => prev.includes(code) ? prev : [...prev, code]);
    setBoardInput("");
  }

  async function previewQuestions() {
    if (!tokenResolved) return;
    setBusy(true);
    setError(null);
    try {
      setQuestions(await browseQuestionBankQuestions(token, filterParams({ limit: clampedLimit })));
    } catch (err) {
      setQuestions([]);
      setError(err instanceof Error ? err.message : "Não foi possível buscar questões.");
    } finally {
      setBusy(false);
    }
  }

  async function startSession() {
    if (!tokenResolved || clampedLimit <= 0) return;
    if (studyKind === "full_exam" && !fullExamReady) {
      setError("Informe nome, ano e tipo da prova para iniciar.");
      return;
    }
    const payload: QuestionBankSessionCreatePayload = {
      mode: studyKind === "full_exam" ? "by_exam" : "adaptive",
      resolution_mode: studyKind === "full_exam" ? "simulation" : resolutionMode,
      study_kind: studyKind,
      ...filterParams({ limit: clampedLimit }),
      performed_at: localNoonISO(entryContext.dateISO),
      review_task_id: studyKind === "topic" ? entryContext.reviewTaskId ?? undefined : undefined,
    };
    if (studyKind === "full_exam") {
      payload.full_exam_name = fullExamName.trim();
      payload.full_exam_year = fullExamYearNumber;
      payload.full_exam_type = fullExamType;
      payload.generate_review_trail = false;
    } else if (!entryContext.reviewTaskId) {
      payload.generate_review_trail = generateReviewTrail;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await createQuestionBankSession(token, payload);
      router.push(`/banco-de-questoes/sessao/${created.session_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar a sessão.");
    } finally {
      setBusy(false);
    }
  }

  // Next action: backend owns the decision; the page only renders and starts it.
  useEffect(() => {
    if (!tokenResolved) return;
    let active = true;
    getQuestionBankNextAction(token)
      .then((action) => {
        if (active) setNextAction(action);
      })
      .catch(() => {
        if (active) setNextAction(null);
      })
      .finally(() => {
        if (active) setNextActionLoading(false);
      });
    getQuestionBankPerformance(token)
      .then((p) => {
        if (active) setPerformance(p);
      })
      .catch(() => {
        if (active) setPerformance(null);
      });
    getReviewAgenda(token)
      .then((agenda) => {
        if (!active) return;
        const today = todayLocalDateISO();
        const dueTasks = agenda.tasks.filter(
          (task) => task.status !== "done" && (task.is_overdue || task.due_date <= today),
        );
        setDueTopicTaskCount(dueTasks.length);
      })
      .catch(() => {
        if (active) setDueTopicTaskCount(0);
      });
    return () => {
      active = false;
    };
  }, [tokenResolved, token]);

  async function startRecommendedSession() {
    if (!tokenResolved) return;
    const action = nextAction ?? FALLBACK_NEXT_ACTION;
    const { area: payloadArea, ...startPayload } = action.start_payload;
    const payload: QuestionBankSessionCreatePayload = {
      ...startPayload,
      area: payloadArea ?? undefined,
      performed_at: localNoonISO(entryContext.dateISO),
    };
    setBusy(true);
    setError(null);
    try {
      const created = await createQuestionBankSession(token, payload);
      router.push(`/banco-de-questoes/sessao/${created.session_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível iniciar a revisão.");
    } finally {
      setBusy(false);
    }
  }

  // Start a focused, deterministic training session on a single area — used by the
  // recommended-session hero and the readiness shortcuts (no manual assembly needed).
  async function startFocusedArea(targetArea: string, status: QuestionBankAnswerStatus = "needs_review") {
    if (!tokenResolved) return;
    setBusy(true);
    setError(null);
    try {
      const created = await createQuestionBankSession(token, {
        mode: "adaptive",
        resolution_mode: "training",
        area: targetArea,
        answer_status: status,
        only_unanswered: false,
        limit: 10,
        performed_at: localNoonISO(entryContext.dateISO),
      });
      router.push(`/banco-de-questoes/sessao/${created.session_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível iniciar a sessão.");
    } finally {
      setBusy(false);
    }
  }

  if (!tokenResolved) return <main className="p-6 text-sm text-muted">Carregando...</main>;

  const hasDueTopicTasks = dueTopicTaskCount > 0;
  const recommended = nextAction ?? FALLBACK_NEXT_ACTION;

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-serif text-4xl font-semibold leading-tight md:text-5xl">Questões com raciocínio clínico</h1>
            <p className="mt-3 max-w-2xl text-base text-muted">
              Comece pela missão do bloco. O banco usa seus erros, revisões e demanda da prova para sugerir o melhor foco.
            </p>
          </div>
          {entryContext.reviewTaskId && (
            <span className="rounded-lg border border-edge bg-[var(--amber-tint)] px-3 py-2 text-xs text-muted">
              <strong className="font-semibold text-ink">{(entryContext.theme ?? search) || "Revisão"}</strong>
              {" · "}{(entryContext.area ?? area) || "Área"}
              {" · "}{entryContext.dateISO ?? "data do calendário"}
            </span>
          )}
        </header>

        {/* Sessão recomendada — o único melhor próximo passo, já decidido pelo banco */}
        <section className="km-card overflow-hidden" aria-label="Sessão recomendada" aria-busy={nextActionLoading}>
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Recomendado para hoje</p>
              {nextActionLoading ? (
                <div className="mt-2 animate-pulse space-y-2" aria-hidden="true">
                  <div className="h-7 w-64 max-w-full rounded bg-surfaceMuted" />
                  <div className="h-4 w-80 max-w-full rounded bg-surfaceMuted" />
                </div>
              ) : (
                <>
                  <h2 className="mt-1 font-serif text-2xl font-semibold leading-tight md:text-3xl">{recommended.title}</h2>
                  <p className="mt-1 text-sm text-muted">{recommended.subtitle}</p>
                  <p className="mt-2 text-xs text-muted">{recommended.meta}</p>
                  {recommended.signals.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {recommended.signals.map((signal) => (
                        <span
                          key={signal.key}
                          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${signalClassName(signal.severity)}`}
                        >
                          {signal.label}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => void startRecommendedSession()}
              disabled={busy || nextActionLoading}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-primary bg-primary px-6 py-3 text-sm font-semibold text-primaryInk shadow-sm transition hover:brightness-105 disabled:opacity-50"
            >
              {busy ? "Preparando..." : nextActionLoading ? "Carregando..." : recommended.cta_label}
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                <path d="M4 10h12" /><path d="m11 5 5 5-5 5" />
              </svg>
            </button>
          </div>
          {hasDueTopicTasks && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-edge px-5 py-3">
              <p className="text-sm text-muted">
                Você também tem <strong className="font-semibold text-ink">{dueTopicTaskCount}</strong> {dueTopicTaskCount === 1 ? "tarefa de tópico" : "tarefas de tópico"} no cronograma para hoje.
              </p>
              <button type="button" onClick={() => router.push("/cronograma")} className="text-sm font-semibold text-primary hover:underline">
                Abrir cronograma
              </button>
            </div>
          )}
        </section>

        {/* Prontidão por área — atalhos secundários; tocar inicia uma sessão focada */}
        {performance && performance.areas.length > 0 && (
          <section aria-label="Sua prontidão por área" className="km-card rounded-lg p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-serif text-2xl font-semibold leading-tight">Sua prontidão</h2>
              {performance.exam.simulation_count > 0 && (
                <p className="text-sm text-muted">
                  Simulado: {Math.round((performance.exam.accuracy ?? 0) * 100)}% de acerto
                  {performance.exam.avg_time_ms ? ` · ${Math.round(performance.exam.avg_time_ms / 1000)}s/questão` : ""}
                  {` · ${performance.exam.simulation_count} questões`}
                </p>
              )}
            </div>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {performance.areas.map((a) => {
                const pct = Math.round(a.readiness * 100);
                const levelLabel = a.level === "consolidando" ? "Consolidando" : a.level === "atencao" ? "Atenção" : "Crítico";
                const levelTone = a.level === "consolidando" ? "text-success" : a.level === "atencao" ? "text-warning" : "text-danger";
                return (
                  <li key={a.area}>
                    <button
                      type="button"
                      onClick={() => void startFocusedArea(a.area, a.level === "consolidando" ? "unanswered" : "needs_review")}
                      disabled={busy}
                      className="w-full rounded-xl border border-edge bg-surface p-4 text-left transition hover:border-primary disabled:opacity-50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-ink">{a.label}</span>
                        <span className={`text-xs font-semibold ${levelTone}`}>{levelLabel} · {pct}%</span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surfaceMuted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-2 text-xs text-muted">
                        {a.questions_seen} feitas · {Math.round((a.accuracy ?? 0) * 100)}% acerto{a.due_count > 0 ? ` · ${a.due_count} vencidas` : ""}
                      </p>
                      <p className="mt-1 text-xs font-medium text-primary">{a.next_action}</p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {error && (
          <Alert
            variant="danger"
            action={
              <button type="button" onClick={() => void refreshAvailability()} className="text-sm font-semibold text-danger underline">
                Tentar novamente
              </button>
            }
          >
            {error}
          </Alert>
        )}

        {/* Montador manual — todo o poder, recolhido até o aluno pedir */}
        <section aria-label="Montar sessão manual">
          <button
            type="button"
            onClick={() => setManualOpen((v) => !v)}
            aria-expanded={manualOpen}
            className="flex w-full items-center justify-between gap-3 rounded-lg border border-edge bg-surface px-5 py-4 text-left transition-colors hover:border-primary"
          >
            <div>
              <h2 className="font-serif text-lg font-semibold leading-tight">Montar sessão manual</h2>
              <p className="mt-0.5 text-sm text-muted">Escolha intenção, filtros, banca, ano e número de questões.</p>
            </div>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={cx("h-5 w-5 shrink-0 text-muted transition-transform", manualOpen && "rotate-90")} aria-hidden="true">
              <path d="m7 4 6 6-6 6" />
            </svg>
          </button>
        </section>

        {manualOpen && (
        <div className="space-y-6">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Tipos de sessão">
          <SessionIntentCard
            eyebrow="01 · construir"
            title="Aprender um tema"
            description="Resolva com feedback próximo e reconstrua o caminho diagnóstico item a item."
            active={activeIntent === "learning"}
            Icon={IconBookOpen}
            onClick={() => {
              setStudyKind("topic");
              setResolutionMode("training");
              handleAnswerStatusChange("unanswered");
            }}
          />
          <SessionIntentCard
            eyebrow="02 · medir"
            title="Simular prova"
            description="Faça um bloco cronometrado, sem gabarito durante a execução."
            active={activeIntent === "simulation"}
            Icon={IconTrophy}
            onClick={() => {
              setStudyKind("topic");
              setResolutionMode("simulation");
              handleAnswerStatusChange("unanswered");
            }}
          />
          <SessionIntentCard
            eyebrow="03 · reparar"
            title="Corrigir fraquezas"
            description="Puxe erros, baixo desempenho e revisões vencidas para fechar lacunas."
            active={activeIntent === "weakness"}
            Icon={IconTarget}
            onClick={() => {
              setStudyKind("topic");
              setResolutionMode("training");
              handleAnswerStatusChange("needs_review");
            }}
          />
          <SessionIntentCard
            eyebrow="04 · calibrar"
            title="Quase acertei"
            description="Ataque itens no limiar entre acerto e erro, onde a calibragem rende mais."
            active={activeIntent === "near_miss"}
            Icon={IconTarget}
            onClick={() => {
              setStudyKind("topic");
              setResolutionMode("training");
              handleAnswerStatusChange("near_miss");
            }}
          />
        </section>

        <RecommendedTopicsPanel
          topics={topics}
          selectedTopics={selectedTopics}
          activeIntent={activeIntent}
          onToggleTopic={toggleTopic}
        />

        <section
          aria-label="Filtros e resumo do banco de questões"
          className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]"
          data-testid="question-bank-top-filters"
        >
          <div className="km-card min-w-0 overflow-visible rounded-lg">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-edge px-5 py-4">
              <div>
                <h2 className="font-serif text-2xl font-semibold leading-tight">Filtros da sessão</h2>
                <p className="mt-1 text-sm text-muted">Refine área, assunto, banca, ano e status das questões.</p>
              </div>
              <div className="rounded-full bg-surfaceMuted px-3 py-1 text-xs font-semibold text-muted">
                {appliedFilterCount} filtro{appliedFilterCount === 1 ? "" : "s"}
              </div>
            </div>
            <FiltersBar
              area={area}
              onAreaChange={handleAreaChange}
              search={search}
              onSearchChange={handleSearchChange}
              topics={topics}
              selectedTopics={selectedTopics}
              onToggleTopic={toggleTopic}
              boardCodes={boardCodes}
              boardInput={boardInput}
              onBoardInputChange={setBoardInput}
              onAddBoardCode={addBoardCode}
              onRemoveBoardCode={(code) => setBoardCodes((prev) => prev.filter((c) => c !== code))}
              institution={institution}
              onInstitutionChange={handleInstitutionChange}
              selectedYears={selectedYears}
              onSelectedYearsChange={handleSelectedYearsChange}
              answerStatus={answerStatus}
              onAnswerStatusChange={handleAnswerStatusChange}
              resolutionMode={resolutionMode}
              onResolutionModeChange={setResolutionMode}
              studyKind={studyKind}
              onStudyKindChange={setStudyKind}
              fullExamName={fullExamName}
              onFullExamNameChange={setFullExamName}
              fullExamYear={fullExamYear}
              onFullExamYearChange={setFullExamYear}
              fullExamType={fullExamType}
              onFullExamTypeChange={setFullExamType}
              reviewTrailEnabled={generateReviewTrail}
              onReviewTrailEnabledChange={setGenerateReviewTrail}
              reviewTrailLocked={Boolean(entryContext.reviewTaskId)}
              limit={limit}
              clampedLimit={clampedLimit}
              maxSelectable={maxSelectable}
              onLimitChange={setLimit}
            />
          </div>

          <CreateSessionPanel
            availability={availability}
            loadingPreview={loadingPreview}
            busy={busy}
            clampedLimit={clampedLimit}
            resolutionMode={resolutionMode}
            studyKind={studyKind}
            canStartSession={studyKind !== "full_exam" || fullExamReady}
            onRefreshAvailability={() => void refreshAvailability()}
            onPreviewQuestions={() => void previewQuestions()}
            onStartSession={() => void startSession()}
          />
        </section>

          <QuestionList
            questions={questions}
            selectedTopicSummary={selectedTopicSummary}
            resolutionMode={resolutionMode}
            studyKind={studyKind}
            busy={busy}
            availability={availability}
            onStartSession={() => void startSession()}
          />
        </div>
        )}

        {/* Mobile sticky bar — inicia a sessão recomendada */}
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-edge bg-paper/90 px-4 py-3 backdrop-blur-md md:hidden"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}>
          <button
            type="button"
            onClick={() => void startRecommendedSession()}
            disabled={busy || nextActionLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary bg-primary py-3 text-sm font-semibold text-primaryInk shadow-sm transition disabled:opacity-40"
          >
            {busy ? "Preparando..." : nextActionLoading ? "Carregando..." : recommended.cta_label}
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M4 10h12" /><path d="m11 5 5 5-5 5" />
            </svg>
          </button>
        </div>
        {/* Spacer so the sticky bar doesn't cover content */}
        <div className="h-20 md:hidden" aria-hidden="true" />
      </div>
    </main>
  );
}
