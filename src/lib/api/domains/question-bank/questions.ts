import { api, authHeader } from "../../shared/http";
import type { StudentSurfaceHome } from "../student-experience";
import { appendArrayParams } from "./params";
import type {
  QuestionBankAiRequestPreview,
  QuestionBankAiRequestResult,
  QuestionBankAiRequestStatusResult,
  QuestionBankAnswerStatus,
  QuestionBankCorrectionStatus,
  QuestionBankQuestion,
  QuestionBankQuestionHistory,
  QuestionBankOption,
  QuestionTextHighlight,
  QuestionTextHighlightKind,
  QuestionTextHighlightTarget,
} from "./types";

export async function getQuestionBankPracticeHome(token: string): Promise<StudentSurfaceHome> {
  return api<StudentSurfaceHome>("/api/question-bank/practice-home", {
    headers: authHeader(token),
    cache: "no-store",
  });
}

export async function browseQuestionBankQuestions(
  token: string,
  params: { knowledge_node_ids?: string[]; area?: string; search?: string; institution?: string; institutions?: string[]; board_codes?: string[]; exam_codes?: string[]; year_from?: number; year_to?: number; years?: number[]; include_no_year?: boolean; limit?: number; answer_status?: QuestionBankAnswerStatus; only_unanswered?: boolean; correction_status?: QuestionBankCorrectionStatus } = {},
): Promise<QuestionBankQuestion[]> {
  const q = new URLSearchParams();
  appendArrayParams(q, "knowledge_node_ids", params.knowledge_node_ids);
  appendArrayParams(q, "board_codes", params.board_codes);
  appendArrayParams(q, "exam_codes", params.exam_codes);
  appendArrayParams(q, "institutions", params.institutions);
  appendArrayParams(q, "years", params.years?.map(String));
  if (params.area?.trim()) q.set("area", params.area.trim());
  if (params.search?.trim()) q.set("search", params.search.trim());
  if (params.institution?.trim()) q.set("institution", params.institution.trim());
  if (params.year_from) q.set("year_from", String(params.year_from));
  if (params.year_to) q.set("year_to", String(params.year_to));
  if (params.include_no_year) q.set("include_no_year", "true");
  if (params.limit) q.set("limit", String(params.limit));
  if (params.answer_status) q.set("answer_status", params.answer_status);
  if (params.only_unanswered !== undefined) q.set("only_unanswered", params.only_unanswered ? "true" : "false");
  if (params.correction_status && params.correction_status !== "all") q.set("correction_status", params.correction_status);
  return api<QuestionBankQuestion[]>(`/api/question-bank/questions${q.toString() ? `?${q.toString()}` : ""}`, { headers: authHeader(token) });
}

export async function listQuestionBankBookmarks(
  token: string,
  params: { knowledge_node_ids?: string[]; area?: string; search?: string; institution?: string; institutions?: string[]; board_codes?: string[]; exam_codes?: string[]; year_from?: number; year_to?: number; years?: number[]; include_no_year?: boolean; limit?: number } = {},
): Promise<QuestionBankQuestion[]> {
  const q = new URLSearchParams();
  appendArrayParams(q, "knowledge_node_ids", params.knowledge_node_ids);
  appendArrayParams(q, "board_codes", params.board_codes);
  appendArrayParams(q, "exam_codes", params.exam_codes);
  appendArrayParams(q, "institutions", params.institutions);
  appendArrayParams(q, "years", params.years?.map(String));
  if (params.area?.trim()) q.set("area", params.area.trim());
  if (params.search?.trim()) q.set("search", params.search.trim());
  if (params.institution?.trim()) q.set("institution", params.institution.trim());
  if (params.year_from) q.set("year_from", String(params.year_from));
  if (params.year_to) q.set("year_to", String(params.year_to));
  if (params.include_no_year) q.set("include_no_year", "true");
  if (params.limit) q.set("limit", String(params.limit));
  return api<QuestionBankQuestion[]>(`/api/question-bank/bookmarks${q.toString() ? `?${q.toString()}` : ""}`, { headers: authHeader(token), cache: "no-store", clientCache: false });
}

export async function setQuestionBankBookmark(
  token: string,
  questionId: string,
  body: { bookmarked: boolean; session_id?: string; position?: number },
): Promise<{ question_id: string; bookmarked: boolean }> {
  return api<{ question_id: string; bookmarked: boolean }>(
    `/api/question-bank/questions/${encodeURIComponent(questionId)}/bookmark`,
    {
      method: "POST",
      headers: authHeader(token),
      body: JSON.stringify(body),
      cache: "no-store",
      clientCache: false,
    },
  );
}

export async function listQuestionTextHighlights(
  token: string,
  questionId: string,
  params: { session_id?: string } = {},
): Promise<QuestionTextHighlight[]> {
  const q = new URLSearchParams();
  if (params.session_id?.trim()) q.set("session_id", params.session_id.trim());
  return api<QuestionTextHighlight[]>(
    `/api/question-bank/questions/${encodeURIComponent(questionId)}/highlights${q.toString() ? `?${q.toString()}` : ""}`,
    { headers: authHeader(token), cache: "no-store", clientCache: false },
  );
}

export async function createQuestionTextHighlight(
  token: string,
  questionId: string,
  body: {
    session_id?: string | null;
    target: QuestionTextHighlightTarget;
    option?: QuestionBankOption | null;
    kind: QuestionTextHighlightKind;
    selected_text: string;
    prefix?: string;
    suffix?: string;
    occurrence_index?: number;
  },
): Promise<QuestionTextHighlight> {
  return api<QuestionTextHighlight>(
    `/api/question-bank/questions/${encodeURIComponent(questionId)}/highlights`,
    {
      method: "POST",
      headers: authHeader(token),
      body: JSON.stringify(body),
      cache: "no-store",
      clientCache: false,
    },
  );
}

export async function deleteQuestionTextHighlight(
  token: string,
  questionId: string,
  highlightId: string,
): Promise<{ deleted: boolean }> {
  return api<{ deleted: boolean }>(
    `/api/question-bank/questions/${encodeURIComponent(questionId)}/highlights/${encodeURIComponent(highlightId)}`,
    {
      method: "DELETE",
      headers: authHeader(token),
      cache: "no-store",
      clientCache: false,
    },
  );
}

export async function requestQuestionBankAICorrection(
  token: string,
  questionId: string,
  options: { forceReanalyze?: boolean; sourcePage?: string } = {},
): Promise<QuestionBankAiRequestResult> {
  return api<QuestionBankAiRequestResult>(
    `/api/question-bank/questions/${encodeURIComponent(questionId)}/ai-correction`,
    {
      method: "POST",
      headers: authHeader(token),
      body: JSON.stringify({
        source: "student_requested",
        source_page: options.sourcePage ?? "question_session",
        force_reanalyze: options.forceReanalyze === true,
      }),
      timeoutMs: 45000,
    },
  );
}

export async function getQuestionBankAiRequestPreview(
  token: string,
  questionId: string,
): Promise<QuestionBankAiRequestPreview> {
  return api<QuestionBankAiRequestPreview>(
    `/api/question-bank/questions/${encodeURIComponent(questionId)}/ai-request-preview`,
    { headers: authHeader(token), cache: "no-store", clientCache: false },
  );
}

export async function getQuestionBankAiRequestStatus(
  token: string,
  questionId: string,
  requestId: string,
): Promise<QuestionBankAiRequestStatusResult> {
  return api<QuestionBankAiRequestStatusResult>(
    `/api/question-bank/questions/${encodeURIComponent(questionId)}/ai-correction/${encodeURIComponent(requestId)}`,
    { headers: authHeader(token), cache: "no-store", clientCache: false },
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
