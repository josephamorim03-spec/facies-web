import { api, authHeader } from "../shared/http";

export type TrainerActionKind =
  | "question_block"
  | "scheduled_review"
  | "guided_correction"
  | "flashcard_review"
  | "simulation"
  | "manual_study";

export type TrainerOutcomeTarget = "retention" | "transfer" | "speed" | "calibration";
export type TrainerSignalSeverity = "info" | "warning" | "critical";
export type TrainerEventType =
  | "shown"
  | "started"
  | "completed"
  | "dismissed"
  | "stale"
  | "contested";

export type TrainerWhyFactor = { factor: string; detail: string };
export type TrainerSignal = { key: string; label: string; severity: TrainerSignalSeverity };

export type TrainerStartPayload = {
  mode?: string | null;
  resolution_mode?: string | null;
  area?: string | null;
  answer_status?: string | null;
  only_unanswered?: boolean | null;
  limit?: number | null;
  review_task_id?: string | null;
  knowledge_node_ids?: string[] | null;
  cognitive_mode?: string | null;
};

export type TrainerAction = {
  kind: TrainerActionKind;
  action_id?: string | null;
  title: string;
  rationale: string;
  priority_score: number;
  estimated_minutes: number;
  source_module?: string | null;
  required_capabilities?: string[];
  blocked_reason?: string | null;
  handoff?: Record<string, unknown> | null;
  why_factors: TrainerWhyFactor[];
  outcome_targets: TrainerOutcomeTarget[];
  signals: TrainerSignal[];
  start_payload: TrainerStartPayload | null;
  href: string | null;
};

export type TrainerClosedLoop = {
  measure: string[];
  next_check: string[];
  recalibration_hint: string[];
};

export type TrainerDailyLoad = {
  prescribed_minutes: number;
  cognitive_load: "low" | "moderate" | "high";
  pending_reviews: number;
  recommended_limit_minutes: number;
  overload_alert: boolean;
};

export type TrainerStateSummary = { headline: string; detail: string | null };

export type TrainerPrescription = {
  recommendation_id: string;
  generated_at: string;
  policy_version: string;
  primary_action: TrainerAction;
  secondary_actions: TrainerAction[];
  state_summary: TrainerStateSummary;
  signals: TrainerSignal[];
  closed_loop: TrainerClosedLoop;
  daily_load: TrainerDailyLoad;
  missing_sources: string[];
};

export type TrainerRecommendationEvent = {
  event_id: string;
  recommendation_id: string;
  event_type: string;
  occurred_at: string;
};

/** The single daily prescription. Per-user, never shared-cached. */
export async function getTrainerPrescription(token: string): Promise<TrainerPrescription> {
  return api<TrainerPrescription>("/api/trainer/prescription/today", {
    headers: authHeader(token),
    cache: "no-store",
  });
}

/** Record a lifecycle event for a recommendation (idempotent by event_id). */
export async function recordTrainerRecommendationEvent(
  token: string,
  recommendationId: string,
  event: { event_type: TrainerEventType; event_id?: string; payload?: Record<string, unknown> },
): Promise<TrainerRecommendationEvent> {
  return api<TrainerRecommendationEvent>(
    `/api/trainer/recommendations/${encodeURIComponent(recommendationId)}/events`,
    {
      method: "POST",
      headers: authHeader(token),
      body: JSON.stringify(event),
    },
  );
}
