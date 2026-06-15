"use client";

import { Suspense, useCallback, useEffect, useMemo, useState, type JSX } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  browseQuestionBankQuestions,
  browseQuestionBankTopics,
  createQuestionBankSession,
  getReviewAgenda,
  getQuestionBankReviewQueue,
  previewQuestionBankAvailability,
  type QuestionBankAnswerStatus,
  type QuestionBankAvailability,
  type QuestionBankQuestion,
  type QuestionBankResolutionMode,
  type QuestionBankReviewQueue,
  type QuestionBankTopic,
} from "@/lib/api";
import { useNavbar } from "@/lib/NavbarContext";
import { useAuthToken } from "@/lib/useAuthToken";
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
  title: string;
  description: string;
  active: boolean;
  Icon: (props: { className?: string }) => JSX.Element;
  onClick: () => void;
};

function SessionIntentCard({ title, description, active, Icon, onClick }: SessionIntentCardProps) {
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
        <h2 className={cx("font-serif text-base font-semibold leading-tight md:text-lg", active ? "text-ink" : "text-muted group-hover:text-ink")}>{title}</h2>
        <p className="mt-0.5 text-xs leading-relaxed text-muted md:mt-1 md:text-sm">{description}</p>
      </div>
      <IconChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 md:hidden" />
    </button>
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

  // Topic state
  const [selectedTopics, setSelectedTopics] = useState<QuestionBankTopic[]>([]);
  const [topics, setTopics] = useState<QuestionBankTopic[]>([]);

  // Preview state
  const [availability, setAvailability] = useState<QuestionBankAvailability | null>(null);
  const [questions, setQuestions] = useState<QuestionBankQuestion[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewQueue, setReviewQueue] = useState<QuestionBankReviewQueue>({
    due_count: 0,
    struggling_count: 0,
    total: 0,
  });
  const [dueTopicTaskCount, setDueTopicTaskCount] = useState(0);

  // Derived
  const maxSelectable = Math.max(1, Math.min(50, availability?.max_selectable ?? 50));
  const clampedLimit = Math.max(1, Math.min(limit, maxSelectable));

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
    answerStatus === "wrong" || answerStatus === "needs_review"
      ? "weakness"
      : resolutionMode === "simulation"
        ? "simulation"
        : "learning";

  // Reset on URL change
  useEffect(() => {
    const context = parseEntryContext(new URLSearchParams(routeSearchKey));
    setEntryContext(context);
    setArea(context.area ?? "");
    setSearch(context.theme ?? "");
    setLimit(Math.max(1, Math.min(50, context.expectedQuestions ?? 10)));
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
        limit: 200,
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
    setBusy(true);
    setError(null);
    try {
      const created = await createQuestionBankSession(token, {
        mode: "adaptive",
        resolution_mode: resolutionMode,
        ...filterParams({ limit: clampedLimit }),
        performed_at: localNoonISO(entryContext.dateISO),
        review_task_id: entryContext.reviewTaskId ?? undefined,
      });
      router.push(`/banco-de-questoes/sessao/${created.session_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar a sessão.");
    } finally {
      setBusy(false);
    }
  }

  // Review queue: FSRS-due + struggling questions, surfaced as an actionable card.
  useEffect(() => {
    if (!tokenResolved) return;
    let active = true;
    getQuestionBankReviewQueue(token)
      .then((q) => {
        if (active) setReviewQueue(q);
      })
      .catch(() => {
        if (active) setReviewQueue({ due_count: 0, struggling_count: 0, total: 0 });
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

  async function startReviewSession() {
    if (!tokenResolved || !reviewQueue || reviewQueue.total <= 0) return;
    setBusy(true);
    setError(null);
    try {
      const created = await createQuestionBankSession(token, {
        mode: "adaptive",
        resolution_mode: "training",
        answer_status: "needs_review",
        only_unanswered: false,
        limit: Math.max(1, Math.min(20, reviewQueue.total)),
        performed_at: localNoonISO(entryContext.dateISO),
      });
      router.push(`/banco-de-questoes/sessao/${created.session_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível iniciar a revisão.");
    } finally {
      setBusy(false);
    }
  }

  if (!tokenResolved) return <main className="p-6 text-sm text-muted">Carregando...</main>;

  const hasDueTopicTasks = dueTopicTaskCount > 0;
  const hasQuestionReviewQueue = Boolean(reviewQueue && reviewQueue.total > 0);

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-serif text-4xl font-semibold leading-tight md:text-5xl">Monte sua sessão</h1>
            <p className="mt-3 max-w-2xl text-base text-muted">
              Escolha como deseja estudar e personalize o bloco com filtros do banco.
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

        {(hasDueTopicTasks || hasQuestionReviewQueue) && (
          <section
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary bg-[var(--amber-tint)] px-4 py-3"
            aria-label="Revisão pendente"
          >
            <p className="text-sm text-ink">
              {hasDueTopicTasks ? (
                <>
                  <strong className="font-semibold">
                    {dueTopicTaskCount === 1
                      ? "1 tarefa de tópico para revisar hoje"
                      : `${dueTopicTaskCount} tarefas de tópico para revisar hoje`}
                  </strong>
                  {reviewQueue && reviewQueue.total > 0
                    ? ` · ${reviewQueue.total} questões pendentes no banco`
                    : ""}
                </>
              ) : (
                <>
                  <strong className="font-semibold">
                    {reviewQueue.total === 1
                      ? "1 questão para revisar hoje"
                      : `${reviewQueue.total} questões para revisar hoje`}
                  </strong>
                  {reviewQueue.due_count > 0 ? ` · ${reviewQueue.due_count} com revisão vencida` : ""}
                  {reviewQueue.struggling_count > 0 ? ` · ${reviewQueue.struggling_count} com baixo desempenho` : ""}
                </>
              )}
            </p>
            <button
              type="button"
              onClick={() => {
                if (hasDueTopicTasks) {
                  router.push("/cronograma");
                  return;
                }
                void startReviewSession();
              }}
              disabled={!hasDueTopicTasks && busy}
              className="rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primaryInk shadow-sm disabled:opacity-50"
            >
              {hasDueTopicTasks ? "Abrir cronograma" : "Revisar agora"}
            </button>
          </section>
        )}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3" aria-label="Tipos de sessão">
          <SessionIntentCard
            title="Aprender um tema"
            description="Resolva com feedback mais próximo e acompanhe o raciocínio item a item."
            active={activeIntent === "learning"}
            Icon={IconBookOpen}
            onClick={() => {
              setResolutionMode("training");
              handleAnswerStatusChange("unanswered");
            }}
          />
          <SessionIntentCard
            title="Simular prova"
            description="Faça um bloco cronometrado e deixe a correção para o final."
            active={activeIntent === "simulation"}
            Icon={IconTrophy}
            onClick={() => {
              setResolutionMode("simulation");
              handleAnswerStatusChange("unanswered");
            }}
          />
          <SessionIntentCard
            title="Corrigir fraquezas"
            description="Puxe questões erradas, com baixo desempenho ou revisão vencida para fechar lacunas."
            active={activeIntent === "weakness"}
            Icon={IconTarget}
            onClick={() => {
              setResolutionMode("training");
              handleAnswerStatusChange("needs_review");
            }}
          />
        </section>

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
            onRefreshAvailability={() => void refreshAvailability()}
            onPreviewQuestions={() => void previewQuestions()}
            onStartSession={() => void startSession()}
          />
        </section>

        {error && (
          <div className="rounded-xl border border-danger bg-surface p-4 text-sm text-danger">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => void refreshAvailability()}
                className="font-semibold underline"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )}

        <QuestionList
          questions={questions}
          selectedTopicSummary={selectedTopicSummary}
          resolutionMode={resolutionMode}
          busy={busy}
          availability={availability}
          onStartSession={() => void startSession()}
        />

        {/* Mobile sticky start bar */}
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-edge bg-paper/90 px-4 py-3 backdrop-blur-md md:hidden"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}>
          <button
            type="button"
            onClick={() => void startSession()}
            disabled={busy || !availability || availability.available_count <= 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary bg-primary py-3 text-sm font-semibold text-primaryInk shadow-sm transition disabled:opacity-40"
          >
            {busy ? "Preparando..." : resolutionMode === "simulation" ? "Iniciar simulado" : "Iniciar treino"}
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
