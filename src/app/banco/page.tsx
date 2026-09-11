"use client";

import { Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
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
  getAPIErrorMessage,
} from "@/lib/api";
import { useNavbar } from "@/lib/NavbarContext";
import { useAuthToken } from "@/lib/useAuthToken";
import { invalidateLearningQueries } from "@/lib/queryKeys";
import { useToast } from "@/lib/useToast";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import FiltersBar from "./_components/FiltersBar";
import type { TipoDeSessao } from "./_components/FiltersBar";
import QuestionList from "./_components/QuestionList";
import CreateSessionPanel from "./_components/CreateSessionPanel";
import { BOTTOM_ACTION_BAR_RESERVE_CLASS } from "@/components/ui/BottomActionBar";
import { BancoDeQuestoesSkeleton } from "./_components/BancoDeQuestoesSkeleton";
import { useEdicoesDaProva } from "./_lib/useEdicoesDaProva";
import { filterTopicsLocally } from "./_components/topicTree";
import {
  QUESTION_BANK_LIMIT_CAP,
  clampQuestionLimit,
  CORRECTION_MODE_SHORT_LABEL,
  getActiveFilters,
  motivoParaNaoComecar,
  ressalvaDoTreinoDirigido,
  resolverProvaEscolhida,
  focoClinicoTemFiltro,
  recorteDeFocoClinico,
  parseQuestionBankEntryContext,
  politicaDeCorrecao,
  questionBankCtaLabel,
  resolveEntryTopic,
  type CorrectionMode,
  type QuestionBankEntryContext,
} from "./_lib/sessionBuilder";
import { useFocoDeEntrada } from "./_lib/useFocoDeEntrada";
import { useTreinoDirigido } from "./_lib/useTreinoDirigido";
import { BarraDeFiltrosAtivos } from "./_components/BarraDeFiltrosAtivos";

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

// ⚠️ ~180 LINHAS DE UI QUE NUNCA FORAM RENDERIZADAS saíram daqui em
// 2026-09-06: `SessionIntentCard`, `RecommendedTopicsPanel`, `TopicReason` e o
// `topicPathLabel` local que só elas usavam. Zero call sites — e
// `tests/unit/metacognition-exposure.test.mjs` chega a EXIGIR a ausência do
// painel de recomendação — ou seja, o contrato já dizia que aquilo não devia
// aparecer enquanto o código continuava a mantê-lo.
//
// ⚠️ E o nome dele não se escreve aqui: esse teste varre o FONTE CRU, comentário
// incluído. Citar o símbolo entre crases faria o próprio registo reprovar.
//
// Foi essa gordura que abriu o orçamento para a tela passar a abrir na decisão
// em vez de num formulário.

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
    <Suspense fallback={<BancoDeQuestoesSkeleton />}>
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
  const [correctionMode, setCorrectionMode] = useState<CorrectionMode>("guided_choice");
  const [tipoSessao, setTipoSessao] = useState<TipoDeSessao>("topic");
  // Derivado, nunca guardado: o contrato so conhece dois valores, e o servidor
  // pina `study_kind="topic"` quando `session_kind="kros"`.
  const studyKind: StudyKind = tipoSessao === "full_exam" ? "full_exam" : "topic";
  // UMA fonte de verdade. `studyKind` e `treinoDirigido` sao DERIVADOS: dois
  // estados que precisam concordar e o padrao de defeito que esta sessao achou
  // tres vezes hoje.
  const treinoDirigido = tipoSessao === "kros";
  const [fullExamType, setFullExamType] = useState<FullExamType>("acesso_direto");
  /** Qual das provas, quando a banca aplicou duas no mesmo ano. */
  const [fullExamNumber, setFullExamNumber] = useState<string | null>(null);
  // Desligado por padrao: a pratica normal continua sendo a pratica normal.
  // Completar a prova com anulada e desatualizada e uma escolha do aluno, e o
  // valor esta em ele SABER que escolheu.
  const [includeRetired, setIncludeRetired] = useState(false);
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
  const limitMaxLivre = Math.max(1, Math.min(QUESTION_BANK_LIMIT_CAP, maxSelectable || requestedLimit));
  const deferredSearchDraft = useDeferredValue(searchDraft);
  const normalizedSearch = committedSearch.trim();
  // A regra e o porque moram em `_lib/sessionBuilder.resolverProvaEscolhida`.
  const provaEscolhida = useMemo(() => resolverProvaEscolhida(institutions, selectedYears, sources), [institutions, selectedYears, sources]);
  const fullExamReady = provaEscolhida !== null;
  const { edicoes: examEditions, totaisDaProva, carregando: examEditionsLoading, tamanhoDoAno: tamanhoProva, tamanhoPorAnoDaProva, aplicacaoPorAnoDaProva } = useEdicoesDaProva({ token, pronto: tokenResolved, ehModoProva: tipoSessao === "full_exam", bancaEscolhida: institutions.length === 1 ? institutions[0] : "", accessGroup: fullExamType === "r_plus" ? "RPLUS" : "ACESSO-DIRETO", ano: selectedYears.length === 1 ? selectedYears[0] : null, escolha: fullExamNumber, incluirAnuladas: includeRetired });

  const selectedTopicSummary = selectedTopics.length > 0
    ? selectedTopics.map((t) => t.node_name).join(", ")
    : area || "Filtro atual";

  /**
   * Troca de modo — e encosta a quantidade na grade do modo escolhido.
   *
   * ⚠️ Sem esta função, `setTipoSessao` sozinho deixava o campo "Questões" a
   * dizer 10 enquanto o resumo e o botão diziam 20: `clampedLimit` é derivado e
   * já respeitava o piso do Treino dirigido, mas o `limit` — que é o que a
   * barra e o campo desenham — continuava no valor antigo. Dois números para a
   * mesma coisa na mesma tela é como o aluno deixa de acreditar em ambos.
   */
  function escolherTipoDeSessao(proximo: TipoDeSessao) {
    setTipoSessao(proximo);
    if (proximo === "kros") setLimit((atual) => kros.ajustar(atual, limitMaxLivre));
  }

  /** A saída do beco. Ver o docstring de `_components/BarraDeFiltrosAtivos`. */
  function limparFiltros() {
    setArea("");
    setSearchDraft("");
    setCommittedSearch("");
    setBoardCodes([]);
    // Volta ao PADRÃO, não a vazio: o acervo tem R+ e Revalida, e quem monta
    // sessão de acesso direto não quer as três misturadas por engano.
    setExamCodes([...DEFAULT_EXAM_CODES]);
    setInstitutions([]);
    setStateCodes([]);
    setSelectedYears([]);
    setIncludeNoYear(false);
    setAnswerStatus("unanswered");
    setCorrectionStatus("all");
    setSelectedTopics([]);
    setFocusTopicId(null);
  }

  const activeFilters = useMemo(() => getActiveFilters({
    area, boardCodes, examCodes, institutions, stateCodes, selectedYears, includeNoYear,
    answerStatus, correctionStatus, selectedTopics, search: normalizedSearch,
  }), [answerStatus, area, boardCodes, correctionStatus, examCodes, includeNoYear, institutions, normalizedSearch, selectedTopics, selectedYears, stateCodes]);

  const filteredTaxonomyTopics = useMemo(
    () => filterTopicsLocally(taxonomyTopics, { area, search: searchDraft, preserveSearchAncestors: true }),
    [area, searchDraft, taxonomyTopics],
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
    // ⚠️ `setAnswerStatus` ESTAVA AUSENTE DESTE RESET, e era esse o defeito:
    // "Revisar os erros desta sessão" abria o Banco nas questões que o aluno
    // NUNCA tinha visto. Ver `parseQuestionBankEntryContext`.
    setAnswerStatus(context.answerStatus ?? "unanswered");
    setLimit(clampQuestionLimit(context.limit ?? context.expectedQuestions ?? 10));
    setCorrectionMode("guided_choice");
    setTipoSessao(opensInstitutionalExam ? "full_exam" : "topic");
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
        setCorrectionMode(
          profile.default_feedback_timing === "immediate"
            ? "immediate"
            : profile.default_feedback_reveal_policy === "reveal_all"
              ? "reveal_all"
              : "guided_choice",
        );
      })
      .catch(() => setHasChosenFeedbackDefault(true));
  }, [token, tokenResolved]);

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
          strokeWidth="2"
          strokeLinecap="butt"
          strokeLinejoin="miter"
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

  // Uma definicao so: tres chamadas montavam este recorte e uma esquecia a
  // guarda de modo. Ver `_lib/sessionBuilder.recorteDeFocoClinico`.
  const focoClinico = useMemo(() => recorteDeFocoClinico({ ehProva: tipoSessao === "full_exam", topicos: selectedTopics, area, busca: normalizedSearch }), [area, normalizedSearch, selectedTopics, tipoSessao]);

  const filterParams = useCallback((override: { limit?: number } = {}) => ({
    knowledge_node_ids: focoClinico.knowledge_node_ids,
    area: focoClinico.area,
    board_codes: boardCodes.length > 0 ? boardCodes : undefined,
    exam_codes: examCodes.length > 0 ? examCodes : undefined,
    institutions: institutions.length > 0 ? institutions : undefined,
    state_codes: stateCodes.length > 0 ? stateCodes : undefined,
    years: selectedYears.length > 0 ? selectedYears : undefined,
    include_no_year: includeNoYear || undefined,
    search: focoClinico.search,
    answer_status: answerStatus,
    only_unanswered: answerStatus === "unanswered",
    correction_status: correctionStatus,
    limit: override.limit,
  }), [answerStatus, boardCodes, correctionStatus, examCodes, focoClinico, includeNoYear, institutions, selectedYears, stateCodes]);

  // O preset, as bancas-alvo e a grade de tamanho do Treino dirigido — as tres
  // saem da MESMA previa, e por isso vivem juntas num hook. Ver
  // `_lib/useTreinoDirigido`.
  const kros = useTreinoDirigido({
    ativo: treinoDirigido,
    token,
    tokenResolved,
    filtros: filterParams,
  });

  /**
   * ⚠️ O TREINO DIRIGIDO TEM GRADE PRÓPRIA, e é isto que o fazia não iniciar.
   *
   * O servidor recusa com 422 (`invalid_kros_size`) qualquer sessão dirigida
   * fora de 20–120 em múltiplos de 5. A tela abria em 10 e oferecia passo 1,
   * então o caminho padrão do modo — escolher e premir começar — falhava
   * sempre. Ver `_lib/useTreinoDirigido`.
   *
   * O piso e o passo entram no CONTROLE, não só no envio: barra que aceita 37 e
   * manda 35 mente ao aluno sobre o que ele vai receber.
   *
   * ⚠️ Mora AQUI, e não no bloco `Derived` lá em cima, porque depende do hook —
   * e o hook depende de `filterParams`. Ordem de declaração, não preferência.
   */
  const limitMin = treinoDirigido ? kros.grade.min : 1;
  const limitMax = treinoDirigido
    ? Math.max(kros.grade.min, kros.ajustar(limitMaxLivre, limitMaxLivre))
    : limitMaxLivre;
  const limitStep = treinoDirigido ? kros.grade.passo : 1;
  const clampedLimit = treinoDirigido
    ? kros.ajustar(requestedLimit, limitMax)
    : Math.max(1, Math.min(requestedLimit, limitMax));

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
      // SÓ a taxonomia: as micros não são desenhadas na árvore. `microTopics`
      // alimenta apenas `resolveEntryTopic`, que roda UMA vez logo após o
      // bootstrap (gated em `calendarContextResolved`) — quando um filtro muda,
      // ele já rodou, e a lista rebuscada não alimentava nada.
      // E custava caro: medido em produção em 04/09/2026, a consulta de micros
      // levava 4,2s contra 1,1s da taxonomia, acima do `statement_timeout` de
      // 4s, e devolvia 503 TODA VEZ (o EXPLAIN mostra um `Nested Loop Left
      // Join` varrendo 10.091 nós para cada uma das 20.283 linhas do cache).
      // Era o "às vezes dá erro" ao escolher uma banca. Consertar a consulta
      // seria otimizar dado que ninguém lê; se voltarem a ser precisas aqui, o
      // caminho é resolver o nó por id.
      const taxonomy = await browseQuestionBankTopics(token, {
        ...common,
        node_types: ["specialty", "theme", "subtheme"],
      }, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setTaxonomyTopics(taxonomy);
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

  // O foco que a origem pediu -- ver `_lib/useFocoDeEntrada`.
  useFocoDeEntrada({
    ativo: bootstrapReady,
    contexto: entryContext,
    chaveDaRota: routeSearchKey,
    topicos: useMemo(() => [...taxonomyTopics, ...microTopics], [microTopics, taxonomyTopics]),
    aoAplicar: useCallback((achados) => {
      setSelectedTopics(achados);
      setFocusTopicId(achados[0].knowledge_node_id);
      // A busca por texto atrapalha quando ja ha no: ela e o caminho de
      // recurso de quem so tem o nome do tema.
      setSearchDraft("");
      setCommittedSearch("");
    }, []),
  });

  // Cross-filtered facets (Estratégia-style): one call whose year counts react to
  // the selected banca and whose banca counts react to the selected years. It
  // overwrites the global catalogs above with the recorte-aware options. Silent
  // (no skeleton) so the counts feel live as filters change.
  const refreshFacets = useCallback(async () => {
    const requestKey = JSON.stringify({
      ...focoClinico,
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
          ...focoClinico,
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
      //
      // O silencio na TELA e' de proposito -- contagem velha e melhor que a
      // barra piscando. O silencio no CONSOLE nao era: `/facets` devolveu 503
      // por 11 dias (uma CTE sem a coluna que o proprio predicado lia) e este
      // catch engoliu tudo. Para o aluno "o filtro nao faz nada" e para o
      // desenvolvedor nao havia rastro nenhum. Uma linha aqui e' a diferenca
      // entre um bug de 11 dias e um F12.
      console.warn("[banco] faceta indisponivel; mantendo as opcoes anteriores", err);
    } finally {
      if (facetsAbortRef.current === controller) facetsAbortRef.current = null;
      if (facetsInFlightRef.current?.key === requestKey) facetsInFlightRef.current = null;
    }
  }, [boardCodes, correctionStatus, examCodes, focoClinico, institutions, selectedYears, stateCodes, token]);

  useEffect(() => {
    if (!tokenResolved || !bootstrapReady) return;
    // Do recorte DERIVADO: contar `selectedTopics` aqui pediria faceta por um
    // filtro que a prova deixou de enviar.
    const hasFacetFilters = Boolean(
      focoClinicoTemFiltro(focoClinico) || boardCodes.length || examCodes.length ||
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
  }, [boardCodes.length, bootstrapReady, correctionStatus, examCodes.length, focoClinico, institutions.length, refreshFacets, selectedYears.length, stateCodes.length, tokenResolved]);

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
          : treinoDirigido
            ? "kros"
            : selectedTopics.length > 1
              ? "bank_combined"
              : "bank_topic",
      ...politicaDeCorrecao(correctionMode, tipoSessao),
      mode: studyKind === "full_exam" ? "by_exam" : "by_topic",
      resolution_mode: "simulation",
      study_kind: studyKind,
      ...filterParams({ limit: clampedLimit }),
      // O preset tem de viajar junto: `resolve_kros_mode(None)` devolve
      // `equilibrado`, entao omiti-lo nao da erro — da a sessao errada em
      // silencio. Quem escolheu "Prioridade nos erros" receberia
      // `max_answered_share = 0.0` no lugar de 0.40 e nenhum dos boosts
      // (`recent_error`, `deficit`, `fingerprint_need`): uma sessao que nunca
      // reexpoe o erro, que e a unica coisa que o modo faz.
      ...(treinoDirigido ? { kros_mode: kros.modo } : {}),
      performed_at: localNoonISO(entryContext.dateISO),
      review_task_id: studyKind === "topic" ? entryContext.reviewTaskId ?? undefined : undefined,
    };
    if (studyKind === "full_exam") {
      // `full_exam_name` e' ROTULO (vira o titulo da sessao); quem recorta e'
      // `institutions`, com a chave do catalogo. Mandar o rotulo nos dois foi o
      // defeito.
      payload.full_exam_name = provaEscolhida?.rotulo ?? "";
      payload.full_exam_year = provaEscolhida?.ano ?? 0;
      payload.full_exam_type = fullExamType;
      payload.institutions = provaEscolhida ? [provaEscolhida.chave] : [];
      payload.years = provaEscolhida ? [provaEscolhida.ano] : [];
      if (fullExamNumber) payload.full_exam_number = fullExamNumber;
      payload.exam_codes = [fullExamType === "r_plus" ? "RPLUS" : "ACESSO-DIRETO"];
      // UM controle, UM flag -- e a desatualizada saiu dele de proposito. Ela
      // TINHA resposta certa a epoca, caiu naquele dia e pontua normalmente, so
      // que os dois eixos viajavam juntos como se fossem a mesma pergunta. A
      // anulada nao tem gabarito valido, entao sai por padrao e volta com um
      // clique. (`include_outdated` segue no contrato para o caminho antigo.)
      payload.include_annulled = includeRetired;
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
            correctionMode === "immediate" ? "immediate" : "post_result",
          default_feedback_reveal_policy:
            correctionMode === "reveal_all" ? "reveal_all" : "guided_choice",
          has_chosen_feedback_default: true,
        });
      } catch (cause) {
        console.error("banco: falha ao salvar correção padrão", cause);
        showToast(
          getAPIErrorMessage(cause) ?? "Não foi possível salvar a correção padrão.",
          "error",
        );
        return;
      }
    }
    await startSession({ skipDefaultPrompt: true });
  }

  if (!tokenResolved) return <BancoDeQuestoesSkeleton />;
  if (entryContext.source && !calendarContextResolved) {
    return <div className="p-6 text-sm text-muted" aria-live="polite">Configurando a revisão do calendário...</div>;
  }

  const canStartConfigured = !busy && (studyKind !== "full_exam" || fullExamReady) && !!availability && availability.available_count > 0;
  // Dá para começar, mas o acervo não chega ao piso do modo: o número do botão
  // passa a ser TETO, e por isso ele muda de "Começar N" para "Começar até N".
  const ressalva = ressalvaDoTreinoDirigido({ treinoDirigido, availableCount: availability?.available_count ?? null, piso: kros.grade.min });
  const configuredStartLabel = questionBankCtaLabel(tamanhoProva ?? clampedLimit, correctionMode, tipoSessao, ressalva !== null);
  // Zero questoes tem causas diferentes e acoes diferentes. Sem dizer qual, a
  // tela so mostra "Max. 0" e um botao morto — foi o que fez o filtro parecer
  // quebrado.
  // A decisao mora em `motivoParaNaoComecar`, fora do JSX: varios ramos, e
  // regra presa em componente so' se testa por regex no texto-fonte.
  const emptyReason = motivoParaNaoComecar({
    studyKind, fullExamReady,
    fullExamName: provaEscolhida?.rotulo ?? "", temBanca: institutions.length === 1,
    fullExamYear: provaEscolhida?.ano ?? null, temAno: selectedYears.length === 1,
    loadingPreview,
    answerStatus, activeFilterCount: activeFilters.length,
    availableCount: availability ? availability.available_count : null,
    totalCount: availability ? availability.total_count : null,
  });

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* Sem max-w proprio: o AppShell ja limita o conteudo em `lg:max-w-6xl`.
          O `max-w-7xl` que estava aqui nunca chegava a valer. */}
      {/* ⚠️ A RESERVA É OBRIGATÓRIA desde que o `CreateSessionPanel` voltou a
          montar uma `BottomActionBar`: no telemóvel ela é `fixed`, sai do
          fluxo, e sem este recuo o fim dos filtros fica por baixo dela. É o
          mesmo que o `CadernoClientPage` faz. */}
      <div className={`ritmo-secao ${BOTTOM_ACTION_BAR_RESERVE_CLASS}`}>
        <section className="space-y-4" aria-label="Montador de sessão">
          <section
            aria-label="Filtros e resumo do banco de questões"
            className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]"
            data-testid="question-bank-top-filters"
          >
            {/* ⚠️ O RESUMO VEM PRIMEIRO NO DOM. A 390px a ordem visual é a ordem
                do DOM: o Banco abre na decisão, não num formulário — o botão
                ficava ~2.000px abaixo. No desktop a colocação por linha/coluna
                devolve tudo ao lugar. O botão NÃO é duplicado (`/^Começar/` é
                estrito no e2e) e nada é fixado ao rodapé: a ação SOBE no fluxo.
                Ver `_components/SecaoRecolhivel`. */}
            <CreateSessionPanel
              availability={availability}
              loadingPreview={loadingPreview}
              busy={busy}
              clampedLimit={tamanhoProva ?? clampedLimit}
              correctionMode={correctionMode}
              studyKind={studyKind}
              canStartSession={studyKind !== "full_exam" || fullExamReady}
              error={error}
              startLabel={configuredStartLabel}
              emptyReason={emptyReason}
              ressalva={ressalva}
              onRefreshAvailability={() => void refreshAvailability()}
              onPreviewQuestions={() => void previewQuestions()}
              onStartSession={() => void startSession()}
              onRetry={() => {
                // TENTA DE NOVO — nunca cria sessão. Chamava `startSession()`
                // sempre que havia disponibilidade carregada, e era o caso
                // comum: o aluno via "não foi possível carregar as questões",
                // clicava, e ganhava uma sessão de 10 questões que não pediu.
                // Botão de recuperação de erro não pode ter efeito colateral
                // irreversível.
                setError(null);
                if (topicsError || !bootstrapReady) void loadBootstrap();
                void refreshAvailability();
              }}
            />

            <div className="min-w-0 space-y-4 lg:col-start-1 lg:row-start-1">
              <BarraDeFiltrosAtivos
                filtros={activeFilters}
                onLocalizar={locateActiveFilter}
                onLimpar={limparFiltros}
              />
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
                  correctionMode={correctionMode}
                  onCorrectionModeChange={setCorrectionMode}
                  tipoSessao={tipoSessao}
                  onTipoSessaoChange={escolherTipoDeSessao}
                  krosMode={kros.modo}
                  onKrosModeChange={kros.escolherModo}
                  krosBancasAlvo={kros.bancasAlvo}
                  krosBancasSemCobertura={kros.bancasSemCobertura}
                  krosPreviaCarregando={kros.previaCarregando}
                  includeRetired={includeRetired}
                  onIncludeRetiredChange={setIncludeRetired}
                  examEditions={examEditions} tamanhoPorAnoDaProva={tamanhoPorAnoDaProva} aplicacaoPorAnoDaProva={aplicacaoPorAnoDaProva} totaisDaProva={totaisDaProva}
                  examEditionsLoading={examEditionsLoading}
                  fullExamNumber={fullExamNumber}
                  onFullExamNumberChange={setFullExamNumber}
                  fullExamType={fullExamType}
                  onFullExamTypeChange={setFullExamType}
                  limit={limit}
                  clampedLimit={clampedLimit}
                  limitMax={limitMax}
                  limitMin={limitMin}
                  limitStep={limitStep}
                  onLimitChange={setLimit}
                  focusTopicId={focusTopicId}
                  onQuantityEditingChange={setQuantityEditing}
                />
              </div>
            </div>

          </section>

          <QuestionList
            questions={questions}
            selectedTopicSummary={selectedTopicSummary}
          />
        </section>

        {/* ⚠️ A `BottomActionBar` SAIU DAQUI.

            Ela duplicava, SO' NO CELULAR, o botao que o painel Resumo ja monta
            -- e o fazia numa faixa fixa por cima da barra de abas, empilhando
            duas linhas de chrome no rodape. Nenhuma rede social faz isso, e o
            operador apontou.

            A correcao nao foi mover a acao para outro lugar: foi parar de
            duplica-la. `CreateSessionPanel` tirou o `hidden md:flex` do proprio
            botao, e a tela ganhou ~110px de altura util.

            ⚠️ CONFLITO DE MERGE RESOLVIDO A FAVOR DA REMOCAO, e o ganho do
            outro lado NAO se perdeu. `0f88da9a` ("o botao de comecar diz o que
            falta, em vez de morrer calado") tinha acabado de por `emptyReason`
            no `status` desta barra, justamente para o aluno de celular ver o
            motivo. Ele continua a ve-lo: `emptyReason` ja era renderizado
            dentro do `CreateSessionPanel` (`:207`), e o painel deixou de se
            esconder no mobile -- entao a explicacao passou a aparecer ao lado
            do resumo que ela explica, que e' onde ela pertence. */}
      </div>
      <ConfirmDialog
        open={feedbackDefaultPromptOpen}
        title="Usar esta correção como padrão?"
        message={`Você escolheu ${CORRECTION_MODE_SHORT_LABEL[correctionMode]}. Esta preferência pode ser alterada depois.`}
        cancelLabel="Só nesta sessão"
        confirmLabel="Usar como padrão"
        onCancel={() => void continueAfterFeedbackPrompt(false)}
        onConfirm={() => void continueAfterFeedbackPrompt(true)}
      />
    </div>
  );
}
