import { api, authHeader } from "../../shared/http";
import type {
  QuestionBankFinalizeResult,
  QuestionBankSession,
  QuestionBankSessionCreatePayload,
  QuestionBankSessionStatus,
} from "./types";

export async function createQuestionBankSession(token: string, payload: QuestionBankSessionCreatePayload): Promise<QuestionBankSession> {
  return api<QuestionBankSession>("/api/question-bank/sessions", { method: "POST", headers: authHeader(token), body: JSON.stringify(payload) });
}

export async function listQuestionBankSessions(
  token: string,
  params: { status?: QuestionBankSessionStatus; limit?: number } = {},
): Promise<QuestionBankSession[]> {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.limit) q.set("limit", String(params.limit));
  return api<QuestionBankSession[]>(
    `/api/question-bank/sessions${q.toString() ? `?${q.toString()}` : ""}`,
    { headers: authHeader(token) },
  );
}

export async function getQuestionBankSession(token: string, sessionId: string): Promise<QuestionBankSession> {
  return api<QuestionBankSession>(`/api/question-bank/sessions/${encodeURIComponent(sessionId)}`, { headers: authHeader(token) });
}

export async function revealQuestionBankSessionResults(
  token: string,
  sessionId: string,
): Promise<QuestionBankSession> {
  return api<QuestionBankSession>(
    `/api/question-bank/sessions/${encodeURIComponent(sessionId)}/reveal-results`,
    { method: "POST", headers: authHeader(token) },
  );
}

export async function finalizeQuestionBankSession(
  token: string,
  sessionId: string,
  options?: { confirm_unanswered?: boolean; confirm_reported_items?: boolean },
): Promise<QuestionBankFinalizeResult> {
  const q = new URLSearchParams({
    confirm_unanswered: options?.confirm_unanswered ? "true" : "false",
    confirm_reported_items: options?.confirm_reported_items ? "true" : "false",
  });
  return api<QuestionBankFinalizeResult>(`/api/question-bank/sessions/${encodeURIComponent(sessionId)}/finalize?${q.toString()}`, { method: "POST", headers: authHeader(token) });
}
