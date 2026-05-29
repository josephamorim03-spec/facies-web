"use client";

/* eslint-disable @next/next/no-img-element */

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  browseQuestionBankQuestions,
  browseQuestionBankTopics,
  createQuestionBankSession,
  finalizeQuestionBankSession,
  previewQuestionBankAvailability,
  recordQuestionBankAttempt,
  recordQuestionBankCorrection,
  reportQuestionProblem,
  type QuestionBankAnswerStatus,
  type QuestionBankAvailability,
  type QuestionBankOption,
  type QuestionBankQuestion,
  type QuestionBankReportType,
  type QuestionBankResolutionMode,
  type QuestionBankSession,
  type QuestionBankTopic,
} from "@/lib/api";
import { useAuthToken } from "@/lib/useAuthToken";

const OPTIONS: QuestionBankOption[] = ["A", "B", "C", "D", "E"];
const AREAS = ["", "GO", "CM", "CG", "MP", "PD", "OU"] as const;
const QUICK_YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025] as const;

const REALIZACAO_OPTIONS: { value: QuestionBankAnswerStatus; label: string }[] = [
  { value: "unanswered", label: "Não realizadas" },
  { value: "answered", label: "Já realizadas" },
  { value: "all", label: "Todas" },
];

const MODO_OPTIONS: { value: QuestionBankResolutionMode; label: string }[] = [
  { value: "simulation", label: "Simulado" },
  { value: "training", label: "Treino" },
];

type FilterTab = "assunto" | "banca" | "ano" | "realizacao" | "modo" | "quantidade";

type EntryContext = {
  reviewTaskId: string | null;
  dateISO: string | null;
  area: string | null;
  theme: string | null;
  expectedQuestions: number | null;
};

type SearchParamReader = {
  get(name: string): string | null;
};

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

function availabilityText(availability: QuestionBankAvailability | null): string {
  if (!availability) return "Calculando...";
  if (availability.answer_status === "answered") {
    return `${availability.answered_count} já realizadas`;
  }
  if (availability.answer_status === "all") {
    return `${availability.total_count} no filtro`;
  }
  return `${availability.unanswered_count} disponíveis`;
}

export default function BancoDeQuestoesPage() {
  return (
    <Suspense fallback={<main className="p-6 text-sm text-muted">Carregando...</main>}>
      <BancoDeQuestoesContent />
    </Suspense>
  );
}

function BancoDeQuestoesContent() {
  const { token, tokenResolved } = useAuthToken();
  const routeSearchParams = useSearchParams();
  const routeSearchKey = routeSearchParams.toString();
  const initialContext = useMemo(() => parseEntryContext(new URLSearchParams(routeSearchKey)), [routeSearchKey]);

  const [entryContext, setEntryContext] = useState<EntryContext>(() => initialContext);
  const [area, setArea] = useState(() => initialContext.area ?? "");
  const [search, setSearch] = useState(() => initialContext.theme ?? "");
  const [institution, setInstitution] = useState("");
  const [boardCodesState, setBoardCodesState] = useState<string[]>([]);
  const [boardInput, setBoardInput] = useState("");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [answerStatus, setAnswerStatus] = useState<QuestionBankAnswerStatus>("unanswered");
  const [limit, setLimit] = useState(() => Math.max(1, Math.min(50, initialContext.expectedQuestions ?? 10)));
  const [resolutionMode, setResolutionMode] = useState<QuestionBankResolutionMode>("simulation");

  const [selectedTopics, setSelectedTopics] = useState<QuestionBankTopic[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab | null>(null);
  const [suggestionsFocused, setSuggestionsFocused] = useState(false);
  const [topics, setTopics] = useState<QuestionBankTopic[]>([]);
  const [availability, setAvailability] = useState<QuestionBankAvailability | null>(null);
  const [questions, setQuestions] = useState<QuestionBankQuestion[]>([]);
  const [session, setSession] = useState<QuestionBankSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [revealedPositions, setRevealedPositions] = useState<Record<number, boolean>>({});
  const [correctionDrafts, setCorrectionDrafts] = useState<Record<number, string>>({});
  const [reportingQuestionId, setReportingQuestionId] = useState<string | null>(null);
  const [reportType, setReportType] = useState<QuestionBankReportType>("error");
  const [reportReason, setReportReason] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [reportDone, setReportDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const context = parseEntryContext(new URLSearchParams(routeSearchKey));
    setEntryContext(context);
    setArea(context.area ?? "");
    setSearch(context.theme ?? "");
    setLimit(Math.max(1, Math.min(50, context.expectedQuestions ?? 10)));
    setSelectedTopics([]);
    setQuestions([]);
    setResult(null);
  }, [routeSearchKey]);

  const parsedYearFrom = useMemo(() => {
    const parsed = Number(yearFrom);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  }, [yearFrom]);

  const parsedYearTo = useMemo(() => {
    const parsed = Number(yearTo);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  }, [yearTo]);

  const hasReviewContext = Boolean(entryContext.reviewTaskId);
  const maxSelectable = Math.max(1, Math.min(50, availability?.max_selectable ?? 50));
  const clampedLimit = Math.max(1, Math.min(limit, maxSelectable));

  const filterParams = useCallback((overrides?: { limit?: number }) => ({
    knowledge_node_ids: selectedTopics.length > 0 ? selectedTopics.map(t => t.knowledge_node_id) : undefined,
    area: area || undefined,
    search: search.trim() || undefined,
    institution: institution.trim() || undefined,
    board_codes: boardCodesState.length > 0 ? boardCodesState : undefined,
    year_from: parsedYearFrom,
    year_to: parsedYearTo,
    answer_status: answerStatus,
    only_unanswered: answerStatus === "unanswered",
    limit: overrides?.limit,
  }), [answerStatus, area, boardCodesState, institution, parsedYearFrom, parsedYearTo, search, selectedTopics]);

  const refreshAvailability = useCallback(async () => {
    setLoadingPreview(true);
    setError(null);
    try {
      const next = await previewQuestionBankAvailability(token, filterParams());
      setAvailability(next);
      if (next.max_selectable > 0 && limit > next.max_selectable) {
        setLimit(next.max_selectable);
      }
    } catch (err) {
      setAvailability(null);
      setError(err instanceof Error ? err.message : "Nao foi possivel calcular a disponibilidade.");
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
        board_codes: boardCodesState.length > 0 ? boardCodesState : undefined,
        year_from: parsedYearFrom,
        year_to: parsedYearTo,
        limit: 60,
      });
      setTopics(found);
    } catch {
      setTopics([]);
    }
  }, [area, boardCodesState, institution, parsedYearFrom, parsedYearTo, search, token]);

  useEffect(() => {
    if (!tokenResolved || session) return;
    const timer = window.setTimeout(() => {
      void refreshAvailability();
      void refreshTopics();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [refreshAvailability, refreshTopics, session, token, tokenResolved]);

  function clearTopicForFilterChange() {
    setSelectedTopics([]);
    setQuestions([]);
    setResult(null);
  }

  function toggleTopic(topic: QuestionBankTopic) {
    setSelectedTopics(prev => {
      const exists = prev.some(t => t.knowledge_node_id === topic.knowledge_node_id);
      return exists
        ? prev.filter(t => t.knowledge_node_id !== topic.knowledge_node_id)
        : [...prev, topic];
    });
    setQuestions([]);
    setResult(null);
  }

  function addBoardCode() {
    const code = boardInput.trim().toUpperCase();
    if (!code) return;
    setBoardCodesState(prev => prev.includes(code) ? prev : [...prev, code]);
    setBoardInput("");
  }

  function removeBoardCode(code: string) {
    setBoardCodesState(prev => prev.filter(c => c !== code));
  }

  async function previewQuestions() {
    if (!tokenResolved) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setQuestions(await browseQuestionBankQuestions(token, filterParams({ limit: clampedLimit })));
      setSession(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel buscar questoes.");
    } finally {
      setBusy(false);
    }
  }

  async function startSession() {
    if (!tokenResolved || clampedLimit <= 0) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setRevealedPositions({});
    setCorrectionDrafts({});
    try {
      const created = await createQuestionBankSession(token, {
        mode: "adaptive",
        resolution_mode: resolutionMode,
        ...filterParams({ limit: clampedLimit }),
        performed_at: localNoonISO(entryContext.dateISO),
        review_task_id: entryContext.reviewTaskId ?? undefined,
      });
      setSession(created);
      setQuestions([]);
      setActiveTab(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel criar a sessao.");
    } finally {
      setBusy(false);
    }
  }

  async function answer(position: number, selected: QuestionBankOption) {
    if (!tokenResolved || !session) return;
    setBusy(true);
    setError(null);
    try {
      setSession(await recordQuestionBankAttempt(token, session.session_id, position, {
        selected_option: selected,
        confidence_self_rating: 3,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel registrar a resposta.");
    } finally {
      setBusy(false);
    }
  }

  async function submitCorrection(position: number) {
    if (!tokenResolved || !session) return;
    const response = correctionDrafts[position]?.trim();
    if (!response) return;
    setBusy(true);
    setError(null);
    try {
      const out = await recordQuestionBankCorrection(token, session.session_id, position, {
        prompt: "Qual foi o raciocinio correto e onde voce errou?",
        response_value: response,
        confidence_delta: 0.3,
      });
      setSession(out.session);
      setCorrectionDrafts(current => ({ ...current, [position]: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel salvar a correcao guiada.");
    } finally {
      setBusy(false);
    }
  }

  async function finalize() {
    if (!tokenResolved || !session) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const out = await finalizeQuestionBankSession(token, session.session_id, { confirm_unanswered: true });
      setSession(out.session);
      const label = hasReviewContext ? "Revisao registrada" : "Estudo inicial criado";
      setResult(`${label}: ${out.correct_questions}/${out.total_questions} acertos.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel finalizar.");
    } finally {
      setBusy(false);
    }
  }

  async function submitReport(questionId: string) {
    if (!token) return;
    setReportBusy(true);
    try {
      await reportQuestionProblem(token, questionId, { report_type: reportType, report_reason: reportReason.trim() || undefined });
      setReportDone(prev => ({ ...prev, [questionId]: true }));
      setReportingQuestionId(null);
      setReportReason("");
    } catch {
      // silently ignore — user can try again
    } finally {
      setReportBusy(false);
    }
  }

  const startLabel = resolutionMode === "training" ? "Iniciar treino" : "Iniciar simulado";

  if (!tokenResolved) return <main className="p-6 text-sm text-muted">Carregando...</main>;

  const TABS: { id: FilterTab; label: string; indicator: boolean }[] = [
    {
      id: "assunto",
      label: "Especialidade / Assunto",
      indicator: selectedTopics.length > 0 || !!area || !!search.trim(),
    },
    {
      id: "banca",
      label: "Banca / Instituição",
      indicator: boardCodesState.length > 0 || !!institution.trim(),
    },
    {
      id: "ano",
      label: "Ano",
      indicator: !!yearFrom || !!yearTo,
    },
    {
      id: "realizacao",
      label: "Realização",
      indicator: answerStatus !== "unanswered",
    },
    {
      id: "modo",
      label: `Modo: ${resolutionMode === "simulation" ? "Simulado" : "Treino"}`,
      indicator: false,
    },
    {
      id: "quantidade",
      label: `Quantidade: ${clampedLimit}`,
      indicator: false,
    },
  ];

  return (
    <main className="min-h-screen bg-paper p-4 text-ink md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="border-b border-edge pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">KrosBank</p>
              <h1 className="mt-1 font-serif text-3xl font-semibold">Banco de questoes</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="border border-edge px-2 py-1 font-semibold">
                {hasReviewContext ? "Revisao" : "Estudo inicial"}
              </span>
              {hasReviewContext && (
                <span className="border border-edge bg-[var(--amber-tint)] px-2 py-1 text-muted">
                  <strong className="font-medium text-ink">{(entryContext.theme ?? search) || "Revisao"}</strong>
                  {" — "}
                  {(entryContext.area ?? area) || "Area"}
                  {" — "}
                  {entryContext.dateISO ?? "data do calendario"}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Filter section: tab bar + panels + action bar */}
        <section aria-label="Filtros do banco de questoes" className="border border-edge bg-paper">

          {/* Tab bar */}
          <nav className="flex overflow-x-auto border-b border-edge" aria-label="Categorias de filtro">
            {TABS.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(activeTab === tab.id ? null : tab.id)}
                className={`relative shrink-0 px-4 py-3 text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-b-2 border-ink font-medium text-ink"
                    : "text-muted hover:text-ink"
                }`}
              >
                {tab.label}
                {tab.indicator && (
                  <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-ink" />
                )}
              </button>
            ))}
          </nav>

          {/* Active tab panel */}
          {activeTab && (
            <div className="border-b border-edge p-5">

              {/* Especialidade / Assunto */}
              {activeTab === "assunto" && (
                <div className="grid gap-6 xl:grid-cols-[1fr_260px]">
                  <div>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {AREAS.map(a => (
                        <button
                          key={a || "all"}
                          type="button"
                          onClick={() => { setArea(a); clearTopicForFilterChange(); }}
                          className={`border px-3 py-1 text-xs transition ${
                            area === a
                              ? "border-ink bg-ink text-paper"
                              : "border-edge text-muted hover:border-ink"
                          }`}
                        >
                          {a || "Todas"}
                        </button>
                      ))}
                    </div>
                    <div className="relative mb-3">
                      <input
                        value={search}
                        onChange={event => { setSearch(event.target.value); clearTopicForFilterChange(); }}
                        onFocus={() => setSuggestionsFocused(true)}
                        onBlur={() => setTimeout(() => setSuggestionsFocused(false), 150)}
                        placeholder="Buscar tema ou microcompetência"
                        className="w-full border-b border-edge bg-paper py-1.5 text-sm text-ink outline-none placeholder:text-muted/60 focus:border-ink"
                      />
                      {suggestionsFocused && search.trim() && (
                        <ul className="absolute left-0 right-0 top-full z-20 border border-edge bg-paper shadow-md">
                          {topics.slice(0, 8).map(topic => (
                            <li key={topic.knowledge_node_id}>
                              <button
                                type="button"
                                onMouseDown={() => { toggleTopic(topic); setSearch(""); setSuggestionsFocused(false); }}
                                className="flex w-full flex-col px-3 py-2 text-left hover:bg-[var(--amber-tint)]"
                              >
                                <span className="text-sm font-medium">{topic.node_name}</span>
                                <span className="text-xs text-muted">{topic.node_code ?? "OU"} · {topic.question_count} questoes</span>
                              </button>
                            </li>
                          ))}
                          {topics.length === 0 && (
                            <li className="px-3 py-2 text-sm text-muted">Nenhum resultado para &ldquo;{search}&rdquo;</li>
                          )}
                        </ul>
                      )}
                    </div>
                    <div className="max-h-72 space-y-0.5 overflow-y-auto">
                      {topics.length === 0 ? (
                        <p className="py-2 text-sm text-muted">Nenhum assunto encontrado.</p>
                      ) : topics.map(topic => {
                        const checked = selectedTopics.some(t => t.knowledge_node_id === topic.knowledge_node_id);
                        return (
                          <label
                            key={topic.knowledge_node_id}
                            className={`flex cursor-pointer items-start gap-3 border p-2.5 transition ${
                              checked ? "border-ink bg-[var(--amber-tint)]" : "border-transparent hover:border-edge"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleTopic(topic)}
                              className="mt-0.5 shrink-0 accent-ink"
                            />
                            <div className="min-w-0">
                              <p className="text-xs text-muted">{topic.node_code ?? "OU"} · {topic.question_count} questoes</p>
                              <p className="text-sm font-medium leading-snug">{topic.node_name}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div className="border-l border-edge pl-6">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                      {selectedTopics.length > 0
                        ? `${selectedTopics.length} selecionado${selectedTopics.length > 1 ? "s" : ""}`
                        : "Nenhum tema selecionado"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedTopics.map(t => (
                        <span key={t.knowledge_node_id} className="flex items-center gap-1 border border-edge px-2 py-1 text-xs">
                          {t.node_name}
                          <button
                            type="button"
                            onClick={() => toggleTopic(t)}
                            className="ml-0.5 text-muted hover:text-ink"
                            aria-label={`Remover ${t.node_name}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Banca / Instituição */}
              {activeTab === "banca" && (
                <div className="space-y-5">
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Banca</p>
                    {boardCodesState.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-2">
                        {boardCodesState.map(code => (
                          <span key={code} className="flex items-center gap-1 border border-edge px-2 py-1 text-sm">
                            {code}
                            <button
                              type="button"
                              onClick={() => removeBoardCode(code)}
                              className="ml-0.5 text-muted hover:text-ink"
                              aria-label={`Remover ${code}`}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        value={boardInput}
                        onChange={event => setBoardInput(event.target.value.toUpperCase())}
                        onKeyDown={event => {
                          if (event.key === "Enter" || event.key === ",") {
                            addBoardCode();
                            event.preventDefault();
                          }
                        }}
                        placeholder="SMK, FUVEST... — Enter para adicionar"
                        className="flex-1 border-b border-edge bg-paper py-1.5 text-sm text-ink outline-none placeholder:text-muted/60 focus:border-ink"
                      />
                      <button
                        type="button"
                        onClick={addBoardCode}
                        className="border border-ink px-3 py-1 text-sm font-semibold"
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Instituição</p>
                    <input
                      value={institution}
                      onChange={event => { setInstitution(event.target.value); clearTopicForFilterChange(); }}
                      placeholder="USP, UNIFESP..."
                      className="border-b border-edge bg-paper py-1.5 text-sm text-ink outline-none placeholder:text-muted/60 focus:border-ink"
                    />
                  </div>
                </div>
              )}

              {/* Ano */}
              {activeTab === "ano" && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-end gap-6">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted">De</span>
                      <input
                        type="number"
                        min={1990}
                        max={2026}
                        value={yearFrom}
                        onChange={event => { setYearFrom(event.target.value); clearTopicForFilterChange(); }}
                        className="w-24 border-b border-edge bg-paper py-1.5 text-sm text-ink outline-none focus:border-ink"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted">Até</span>
                      <input
                        type="number"
                        min={1990}
                        max={2026}
                        value={yearTo}
                        onChange={event => { setYearTo(event.target.value); clearTopicForFilterChange(); }}
                        className="w-24 border-b border-edge bg-paper py-1.5 text-sm text-ink outline-none focus:border-ink"
                      />
                    </div>
                    {(yearFrom || yearTo) && (
                      <button
                        type="button"
                        onClick={() => { setYearFrom(""); setYearTo(""); clearTopicForFilterChange(); }}
                        className="text-xs text-muted hover:text-ink"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Anos rápidos</p>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_YEARS.map(y => {
                        const yStr = String(y);
                        const active = yearFrom === yStr && yearTo === yStr;
                        return (
                          <button
                            key={y}
                            type="button"
                            onClick={() => { setYearFrom(yStr); setYearTo(yStr); clearTopicForFilterChange(); }}
                            className={`border px-2.5 py-1 text-xs transition ${
                              active ? "border-ink bg-ink text-paper" : "border-edge text-muted hover:border-ink"
                            }`}
                          >
                            {y}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Realização */}
              {activeTab === "realizacao" && (
                <div className="flex flex-wrap gap-2">
                  {REALIZACAO_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setAnswerStatus(opt.value); setQuestions([]); }}
                      className={`border px-4 py-2 text-sm transition ${
                        answerStatus === opt.value
                          ? "border-ink bg-ink text-paper"
                          : "border-edge text-muted hover:border-ink"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Modo */}
              {activeTab === "modo" && (
                <div className="flex flex-wrap gap-2">
                  {MODO_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setResolutionMode(opt.value)}
                      className={`border px-4 py-2 text-sm transition ${
                        resolutionMode === opt.value
                          ? "border-ink bg-ink text-paper"
                          : "border-edge text-muted hover:border-ink"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Quantidade */}
              {activeTab === "quantidade" && (
                <div className="flex items-end gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted">Número de questões</span>
                    <input
                      type="number"
                      min={1}
                      max={maxSelectable}
                      value={limit}
                      onChange={event => setLimit(Math.max(1, Math.min(maxSelectable, Number(event.target.value) || 1)))}
                      className="w-24 border-b border-edge bg-paper py-1.5 text-sm text-ink outline-none focus:border-ink"
                    />
                  </div>
                  <p className="text-xs text-muted">Máximo disponível: {maxSelectable}</p>
                </div>
              )}

            </div>
          )}

          {/* Action bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3">
            <div>
              <p className="text-sm font-semibold">{loadingPreview ? "Calculando..." : availabilityText(availability)}</p>
              {availability && (
                <p className="mt-0.5 text-xs text-muted">
                  {availability.unanswered_count} não realizadas · {availability.answered_count} já realizadas
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void previewQuestions()}
                disabled={busy || !availability || availability.available_count <= 0}
                className="border border-ink px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                Ver prévia
              </button>
              <button
                type="button"
                onClick={startSession}
                disabled={busy || !availability || availability.available_count <= 0}
                className="bg-ink px-4 py-2 text-sm font-semibold text-paper disabled:opacity-50"
              >
                {startLabel}
              </button>
            </div>
          </div>
        </section>

        <section className="min-w-0 space-y-5">
          {error && <p className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {result && <p className="border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">{result}</p>}

          {questions.length > 0 && !session && (
            <section className="border border-edge bg-paper p-4">
              <h2 className="font-serif text-xl font-semibold">Prévia das questões</h2>
              <p className="mt-1 text-sm text-muted">
                {selectedTopics.length > 0
                  ? selectedTopics.map(t => t.node_name).join(", ")
                  : (search.trim() || "Filtro atual")}
              </p>
              <div className="mt-4 grid gap-3">
                {questions.map(q => (
                  <article key={q.id} className="border border-edge p-3">
                    <p className="line-clamp-4 text-sm leading-relaxed">{q.stem}</p>
                    <p className="mt-2 text-xs text-muted">
                      {String(q.source?.institution ?? "") || "Instituicao nao informada"} — {String(q.source?.board_code ?? "") || "Banca nao informada"} {String(q.source?.year ?? "")}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {session && (
            <section className="border border-edge bg-paper p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-serif text-xl font-semibold">{session.theme ?? "Sessao do banco"}</h2>
                  <p className="text-sm text-muted">
                    {session.answered_count}/{session.total_questions} respondidas — {session.area ?? "OU"} — {session.resolution_mode === "training" ? "treino" : "simulado"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={finalize}
                  disabled={busy || session.status === "finalized"}
                  className="bg-ink px-4 py-2 text-sm font-semibold text-paper disabled:opacity-50"
                >
                  Finalizar
                </button>
              </div>
              <div className="mt-5 grid gap-4">
                {session.items.map(item => {
                  const revealed = session.status === "finalized" || Boolean(revealedPositions[item.position]);
                  const canReveal = session.status === "active" && session.resolution_mode === "training" && item.answered && !revealed;
                  return (
                    <article key={item.question_id} className="border border-edge p-4">
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-xs font-semibold text-muted">Questao {item.position}</p>
                        {revealed && item.correct_answer && (
                          <span className="border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
                            Gabarito {item.correct_answer} {item.is_correct === true ? "— certo" : item.is_correct === false ? "— revisar" : ""}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{item.stem}</p>
                      {item.image_refs.length > 0 && (
                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                          {item.image_refs.map(src => <img key={src} src={src} alt="Imagem da questao" className="border border-edge" />)}
                        </div>
                      )}
                      <div className="mt-4 grid gap-2">
                        {OPTIONS.map(opt => item.alternatives[opt] ? (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => answer(item.position, opt)}
                            disabled={busy || session.status === "finalized"}
                            className={`border px-3 py-2 text-left text-sm transition ${item.selected_option === opt ? "border-ink bg-[var(--amber-tint)]" : "border-edge hover:border-ink"}`}
                          >
                            <span className="font-semibold">{opt}.</span> {item.alternatives[opt]}
                          </button>
                        ) : null)}
                      </div>
                      {canReveal && (
                        <button
                          type="button"
                          onClick={() => setRevealedPositions(current => ({ ...current, [item.position]: true }))}
                          className="mt-3 border border-ink px-3 py-1.5 text-sm font-semibold"
                        >
                          Corrigir
                        </button>
                      )}
                      {revealed && item.needs_correction && (
                        <div className="mt-4 border border-amber-200 bg-amber-50/60 p-3">
                          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-900">Correcao guiada</label>
                          <textarea
                            value={correctionDrafts[item.position] ?? ""}
                            onChange={event => setCorrectionDrafts(current => ({ ...current, [item.position]: event.target.value }))}
                            placeholder="Explique o raciocinio correto e o motivo do erro."
                            className="mt-2 min-h-24 w-full border border-amber-200 bg-white/80 p-3 text-sm outline-none focus:border-ink"
                          />
                          <button
                            type="button"
                            onClick={() => submitCorrection(item.position)}
                            disabled={busy || !(correctionDrafts[item.position] ?? "").trim()}
                            className="mt-2 bg-ink px-4 py-2 text-sm font-semibold text-paper disabled:opacity-50"
                          >
                            Salvar correcao
                          </button>
                        </div>
                      )}
                      <div className="mt-4 flex justify-end">
                        {reportDone[item.question_id] ? (
                          <span className="text-xs text-muted">Problema reportado</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setReportingQuestionId(reportingQuestionId === item.question_id ? null : item.question_id)}
                            className="text-xs text-muted/60 transition hover:text-muted"
                            title="Informar problema nesta questao"
                          >
                            ⚑ Informar problema
                          </button>
                        )}
                      </div>
                      {reportingQuestionId === item.question_id && !reportDone[item.question_id] && (
                        <div className="mt-2 border border-edge p-3">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Qual o problema?</p>
                          <div className="mb-2 flex flex-wrap gap-1.5">
                            {(["error", "unclear", "outdated", "other"] as QuestionBankReportType[]).map(type => {
                              const labels: Record<QuestionBankReportType, string> = { error: "Erro no gabarito", unclear: "Enunciado confuso", outdated: "Desatualizada", other: "Outro" };
                              return (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => setReportType(type)}
                                  className={`border px-2 py-1 text-xs transition ${reportType === type ? "border-ink bg-[var(--amber-tint)]" : "border-edge hover:border-ink"}`}
                                >
                                  {labels[type]}
                                </button>
                              );
                            })}
                          </div>
                          <textarea
                            value={reportReason}
                            onChange={event => setReportReason(event.target.value)}
                            placeholder="Descreva o problema (opcional)"
                            className="min-h-14 w-full resize-none border border-edge p-2 text-xs outline-none focus:border-ink"
                          />
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              onClick={() => submitReport(item.question_id)}
                              disabled={reportBusy}
                              className="bg-ink px-3 py-1.5 text-xs font-semibold text-paper disabled:opacity-50"
                            >
                              Enviar
                            </button>
                            <button
                              type="button"
                              onClick={() => setReportingQuestionId(null)}
                              className="border border-edge px-3 py-1.5 text-xs hover:border-ink"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}
