import { api, authHeader } from "../../shared/http";
import { appendArrayParams } from "./params";
import type {
  QuestionBankAnswerStatus,
  QuestionBankAvailability,
  QuestionBankCorrectionStatus,
  QuestionBankMode,
  QuestionBankTopic,
} from "./types";

export async function browseQuestionBankTopics(
  token: string,
  params: { area?: string; search?: string; institution?: string; institutions?: string[]; node_type?: string; node_types?: string[]; board_codes?: string[]; exam_codes?: string[]; state_codes?: string[]; year_from?: number; year_to?: number; years?: number[]; include_empty?: boolean; limit?: number; population?: "servable" | "exam" } = {},
  init?: Pick<RequestInit, "signal">,
): Promise<QuestionBankTopic[]> {
  const q = new URLSearchParams();
  if (params.area?.trim()) q.set("area", params.area.trim());
  if (params.search?.trim()) q.set("search", params.search.trim());
  if (params.institution?.trim()) q.set("institution", params.institution.trim());
  appendArrayParams(q, "institutions", params.institutions);
  if (params.node_type?.trim()) q.set("node_type", params.node_type.trim());
  if (params.year_from) q.set("year_from", String(params.year_from));
  if (params.year_to) q.set("year_to", String(params.year_to));
  if (typeof params.include_empty === "boolean") q.set("include_empty", String(params.include_empty));
  if (params.limit) q.set("limit", String(params.limit));
  // Qual população a árvore conta. Omitir = `servable`, que é o Banco; `exam` é
  // o mapa, que mede a prova. Ver `servable_question_count` em `types.ts`.
  if (params.population) q.set("population", params.population);
  appendArrayParams(q, "node_types", params.node_types);
  appendArrayParams(q, "board_codes", params.board_codes);
  appendArrayParams(q, "exam_codes", params.exam_codes);
  appendArrayParams(q, "state_codes", params.state_codes);
  appendArrayParams(q, "years", params.years?.map(String));
  // Usa a política de cache do client (TTL+SWR, tags question-bank-topics):
  // catálogo é referência quase-estática e mutações em /api/question-bank
  // invalidam a tag automaticamente.
  return api<QuestionBankTopic[]>(`/api/question-bank/topics${q.toString() ? `?${q.toString()}` : ""}`, {
    headers: authHeader(token),
    signal: init?.signal,
  });
}

export async function previewQuestionBankAvailability(
  token: string,
  params: { knowledge_node_ids?: string[]; area?: string; search?: string; institution?: string; institutions?: string[]; board_codes?: string[]; exam_codes?: string[]; state_codes?: string[]; year_from?: number; year_to?: number; years?: number[]; include_no_year?: boolean; answer_status?: QuestionBankAnswerStatus; only_unanswered?: boolean; correction_status?: QuestionBankCorrectionStatus; mode?: QuestionBankMode } = {},
  init?: Pick<RequestInit, "signal">,
): Promise<QuestionBankAvailability> {
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
  if (params.include_no_year) q.set("include_no_year", "true");
  if (params.answer_status) q.set("answer_status", params.answer_status);
  if (params.only_unanswered !== undefined) q.set("only_unanswered", params.only_unanswered ? "true" : "false");
  if (params.correction_status && params.correction_status !== "all") q.set("correction_status", params.correction_status);
  if (params.mode) q.set("mode", params.mode);
  return api<QuestionBankAvailability>(`/api/question-bank/availability${q.toString() ? `?${q.toString()}` : ""}`, {
    headers: authHeader(token),
    retry: false,
    signal: init?.signal,
  });
}
