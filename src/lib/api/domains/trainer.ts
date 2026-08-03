import { api, authHeader } from "../shared/http";
import type { OperationalTurboOverview } from "./operational";

export type TrainerActionKind =
  | "resume_session"
  | "targeted_practice"
  | "scheduled_topic_practice"
  | "flashcard_review"
  | "simulation"
  | "manual_study"
  | "rest";

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
export type TrainerConfidenceLevel = "low" | "medium" | "high";
export type TrainerPedagogicalConfidence = {
  level: TrainerConfidenceLevel;
  label: string;
  reason: string;
  evidence_count: number;
  session_count: number;
  editorial_coverage_pct: number | null;
  missing_sources: string[];
};
export type TrainerEditorialQuality = {
  state: "reviewed" | "mixed" | "consolidating" | "unknown" | "blocked";
  label: string;
  coverage_pct: number | null;
};

export type TrainerStartPayload = {
  mode?: string | null;
  resolution_mode?: string | null;
  area?: string | null;
  answer_status: string | null;
  only_unanswered?: boolean | null;
  limit?: number | null;
  review_task_id?: string | null;
  knowledge_node_id: string[] | null;
  selection_intent?: string | null;
  selection_policy?: string | null;
  reason_code?: string | null;
};

export type TrainerAction = {
  kind: TrainerActionKind;
  action_id?: string | null;
  title: string;
  rationale: string;
  priority_score: number;
  estimated_minutes: number;
  source_module?: string | null;
  required_capabilitie: string[];
  blocked_reason?: string | null;
  handoff?: Record<string, unknown> | null;
  why_factors: TrainerWhyFactor[];
  outcome_targets: TrainerOutcomeTarget[];
  signals: TrainerSignal[];
  start_payload: TrainerStartPayload | null;
  href: string | null;
  pedagogical_confidence?: TrainerPedagogicalConfidence | null;
  plan_activity_id?: string | null;
  plan_activity_kind?: string | null;
  plan_id?: string | null;
  plan_revision?: number | null;
  plan_policy_version?: string | null;
  selection_policy_version?: string | null;
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
  review_load?: TrainerReviewLoad | null;
};

export type TrainerReviewLoad = {
  topic_tasks_due: number;
  question_practice: number;
  cards_due: number;
  overdue_topic_tasks: number;
  overdue_cards: number;
  estimated_minutes: number;
};

export type TrainerStateSummary = { headline: string; detail: string | null };

export type TrainerEvidence = {
  key: string;
  label: string;
  value: number | string;
  unit: string | null;
  kind: "observed" | "estimated";
  confidence: "low" | "medium" | "high";
  quality_context?: {
    editorial_state: TrainerEditorialQuality["state"];
    editorial_coverage_pct: number | null;
    evidence_count: number;
    session_count: number;
    reasons: string[];
  } | null;
};

export type TrainerOutcome = {
  run_id: string;
  action_kind: string;
  completed_at: string;
  narrative: string;
  evidence: TrainerEvidence[];
  next_step_changed: boolean;
};

export type TrainerPrescription = {
  recommendation_id: string;
  generated_at: string;
  policy_version: string;
  authority_mode: "legacy" | "study_plan";
  plan_id: string | null;
  plan_revision: number | null;
  primary_action: TrainerAction;
  secondary_actions: TrainerAction[];
  state_summary: TrainerStateSummary;
  signals: TrainerSignal[];
  closed_loop: TrainerClosedLoop;
  daily_load: TrainerDailyLoad;
  previous_outcome: TrainerOutcome | null;
  plan_progress: { completed_actions: number; total_actions: number; label: string };
  missing_sources: string[];
};

export type TrainerRecommendationEvent = {
  event_id: string;
  recommendation_id: string;
  event_type: string;
  occurred_at: string;
};

export type TrainerReviewQueueItem = {
  rank: number;
  action: TrainerAction;
  urgency_score: number;
  expected_gain_score: number;
  queue_reason: string;
  expected_result: string;
  editorial_quality: TrainerEditorialQuality;
};

export type TrainerReviewQueue = {
  recommendation_id: string;
  generated_at: string;
  policy_version: string;
  primary_item: TrainerReviewQueueItem | null;
  items: TrainerReviewQueueItem[];
  counts: { total: number; questions: number; cards: number };
  daily_load: TrainerDailyLoad;
  flashcards_overview?: OperationalTurboOverview | null;
  previous_outcome: TrainerOutcome | null;
  missing_sources: string[];
};

export type TrainerDebrief = {
  status: "completed" | "needs_review" | "unavailable";
  question_id: string;
  error_hypothesis: string;
  socratic_question: string;
  essential_concept: string;
  next_micro_action: string;
  confidence: TrainerConfidenceLevel;
  provenance: string;
  ai_disclosure: string;
};

/** The single daily prescription. Per-user, never shared-cached. */
export async function getTrainerPrescription(token: string): Promise<TrainerPrescription> {
  return api<TrainerPrescription>("/api/trainer/prescription/today", {
    headers: authHeader(token),
    cache: "no-store",
  });
}

export async function getTrainerReviewQueue(
  token: string,
  limit = 8,
): Promise<TrainerReviewQueue> {
  return api<TrainerReviewQueue>(`/api/trainer/review-queue?limit=${Math.max(1, Math.min(8, limit))}`, {
    headers: authHeader(token),
    cache: "no-store",
  });
}

export async function createTrainerDebrief(
  token: string,
  runId: string,
  questionId: string,
): Promise<TrainerDebrief> {
  return api<TrainerDebrief>(`/api/trainer/runs/${encodeURIComponent(runId)}/debrief`, {
    method: "POST",
    headers: authHeader(token),
    body: JSON.stringify({ question_id: questionId }),
  });
}

/** Record a lifecycle event for a recommendation (idempotent by event_id). */
export async function recordTrainerRecommendationEvent(
  token: string,
  recommendationId: string,
  event: { event_type: TrainerEventType; event_id?: string; payload?: Record<string, unknown> },
): Promise<TrainerRecommendationEvent> {
  const occurredAt = new Date();
  const sourceModule = String(event.payload?.surface ?? event.payload?.source_module ?? "student");
  const enrichedEvent = {
    ...event,
    payload: {
      contract_version: "student-experience-v1",
      source_module: sourceModule,
      source_ref: recommendationId,
      occurred_at: occurredAt.toISOString(),
      local_day: [
        occurredAt.getFullYear(),
        String(occurredAt.getMonth() + 1).padStart(2, "0"),
        String(occurredAt.getDate()).padStart(2, "0"),
      ].join("-"),
      ...event.payload,
    },
  };
  return api<TrainerRecommendationEvent>(
    `/api/trainer/recommendations/${encodeURIComponent(recommendationId)}/events`,
    {
      method: "POST",
      headers: authHeader(token),
      body: JSON.stringify(enrichedEvent),
    },
  );
}
