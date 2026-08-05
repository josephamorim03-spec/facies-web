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
