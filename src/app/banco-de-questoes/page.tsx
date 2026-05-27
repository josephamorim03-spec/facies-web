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
  type QuestionBankAnswerStatus,
  type QuestionBankAvailability,
  type QuestionBankOption,
  type QuestionBankQuestion,
  type QuestionBankResolutionMode,
  type QuestionBankSession,
  type QuestionBankTopic,
} from "@/lib/api";
import { useAuthToken } from "@/lib/useAuthToken";

const OPTIONS: QuestionBankOption[] = ["A", "B", "C", "D", "E"];
const AREAS = ["", "GO", "CM", "CG", "MP", "PD", "OU"] as const;

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

function pct(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "n/a";
  return `${Math.round(value * 100)}%`;
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
    return `${availability.answered_count} ja realizadas`;
  }
  if (availability.answer_status === "all") {
    return `${availability.total_count} no filtro`;
  }
  return `${availability.unanswered_count} disponiveis`;
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
  const [boardCode, setBoardCode] = useState("");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [answerStatus, setAnswerStatus] = useState<QuestionBankAnswerStatus>("unanswered");
  const [limit, setLimit] = useState(() => Math.max(1, Math.min(50, initialContext.expectedQuestions ?? 10)));
  const [resolutionMode, setResolutionMode] = useState<QuestionBankResolutionMode>("simulation");
  const [topics, setTopics] = useState<QuestionBankTopic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<QuestionBankTopic | null>(null);
  const [availability, setAvailability] = useState<QuestionBankAvailability | null>(null);
  const [questions, setQuestions] = useState<QuestionBankQuestion[]>([]);
  const [session, setSession] = useState<QuestionBankSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [revealedPositions, setRevealedPositions] = useState<Record<number, boolean>>({});
  const [correctionDrafts, setCorrectionDrafts] = useState<Record<number, string>>({});

  useEffect(() => {
    const context = parseEntryContext(new URLSearchParams(routeSearchKey));
    setEntryContext(context);
    setArea(context.area ?? "");
    setSearch(context.theme ?? "");
    setLimit(Math.max(1, Math.min(50, context.expectedQuestions ?? 10)));
    setSelectedTopic(null);
    setQuestions([]);
    setResult(null);
  }, [routeSearchKey]);

  const boardCodes = useMemo(() => {
    const code = boardCode.trim().toUpperCase();
    return code ? [code] : undefined;
  }, [boardCode]);

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

  const filterParams = useCallback((overrides?: { topic?: QuestionBankTopic | null; limit?: number }) => {
    const topic = overrides?.topic === undefined ? selectedTopic : overrides.topic;
    return {
      knowledge_node_ids: topic ? [topic.knowledge_node_id] : undefined,
      area: area || undefined,
      search: search.trim() || undefined,
      institution: institution.trim() || undefined,
      board_codes: boardCodes,
      year_from: parsedYearFrom,
      year_to: parsedYearTo,
      answer_status: answerStatus,
      only_unanswered: answerStatus === "unanswered",
      limit: overrides?.limit,
    };
  }, [answerStatus, area, boardCodes, institution, parsedYearFrom, parsedYearTo, search, selectedTopic]);

  const refreshAvailability = useCallback(async (topic: QuestionBankTopic | null = selectedTopic) => {
    setLoadingPreview(true);
    setError(null);
    try {
      const next = await previewQuestionBankAvailability(token, filterParams({ topic }));
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
  }, [filterParams, limit, selectedTopic, token]);

  const refreshTopics = useCallback(async () => {
    setError(null);
    try {
      const found = await browseQuestionBankTopics(token, {
        area: area || undefined,
        search: search.trim() || undefined,
        institution: institution.trim() || undefined,
        board_codes: boardCodes,
        year_from: parsedYearFrom,
        year_to: parsedYearTo,
        limit: 60,
      });
      setTopics(found);
    } catch (err) {
      setTopics([]);
      setError(err instanceof Error ? err.message : "Nao foi possivel buscar assuntos.");
    }
  }, [area, boardCodes, institution, parsedYearFrom, parsedYearTo, search, token]);

  useEffect(() => {
    if (!tokenResolved || session) return;
    const timer = window.setTimeout(() => {
      void refreshAvailability();
      void refreshTopics();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [refreshAvailability, refreshTopics, session, token, tokenResolved]);

  function clearTopicForFilterChange() {
    setSelectedTopic(null);
    setQuestions([]);
    setResult(null);
  }

  async function previewQuestions(topic = selectedTopic) {
    if (!tokenResolved) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setQuestions(await browseQuestionBankQuestions(token, filterParams({ topic, limit: clampedLimit })));
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
      setCorrectionDrafts((current) => ({ ...current, [position]: "" }));
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

  if (!tokenResolved) return <main className="p-6 text-sm text-muted">Carregando...</main>;

  return (
    <main className="min-h-screen bg-paper p-4 text-ink md:p-6">
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[19rem_minmax(0,1fr)]">
        <aside className="h-fit border border-edge bg-paper p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">KrosBank</p>
              <h1 className="mt-1 font-serif text-2xl font-semibold">Banco de questoes</h1>
            </div>
            <span className="border border-edge px-2 py-1 text-xs font-semibold">
              {hasReviewContext ? "Revisao" : "Inicial"}
            </span>
          </div>

          {hasReviewContext && (
            <div className="mt-4 border border-edge bg-[var(--amber-tint)] p-3 text-xs text-muted">
              <p className="font-medium text-ink">{(entryContext.theme ?? search) || "Revisao"}</p>
              <p>{(entryContext.area ?? area) || "Area"} - {entryContext.dateISO ?? "data do calendario"}</p>
            </div>
          )}

          <div className="mt-4 space-y-3">
            <label className="block text-xs font-medium text-muted">
              Grande area
              <select
                value={area}
                onChange={(event) => { setArea(event.target.value); clearTopicForFilterChange(); }}
                className="mt-1 w-full border border-edge bg-paper px-2 py-2 text-sm outline-none focus:border-ink"
              >
                {AREAS.map((item) => (
                  <option key={item || "all"} value={item}>{item || "Todas"}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-muted">
              Assunto
              <input
                value={search}
                onChange={(event) => { setSearch(event.target.value); clearTopicForFilterChange(); }}
                placeholder="Tema ou microcompetencia"
                className="mt-1 w-full border border-edge bg-paper px-2 py-2 text-sm outline-none focus:border-ink"
              />
            </label>
            <label className="block text-xs font-medium text-muted">
              Instituicao
              <input
                value={institution}
                onChange={(event) => { setInstitution(event.target.value); clearTopicForFilterChange(); }}
                placeholder="USP, UNIFESP..."
                className="mt-1 w-full border border-edge bg-paper px-2 py-2 text-sm outline-none focus:border-ink"
              />
            </label>
            <label className="block text-xs font-medium text-muted">
              Banca
              <input
                value={boardCode}
                onChange={(event) => { setBoardCode(event.target.value.toUpperCase()); clearTopicForFilterChange(); }}
                placeholder="SMK"
                className="mt-1 w-full border border-edge bg-paper px-2 py-2 text-sm outline-none focus:border-ink"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs font-medium text-muted">
                Ano inicial
                <input
                  type="number"
                  min={1900}
                  max={2100}
                  value={yearFrom}
                  onChange={(event) => { setYearFrom(event.target.value); clearTopicForFilterChange(); }}
                  className="mt-1 w-full border border-edge bg-paper px-2 py-2 text-sm outline-none focus:border-ink"
                />
              </label>
              <label className="block text-xs font-medium text-muted">
                Ano final
                <input
                  type="number"
                  min={1900}
                  max={2100}
                  value={yearTo}
                  onChange={(event) => { setYearTo(event.target.value); clearTopicForFilterChange(); }}
                  className="mt-1 w-full border border-edge bg-paper px-2 py-2 text-sm outline-none focus:border-ink"
                />
              </label>
            </div>
            <label className="block text-xs font-medium text-muted">
              Realizacao
              <select
                value={answerStatus}
                onChange={(event) => { setAnswerStatus(event.target.value as QuestionBankAnswerStatus); setQuestions([]); }}
                className="mt-1 w-full border border-edge bg-paper px-2 py-2 text-sm outline-none focus:border-ink"
              >
                <option value="unanswered">Nao realizadas</option>
                <option value="answered">Ja realizadas</option>
                <option value="all">Todas</option>
              </select>
            </label>
            <label className="block text-xs font-medium text-muted">
              Modo
              <select
                value={resolutionMode}
                onChange={(event) => setResolutionMode(event.target.value as QuestionBankResolutionMode)}
                className="mt-1 w-full border border-edge bg-paper px-2 py-2 text-sm outline-none focus:border-ink"
              >
                <option value="simulation">Simulado</option>
                <option value="training">Treino</option>
              </select>
            </label>
            <label className="block text-xs font-medium text-muted">
              Quantidade
              <input
                type="number"
                  min={1}
                  max={maxSelectable}
                  value={limit}
                  onChange={(event) => setLimit(Math.max(1, Math.min(maxSelectable, Number(event.target.value) || 1)))}
                  className="mt-1 w-full border border-edge bg-paper px-2 py-2 text-sm outline-none focus:border-ink"
                />
            </label>
          </div>

          <div className="mt-4 border border-edge p-3">
            <p className="text-xs text-muted">Preview</p>
            <p className="mt-1 text-lg font-semibold">{loadingPreview ? "Calculando..." : availabilityText(availability)}</p>
            {availability && (
              <p className="mt-1 text-xs text-muted">
                {availability.unanswered_count} nao realizadas - {availability.answered_count} ja realizadas
              </p>
            )}
          </div>

          <div className="mt-4 grid gap-2">
            <button
              type="button"
              onClick={() => void previewQuestions()}
              disabled={busy || !availability || availability.available_count <= 0}
              className="border border-ink px-3 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Ver previa
            </button>
            <button
              type="button"
              onClick={startSession}
              disabled={busy || !availability || availability.available_count <= 0}
              className="bg-ink px-3 py-2 text-sm font-semibold text-paper disabled:opacity-50"
            >
              Iniciar simulado
            </button>
          </div>
        </aside>

        <section className="min-w-0 space-y-5">
          {error && <p className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {result && <p className="border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">{result}</p>}

          {!session && (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
              <section className="border border-edge bg-paper p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-serif text-xl font-semibold">Assuntos encontrados</h2>
                    <p className="text-sm text-muted">{topics.length} opcoes no filtro atual</p>
                  </div>
                  {selectedTopic && <span className="border border-edge px-2 py-1 text-xs">Selecionado</span>}
                </div>
                <div className="mt-4 grid gap-2">
                  {topics.length === 0 ? (
                    <p className="text-sm text-muted">Nenhum assunto encontrado.</p>
                  ) : topics.map((topic) => (
                    <button
                      key={topic.knowledge_node_id}
                      type="button"
                      onClick={() => {
                        setSelectedTopic(topic);
                        setQuestions([]);
                        void refreshAvailability(topic);
                      }}
                      className={`border p-3 text-left transition ${selectedTopic?.knowledge_node_id === topic.knowledge_node_id ? "border-ink bg-[var(--amber-tint)]" : "border-edge hover:border-ink"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{topic.node_code ?? "OU"} - {topic.node_type ?? "tema"}</p>
                          <h3 className="mt-1 truncate font-serif text-lg font-semibold">{topic.node_name}</h3>
                        </div>
                        <span className="shrink-0 border border-edge px-2 py-1 text-xs">Peso {topic.adaptive_weight}</span>
                      </div>
                      <p className="mt-2 text-sm text-muted">
                        {topic.question_count} questoes - demanda {pct(topic.bank_demand_score)} - prioridade {pct(topic.adaptive_weight_score)}
                      </p>
                    </button>
                  ))}
                </div>
              </section>

              <section className="border border-edge bg-paper p-4">
                <h2 className="font-serif text-xl font-semibold">Previa</h2>
                <p className="mt-1 text-sm text-muted">
                  {selectedTopic?.node_name ?? (search.trim() || "Filtro atual")}
                </p>
                <div className="mt-4 grid gap-3">
                  {questions.length === 0 ? (
                    <p className="text-sm text-muted">Use o preview para ver uma amostra.</p>
                  ) : questions.map((q) => (
                    <article key={q.id} className="border border-edge p-3">
                      <p className="line-clamp-4 text-sm leading-relaxed">{q.stem}</p>
                      <p className="mt-2 text-xs text-muted">
                        {String(q.source?.institution ?? "") || "Instituicao nao informada"} - {String(q.source?.board_code ?? "") || "Banca nao informada"} {String(q.source?.year ?? "")}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}

          {session && (
            <section className="border border-edge bg-paper p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-serif text-xl font-semibold">{session.theme ?? "Sessao do banco"}</h2>
                  <p className="text-sm text-muted">
                    {session.answered_count}/{session.total_questions} respondidas - {session.area ?? "OU"} - {session.resolution_mode === "training" ? "treino" : "simulado"}
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
                {session.items.map((item) => {
                  const revealed = session.status === "finalized" || Boolean(revealedPositions[item.position]);
                  const canReveal = session.status === "active" && session.resolution_mode === "training" && item.answered && !revealed;
                  return (
                    <article key={item.question_id} className="border border-edge p-4">
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-xs font-semibold text-muted">Questao {item.position}</p>
                        {revealed && item.correct_answer && (
                          <span className="border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
                            Gabarito {item.correct_answer} {item.is_correct === true ? "- certo" : item.is_correct === false ? "- revisar" : ""}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{item.stem}</p>
                      {item.image_refs.length > 0 && (
                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                          {item.image_refs.map((src) => <img key={src} src={src} alt="Imagem da questao" className="border border-edge" />)}
                        </div>
                      )}
                      <div className="mt-4 grid gap-2">
                        {OPTIONS.map((opt) => item.alternatives[opt] ? (
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
                          onClick={() => setRevealedPositions((current) => ({ ...current, [item.position]: true }))}
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
                            onChange={(event) => setCorrectionDrafts((current) => ({ ...current, [item.position]: event.target.value }))}
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
