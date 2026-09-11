import type { QuestionBankAnswerStatus, QuestionBankTopic } from "@/lib/api";

// Extensao EXPLICITA: o runner de teste do Node resolve ESM cru, e este
// modulo e importado por `.test.mjs`. Sem ela, `ERR_MODULE_NOT_FOUND` --
// o mesmo motivo de `mapaLayout.ts` e `plano/_lib/fases.ts`.
import { rotuloDaBanca } from "./rotuloDaBanca.ts";

export const QUESTION_BANK_LIMIT_CAP = 120;

/**
 * A GRADE DE TAMANHO DO TREINO DIRIGIDO — e por que o modo nunca iniciava.
 *
 * ## O defeito, exatamente
 *
 * `app/domain/kros_modes.is_valid_kros_size` exige que a sessão dirigida tenha
 * entre 20 e 120 questões, em múltiplos de 5, e o serviço responde **422
 * `invalid_kros_size`** quando não tem. O Banco oferecia uma barra de 1 a
 * `max_selectable`, passo 1, e abria com `limit = 10`.
 *
 * Ou seja: no caminho padrão — escolher "Treino dirigido" e premir começar sem
 * mexer na quantidade — o servidor recusava **sempre**. O aluno via um toast de
 * erro e nenhuma sessão. Só quem, por acaso, parasse a barra num múltiplo de 5
 * acima de 20 conseguia iniciar, o que faz o modo parecer intermitente em vez
 * de quebrado, e foi por isso que ficou de pé tanto tempo.
 *
 * ## Por que a regra não sai do servidor
 *
 * Abaixo de 20 `compose_adaptive_session` não tem itens para preencher as
 * quotas (60/30/10 e as outras), então a sessão sairia com a mistura torta —
 * plausível e errada, que é o pior resultado possível. O piso é do motor; o
 * cliente é que tinha de o respeitar.
 *
 * ⚠️ Os três números são cópia de `app/domain/kros_modes.py`
 * (`KROS_MIN_SIZE`, `KROS_MAX_SIZE`, `KROS_SIZE_STEP`). Mudar lá exige mudar
 * aqui — `tests/unit/treino-dirigido-tamanho.test.mjs` prende os valores para
 * que a divergência apareça como teste vermelho e não como 422 em produção.
 */
export const KROS_MIN_SIZE = 20;
export const KROS_MAX_SIZE = 120;
export const KROS_SIZE_STEP = 5;

export function ehTamanhoDeKrosValido(valor: number): boolean {
  return (
    Number.isInteger(valor) &&
    valor >= KROS_MIN_SIZE &&
    valor <= KROS_MAX_SIZE &&
    valor % KROS_SIZE_STEP === 0
  );
}

/**
 * Encosta `valor` na grade do Treino dirigido, para baixo, dentro do teto.
 *
 * Arredonda PARA BAIXO de propósito: para cima entregaria mais questões do que
 * o aluno pediu, e num caso (o teto) mais do que o acervo tem.
 *
 * ⚠️ O piso vence o teto quando os dois se cruzam. Um acervo com 12 questões
 * disponíveis não permite nenhum tamanho válido; devolver 12 seria voltar ao
 * 422. Devolve 20 — o motor entrega o que houver — e cabe à tela dizer que o
 * filtro tem menos do que isso, o que `motivoParaNaoComecar` já faz.
 */
export type GradeDoKros = { min: number; max: number; passo: number };

/** A grade que o front assume até a prévia responder com a do servidor. */
export const GRADE_PADRAO_DO_KROS: GradeDoKros = {
  min: KROS_MIN_SIZE,
  max: KROS_MAX_SIZE,
  passo: KROS_SIZE_STEP,
};

export function ajustarAoPassoDoKros(
  valor: number,
  teto = KROS_MAX_SIZE,
  grade: GradeDoKros = GRADE_PADRAO_DO_KROS,
): number {
  const passo = grade.passo > 0 ? grade.passo : KROS_SIZE_STEP;
  const tetoNaGrade = Math.min(grade.max, Math.trunc(teto));
  const alvo = Math.min(Math.trunc(Number(valor) || 0), tetoNaGrade);
  // Encosta a partir do PISO, e não do zero: uma grade cujo mínimo não é
  // múltiplo do passo (o servidor pode publicar uma) sairia toda deslocada.
  const encostado = Math.floor((alvo - grade.min) / passo) * passo + grade.min;
  return Math.max(grade.min, Math.min(grade.max, encostado));
}

export type QuestionBankEntryContext = {
  reviewTaskId: string | null;
  activityId: string | null;
  source: "calendar-review" | null;
  dateISO: string | null;
  area: string | null;
  theme: string | null;
  /** O primeiro de `knowledgeNodeIds`. Mantido porque `resolveEntryTopic` o usa. */
  knowledgeNodeId: string | null;
  /**
   * Os nós que a origem pediu, em ordem.
   *
   * ⚠️ QUEM MANDA ESCREVE NO PLURAL. `PostExamReview` monta
   * `?knowledge_node_ids=…` desde sempre, e este parser só lia o singular —
   * então o parâmetro caía no chão e a sessão nascia sem foco nenhum.
   */
  knowledgeNodeIds: string[];
  expectedQuestions: number | null;
  /**
   * O recorte de histórico que a origem pediu.
   *
   * ⚠️ ESTE É O CAMPO QUE FAZIA O BOTÃO MENTIR. "Revisar os erros desta
   * sessão" navega para `?answer_status=wrong`; o Banco não lia o parâmetro e
   * `answerStatus` nascia `"unanswered"`, então o aluno pedia o que errou e
   * recebia o que nunca tinha visto. O oposto exato do rótulo.
   */
  answerStatus: QuestionBankAnswerStatus | null;
  /** Quantas questões a origem pediu, quando ela pede. */
  limit: number | null;
};

/** Os valores que o contrato conhece. Qualquer outro vira `null`. */
const ANSWER_STATUS_VALIDOS = new Set<QuestionBankAnswerStatus>([
  "unanswered", "answered", "correct", "wrong", "all",
  "unanswered_or_wrong", "needs_review", "near_miss",
]);

function parseAnswerStatus(bruto: string | null): QuestionBankAnswerStatus | null {
  const valor = bruto?.trim();
  if (!valor) return null;
  return ANSWER_STATUS_VALIDOS.has(valor as QuestionBankAnswerStatus)
    ? (valor as QuestionBankAnswerStatus)
    : null;
}

/**
 * Lê o plural e aceita o singular legado. Vazios saem fora: `?ids=a,,b` é
 * erro de quem montou a URL, não um nó chamado "".
 */
function parseKnowledgeNodeIds(params: SearchParamReader): string[] {
  const bruto = params.get("knowledge_node_ids") ?? params.get("knowledge_node_id") ?? "";
  const vistos = new Set<string>();
  for (const parte of bruto.split(",")) {
    const id = parte.trim();
    if (id) vistos.add(id);
  }
  return [...vistos];
}

type SearchParamReader = { get(name: string): string | null };

export function clampQuestionLimit(value: number | null | undefined, fallback = 10, maximum = QUESTION_BANK_LIMIT_CAP) {
  const numericValue = Number(value ?? fallback);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.max(1, Math.min(maximum, Math.trunc(numericValue)));
}

export function parsePositiveInt(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function parseQuestionBankEntryContext(params: SearchParamReader | null): QuestionBankEntryContext {
  if (!params) {
    return {
      reviewTaskId: null, activityId: null, source: null, dateISO: null, area: null,
      theme: null, knowledgeNodeId: null, knowledgeNodeIds: [], expectedQuestions: null,
      answerStatus: null, limit: null,
    };
  }
  const source = params.get("source") === "calendar-review" ? "calendar-review" : null;
  const nodeIds = parseKnowledgeNodeIds(params);
  return {
    reviewTaskId: params.get("review_task_id")?.trim() || null,
    activityId: params.get("activity_id")?.trim() || null,
    source,
    dateISO: params.get("date")?.trim() || null,
    area: params.get("area")?.trim().toUpperCase() || null,
    theme: params.get("theme")?.trim() || null,
    knowledgeNodeId: nodeIds[0] ?? null,
    knowledgeNodeIds: nodeIds,
    expectedQuestions: parsePositiveInt(params.get("expected_questions")),
    answerStatus: parseAnswerStatus(params.get("answer_status")),
    // `limit` chegava de `TodayEmptyState` (`?limit=10`) e ninguém o lia: ele
    // funcionava por coincidência, porque o padrão já era 10.
    limit: parsePositiveInt(params.get("limit")),
  };
}

function normalize(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

/**
 * IDs are authoritative. Legacy entries may only use an unambiguous exact label;
 * fuzzy matching is intentionally avoided so a review never opens on a wrong topic.
 */
export function resolveEntryTopic(
  topics: QuestionBankTopic[],
  context: Pick<QuestionBankEntryContext, "knowledgeNodeId" | "theme" | "area">,
): QuestionBankTopic | null {
  if (context.knowledgeNodeId) {
    return topics.find((topic) => topic.knowledge_node_id === context.knowledgeNodeId) ?? null;
  }
  const legacyName = normalize(context.theme);
  if (!legacyName) return null;
  const matching = topics.filter((topic) => {
    const inArea = !context.area || normalize(topic.node_code).includes(normalize(context.area));
    return inArea && normalize(topic.node_name) === legacyName;
  });
  return matching.length === 1 ? matching[0] : null;
}

export type ActiveFilter = { id: string; label: string; topicId?: string };

function examFilterLabel(code: string): string {
  const normalized = String(code || "").trim().toUpperCase();
  if (normalized === "ACESSO-DIRETO") return "Acesso Direto";
  if (normalized === "RPLUS") return "Residência R+";
  if (normalized === "REVALIDA") return "Revalida";
  return normalized;
}

export function getActiveFilters(params: {
  area: string;
  boardCodes: string[];
  examCodes: string[];
  institutions: string[];
  stateCodes: string[];
  selectedYears: number[];
  includeNoYear: boolean;
  answerStatus: string;
  correctionStatus: string;
  selectedTopics: QuestionBankTopic[];
  search: string;
}): ActiveFilter[] {
  const filters: ActiveFilter[] = [];
  if (params.area) filters.push({ id: "area", label: params.area });
  for (const topic of params.selectedTopics) filters.push({ id: `topic:${topic.knowledge_node_id}`, label: topic.node_name, topicId: topic.knowledge_node_id });
  for (const code of params.boardCodes) filters.push({ id: `board:${code}`, label: code });
  // ⚠️ O CODIGO DE EXAME APARECE MESMO SENDO O PADRAO, e isso e deliberado.
  //
  // As outras entradas desta lista so' aparecem quando SAEM do padrao -- o
  // `answerStatus` logo abaixo e o exemplo. Aqui e diferente: o Banco nasce
  // recortado em "Acesso Direto", e um recorte invisivel e' pior que um chip a
  // mais. Quem nao souber que o acervo esta filtrado nao entende por que o
  // total nao bate com o do mapa.
  //
  // ⚠️ Consequencia que fica dita: "Limpar" nunca esvazia a barra por completo.
  for (const code of params.examCodes) {
    filters.push({ id: `exam:${code}`, label: examFilterLabel(code) });
  }
  // O chip mostra o rotulo limpo: cru, ele ocupa a barra inteira com a UF
  // repetida e o hospital-sede. Ver .
  for (const institution of params.institutions) filters.push({ id: `institution:${institution}`, label: rotuloDaBanca(institution) });
  for (const state of params.stateCodes) filters.push({ id: `state:${state}`, label: state });
  for (const year of params.selectedYears) filters.push({ id: `year:${year}`, label: String(year) });
  if (params.includeNoYear) filters.push({ id: "no-year", label: "Sem ano" });
  if (params.answerStatus !== "unanswered") filters.push({ id: "answer-status", label: "Status de resolução" });
  if (params.correctionStatus !== "all") filters.push({ id: "correction-status", label: "Correção IA" });
  if (params.search.trim()) filters.push({ id: "search", label: params.search.trim() });
  return filters;
}

/** Quando o aluno vê o gabarito. Um eixo, três posições, sem sinônimo. */
export type CorrectionMode = "immediate" | "guided_choice" | "reveal_all";

/** O que o botão promete. Precisa ser o que a sessão entrega — durante um bom
 *  tempo ele anunciou "feedback por questão" para uma sessão que só corrigia no
 *  fim, porque o rótulo era derivado de `resolutionMode`, que nada tem a ver
 *  com o momento do gabarito. */
export const CORRECTION_MODE_LABEL: Record<CorrectionMode, string> = {
  immediate: "Corrigir a cada questão",
  guided_choice: "Corrigir ao terminar, uma a uma",
  reveal_all: "Corrigir tudo ao terminar",
};

export const CORRECTION_MODE_SHORT_LABEL: Record<CorrectionMode, string> = {
  immediate: "corrige a cada questão",
  guided_choice: "corrige ao terminar, uma a uma",
  reveal_all: "corrige tudo ao terminar",
};

/**
 * Onde o SERVIDOR fixa o momento da correção, e a tela tem de parar de prometer
 * o contrário.
 *
 * `normalize_session_contract` (`app/api/schemas/question_bank.py`) põe
 * `feedback_timing = "post_result"` em `session_kind="kros"` e em
 * `session_kind="institutional_exam"`, e por boa razão: nos dois o exercício
 * depende de não ver o gabarito antes do fim.
 *
 * ⚠️ Mas a tela oferecia "A cada questão" nos três tipos, e o botão dizia
 * `Começar prova · 100 questões · corrige a cada questão` para uma sessão que
 * ia corrigir no fim. É a mesma forma do beco do `guided_choice` fechado na
 * PR #76: **oferecer a escolha que o servidor descarta**. O remédio é o mesmo —
 * não oferecer.
 *
 * ⚠️ Isto é um espelho de regra do servidor, que é coisa que esta base evita.
 * Fica aqui, num lugar só, e `tests/unit/correcao-nao-promete-o-que-o-servidor-desfaz.test.mjs`
 * lê o schema e reprova se o servidor deixar de pinar — para o espelho não
 * poder envelhecer em silêncio.
 */
export function correcaoEhEscolhaDoAluno(tipoSessao: string): boolean {
  return tipoSessao !== "full_exam" && tipoSessao !== "kros";
}

/**
 * O modo que a sessão vai MESMO ter.
 *
 * Onde o servidor pina o fim, `immediate` cai para `guided_choice` — a posição
 * vizinha no mesmo eixo, e a que o payload já mandava nesses casos.
 */
export function correcaoEfetiva(escolhida: CorrectionMode, tipoSessao: string): CorrectionMode {
  if (correcaoEhEscolhaDoAluno(tipoSessao)) return escolhida;
  return escolhida === "immediate" ? "guided_choice" : escolhida;
}

/**
 * Os dois eixos do contrato, derivados de uma escolha só — aqui, e não na
 * página.
 *
 * São eixos DIFERENTES e é por isso que ambos viajam: `feedback_timing` é
 * QUANDO (na hora ou no fim) e `feedback_reveal_policy` é COMO no fim (uma a
 * uma ou tudo junto). A página montava os dois à mão, ao lado do resto do
 * payload, e a regra do `immediate` tinha de ser lembrada num sítio que não é
 * o dono do assunto.
 */
export function politicaDeCorrecao(
  escolhida: CorrectionMode,
  tipoSessao: string,
): { feedback_timing: "immediate" | "post_result"; feedback_reveal_policy: "guided_choice" | "reveal_all" } {
  const efetiva = correcaoEfetiva(escolhida, tipoSessao);
  return {
    feedback_timing: efetiva === "immediate" ? "immediate" : "post_result",
    feedback_reveal_policy: efetiva === "reveal_all" ? "reveal_all" : "guided_choice",
  };
}

export function questionBankCtaLabel(
  limit: number,
  correctionMode: CorrectionMode,
  /** O tipo escolhido na TELA (`full_exam` | `kros` | `topic`) — e não o
   *  `study_kind` do contrato, que não distingue o Treino dirigido e por isso
   *  não sabe que ali a correção também é fixada. */
  tipoSessao: string,
  /**
   * O acervo não chega ao tamanho pedido, e o botão tem de dizê-lo.
   *
   * ⚠️ Existe por um defeito que EU introduzi ao consertar o Treino dirigido.
   * O piso do modo é 20, então com 12 questões no filtro a barra trava em 20 e
   * o pedido sai em 20 — legítimo para o servidor, que trata o número como
   * teto. Só que o botão anunciava "Começar 20 questões" e entregava 12.
   *
   * É exatamente a mentira que o piso veio corrigir, com o sinal trocado: antes
   * a barra aceitava 37 e mandava 35; depois passou a prometer 20 e entregar o
   * que houvesse. "até" é a única palavra honesta quando o número é teto.
   */
  aproximado = false,
): string {
  // A correção aparece nos DOIS tipos. Antes a prova institucional retornava
  // cedo e omitia como seria corrigida — e como escolher a prova sobrescrevia a
  // correção em silêncio, o aluno não tinha nenhum lugar onde ver o que ia
  // receber.
  //
  // ⚠️ `correcaoEfetiva`, e não a escolha crua: mostrar a escolha aqui deixava
  // o botão prometer "corrige a cada questão" numa prova que o servidor pina em
  // `post_result`. Ver a nota da função.
  const correction = CORRECTION_MODE_SHORT_LABEL[correcaoEfetiva(correctionMode, tipoSessao)];
  if (tipoSessao === "full_exam") return `Começar prova · ${limit} questões · ${correction}`;
  if (aproximado) return `Começar até ${limit} questões · ${correction}`;
  return `Começar ${limit} questões · ${correction}`;
}

/**
 * A RESSALVA — "dá para começar, mas não como você pediu".
 *
 * ## Por que não entra em `motivoParaNaoComecar`
 *
 * Aquela função tem contrato explícito: `null` significa "pode começar, ou
 * ainda estamos carregando", e quem chama não deve inventar texto no lugar do
 * silêncio. Enfiar aqui um aviso que NÃO impede de começar transformaria o
 * `null` em três significados — e o docstring dela existe justamente porque
 * misturar razões de bloqueio já tinha custado um botão morto e mudo.
 *
 * São duas perguntas diferentes: *posso começar?* e *vou receber o que pedi?*
 * Duas perguntas, duas funções.
 *
 * ## O caso
 *
 * O Treino dirigido monta a partir de `grade.min` (20). Um filtro com 12
 * questões disponíveis é começável — 12 questões valem a pena — mas a sessão
 * sai menor que o número no botão. Bloquear seria pior: negaria prática a quem
 * tem pouco acervo, que é justamente quem mais precisa de a fazer render.
 */
export function ressalvaDoTreinoDirigido({
  treinoDirigido,
  availableCount,
  piso,
}: {
  treinoDirigido: boolean;
  availableCount: number | null;
  piso: number;
}): string | null {
  if (!treinoDirigido || availableCount === null) return null;
  if (availableCount <= 0 || availableCount >= piso) return null;
  return (
    `O filtro tem ${availableCount} ${availableCount === 1 ? "questão" : "questões"}, ` +
    `e o Treino dirigido monta a partir de ${piso}. Dá para começar — a sessão ` +
    `sai com o que houver. Para uma prova cheia, amplie o filtro.`
  );
}

/**
 * Por que o botao de comecar esta morto — e o que fazer a respeito.
 *
 * Mora AQUI, e nao no JSX: e' uma
 * decisao com varios ramos, e regra presa dentro de componente so' se testa por
 * regex no texto-fonte, o que prova que a linha existe e nao que ela decide
 * certo.
 *
 * Dois dos quatro motivos de `canStartConfigured` nao tinham explicacao
 * nenhuma. O pior era a prova: sem instituicao e ano preenchidos nao ha o que
 * contar, entao o CTA ficava desabilitado e MUDO — o "modo prova nao inicia de
 * forma clara" que o operador relatou.
 *
 * `null` significa "pode comecar, ou ainda estamos carregando": quem chama nao
 * deve inventar texto no lugar do silencio.
 */
export type MotivoParaNaoComecar = {
  studyKind: string;
  fullExamReady: boolean;
  /** Rótulo da banca escolhida NO SELETOR. Vazio = ainda não escolheu. */
  fullExamName: string;
  /** O que já foi escolhido, SEPARADO — ver `motivoParaNaoComecar`. */
  temBanca: boolean;
  temAno: boolean;
  /** Ano escolhido no seletor. `null` = ainda não escolheu. */
  fullExamYear: string | number | null;
  loadingPreview: boolean;
  availableCount: number | null;
  totalCount: number | null;
  answerStatus: string;
  activeFilterCount: number;
};

export function motivoParaNaoComecar(estado: MotivoParaNaoComecar): string | null {
  const {
    studyKind, fullExamReady, fullExamName, fullExamYear, temBanca, temAno,
    loadingPreview, availableCount, totalCount, answerStatus, activeFilterCount,
  } = estado;

  // A prova vem ANTES da disponibilidade: sem os campos nao ha o que contar.
  if (studyKind === "full_exam" && !fullExamReady) {
    // ⚠️ O QUE FALTA VEM DE `temBanca`/`temAno`, e não do rótulo.
    //
    // A versão anterior lia `fullExamName`, que sai de `provaEscolhida?.rotulo`
    // — e `provaEscolhida` é `null` quando falta a banca OU o ano. Com a banca
    // escolhida e o ano não, o rótulo vinha vazio e a tela pedia a BANCA que já
    // estava ali. Visto na tela do operador em 2026-09-10.
    //
    // Um objeto que colapsa duas condições numa só não consegue dizer qual
    // delas falhou. Os dois fatos viajam separados por isso.
    // UMA coisa de cada vez, e nesta ordem: a banca decide quais anos existem.
    // Pedir os dois juntos ("escolha a banca e o ano") daria uma frase que o
    // aluno nao consegue satisfazer de uma vez -- e era ramo morto, porque
    // `!temBanca` ja o cobria.
    if (!temBanca) return "Escolha a banca da prova para continuar.";
    return "Escolha o ano da prova para continuar.";
  }
  if (loadingPreview || availableCount === null || availableCount > 0) return null;

  if (totalCount === 0) {
    // Em prova, "remova um filtro" e' conselho errado: o filtro E' a prova, e
    // zero quase sempre significa que o nome digitado nao casou com o acervo.
    if (studyKind === "full_exam") {
      // Não sugere mais "confira o nome": com seletor, o nome não se digita.
      return `Nenhuma questão encontrada para ${fullExamName.trim()} em ${fullExamYear}. Escolha outro ano ou outra banca.`;
    }
    return activeFilterCount > 0
      ? "Nenhuma questão combina com os filtros atuais. Remova um filtro para ampliar a busca."
      : "Nenhuma questão disponível no banco para esta configuração.";
  }
  if (answerStatus === "unanswered") {
    return `Você já respondeu todas as ${totalCount} questões deste filtro. Troque o histórico para "todas" ou "só erros".`;
  }
  return `As ${totalCount} questões do filtro não se encaixam neste histórico. Ajuste o histórico da sessão.`;
}

/** O recorte por área, tema e busca — o que a barra chama de "Foco clínico". */
export type FocoClinico = {
  knowledge_node_ids: string[] | undefined;
  area: string | undefined;
  search: string | undefined;
};

/**
 * ESCONDER UM FILTRO NÃO O DESLIGA — e a diferença chegou ao aluno.
 *
 * A prova é um caderno fechado: área, tema e busca não a recortam, e é por isso
 * que o passo "1. Foco clínico" some no modo prova. Mas sumir da tela não
 * impediu os valores de viajarem: quem tinha temas escolhidos e trocava para
 * Prova ficava com um recorte INVISÍVEL e sem controle para limpá-lo. Relatado
 * como *"antes se apareciam 90 e poucas questões por ano, agora tá 2, 3, 1"*.
 *
 * O estado NÃO é apagado — quem volta para "Por tópico" reencontra a sua
 * seleção. O que muda é o que se ENVIA.
 *
 * ⚠️ Função, e não um objeto montado na página, de propósito: `filterParams`, a
 * chave de cache das facetas e o pedido de facetas montavam o MESMO recorte em
 * três lugares, e bastou um deles esquecer a guarda de modo para o número da
 * barra discordar do da sessão. Uma definição, nada para divergir.
 */
export function recorteDeFocoClinico(entrada: {
  ehProva: boolean;
  topicos: QuestionBankTopic[];
  area: string;
  busca: string;
}): FocoClinico {
  if (entrada.ehProva) {
    return { knowledge_node_ids: undefined, area: undefined, search: undefined };
  }
  return {
    knowledge_node_ids:
      entrada.topicos.length > 0
        ? entrada.topicos.map((topico) => topico.knowledge_node_id)
        : undefined,
    area: entrada.area || undefined,
    search: entrada.busca || undefined,
  };
}

/** Há algo no foco clínico que de fato viaja? Decide se vale pedir facetas. */
export function focoClinicoTemFiltro(foco: FocoClinico): boolean {
  return Boolean(foco.area || foco.search || foco.knowledge_node_ids?.length);
}

/** A prova que o aluno escolheu: chave para recortar, rótulo para exibir. */
export type ProvaEscolhida = { chave: string; rotulo: string; ano: number } | null;

/**
 * A PROVA VEM DO SELETOR, e não de uma caixa de texto — esta era a razão de o
 * modo prova não funcionar.
 *
 * O payload fazia `institutions = [fullExamName.trim()]`: mandava ao banco o
 * texto que a pessoa digitava ("USP", "ENARE"), num campo cujo placeholder era
 * literalmente "USP, UNIFESP, SUS-SP...". As chaves reais têm 60 a 90
 * caracteres (`EXAME-NACIONAL-DE-RESIDENCIA-MEDICA-EBSERH-...`) e a comparação
 * é exata: casava **zero**. E de quebra sobrescrevia a banca já escolhida no
 * seletor, que trazia a chave certa. Com o campo vazio, o botão de começar
 * ficava morto sem dizer por quê.
 *
 * `null` quando a prova ainda não está determinada: prova é UMA instituição e
 * UM ano, e qualquer outra combinação não é prova.
 *
 * O rótulo sai do catálogo porque `full_exam_name` vira o título da sessão —
 * sem ele o aluno veria a chave crua de 90 caracteres no topo da prova.
 */
export function resolverProvaEscolhida(
  institutions: string[],
  anos: number[],
  sources: { option_key: string; label: string }[],
): ProvaEscolhida {
  if (institutions.length !== 1 || anos.length !== 1) return null;
  const chave = institutions[0];
  return {
    chave,
    rotulo: sources.find((item) => item.option_key === chave)?.label ?? chave,
    ano: anos[0],
  };
}
