import { api, authHeader } from "../../shared/http";
import { appendArrayParams } from "./params";
import type {
  QuestionBankCorrectionStatus,
  QuestionBankBootstrap,
  QuestionBankFacets,
  QuestionBankSourceEntities,
  QuestionBankSourceOption,
  QuestionBankYearStat,
} from "./types";

export async function getQuestionBankBootstrap(token: string): Promise<QuestionBankBootstrap> {
  return api<QuestionBankBootstrap>("/api/question-bank/bootstrap", {
    headers: authHeader(token),
  });
}

export async function listQuestionBankSources(token: string): Promise<QuestionBankSourceOption[]> {
  return api<QuestionBankSourceOption[]>("/api/question-bank/sources", {
    headers: authHeader(token),
  });
}

export async function listQuestionBankSourceEntities(
  token: string,
): Promise<QuestionBankSourceEntities> {
  return api<QuestionBankSourceEntities>("/api/question-bank/source-entities", {
    headers: authHeader(token),
  });
}

export async function listQuestionBankYears(token: string): Promise<QuestionBankYearStat[]> {
  return api<QuestionBankYearStat[]>("/api/question-bank/years", {
    headers: authHeader(token),
  });
}

export type QuestionBankFacetParams = {
  knowledge_node_ids?: string[];
  area?: string;
  search?: string;
  institution?: string;
  institutions?: string[];
  board_codes?: string[];
  exam_codes?: string[];
  state_codes?: string[];
  year_from?: number;
  year_to?: number;
  years?: number[];
  correction_status?: QuestionBankCorrectionStatus;
};

// Cross-filtered facet counts (Estratégia-style): years react to the selected
// banca and bancas react to the selected years. One call to avoid a waterfall.
export async function listQuestionBankFacets(
  token: string,
  params: QuestionBankFacetParams = {},
  signal?: AbortSignal,
): Promise<QuestionBankFacets> {
  const q = new URLSearchParams();
  appendArrayParams(q, "knowledge_node_ids", params.knowledge_node_ids);
  appendArrayParams(q, "board_codes", params.board_codes);
  appendArrayParams(q, "exam_codes", params.exam_codes);
  appendArrayParams(q, "institutions", params.institutions);
  appendArrayParams(q, "state_codes", params.state_codes);
  appendArrayParams(q, "years", params.years?.map(String));
  if (params.area?.trim()) q.set("area", params.area.trim());
  if (params.search?.trim()) q.set("search", params.search.trim());
  if (params.institution?.trim()) q.set("institution", params.institution.trim());
  if (params.year_from) q.set("year_from", String(params.year_from));
  if (params.year_to) q.set("year_to", String(params.year_to));
  if (params.correction_status && params.correction_status !== "all") {
    q.set("correction_status", params.correction_status);
  }
  return api<QuestionBankFacets>(
    `/api/question-bank/facets${q.toString() ? `?${q.toString()}` : ""}`,
    { headers: authHeader(token), signal },
  );
}

/** Uma edição de prova escolhível, com o denominador ao lado do capturado. */
export type QuestionBankExamEdition = {
  exam_edition_key: string;
  institution_key: string;
  institution_label: string;
  year: number;
  /** A ENTRADA da prova. Duas entradas no mesmo ano são duas aplicações. */
  exam_number: string;
  access_group: string;
  /** O CADERNO, legível. No R+ é ele que separa uma prova da outra: as
   *  especialidades partilham o `exam_number`. Ver `chaveDaProva`. */
  access_type: string | null;
  /** Quantas a prova teve. `null` = ninguém conferiu o edital — não é zero. */
  declared_count: number | null;
  declared_origin: string | null;
  captured_count: number;
  annulled_count: number;
  outdated_count: number;
  /** Quando a prova caiu (ISO). `null` = não sabemos — a tela não afirma.
   *  NÃO é o `year`: a fonte rotula pela turma, e a 'ENARE 2026' caiu em
   *  20/10/2025. */
  applied_on: string | null;
  applied_year: number | null;
  completeness: "complete" | "partial" | "over" | "unknown";
};

/**
 * As edições de uma banca num ano.
 *
 * Existe para a pergunta que só o aluno responde: quando a banca aplicou DUAS
 * provas no mesmo ano (a PE tem n=1 e n=2, com 100 e 99 questões), nenhuma regra
 * decide qual ele quer — e sem escolher, o modo prova desistia e servia o
 * recorte de treino no lugar da prova.
 *
 * Lista vazia é resposta legítima: o banco pode ainda não ter as views de
 * edição. Quem consome não pergunta nada nesse caso.
 */
/** Quantas questões de PROVA uma instituição tem, e em quantas edições. */
export type QuestionBankExamTotal = {
  institution_key: string;
  total: number;
  annulled: number;
  /** Anos distintos: é o número de provas escolhíveis. */
  editions: number;
};

/**
 * O tamanho de prova de cada banca, para o seletor parar de anunciar o treino.
 *
 * O ENARE aparecia com 530 e as seis provas somam 600 — a diferença são as
 * anuladas, desatualizadas e duplicatas que o índice de treino exclui com razão
 * e a prova precisa ter.
 */
export async function listQuestionBankExamTotals(
  token: string,
  params: { access_group?: string } = {},
  signal?: AbortSignal,
): Promise<QuestionBankExamTotal[]> {
  const q = new URLSearchParams();
  if (params.access_group) q.set("access_group", params.access_group);
  return api<QuestionBankExamTotal[]>(
    `/api/question-bank/exam-totals${q.toString() ? `?${q.toString()}` : ""}`,
    { headers: authHeader(token), signal },
  );
}

export async function listQuestionBankExamEditions(
  token: string,
  /** `year` opcional: quem escolheu a banca precisa dos tamanhos de TODOS os
   *  anos para decidir qual prova fazer. */
  params: { institution_key: string; year?: number; access_group?: string },
  signal?: AbortSignal,
): Promise<QuestionBankExamEdition[]> {
  const q = new URLSearchParams();
  q.set("institution_key", params.institution_key);
  if (params.year !== undefined) q.set("year", String(params.year));
  if (params.access_group) q.set("access_group", params.access_group);
  return api<QuestionBankExamEdition[]>(
    `/api/question-bank/exam-editions?${q.toString()}`,
    { headers: authHeader(token), signal },
  );
}
