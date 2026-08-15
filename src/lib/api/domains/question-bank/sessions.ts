import { api, authHeader } from "../../shared/http";
import type {
  KrosPreview,
  QuestionBankFinalizeResult,
  QuestionBankReasoningReview,
  QuestionBankFeedbackRevealPolicy,
  QuestionPostAnswerReflection,
  QuestionBankSession,
  QuestionBankSessionCreatePayload,
  QuestionBankSessionDeleteResult,
  QuestionBankSessionStatus,
} from "./types";
import { invalidateStudentExperienceCache } from "../student-experience";

export async function createQuestionBankSession(token: string, payload: QuestionBankSessionCreatePayload): Promise<QuestionBankSession> {
  return api<QuestionBankSession>("/api/question-bank/sessions", { method: "POST", headers: authHeader(token), body: JSON.stringify(payload) });
}

/**
 * Monta a prova no servidor, devolve só a composição agregada e descarta a
 * seleção. Roda a mesma pipeline do create — é o que garante que a prévia não
 * minta sobre a prova. Aceita `signal` porque o lobby refaz a chamada a cada
 * ajuste da barra e precisa abortar a anterior.
 */
export async function previewKros(
  token: string,
  payload: QuestionBankSessionCreatePayload,
  signal?: AbortSignal,
): Promise<KrosPreview> {
  return api<KrosPreview>("/api/question-bank/kros/preview", {
    method: "POST",
    headers: authHeader(token),
    body: JSON.stringify(payload),
    signal,
  });
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

export async function setQuestionBankSessionFeedbackPolicy(
  token: string,
  sessionId: string,
  feedbackRevealPolicy: QuestionBankFeedbackRevealPolicy,
): Promise<QuestionBankSession> {
  return api<QuestionBankSession>(
    `/api/question-bank/sessions/${encodeURIComponent(sessionId)}/feedback-policy`,
    {
      method: "PATCH",
      headers: authHeader(token),
      body: JSON.stringify({ feedback_reveal_policy: feedbackRevealPolicy }),
    },
  );
}

export async function deleteQuestionBankSession(
  token: string,
  sessionId: string,
): Promise<QuestionBankSessionDeleteResult> {
  const result = await api<QuestionBankSessionDeleteResult>(
    `/api/question-bank/sessions/${encodeURIComponent(sessionId)}`,
    { method: "DELETE", headers: authHeader(token) },
  );
  invalidateStudentExperienceCache();
  return result;
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

export async function revealAllQuestionBankFeedback(
  token: string,
  sessionId: string,
): Promise<QuestionBankSession> {
  return api<QuestionBankSession>(
    `/api/question-bank/sessions/${encodeURIComponent(sessionId)}/feedback/reveal-all`,
    { method: "POST", headers: authHeader(token) },
  );
}

export async function revealQuestionBankItemFeedback(
  token: string,
  sessionId: string,
  position: number,
): Promise<QuestionBankSession> {
  return api<QuestionBankSession>(
    `/api/question-bank/sessions/${encodeURIComponent(sessionId)}/items/${position}/feedback/reveal`,
    { method: "POST", headers: authHeader(token) },
  );
}

export async function getQuestionBankReasoningReview(
  token: string,
  sessionId: string,
  position: number,
): Promise<QuestionBankReasoningReview> {
  return api<QuestionBankReasoningReview>(
    `/api/question-bank/sessions/${encodeURIComponent(sessionId)}/items/${position}/reasoning-review`,
    { headers: authHeader(token), cache: "no-store", clientCache: false },
  );
}

export async function answerQuestionBankReasoningCheckpoint(
  token: string,
  sessionId: string,
  position: number,
  body: { checkpoint_key: string; response_value: "yes" | "partial" | "no" | "unsure" },
  idempotencyKey: string,
): Promise<QuestionBankReasoningReview> {
  return api<QuestionBankReasoningReview>(
    `/api/question-bank/sessions/${encodeURIComponent(sessionId)}/items/${position}/reasoning-review/responses`,
    {
      method: "POST",
      headers: { ...authHeader(token), "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(body),
    },
  );
}

export async function attributeQuestionBankReasoningReview(
  token: string,
  sessionId: string,
  position: number,
  attribution: "inattention_to_command" | "marking_error" | "changed_correct_answer" | "guess" | "unsure",
  idempotencyKey: string,
): Promise<QuestionBankSession> {
  return api<QuestionBankSession>(
    `/api/question-bank/sessions/${encodeURIComponent(sessionId)}/items/${position}/reasoning-review/attribution`,
    {
      method: "POST",
      headers: { ...authHeader(token), "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ attribution }),
    },
  );
}

export type ConfidenceRatingInput = {
  position: number;
  confidence_self_rating: number;
  event_id?: string;
};

/** Pre-reveal confidence (Fase 3). Does not change answers. */
export async function postConfidenceReview(
  token: string,
  sessionId: string,
  body: { review_id: string; ratings: ConfidenceRatingInput[] },
): Promise<QuestionBankSession> {
  return api<QuestionBankSession>(
    `/api/question-bank/sessions/${encodeURIComponent(sessionId)}/confidence-review`,
    { method: "POST", headers: authHeader(token), body: JSON.stringify(body) },
  );
}

export async function recordQuestionBankPostAnswerReflection(
  token: string,
  sessionId: string,
  position: number,
  reflection: QuestionPostAnswerReflection,
): Promise<QuestionBankSession> {
  return api<QuestionBankSession>(
    `/api/question-bank/sessions/${encodeURIComponent(sessionId)}/items/${encodeURIComponent(String(position))}/reflection`,
    {
      method: "POST",
      headers: authHeader(token),
      body: JSON.stringify({ reflection }),
      cache: "no-store",
      clientCache: false,
    },
  );
}

export async function finalizeQuestionBankSession(
  token: string,
  sessionId: string,
  option: { confirm_unanswered?: boolean; confirm_reported_items?: boolean },
): Promise<QuestionBankFinalizeResult> {
  const q = new URLSearchParams({
    confirm_unanswered: option.confirm_unanswered ? "true" : "false",
    confirm_reported_items: option.confirm_reported_items ? "true" : "false",
  });
  const result = await api<QuestionBankFinalizeResult>(`/api/question-bank/sessions/${encodeURIComponent(sessionId)}/finalize?${q.toString()}`, { method: "POST", headers: authHeader(token) });
  invalidateStudentExperienceCache();
  return result;
}
