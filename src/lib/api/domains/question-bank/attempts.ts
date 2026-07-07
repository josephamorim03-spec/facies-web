import { api, authHeader } from "../../shared/http";
import type {
  QuestionBankGuidedReview,
  QuestionBankGuidedReviewValue,
  QuestionBankOption,
  QuestionBankSession,
  QuestionBankStudentEventPayload,
} from "./types";

export async function recordQuestionBankAttempt(
  token: string,
  sessionId: string,
  position: number,
  payload: {
    selected_option: QuestionBankOption;
    time_ms?: number | null;
    doubtful?: boolean;
    confidence_self_rating?: number | null;
    eliminated_options?: QuestionBankOption[] | null;
  },
): Promise<QuestionBankSession> {
  return api<QuestionBankSession>(`/api/question-bank/sessions/${encodeURIComponent(sessionId)}/items/${position}/attempt`, { method: "PUT", headers: authHeader(token), body: JSON.stringify(payload) });
}

export async function recordQuestionBankEvents(
  token: string,
  sessionId: string,
  position: number,
  events: QuestionBankStudentEventPayload[],
): Promise<{ events: Array<{ event_id: string; event_type: string; question_id: string; position: number | null; occurred_at: string }> }> {
  return api<{ events: Array<{ event_id: string; event_type: string; question_id: string; position: number | null; occurred_at: string }> }>(
    `/api/question-bank/sessions/${encodeURIComponent(sessionId)}/items/${position}/events`,
    { method: "POST", headers: authHeader(token), body: JSON.stringify({ events }) },
  );
}

export async function getQuestionBankGuidedReview(
  token: string,
  sessionId: string,
  position: number,
): Promise<QuestionBankGuidedReview> {
  return api<QuestionBankGuidedReview>(
    `/api/question-bank/sessions/${encodeURIComponent(sessionId)}/items/${position}/guided-review`,
    { headers: authHeader(token) },
  );
}

export async function submitQuestionBankGuidedReview(
  token: string,
  sessionId: string,
  position: number,
  payload: {
    event_id?: string | null;
    responses: Array<{
      checkpoint_key: string;
      response_value: QuestionBankGuidedReviewValue;
      confidence_self_rating?: number | null;
      free_text?: string | null;
    }>;
    free_text?: string | null;
  },
): Promise<{ response_ids: string[]; session: QuestionBankSession; competency_events: Record<string, unknown>[] }> {
  return api<{ response_ids: string[]; session: QuestionBankSession; competency_events: Record<string, unknown>[] }>(
    `/api/question-bank/sessions/${encodeURIComponent(sessionId)}/items/${position}/guided-review`,
    { method: "POST", headers: authHeader(token), body: JSON.stringify(payload) },
  );
}

export async function recordQuestionBankCorrection(
  token: string,
  sessionId: string,
  position: number,
  payload: { prompt?: string | null; response_value: string; confidence_delta?: number; metadata?: Record<string, unknown> },
): Promise<{ response_id: string; session: QuestionBankSession }> {
  return api<{ response_id: string; session: QuestionBankSession }>(`/api/question-bank/sessions/${encodeURIComponent(sessionId)}/items/${position}/correction`, { method: "POST", headers: authHeader(token), body: JSON.stringify(payload) });
}
