"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  browseQuestionBankQuestions,
  browseQuestionBankTopics,
  createQuestionBankSession,
  previewQuestionBankAvailability,
  type QuestionBankAnswerStatus,
  type QuestionBankAvailability,
  type QuestionBankQuestion,
  type QuestionBankResolutionMode,
  type QuestionBankTopic,
} from "@/lib/api";
import { useAuthToken } from "@/lib/useAuthToken";
import FiltersBar from "./_components/FiltersBar";
import QuestionList from "./_components/QuestionList";
import CreateSessionPanel from "./_components/CreateSessionPanel";

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
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [answerStatus, setAnswerStatus] = useState<QuestionBankAnswerStatus>("unanswered");
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

  // Derived
  const parsedYearFrom = useMemo(() => {
    const n = Number(yearFrom);
    return Number.isInteger(n) && n > 0 ? n : undefined;
  }, [yearFrom]);

  const parsedYearTo = useMemo(() => {
    const n = Number(yearTo);
    return Number.isInteger(n) && n > 0 ? n : undefined;
  }, [yearTo]);

  const maxSelectable = Math.max(1, Math.min(50, availability?.max_selectable ?? 50));
  const clampedLimit = Math.max(1, Math.min(limit, maxSelectable));

  const selectedTopicSummary = selectedTopics.length > 0
    ? selectedTopics.map((t) => t.node_name).join(", ")
    : search.trim() || "Filtro atual";

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

  // ─── Filter params factory ───────────────────────────────────────────────

  const filterParams = useCallback((overrides?: { limit?: number }) => ({
    knowledge_node_ids: selectedTopics.length > 0 ? selectedTopics.map((t) => t.knowledge_node_id) : undefined,
    area: area || undefined,
    search: search.trim() || undefined,
    institution: institution.trim() || undefined,
    board_codes: boardCodes.length > 0 ? boardCodes : undefined,
    year_from: parsedYearFrom,
    year_to: parsedYearTo,
    answer_status: answerStatus,
    only_unanswered: answerStatus === "unanswered",
    limit: overrides?.limit,
  }), [answerStatus, area, boardCodes, institution, parsedYearFrom, parsedYearTo, search, selectedTopics]);

  // ─── Data fetching ───────────────────────────────────────────────────────

  const refreshAvailability = useCallback(async () => {
    setLoadingPreview(true);
    setError(null);
    try {
      const next = await previewQuestionBankAvailability(token, filterParams());
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
        year_from: parsedYearFrom,
        year_to: parsedYearTo,
        limit: 200,
      });
      setTopics(found);
    } catch {
      setTopics([]);
    }
  }, [area, boardCodes, institution, parsedYearFrom, parsedYearTo, search, token]);

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

  function handleYearFromChange(next: string) {
    setYearFrom(next);
    clearSelection();
  }

  function handleYearToChange(next: string) {
    setYearTo(next);
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
      setBusy(false);
    }
  }

  if (!tokenResolved) return <main className="p-6 text-sm text-muted">Carregando...</main>;

  return (
    <main className="min-h-screen bg-paper px-4 py-6 text-ink md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">KrosBank</p>
            <h1 className="mt-1 font-serif text-3xl font-semibold leading-tight md:text-4xl">Banco de questões</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Monte blocos por área, instituição, ano, realização e assunto real do banco.
            </p>
          </div>
          {entryContext.reviewTaskId && (
            <span className="rounded-full border border-edge bg-[var(--amber-tint)] px-3 py-1.5 text-xs text-muted">
              <strong className="font-semibold text-ink">{(entryContext.theme ?? search) || "Revisão"}</strong>
              {" · "}{(entryContext.area ?? area) || "Área"}
              {" · "}{entryContext.dateISO ?? "data do calendário"}
            </span>
          )}
        </header>

        <section
          aria-label="Filtros do banco de questões"
          className="km-card overflow-visible"
          data-testid="question-bank-top-filters"
        >
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
            yearFrom={yearFrom}
            onYearFromChange={handleYearFromChange}
            yearTo={yearTo}
            onYearToChange={handleYearToChange}
            answerStatus={answerStatus}
            onAnswerStatusChange={handleAnswerStatusChange}
            resolutionMode={resolutionMode}
            onResolutionModeChange={setResolutionMode}
            limit={limit}
            clampedLimit={clampedLimit}
            maxSelectable={maxSelectable}
            onLimitChange={setLimit}
          />
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
      </div>
    </main>
  );
}
