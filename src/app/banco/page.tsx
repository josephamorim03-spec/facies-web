"use client";

import { Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type JSX } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import {
  browseQuestionBankQuestions,
  browseQuestionBankTopics,
  createQuestionBankSession,
  getProfile,
  getQuestionBankBootstrap,
  listQuestionBankFacets,
  previewQuestionBankAvailability,
  updateProfile,
  type QuestionBankAnswerStatus,
  type QuestionBankCorrectionStatus,
  type QuestionBankAvailability,
  type QuestionBankBootstrap,
  type QuestionBankQuestion,
  type QuestionBankResolutionMode,
  type QuestionBankSessionCreatePayload,
  type QuestionBankSourceOption,
  type QuestionBankStateOption,
  type QuestionBankTopic,
  type QuestionBankYearStat,
  type FullExamType,
  type StudyKind,
} from "@/lib/api";
import { useNavbar } from "@/lib/NavbarContext";
import { useAuthToken } from "@/lib/useAuthToken";
import { invalidateLearningQueries } from "@/lib/queryKeys";
import { useToast } from "@/lib/useToast";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { BottomActionBar, BOTTOM_ACTION_BAR_RESERVE_CLASS } from "@/components/ui/BottomActionBar";
import { Button } from "@/components/ui/Button";
import FiltersBar from "./_components/FiltersBar";
import QuestionList from "./_components/QuestionList";
import CreateSessionPanel from "./_components/CreateSessionPanel";
import { filterTopicsLocally } from "./_components/topicTree";
import {
  QUESTION_BANK_LIMIT_CAP,
  clampQuestionLimit,
  getActiveFilters,
  parseQuestionBankEntryContext,
  questionBankCtaLabel,
  resolveEntryTopic,
  type QuestionBankEntryContext,
} from "./_lib/sessionBuilder";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const DEFAULT_EXAM_CODES = ["ACESSO-DIRETO"];

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

const RECOMMENDATION_REASON_LABEL: Record<QuestionBankTopic["recommendation_reason"], string> = {
  knowledge_gap: "Lacuna de conhecimento",
  high_yield: "Alta cobrança",
  under_covered: "Pouco coberto",
  scheduled: "Planejado",
};

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
      const rankDelta = a.recommendation_rank - b.recommendation_rank;
      if (rankDelta !== 0) return rankDelta;
      return a.knowledge_node_id.localeCompare(b.knowledge_node_id);
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
                    {topic.question_count} questões
                  </p>
                  <p className="mt-0.5 line-clamp-2 break-words text-sm font-semibold leading-snug text-ink [overflow-wrap:anywhere]">{topic.node_name}</p>
                </div>
                <span className={cx("shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold", selected ? "bg-primary text-primaryInk" : "bg-surfaceMuted text-ink")}>
                  #{topic.recommendation_rank}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 break-words text-xs text-muted [overflow-wrap:anywhere]">{topicPathLabel(topic)}</p>
              <p className="mt-1 text-xs font-medium text-ink">
                {RECOMMENDATION_REASON_LABEL[topic.recommendation_reason]}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
  const queryClient = useQueryClient();
  const { setActions } = useNavbar();
  const { token, tokenResolved } = useAuthToken();
  const { showToast } = useToast();
  const routeSearchParams = useSearchParams();
  const routeSearchKey = routeSearchParams.toString();
  const initialContext = useMemo(() => parseQuestionBankEntryContext(new URLSearchParams(routeSearchKey)), [routeSearchKey]);

  // Entry context (from URL)
  const [entryContext, setEntryContext] = useState<QuestionBankEntryContext>(() => initialContext);

  // Filter state
  const [area, setArea] = useState(() => initialContext.area ?? "");
  const [searchDraft, setSearchDraft] = useState(() => initialContext.source ? "" : initialContext.theme ?? "");
  const [committedSearch, setCommittedSearch] = useState(() => initialContext.source ? "" : (initialContext.theme ?? "").trim());
  const [boardCodes, setBoardCodes] = useState<string[]>([]);
  const [examCodes, setExamCodes] = useState<string[]>(() => [...DEFAULT_EXAM_CODES]);
  const [institutions, setInstitutions] = useState<string[]>([]);
  const [stateCodes, setStateCodes] = useState<string[]>([]);
  const [sources, setSources] = useState<QuestionBankSourceOption[]>([]);
  const [states, setStates] = useState<QuestionBankStateOption[]>([]);
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
  const [resolutionMode, setResolutionMode] = useState<QuestionBankResolutionMode>(
    () => (initialContext.reviewTaskId ? "training" : "simulation"),
  );
  const [studyKind, setStudyKind] = useState<StudyKind>("topic");
  const [fullExamName, setFullExamName] = useState("");
  const [fullExamYear, setFullExamYear] = useState(() => String(new Date().getFullYear()));
  const [fullExamType, setFullExamType] = useState<FullExamType>("acesso_direto");
  const [hasChosenFeedbackDefault, setHasChosenFeedbackDefault] = useState<boolean | null>(null);
  const [feedbackDefaultPromptOpen, setFeedbackDefaultPromptOpen] = useState(false);

  // Topic state
  const [selectedTopics, setSelectedTopics] = useState<QuestionBankTopic[]>([]);
  const [taxonomyTopics, setTaxonomyTopics] = useState<QuestionBankTopic[]>([]);
  const [microTopics, setMicroTopics] = useState<QuestionBankTopic[]>([]);
  // true desde o mount: o fetch só dispara após debounce e a árvore não pode
  // abrir como "nenhum assunto" enquanto ainda nem buscou.
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [topicsError, setTopicsError] = useState(false);
  const [bootstrapReady, setBootstrapReady] = useState(false);
  const [calendarContextResolved, setCalendarContextResolved] = useState(() => !initialContext.source);
  const [focusTopicId, setFocusTopicId] = useState<string | null>(null);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [quantityEditing, setQuantityEditing] = useState(false);

  // Preview state
  const [availability, setAvailability] = useState<QuestionBankAvailability | null>(null);
  const [questions, setQuestions] = useState<QuestionBankQuestion[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
  const fullExamYearNumber = Number(fullExamYear);
  const fullExamReady = fullExamName.trim().length > 0 && Number.isInteger(fullExamYearNumber) && fullExamYearNumber > 0;

  const selectedTopicSummary = selectedTopics.length > 0
    ? selectedTopics.map((t) => t.node_name).join(", ")
    : area || "Filtro atual";

  const activeFilters = useMemo(() => getActiveFilters({
    area, boardCodes, examCodes, institutions, stateCodes, selectedYears, includeNoYear,
    answerStatus, correctionStatus, selectedTopics, search: normalizedSearch,
    defaultExamCodes: DEFAULT_EXAM_CODES,
  }), [answerStatus, area, boardCodes, correctionStatus, examCodes, includeNoYear, institutions, normalizedSearch, selectedTopics, selectedYears, stateCodes]);

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
    const routeParams = new URLSearchParams(routeSearchKey);
    const context = parseQuestionBankEntryContext(routeParams);
    const opensInstitutionalExam = routeParams.get("tipo") === "prova";
    setEntryContext(context);
    setArea(context.area ?? "");
    setSearchDraft(context.source ? "" : context.theme ?? "");
    setCommittedSearch(context.source ? "" : (context.theme ?? "").trim());
    setCorrectionStatus("all");
    setLimit(clampQuestionLimit(context.expectedQuestions ?? 10));
    setResolutionMode(context.reviewTaskId ? "training" : "simulation");
    setStudyKind(opensInstitutionalExam ? "full_exam" : "topic");
    setStateCodes([]);
    setSelectedTopics([]);
    setFocusTopicId(null);
    setCalendarContextResolved(!context.source);
    const bootstrap = bootstrapRef.current;
    if (bootstrap) {
      const split = splitBootstrapTopics(bootstrap.topics);
      setTaxonomyTopics(split.taxonomy);
      setMicroTopics(split.micros);
    }
    setQuestions([]);
  }, [routeSearchKey]);

  useEffect(() => {
    if (!tokenResolved) return;
    getProfile(token)
      .then((profile) => {
        setHasChosenFeedbackDefault(profile.has_chosen_feedback_default);
        if (!entryContext.reviewTaskId) {
          setResolutionMode(
            profile.default_feedback_timing === "immediate" ? "training" : "simulation",
          );
        }
      })
      .catch(() => setHasChosenFeedbackDefault(true));
  }, [entryContext.reviewTaskId, token, tokenResolved]);

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
    state_codes: stateCodes.length > 0 ? stateCodes : undefined,
    years: selectedYears.length > 0 ? selectedYears : undefined,
    include_no_year: includeNoYear || undefined,
    search: normalizedSearch || undefined,
    answer_status: answerStatus,
    only_unanswered: answerStatus === "unanswered",
    correction_status: correctionStatus,
    limit: overrides?.limit,
  }), [answerStatus, area, boardCodes, correctionStatus, examCodes, includeNoYear, institutions, normalizedSearch, selectedTopics, selectedYears, stateCodes]);

  // ─── Data fetching ───────────────────────────────────────────────────────

  const refreshAvailability = useCallback(async () => {
    const requestKey = JSON.stringify({ ...filterParams(), mode: "by_topic" });
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
        { ...filterParams(), mode: "by_topic" },
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
        state_codes: stateCodes.length > 0 ? stateCodes : undefined,
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
  }, [boardCodes, examCodes, institutions, selectedYears, showToast, stateCodes, token]);

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
      setStates(bootstrap.states ?? []);
      setYearStats(bootstrap.years);
      setTaxonomyTopics(split.taxonomy);
      setMicroTopics(split.micros);
      setBootstrapReady(true);
    } catch (err) {
      bootstrapRef.current = null;
      setBootstrapReady(false);
      setSources([]);
      setStates([]);
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

  // Calendar reviews are rendered only after their normalized taxonomy context is
  // resolved. This prevents a useful screen from flashing with stale local filters.
  useEffect(() => {
    if (!bootstrapReady || !entryContext.source || calendarContextResolved) return;
    const entryTopic = resolveEntryTopic([...taxonomyTopics, ...microTopics], entryContext);
    if (entryTopic) {
      setArea(entryContext.area ?? "");
      setSelectedTopics([entryTopic]);
      setFocusTopicId(entryTopic.knowledge_node_id);
      setError(null);
    } else if (entryContext.knowledgeNodeId || entryContext.theme) {
      setError("O tema desta atividade não está mais disponível no Banco. Nenhum filtro foi aplicado.");
    }
    setCalendarContextResolved(true);
  }, [bootstrapReady, calendarContextResolved, entryContext, microTopics, taxonomyTopics]);

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
      state_codes: stateCodes.length > 0 ? stateCodes : undefined,
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
          state_codes: stateCodes.length > 0 ? stateCodes : undefined,
          years: selectedYears.length > 0 ? selectedYears : undefined,
          correction_status: correctionStatus,
        },
        controller.signal,
      );
      if (facetsRequestSeq.current !== seq) return;
      setYearStats(facets.years);
      setSources([...facets.exams, ...facets.boards, ...facets.institutions]);
      setStates(facets.states ?? []);
    } catch (err) {
      if (controller.signal.aborted || isAbortError(err)) return;
      // Keep the last good options on a transient facet error.
    } finally {
      if (facetsAbortRef.current === controller) facetsAbortRef.current = null;
      if (facetsInFlightRef.current?.key === requestKey) facetsInFlightRef.current = null;
    }
  }, [area, boardCodes, correctionStatus, examCodes, institutions, normalizedSearch, selectedTopics, selectedYears, stateCodes, token]);

  useEffect(() => {
    if (!tokenResolved || !bootstrapReady) return;
    const hasFacetFilters = Boolean(
      area || normalizedSearch || selectedTopics.length || boardCodes.length || examCodes.length ||
      institutions.length || stateCodes.length || selectedYears.length || correctionStatus !== "all"
    );
    if (!hasFacetFilters) {
      const bootstrap = bootstrapRef.current;
      if (bootstrap) {
        setSources(bootstrap.sources);
        setStates(bootstrap.states ?? []);
        setYearStats(bootstrap.years);
      }
      return;
    }
    const timer = window.setTimeout(() => {
      void refreshFacets();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [area, boardCodes.length, bootstrapReady, correctionStatus, examCodes.length, institutions.length, normalizedSearch, refreshFacets, selectedTopics.length, selectedYears.length, stateCodes.length, tokenResolved]);

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
      boardCodes.length || examCodes.length || institutions.length || stateCodes.length || selectedYears.length
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
  }, [boardCodes.length, bootstrapReady, examCodes.length, institutions.length, refreshTopics, selectedYears.length, stateCodes.length, tokenResolved]);

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

  function handleStateCodesChange(next: string[]) {
    setStateCodes(next.map((value) => value.trim().toUpperCase()).filter(Boolean));
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

  function locateActiveFilter(filter: { id: string; topicId?: string }) {
    setFocusTopicId(filter.topicId ?? null);
    const topicFilter = Boolean(filter.topicId) || filter.id === "area" || filter.id === "search";
    const target = document.getElementById(topicFilter ? "question-bank-topic-filters" : "question-bank-adjustments");
    if (target instanceof HTMLDetailsElement) target.open = true;
    target?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
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

  async function startSession(options: { skipDefaultPrompt?: boolean } = {}) {
    if (!tokenResolved || clampedLimit <= 0) return;
    if (
      studyKind !== "full_exam" &&
      !options.skipDefaultPrompt &&
      hasChosenFeedbackDefault === false
    ) {
      setFeedbackDefaultPromptOpen(true);
      return;
    }
    if (studyKind === "full_exam" && !fullExamReady) {
      const message = "Informe nome, ano e tipo da prova para iniciar.";
      setError(message);
      showToast(message, "error");
      return;
    }
    const payload: QuestionBankSessionCreatePayload = {
      session_kind:
        studyKind === "full_exam"
          ? "institutional_exam"
          : selectedTopics.length > 1
            ? "bank_combined"
            : "bank_topic",
      feedback_timing: resolutionMode === "simulation" ? "post_result" : "immediate",
      mode: studyKind === "full_exam" ? "by_exam" : "by_topic",
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
      payload.institutions = [fullExamName.trim()];
      payload.years = [fullExamYearNumber];
      payload.exam_codes = [fullExamType === "r_plus" ? "RPLUS" : "ACESSO-DIRETO"];
      payload.generate_review_trail = false;
    } else {
      payload.generate_review_trail = false;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await createQuestionBankSession(token, payload);
      void invalidateLearningQueries(queryClient);
      router.push(`/banco/sessao/${created.session_id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível criar a sessão.";
      setError(message);
      showToast(message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function continueAfterFeedbackPrompt(saveAsDefault: boolean) {
    setFeedbackDefaultPromptOpen(false);
    setHasChosenFeedbackDefault(true);
    if (saveAsDefault) {
      try {
        await updateProfile(token, {
          default_feedback_timing:
            resolutionMode === "training" ? "immediate" : "post_result",
          has_chosen_feedback_default: true,
        });
      } catch (cause) {
        showToast(
          cause instanceof Error
            ? cause.message
            : "Não foi possível salvar a correção padrão.",
          "error",
        );
        return;
      }
    }
    await startSession({ skipDefaultPrompt: true });
  }

  if (!tokenResolved) return <div className="p-6 text-sm text-muted">Carregando...</div>;
  if (entryContext.source && !calendarContextResolved) {
    return <div className="p-6 text-sm text-muted" aria-live="polite">Configurando a revisão do calendário...</div>;
  }

  const canStartConfigured = !busy && (studyKind !== "full_exam" || fullExamReady) && !!availability && availability.available_count > 0;
  const configuredStartLabel = questionBankCtaLabel(clampedLimit, resolutionMode, studyKind);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className={`mx-auto max-w-7xl space-y-5 ${BOTTOM_ACTION_BAR_RESERVE_CLASS}`}>
        <section className="space-y-4" aria-label="Montador de sessão">
          <div className="flex w-full flex-wrap items-center justify-between gap-3 border-b border-edge pb-4">
            <span className="min-w-0">
              <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-primary">Montagem manual</span>
              <span className="mt-1 block font-serif text-xl font-semibold leading-tight text-ink">Montar sessão</span>
            </span>
            {activeFilters.length > 0 && (
              <div className="relative shrink-0">
                <button
                  type="button"
                  aria-expanded={filterMenuOpen}
                  aria-controls="question-bank-active-filters"
                  aria-label={activeFilters.length === 1
                    ? "1 filtro ativo: " + activeFilters[0].label + ". Toque para localizar."
                    : activeFilters.length + " filtros ativos. Toque para visualizar."}
                  onClick={() => {
                    if (activeFilters.length === 1) {
                      locateActiveFilter(activeFilters[0]);
                      return;
                    }
                    setFilterMenuOpen((open) => !open);
                  }}
                  className="min-h-11 rounded-full bg-surfaceMuted px-3 text-xs font-semibold text-muted transition-colors hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  {activeFilters.length === 1 ? activeFilters[0].label : activeFilters.length + " filtros"}
                </button>
                {filterMenuOpen && activeFilters.length > 1 && (
                  <div id="question-bank-active-filters" role="dialog" aria-label="Filtros ativos" className="absolute right-0 z-30 mt-2 w-72 rounded-xl border border-edge bg-surface p-2 shadow-[var(--soft-shadow)]">
                    {activeFilters.map((filter) => (
                      <button
                        key={filter.id}
                        type="button"
                        onClick={() => {
                          setFilterMenuOpen(false);
                          locateActiveFilter(filter);
                        }}
                        className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm font-medium text-ink hover:bg-surfaceMuted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <section
            aria-label="Filtros e resumo do banco de questões"
            className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]"
            data-testid="question-bank-top-filters"
          >
            <div className="min-w-0 space-y-4">
              <div className="min-w-0 overflow-visible border-y border-edge">
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
                  stateCodes={stateCodes}
                  sources={sources}
                  states={states}
                  sourcesLoading={sourcesLoading}
                  sourcesError={sourcesError}
                  onSourceSelectionChange={handleSourceSelectionChange}
                  onStateCodesChange={handleStateCodesChange}
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
                  limit={limit}
                  clampedLimit={clampedLimit}
                  maxSelectable={maxSelectable}
                  limitMax={limitMax}
                  onLimitChange={setLimit}
                  focusTopicId={focusTopicId}
                  onQuantityEditingChange={setQuantityEditing}
                />
              </div>
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
              onRetry={() => {
                if (availability) void startSession();
                else void refreshAvailability();
              }}
            />
          </section>

          <QuestionList
            questions={questions}
            selectedTopicSummary={selectedTopicSummary}
          />
        </section>

        <BottomActionBar
          maxWidthClassName="max-w-7xl"
          hiddenOnMobile={quantityEditing}
          status={error ? <span className="text-danger" role="alert">{error}</span> : null}
        >
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => void startSession()}
            disabled={!canStartConfigured}
            className="w-full"
          >
            {busy ? "Preparando..." : configuredStartLabel}
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M4 10h12" /><path d="m11 5 5 5-5 5" />
            </svg>
          </Button>
        </BottomActionBar>
      </div>
      <ConfirmDialog
        open={feedbackDefaultPromptOpen}
        title="Usar esta correção como padrão?"
        message={`Você escolheu ${
          resolutionMode === "training" ? "correção imediata" : "correção pós-resultado"
        }. Esta preferência pode ser alterada depois.`}
        cancelLabel="Só nesta sessão"
        confirmLabel="Usar como padrão"
        onCancel={() => void continueAfterFeedbackPrompt(false)}
        onConfirm={() => void continueAfterFeedbackPrompt(true)}
      />
    </div>
  );
}
