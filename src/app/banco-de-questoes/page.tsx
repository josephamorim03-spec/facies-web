"use client";

import { Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type JSX } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  browseQuestionBankQuestions,
  browseQuestionBankTopics,
  createQuestionBankSession,
  getQuestionBankBootstrap,
  getQuestionBankPracticeHome,
  getReviewAgenda,
  getQuestionBankNextAction,
  getQuestionBankPerformance,
  listQuestionBankFacets,
  previewQuestionBankAvailability,
  type QuestionBankAnswerStatus,
  type QuestionBankCorrectionStatus,
  type QuestionBankAvailability,
  type QuestionBankBootstrap,
  type QuestionBankNextAction,
  type QuestionBankPerformance,
  type QuestionBankQuestion,
  type QuestionBankResolutionMode,
  type QuestionBankSessionCreatePayload,
  type QuestionBankSourceOption,
  type QuestionBankTopic,
  type QuestionBankYearStat,
  type FullExamType,
  type StudyKind,
  type StudentSurfaceHome,
} from "@/lib/api";
import { useNavbar } from "@/lib/NavbarContext";
import { buildSessionCreateFromTrainerPayload } from "@/lib/trainer/session";
import { useAuthToken } from "@/lib/useAuthToken";
import { useToast } from "@/lib/useToast";
import { GuidanceNote } from "@/components/GuidanceNote";
import { DataFreshness, StudentPageHeader } from "@/components/student/StudentExperienceUI";
import {
  StudentBackupActions,
  StudentPrimaryAction,
} from "@/components/student/StudentActionSurface";
import { useStudentExperience } from "@/lib/StudentExperienceContext";
import type { GuidanceTone } from "@/lib/guidanceCopy";
import FiltersBar from "./_components/FiltersBar";
import QuestionList from "./_components/QuestionList";
import CreateSessionPanel from "./_components/CreateSessionPanel";
import { filterTopicsLocally } from "./_components/topicTree";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const QUESTION_BANK_LIMIT_CAP = 1000;

function clampQuestionLimit(value: number | null | undefined, fallback = 10) {
  const numericValue = Number(value ?? fallback);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.max(1, Math.min(QUESTION_BANK_LIMIT_CAP, Math.trunc(numericValue)));
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

const TAXONOMY_NODE_TYPES = new Set(["specialty", "theme", "subtheme"]);

function splitBootstrapTopics(topics: QuestionBankTopic[]) {
  return {
    taxonomy: topics.filter((topic) => TAXONOMY_NODE_TYPES.has(topic.node_type ?? "")),
    micros: topics.filter((topic) => topic.node_type === "microcompetency"),
  };
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
        "paper-control group flex min-h-11 items-center gap-4 border bg-surface p-4 text-left transition-colors md:flex-col md:items-start md:justify-between md:min-h-[8rem] md:p-5",
        active ? "border-primary bg-surfaceMuted" : "border-edge hover:border-primary",
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
  const normalized = (value: string) =>
    value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  const sanitize = (parts: string[]) => {
    const cleaned = parts.map((part) => part.trim()).filter(Boolean);
    while (cleaned.length > 0 && normalized(cleaned[0]) === "medicina") cleaned.shift();
    return cleaned;
  };
  const nodePath = Array.isArray(topic.node_path)
    ? sanitize(topic.node_path.map((part) => String(part)))
    : [];
  if (nodePath.length > 0) return nodePath.join(" / ");
  if (topic.path_label?.trim()) {
    const fromLabel = sanitize(topic.path_label.split(/\s*(?:\/|>)\s*/));
    if (fromLabel.length > 0) return fromLabel.join(" / ");
  }
  return topic.node_name;
}

function adaptivePercent(topic: QuestionBankTopic): number {
  const raw = Number(topic.adaptive_weight_score || topic.adaptive_weight || 0);
  return Math.max(0, Math.min(100, raw <= 1 ? Math.round(raw * 100) : Math.round(raw)));
}

function priorityLabel(percent: number): string {
  if (percent >= 72) return "alta";
  if (percent <= 35) return "baixa";
  return "média";
}

function priorityClassName(percent: number, selected: boolean): string {
  if (selected) return "bg-primary text-primaryInk";
  if (percent >= 72) return "bg-[var(--amber-tint)] text-ink";
  if (percent <= 35) return "bg-surfaceMuted text-muted";
  return "bg-surfaceMuted text-ink";
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
    <section className="rounded-lg border border-edge bg-surface p-4" aria-label="Microcompetências recomendadas">
      <div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Sugestões do sistema</p>
          <h3 className="mt-1 font-serif text-lg font-semibold leading-tight">Microcompetências</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted">{intentCopy}</p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {recommended.map((topic) => {
          const selected = selectedIds.has(topic.knowledge_node_id);
          const percent = adaptivePercent(topic);
          const signal = strongestAdaptiveSignal(topic);
          const confidence = typeof topic.classification_confidence_mean === "number"
            ? Math.round(topic.classification_confidence_mean * 100)
            : null;
          return (
            <button
              key={topic.knowledge_node_id}
              type="button"
              onClick={() => onToggleTopic(topic)}
              aria-pressed={selected}
              title={topic.node_code ? `${topic.node_code} - ${topic.node_name}` : topic.node_name}
              className={cx(
                "w-full rounded-lg border p-3 text-left transition-colors",
                selected ? "border-primary bg-[var(--amber-tint)]" : "border-edge bg-paper hover:border-primary",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                    {topic.question_count} questões{confidence !== null ? ` · conf. ${confidence}%` : ""}
                  </p>
                  <p className="mt-0.5 line-clamp-2 break-words text-sm font-semibold leading-snug text-ink [overflow-wrap:anywhere]">{topic.node_name}</p>
                </div>
                <span className={cx("shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold", priorityClassName(percent, selected))}>
                  Prioridade {percent}/100
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surfaceMuted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-2 line-clamp-2 break-words text-xs text-muted [overflow-wrap:anywhere]">{topicPathLabel(topic)}</p>
              <p className="mt-1 text-xs font-medium text-ink">Prioridade {priorityLabel(percent)} por {signal}</p>
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
  rationale: "Bloco curto de questões novas.",
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

// Tom da "voz do sistema" derivado do sinal mais grave da recomendação.
function actionTone(action: QuestionBankNextAction): GuidanceTone {
  if (action.signals.some((s) => s.severity === "critical")) return "critical";
  if (action.signals.some((s) => s.severity === "warning")) return "attention";
  return "neutral";
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
    <Suspense fallback={<div className="p-6 text-sm text-muted">Carregando...</div>}>
      <BancoDeQuestoesContent />
    </Suspense>
  );
}

function BancoDeQuestoesContent() {
  const router = useRouter();
  const { setActions } = useNavbar();
  const { token, tokenResolved } = useAuthToken();
  const { showToast } = useToast();
  const { enabled: experienceEnabled, experience } = useStudentExperience();
  const routeSearchParams = useSearchParams();
  const routeSearchKey = routeSearchParams.toString();
  const initialContext = useMemo(() => parseEntryContext(new URLSearchParams(routeSearchKey)), [routeSearchKey]);

  // Entry context (from URL)
  const [entryContext, setEntryContext] = useState<EntryContext>(() => initialContext);

  // Filter state
  const [area, setArea] = useState(() => initialContext.area ?? "");
  const [searchDraft, setSearchDraft] = useState(() => initialContext.theme ?? "");
  const [committedSearch, setCommittedSearch] = useState(() => (initialContext.theme ?? "").trim());
  const [boardCodes, setBoardCodes] = useState<string[]>([]);
  const [examCodes, setExamCodes] = useState<string[]>([]);
  const [institutions, setInstitutions] = useState<string[]>([]);
  const [sources, setSources] = useState<QuestionBankSourceOption[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [sourcesError, setSourcesError] = useState(false);
  const [yearStats, setYearStats] = useState<QuestionBankYearStat[]>([]);
  const [yearsLoading, setYearsLoading] = useState(true);
  const [yearsError, setYearsError] = useState(false);
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [includeNoYear, setIncludeNoYear] = useState(false);
  const [answerStatus, setAnswerStatus] = useState<QuestionBankAnswerStatus>("unanswered");
  const [correctionStatus, setCorrectionStatus] = useState<QuestionBankCorrectionStatus>("all");
  const [limit, setLimit] = useState(() => clampQuestionLimit(initialContext.expectedQuestions ?? 10));
  const [resolutionMode, setResolutionMode] = useState<QuestionBankResolutionMode>("simulation");
  const [studyKind, setStudyKind] = useState<StudyKind>("topic");
  const [fullExamName, setFullExamName] = useState("");
  const [fullExamYear, setFullExamYear] = useState(() => String(new Date().getFullYear()));
  const [fullExamType, setFullExamType] = useState<FullExamType>("acesso_direto");

  // Topic state
  const [selectedTopics, setSelectedTopics] = useState<QuestionBankTopic[]>([]);
  const [taxonomyTopics, setTaxonomyTopics] = useState<QuestionBankTopic[]>([]);
  const [microTopics, setMicroTopics] = useState<QuestionBankTopic[]>([]);
  // true desde o mount: o fetch só dispara após debounce e a árvore não pode
  // abrir como "nenhum assunto" enquanto ainda nem buscou.
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [topicsError, setTopicsError] = useState(false);
  const [bootstrapReady, setBootstrapReady] = useState(false);

  // Preview state
  const [availability, setAvailability] = useState<QuestionBankAvailability | null>(null);
  const [questions, setQuestions] = useState<QuestionBankQuestion[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [practiceHome, setPracticeHome] = useState<StudentSurfaceHome | null>(null);
  const [nextAction, setNextAction] = useState<QuestionBankNextAction | null>(null);
  const [nextActionLoading, setNextActionLoading] = useState(true);
  const [performance, setPerformance] = useState<QuestionBankPerformance | null>(null);
  const [dueTopicTaskCount, setDueTopicTaskCount] = useState(0);
  const availabilityRequestSeq = useRef(0);
  const availabilityAbortRef = useRef<AbortController | null>(null);
  const availabilityInFlightRef = useRef<{ key: string; promise: Promise<void> } | null>(null);
  const topicsAbortRef = useRef<AbortController | null>(null);
  const facetsRequestSeq = useRef(0);
  const facetsAbortRef = useRef<AbortController | null>(null);
  const facetsInFlightRef = useRef<{ key: string; promise: Promise<void> } | null>(null);
  const bootstrapRef = useRef<QuestionBankBootstrap | null>(null);

  // Derived
  const requestedLimit = clampQuestionLimit(limit);
  const maxSelectable = availability ? Math.max(0, availability.max_selectable) : requestedLimit;
  const limitMax = Math.max(1, Math.min(QUESTION_BANK_LIMIT_CAP, maxSelectable || requestedLimit));
  const clampedLimit = Math.max(1, Math.min(requestedLimit, limitMax));
  const deferredSearchDraft = useDeferredValue(searchDraft);
  const normalizedSearch = committedSearch.trim();
  const reviewTrailDefault = Boolean(entryContext.reviewTaskId) || selectedTopics.length === 1;
  const [generateReviewTrail, setGenerateReviewTrail] = useState(reviewTrailDefault);
  useEffect(() => {
    setGenerateReviewTrail(reviewTrailDefault);
  }, [reviewTrailDefault]);
  const fullExamYearNumber = Number(fullExamYear);
  const fullExamReady = fullExamName.trim().length > 0 && Number.isInteger(fullExamYearNumber) && fullExamYearNumber > 0;

  const selectedTopicSummary = selectedTopics.length > 0
    ? selectedTopics.map((t) => t.node_name).join(", ")
    : area || "Filtro atual";

  const appliedFilterCount = [
    area,
    boardCodes.length + examCodes.length + institutions.length > 0 ? "sources" : "",
    selectedYears.length > 0 ? "years" : "",
    answerStatus !== "unanswered" ? answerStatus : "",
    correctionStatus !== "all" ? correctionStatus : "",
    selectedTopics.length > 0 ? "topics" : "",
    normalizedSearch ? "search" : "",
  ].filter(Boolean).length;

  const activeIntent =
    answerStatus === "near_miss"
      ? "near_miss"
      : answerStatus === "wrong" || answerStatus === "needs_review"
        ? "weakness"
        : studyKind === "full_exam" || resolutionMode === "simulation"
          ? "simulation"
          : "learning";

  const filteredTaxonomyTopics = useMemo(
    () => filterTopicsLocally(taxonomyTopics, { area, search: searchDraft, preserveSearchAncestors: true }),
    [area, searchDraft, taxonomyTopics],
  );
  const filteredMicroTopics = useMemo(
    () => filterTopicsLocally(microTopics, { area, search: searchDraft, preserveSearchAncestors: false }),
    [area, searchDraft, microTopics],
  );
  const topicSuggestions = useMemo(
    () =>
      filterTopicsLocally(taxonomyTopics, { area, search: searchDraft, preserveSearchAncestors: false })
        .filter((topic) => topic.question_count > 0),
    [area, searchDraft, taxonomyTopics],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCommittedSearch(deferredSearchDraft.trim());
    }, 500);
    return () => window.clearTimeout(timer);
  }, [deferredSearchDraft]);

  // Reset on URL change
  useEffect(() => {
    const context = parseEntryContext(new URLSearchParams(routeSearchKey));
    setEntryContext(context);
    setArea(context.area ?? "");
    setSearchDraft(context.theme ?? "");
    setCommittedSearch((context.theme ?? "").trim());
    setCorrectionStatus("all");
    setLimit(clampQuestionLimit(context.expectedQuestions ?? 10));
    setStudyKind("topic");
    setSelectedTopics([]);
    const bootstrap = bootstrapRef.current;
    if (bootstrap) {
      const split = splitBootstrapTopics(bootstrap.topics);
      setTaxonomyTopics(split.taxonomy);
      setMicroTopics(split.micros);
    }
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

  useEffect(() => () => {
    availabilityAbortRef.current?.abort();
    topicsAbortRef.current?.abort();
    facetsAbortRef.current?.abort();
  }, []);

  // ─── Filter params factory ───────────────────────────────────────────────

  const filterParams = useCallback((overrides?: { limit?: number }) => ({
    knowledge_node_ids: selectedTopics.length > 0 ? selectedTopics.map((t) => t.knowledge_node_id) : undefined,
    area: area || undefined,
    board_codes: boardCodes.length > 0 ? boardCodes : undefined,
    exam_codes: examCodes.length > 0 ? examCodes : undefined,
    institutions: institutions.length > 0 ? institutions : undefined,
    years: selectedYears.length > 0 ? selectedYears : undefined,
    include_no_year: includeNoYear || undefined,
    search: normalizedSearch || undefined,
    answer_status: answerStatus,
    only_unanswered: answerStatus === "unanswered",
    correction_status: correctionStatus,
    limit: overrides?.limit,
  }), [answerStatus, area, boardCodes, correctionStatus, examCodes, includeNoYear, institutions, normalizedSearch, selectedTopics, selectedYears]);

  // ─── Data fetching ───────────────────────────────────────────────────────

  const refreshAvailability = useCallback(async () => {
    const requestKey = JSON.stringify({ ...filterParams(), mode: "adaptive" });
    if (availabilityInFlightRef.current?.key === requestKey) return;
    availabilityInFlightRef.current = { key: requestKey, promise: Promise.resolve() };
    const requestSeq = availabilityRequestSeq.current + 1;
    availabilityRequestSeq.current = requestSeq;
    availabilityAbortRef.current?.abort();
    const controller = new AbortController();
    availabilityAbortRef.current = controller;
    setLoadingPreview(true);
    setError(null);
    try {
      const next = await previewQuestionBankAvailability(
        token,
        { ...filterParams(), mode: "adaptive" },
        { signal: controller.signal },
      );
      if (availabilityRequestSeq.current !== requestSeq) return;
      setAvailability(next);
      if (next.max_selectable > 0 && requestedLimit > next.max_selectable) {
        setLimit(clampQuestionLimit(next.max_selectable));
      }
    } catch (err) {
      if (controller.signal.aborted || isAbortError(err)) return;
      if (availabilityRequestSeq.current !== requestSeq) return;
      setAvailability(null);
      const message = err instanceof Error ? err.message : "Não foi possível calcular a disponibilidade.";
      setError(message);
      showToast(message, "error");
    } finally {
      if (availabilityAbortRef.current === controller) {
        availabilityAbortRef.current = null;
      }
      if (availabilityInFlightRef.current?.key === requestKey) {
        availabilityInFlightRef.current = null;
      }
      if (availabilityRequestSeq.current === requestSeq) setLoadingPreview(false);
    }
  }, [filterParams, requestedLimit, showToast, token]);

  const refreshTopics = useCallback(async () => {
    topicsAbortRef.current?.abort();
    const controller = new AbortController();
    topicsAbortRef.current = controller;
    setTopicsLoading(true);
    setTopicsError(false);
    try {
      const common = {
        board_codes: boardCodes.length > 0 ? boardCodes : undefined,
        exam_codes: examCodes.length > 0 ? examCodes : undefined,
        institutions: institutions.length > 0 ? institutions : undefined,
        years: selectedYears.length > 0 ? selectedYears : undefined,
        include_empty: false,
        limit: 1000,
      };
      const [taxonomy, micros] = await Promise.all([
        browseQuestionBankTopics(token, {
          ...common,
          node_types: ["specialty", "theme", "subtheme"],
        }, { signal: controller.signal }),
        browseQuestionBankTopics(token, {
          ...common,
          node_types: ["microcompetency"],
        }, { signal: controller.signal }),
      ]);
      if (controller.signal.aborted) return;
      setTaxonomyTopics(taxonomy);
      setMicroTopics(micros);
    } catch (err) {
      if (controller.signal.aborted || isAbortError(err)) return;
      setTaxonomyTopics([]);
      setMicroTopics([]);
      setTopicsError(true);
      const message = err instanceof Error ? err.message : "Não foi possível carregar os assuntos do banco de questões.";
      setError(message);
      showToast(message, "error");
    } finally {
      if (topicsAbortRef.current === controller) {
        topicsAbortRef.current = null;
      }
      setTopicsLoading(false);
    }
  }, [boardCodes, examCodes, institutions, selectedYears, showToast, token]);

  const loadBootstrap = useCallback(async () => {
    setSourcesLoading(true);
    setYearsLoading(true);
    setTopicsLoading(true);
    setSourcesError(false);
    setYearsError(false);
    setTopicsError(false);
    try {
      const bootstrap = await getQuestionBankBootstrap(token);
      bootstrapRef.current = bootstrap;
      const split = splitBootstrapTopics(bootstrap.topics);
      setSources(bootstrap.sources);
      setYearStats(bootstrap.years);
      setTaxonomyTopics(split.taxonomy);
      setMicroTopics(split.micros);
      setBootstrapReady(true);
    } catch (err) {
      bootstrapRef.current = null;
      setBootstrapReady(false);
      setSources([]);
      setYearStats([]);
      setTaxonomyTopics([]);
      setMicroTopics([]);
      setSourcesError(true);
      setYearsError(true);
      setTopicsError(true);
        const message = err instanceof Error ? err.message : "Não foi possível carregar o banco de questões.";
      setError(message);
    } finally {
      setSourcesLoading(false);
      setYearsLoading(false);
      setTopicsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!tokenResolved) return;
    void loadBootstrap();
  }, [loadBootstrap, tokenResolved]);

  // Cross-filtered facets (Estratégia-style): one call whose year counts react to
  // the selected banca and whose banca counts react to the selected years. It
  // overwrites the global catalogs above with the recorte-aware options. Silent
  // (no skeleton) so the counts feel live as filters change.
  const refreshFacets = useCallback(async () => {
    const requestKey = JSON.stringify({
      knowledge_node_ids:
        selectedTopics.length > 0 ? selectedTopics.map((t) => t.knowledge_node_id) : undefined,
      area: area || undefined,
      search: normalizedSearch || undefined,
      board_codes: boardCodes.length > 0 ? boardCodes : undefined,
      exam_codes: examCodes.length > 0 ? examCodes : undefined,
      institutions: institutions.length > 0 ? institutions : undefined,
      years: selectedYears.length > 0 ? selectedYears : undefined,
      correction_status: correctionStatus,
    });
    if (facetsInFlightRef.current?.key === requestKey) return;
    facetsInFlightRef.current = { key: requestKey, promise: Promise.resolve() };
    const seq = facetsRequestSeq.current + 1;
    facetsRequestSeq.current = seq;
    facetsAbortRef.current?.abort();
    const controller = new AbortController();
    facetsAbortRef.current = controller;
    try {
      const facets = await listQuestionBankFacets(
        token,
        {
          knowledge_node_ids:
            selectedTopics.length > 0 ? selectedTopics.map((t) => t.knowledge_node_id) : undefined,
          area: area || undefined,
          search: normalizedSearch || undefined,
          board_codes: boardCodes.length > 0 ? boardCodes : undefined,
          exam_codes: examCodes.length > 0 ? examCodes : undefined,
          institutions: institutions.length > 0 ? institutions : undefined,
          years: selectedYears.length > 0 ? selectedYears : undefined,
          correction_status: correctionStatus,
        },
        controller.signal,
      );
      if (facetsRequestSeq.current !== seq) return;
      setYearStats(facets.years);
      setSources([...facets.exams, ...facets.boards, ...facets.institutions]);
    } catch (err) {
      if (controller.signal.aborted || isAbortError(err)) return;
      // Keep the last good options on a transient facet error.
    } finally {
      if (facetsAbortRef.current === controller) facetsAbortRef.current = null;
      if (facetsInFlightRef.current?.key === requestKey) facetsInFlightRef.current = null;
    }
  }, [area, boardCodes, correctionStatus, examCodes, institutions, normalizedSearch, selectedTopics, selectedYears, token]);

  useEffect(() => {
    if (!tokenResolved || !bootstrapReady) return;
    const hasFacetFilters = Boolean(
      area || normalizedSearch || selectedTopics.length || boardCodes.length || examCodes.length ||
      institutions.length || selectedYears.length || correctionStatus !== "all"
    );
    if (!hasFacetFilters) {
      const bootstrap = bootstrapRef.current;
      if (bootstrap) {
        setSources(bootstrap.sources);
        setYearStats(bootstrap.years);
      }
      return;
    }
    const timer = window.setTimeout(() => {
      void refreshFacets();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [area, boardCodes.length, bootstrapReady, correctionStatus, examCodes.length, institutions.length, normalizedSearch, refreshFacets, selectedTopics.length, selectedYears.length, tokenResolved]);

  useEffect(() => {
    if (!tokenResolved || !bootstrapReady) return;
    const timer = window.setTimeout(() => {
      void refreshAvailability();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [bootstrapReady, refreshAvailability, tokenResolved]);

  useEffect(() => {
    if (!tokenResolved || !bootstrapReady) return;
    const hasStructuralTopicFilters = Boolean(
      boardCodes.length || examCodes.length || institutions.length || selectedYears.length
    );
    if (!hasStructuralTopicFilters) {
      const bootstrap = bootstrapRef.current;
      if (bootstrap) {
        const split = splitBootstrapTopics(bootstrap.topics);
        setTaxonomyTopics(split.taxonomy);
        setMicroTopics(split.micros);
        setTopicsError(false);
      }
      return;
    }
    const timer = window.setTimeout(() => {
      void refreshTopics();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [boardCodes.length, bootstrapReady, examCodes.length, institutions.length, refreshTopics, selectedYears.length, tokenResolved]);

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
    setSearchDraft(next);
    clearSelection();
  }

  function handleSelectedYearsChange(next: number[]) {
    setSelectedYears(next);
    clearSelection();
  }

  function handleIncludeNoYearChange(next: boolean) {
    setIncludeNoYear(next);
    clearSelection();
  }

  function handleSourceSelectionChange(next: { boardCodes: string[]; examCodes: string[]; institutions: string[] }) {
    setBoardCodes(next.boardCodes);
    setExamCodes(next.examCodes);
    setInstitutions(next.institutions);
    clearSelection();
  }

  function handleAnswerStatusChange(next: QuestionBankAnswerStatus) {
    setAnswerStatus(next);
    setQuestions([]);
  }

  function handleCorrectionStatusChange(next: QuestionBankCorrectionStatus) {
    setCorrectionStatus(next);
    setQuestions([]);
  }

  function toggleTopic(topic: QuestionBankTopic) {
    setSelectedTopics((prev) => {
      const exists = prev.some((t) => t.knowledge_node_id === topic.knowledge_node_id);
      return exists ? prev.filter((t) => t.knowledge_node_id !== topic.knowledge_node_id) : [...prev, topic];
    });
    setQuestions([]);
  }

  async function previewQuestions() {
    if (!tokenResolved) return;
    setBusy(true);
    setError(null);
    try {
      setQuestions(await browseQuestionBankQuestions(token, filterParams({ limit: clampedLimit })));
    } catch (err) {
      setQuestions([]);
      const message = err instanceof Error ? err.message : "Não foi possível buscar questões.";
      setError(message);
      showToast(message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function startSession() {
    if (!tokenResolved || clampedLimit <= 0) return;
    if (studyKind === "full_exam" && !fullExamReady) {
      const message = "Informe nome, ano e tipo da prova para iniciar.";
      setError(message);
      showToast(message, "error");
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
      const deferSearchReviewTrailInference =
        Boolean(normalizedSearch) && selectedTopics.length === 0 && !generateReviewTrail;
      if (!deferSearchReviewTrailInference) {
        payload.generate_review_trail = generateReviewTrail;
      }
    }
    setBusy(true);
    setError(null);
    try {
      const created = await createQuestionBankSession(token, payload);
      router.push(`/banco-de-questoes/sessao/${created.session_id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível criar a sessão.";
      setError(message);
      showToast(message, "error");
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
    getQuestionBankPracticeHome(token)
      .then((home) => {
        if (active) setPracticeHome(home);
      })
      .catch(() => {
        if (active) setPracticeHome(null);
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
    const payload = buildSessionCreateFromTrainerPayload(action.start_payload, {
      performedAt: localNoonISO(entryContext.dateISO),
    });
    setBusy(true);
    setError(null);
    try {
      const created = await createQuestionBankSession(token, payload);
      router.push(`/banco-de-questoes/sessao/${created.session_id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível iniciar a revisão.";
      setError(message);
      showToast(message, "error");
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
      const message = err instanceof Error ? err.message : "Não foi possível iniciar a sessão.";
      setError(message);
      showToast(message, "error");
    } finally {
      setBusy(false);
    }
  }

  if (!tokenResolved) return <div className="p-6 text-sm text-muted">Carregando...</div>;

  const hasDueTopicTasks = dueTopicTaskCount > 0;
  const recommended = nextAction ?? FALLBACK_NEXT_ACTION;
  const canStartConfigured = !busy && (studyKind !== "full_exam" || fullExamReady) && !!availability && availability.available_count > 0;
  const configuredStartLabel = studyKind === "full_exam"
    ? `Começar prova · ${clampedLimit} questões`
    : `Começar ${clampedLimit} questões · ${resolutionMode === "training" ? "treino com correção" : "simulado"}`;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-7xl space-y-5">
        <StudentPageHeader
          eyebrow="Praticar"
          title="Questões com raciocínio clínico"
          breadcrumb={["Praticar", "Banco de questões"]}
          actions={entryContext.reviewTaskId ? (
            <span className="rounded-lg border border-edge bg-[var(--amber-tint)] px-3 py-2 text-xs text-muted">
              <strong className="font-semibold text-ink">{(entryContext.theme ?? searchDraft) || "Revisão"}</strong>
              {" · "}{(entryContext.area ?? area) || "Área"}
              {" · "}{entryContext.dateISO ?? "data do calendário"}
            </span>
          ) : experienceEnabled && experience ? (
            <DataFreshness status={experience.status} generatedAt={experience.generated_at} missingSources={experience.missing_sources} />
          ) : null}
        />

        {practiceHome ? (
          <>
            <StudentPrimaryAction action={practiceHome.primary_action} eyebrow="Resolver agora" />
            <StudentBackupActions actions={practiceHome.backup_actions} />
          </>
        ) : null}

        <section className="rounded-xl border border-edge bg-surface px-4 py-3" aria-label="Sessão recomendada" aria-busy={nextActionLoading}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Atalho adaptativo</p>
              {nextActionLoading ? (
                <div className="mt-2 flex animate-pulse flex-col gap-2" aria-hidden="true">
                  <div className="h-5 w-56 max-w-full rounded bg-surfaceMuted" />
                  <div className="h-3 w-80 max-w-full rounded bg-surfaceMuted" />
                </div>
              ) : (
                <>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <h2 className="font-serif text-lg font-semibold leading-tight">{recommended.title}</h2>
                    <span className="rounded-full border border-edge px-2 py-0.5 text-xs text-muted">{recommended.meta}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted">{recommended.subtitle}</p>
                  {(recommended.rationale ?? "").trim() && (
                    <GuidanceNote area={recommended.area} eyebrow="Motivo" tone={actionTone(recommended)} className="mt-2">
                      {recommended.rationale}
                    </GuidanceNote>
                  )}
                  {recommended.signals.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
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
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primaryInk shadow-sm transition hover:brightness-105 disabled:opacity-50"
            >
              {busy ? "Preparando..." : nextActionLoading ? "Carregando..." : recommended.cta_label}
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                <path d="M4 10h12" /><path d="m11 5 5 5-5 5" />
              </svg>
            </button>
          </div>
          {hasDueTopicTasks && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-edge pt-3">
              <p className="text-sm text-muted">
                Você tem <strong className="font-semibold text-ink">{dueTopicTaskCount}</strong> {dueTopicTaskCount === 1 ? "tarefa de tópico" : "tarefas de tópico"} no cronograma para hoje.
              </p>
              <button type="button" onClick={() => router.push("/cronograma")} className="text-sm font-semibold text-primary hover:underline">
                Abrir cronograma
              </button>
            </div>
          )}
        </section>

        <section className="space-y-4" aria-label="Montador de sessão">
          <div className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-edge bg-surface px-4 py-3">
            <span className="min-w-0">
              <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-primary">Montagem manual</span>
              <span className="mt-1 block font-serif text-xl font-semibold leading-tight text-ink">Montar sessão</span>
            </span>
            <span className="flex shrink-0 items-center gap-3">
              <span className="rounded-full bg-surfaceMuted px-3 py-1 text-xs font-semibold text-muted">
                {appliedFilterCount} filtro{appliedFilterCount === 1 ? "" : "s"}
              </span>
            </span>
          </div>

          <section className="grid grid-cols-1 gap-3 md:grid-cols-2" aria-label="Tipos de sessão">
            <SessionIntentCard
              eyebrow="01 · construir"
              title="Aprender um tema"
              description="Correção item a item."
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
              description="Bloco cronometrado, sem gabarito durante a execução."
              active={activeIntent === "simulation"}
              Icon={IconTrophy}
              onClick={() => {
                setStudyKind("topic");
                setResolutionMode("simulation");
                handleAnswerStatusChange("unanswered");
              }}
            />
          </section>

          <section
            aria-label="Filtros e resumo do banco de questões"
            className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]"
            data-testid="question-bank-top-filters"
          >
            <div className="min-w-0 space-y-4">
              <div className="km-card min-w-0 overflow-visible rounded-lg">
                <FiltersBar
                  area={area}
                  onAreaChange={handleAreaChange}
                  search={searchDraft}
                  onSearchChange={handleSearchChange}
                  topics={filteredTaxonomyTopics}
                  topicSuggestions={topicSuggestions}
                  topicsLoading={topicsLoading}
                  topicsError={topicsError}
                  onTopicsRetry={() => void loadBootstrap()}
                  selectedTopics={selectedTopics}
                  onToggleTopic={toggleTopic}
                  boardCodes={boardCodes}
                  examCodes={examCodes}
                  institutions={institutions}
                  sources={sources}
                  sourcesLoading={sourcesLoading}
                  sourcesError={sourcesError}
                  onSourceSelectionChange={handleSourceSelectionChange}
                  onSourcesRetry={() => void loadBootstrap()}
                  yearStats={yearStats}
                  yearsLoading={yearsLoading}
                  yearsError={yearsError}
                  onYearsRetry={() => void loadBootstrap()}
                  selectedYears={selectedYears}
                  onSelectedYearsChange={handleSelectedYearsChange}
                  includeNoYear={includeNoYear}
                  onIncludeNoYearChange={handleIncludeNoYearChange}
                  answerStatus={answerStatus}
                  onAnswerStatusChange={handleAnswerStatusChange}
                  correctionStatus={correctionStatus}
                  onCorrectionStatusChange={handleCorrectionStatusChange}
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
                  limitMax={limitMax}
                  onLimitChange={setLimit}
                />
              </div>
              <RecommendedTopicsPanel
                topics={filteredMicroTopics}
                selectedTopics={selectedTopics}
                activeIntent={activeIntent}
                onToggleTopic={toggleTopic}
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
              error={error}
              onRefreshAvailability={() => void refreshAvailability()}
              onPreviewQuestions={() => void previewQuestions()}
              onStartSession={() => void startSession()}
              onRetry={() => {
                if (availability) void startSession();
                else void refreshAvailability();
              }}
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
        </section>

        {performance && performance.areas.length > 0 && (
          <section aria-label="Sua prontidão por área" className="rounded-xl border border-edge bg-surface p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Atalhos de prontidão</p>
                <h2 className="mt-1 font-serif text-xl font-semibold leading-tight">Áreas que merecem atenção</h2>
              </div>
              {performance.exam.simulation_count > 0 && (
                <p className="text-sm text-muted">
                  Simulado: {Math.round((performance.exam.accuracy ?? 0) * 100)}% de acerto
                  {performance.exam.avg_time_ms ? ` · ${Math.round(performance.exam.avg_time_ms / 1000)}s/questão` : ""}
                  {` · ${performance.exam.simulation_count} questões`}
                </p>
              )}
            </div>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {performance.areas.slice(0, 4).map((a) => {
                const pct = Math.round(a.readiness * 100);
                const levelLabel = a.level === "consolidando" ? "Consolidando" : a.level === "atencao" ? "Atenção" : "Crítico";
                const levelTone = a.level === "consolidando" ? "text-success" : a.level === "atencao" ? "text-warning" : "text-danger";
                return (
                  <li key={a.area}>
                    <button
                      type="button"
                      onClick={() => void startFocusedArea(a.area, a.level === "consolidando" ? "unanswered" : "needs_review")}
                      disabled={busy}
                      className="w-full rounded-lg border border-edge bg-paper p-3 text-left transition hover:border-primary disabled:opacity-50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-ink">{a.label}</span>
                        <span className={`text-xs font-semibold ${levelTone}`}>{levelLabel} · {pct}%</span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surfaceMuted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-2 text-xs text-muted">
                        {a.questions_seen} feitas · {Math.round((a.accuracy ?? 0) * 100)}% acerto{a.due_count > 0 ? ` · ${a.due_count} vencidas` : ""}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <div
          className="fixed inset-x-0 z-20 border-t border-edge bg-paper px-4 py-3 md:hidden"
          style={{ bottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          {error && (
            <div className="mb-2 rounded-lg border border-danger bg-surface px-3 py-2 text-xs text-danger">
              {error}
            </div>
          )}
          <button
            type="button"
            onClick={() => void startSession()}
            disabled={!canStartConfigured}
            className="paper-control flex min-h-11 w-full items-center justify-center gap-2 border border-primary bg-primary py-3 text-sm font-semibold text-primaryInk transition disabled:opacity-40"
          >
            {busy ? "Preparando..." : configuredStartLabel}
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M4 10h12" /><path d="m11 5 5 5-5 5" />
            </svg>
          </button>
        </div>
        <div className="h-24 md:hidden" aria-hidden="true" />
      </div>
    </div>
  );
}
