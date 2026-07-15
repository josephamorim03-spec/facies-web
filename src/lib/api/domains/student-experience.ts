import { api, authHeader } from "../shared/http";
import type { TrainerAction, TrainerReviewLoad } from "./trainer";

export type StudentMetric = {
  key: string;
  label: string;
  value: number | string | null;
  unit: string;
  definition: string;
  period: "week" | "all" | "now";
  scope: string;
  evidence_kind: "observed" | "estimated";
  confidence: "low" | "medium" | "high";
  generated_at: string;
  source_status: "complete" | "missing" | "stale";
};

export type StudentExperience = {
  contract_version: "student-experience-v1";
  enabled: boolean;
  generated_at: string;
  status: "complete" | "partial" | "stale";
  period: {
    kind: "week" | "all";
    starts_at: string | null;
    ends_at: string | null;
    timezone: string;
  };
  activity: {
    questions_answered: StudentMetric;
    questions_correct: StudentMetric;
    questions_wrong: StudentMetric;
    accuracy_pct: StudentMetric;
    weekly_goal_questions: StudentMetric;
    weekly_progress_pct: StudentMetric;
  };
  review_load: TrainerReviewLoad;
  active_session: {
    session_id: string;
    href: string;
    title: string;
    area: string | null;
    answered_count: number;
    total_questions: number;
    resolution_mode: string;
    updated_at: string;
  } | null;
  next_action: TrainerAction | null;
  evidence: {
    finalized_sessions: number;
    scorable_questions: number;
    editorial_coverage_pct: number | null;
    confidence: "low" | "medium" | "high";
  };
  missing_sources: string[];
};

const CACHE_MS = 10_000;
let cached: { tokenKey: string; period: string; at: number; value: StudentExperience } | null = null;
const inflight = new Map<string, Promise<StudentExperience>>();

export const STUDENT_EXPERIENCE_INVALIDATED_EVENT = "kros:student-experience-invalidated";

export function invalidateStudentExperienceCache(): void {
  cached = null;
  inflight.clear();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(STUDENT_EXPERIENCE_INVALIDATED_EVENT));
  }
}

export async function getStudentExperience(
  token: string,
  period: "week" | "all" = "week",
): Promise<StudentExperience> {
  const tokenKey = token.slice(0, 12);
  if (cached && cached.tokenKey === tokenKey && cached.period === period && Date.now() - cached.at < CACHE_MS) {
    return cached.value;
  }
  const requestKey = `${tokenKey}:${period}`;
  const active = inflight.get(requestKey);
  if (active) return active;
  const request = api<StudentExperience>(`/api/student/experience?period=${period}`, {
    headers: authHeader(token),
    cache: "no-store",
  })
    .then((value) => {
      cached = { tokenKey, period, at: Date.now(), value };
      return value;
    })
    .finally(() => {
      inflight.delete(requestKey);
    });
  inflight.set(requestKey, request);
  return request;
}
