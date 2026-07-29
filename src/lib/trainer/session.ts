import {
  createQuestionBankSession,
  recordTrainerRecommendationEvent,
  type QuestionBankSessionCreatePayload,
  type TrainerAction,
} from "@/lib/api";

// Structural subset used by the canonical Trainer action payload.
type SessionStartFields = {
  mode?: string | null;
  resolution_mode?: string | null;
  area?: string | null;
  answer_status?: string | null;
  only_unanswered?: boolean | null;
  limit?: number | null;
  review_task_id?: string | null;
  knowledge_node_ids?: string[] | null;
};

/**
 * Single source of truth mapping a trainer `start_payload` to a question-bank
 * session-create payload. `review_task_id` keeps scheduled topic practice
 * constrained to the task selected by the cronograma.
 */
export function buildSessionCreateFromTrainerPayload(
  startPayload: SessionStartFields | null | undefined,
  opts?: { performedAt?: string },
): QuestionBankSessionCreatePayload {
  const sp = startPayload ?? {};
  const payload: QuestionBankSessionCreatePayload = {
    mode: (sp.mode as QuestionBankSessionCreatePayload["mode"]) ?? "adaptive",
    resolution_mode:
      (sp.resolution_mode as QuestionBankSessionCreatePayload["resolution_mode"]) ?? "training",
  };
  if (sp.area) payload.area = sp.area;
  if (sp.answer_status != null) {
    payload.answer_status = sp.answer_status as QuestionBankSessionCreatePayload["answer_status"];
  }
  if (sp.only_unanswered != null) payload.only_unanswered = sp.only_unanswered;
  if (typeof sp.limit === "number") payload.limit = sp.limit;
  if (sp.review_task_id) payload.review_task_id = sp.review_task_id;
  if (sp.knowledge_node_ids && sp.knowledge_node_ids.length > 0) {
    payload.knowledge_node_ids = sp.knowledge_node_ids;
  }
  if (opts?.performedAt) payload.performed_at = opts.performedAt;
  return payload;
}

/**
 * Create a question-bank session from a trainer action, record `started` with
 * the real `session_id` (best-effort — never blocks the student), and return the
 * session id. Used for targeted and scheduled topic practice.
 */
export async function startTrainerQuestionSession(params: {
  token: string;
  recommendationId: string;
  action: TrainerAction;
  sourcePage: string;
  performedAt?: string;
}): Promise<string> {
  const { token, recommendationId, action, sourcePage, performedAt } = params;
  const payload = buildSessionCreateFromTrainerPayload(action.start_payload, { performedAt });
  const created = await createQuestionBankSession(token, payload);
  // Fire-and-forget: a failed event must not block the student's action.
  void recordTrainerRecommendationEvent(token, recommendationId, {
    event_type: "started",
    event_id: `started:${recommendationId}:${sourcePage}:${created.session_id}`,
    payload: {
      source_page: sourcePage,
      action_kind: action.kind,
      source_result_ref: { session_id: created.session_id },
    },
  }).catch(() => null);
  return created.session_id;
}

/**
 * Append the trainer handoff (`rec`/`src`) to an action href so the destination
 * page can record `started` when the activity actually begins.
 */
export function withTrainerHandoff(
  href: string,
  recommendationId: string,
  sourcePage: string,
  actionId?: string | null,
): string {
  const sep = href.includes("?") ? "&" : "?";
  const action = actionId ? `&act=${encodeURIComponent(actionId)}` : "";
  return `${href}${sep}rec=${encodeURIComponent(recommendationId)}&src=${encodeURIComponent(sourcePage)}${action}`;
}
