import { api, authHeader } from "../../shared/http";
import { appendArrayParams } from "./params";
import type {
  QuestionBankAnswerStatus,
  QuestionBankCorrectionStatus,
  QuestionBankQuestion,
  QuestionBankQuestionHistory,
} from "./types";

export async function browseQuestionBankQuestions(
  token: string,
  params: { knowledge_node_ids?: string[]; area?: string; search?: string; institution?: string; board_codes?: string[]; year_from?: number; year_to?: number; years?: number[]; limit?: number; answer_status?: QuestionBankAnswerStatus; only_unanswered?: boolean; correction_status?: QuestionBankCorrectionStatus } = {},
): Promise<QuestionBankQuestion[]> {
  const q = new URLSearchParams();
  appendArrayParams(q, "knowledge_node_ids", params.knowledge_node_ids);
  appendArrayParams(q, "board_codes", params.board_codes);
  appendArrayParams(q, "years", params.years?.map(String));
  if (params.area?.trim()) q.set("area", params.area.trim());
  if (params.search?.trim()) q.set("search", params.search.trim());
  if (params.institution?.trim()) q.set("institution", params.institution.trim());
  if (params.year_from) q.set("year_from", String(params.year_from));
  if (params.year_to) q.set("year_to", String(params.year_to));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.answer_status) q.set("answer_status", params.answer_status);
  if (params.only_unanswered !== undefined) q.set("only_unanswered", params.only_unanswered ? "true" : "false");
  if (params.correction_status && params.correction_status !== "all") q.set("correction_status", params.correction_status);
  return api<QuestionBankQuestion[]>(`/api/question-bank/questions${q.toString() ? `?${q.toString()}` : ""}`, { headers: authHeader(token) });
}

export async function requestQuestionBankAICorrection(
  token: string,
  questionId: string,
): Promise<{ question_id: string; candidate_id?: string; job_id?: string; status: string; source?: string }> {
  return api<{ question_id: string; candidate_id?: string; job_id?: string; status: string; source?: string }>(
    `/api/question-bank/questions/${encodeURIComponent(questionId)}/ai-correction`,
    { method: "POST", headers: authHeader(token), body: JSON.stringify({ source: "student_requested" }), timeoutMs: 45000 },
  );
}

export async function getQuestionAttemptHistory(
  token: string,
  questionId: string,
): Promise<QuestionBankQuestionHistory> {
  return api<QuestionBankQuestionHistory>(
    `/api/question-bank/questions/${encodeURIComponent(questionId)}/attempts`,
    { headers: authHeader(token) },
  );
}
