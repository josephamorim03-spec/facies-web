import { api, authHeader } from "../shared/http";
import type { QuestionBankSession } from "./question-bank";

// ---------------------------------------------------------------- objetivos

export type ObjectiveDateStatus = "estimated" | "confirmed";

export type StudentObjective = {
  student_objective_id: string;
  priority: number;
  label: string;
  board_code: string;
  exam_name: string | null;
  exam_date: string | null;
  date_status: ObjectiveDateStatus;
  program_id: string | null;
  edition_id: string | null;
};

export type StudentObjectives = {
  contract_version: "student-objectives-v1";
  selection_revision: number;
  has_selected_objectives: boolean;
  items: StudentObjective[];
};

export type StudentObjectiveInput = {
  board_code: string;
  label?: string | null;
  exam_name?: string | null;
  exam_date?: string | null;
  date_status: ObjectiveDateStatus;
};

export async function getMyObjectives(token: string): Promise<StudentObjectives> {
  return api<StudentObjectives>("/api/objectives/mine", { headers: authHeader(token) });
}

export async function replaceMyObjectives(
  token: string,
  items: StudentObjectiveInput[],
  expectedRevision: number | null,
): Promise<StudentObjectives> {
  return api<StudentObjectives>("/api/objectives/mine", {
    method: "PUT",
    headers: { ...authHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ items, expected_revision: expectedRevision }),
  });
}

// --------------------------------------------------------------- onboarding

export type OnboardingStep = "objectives" | "routine" | "capacity" | "ready";

export type OnboardingState = {
  contract_version: "student-onboarding-v1";
  state: string;
  next_step: OnboardingStep;
  completed_steps: string[];
  has_selected_objectives: boolean;
  /** Revisão do conjunto de objetivos, para substituição atômica. */
  objectives_revision: number;
  has_routine: boolean;
  has_availability: boolean;
  weekly_goal_questions: number;
  /** Chave "0".."6" seguindo date.weekday(): 0=segunda, 6=domingo. */
  study_availability: Record<string, number>;
  completed_at: string | null;
};

export type RoutineDayInput = {
  weekday: number;
  label?: string;
  duration_hours: number;
  kind?: "shift" | "work" | "other";
};

export async function getOnboarding(token: string): Promise<OnboardingState> {
  return api<OnboardingState>("/api/onboarding", { headers: authHeader(token) });
}

export async function saveOnboardingObjectives(
  token: string,
  items: StudentObjectiveInput[],
  expectedRevision: number | null,
): Promise<OnboardingState> {
  return api<OnboardingState>("/api/onboarding/objectives", {
    method: "PUT",
    headers: { ...authHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ items, expected_revision: expectedRevision }),
  });
}

export async function saveOnboardingRoutine(
  token: string,
  days: RoutineDayInput[],
  options?: { shift_12h_capacity?: number | null; shift_24h_capacity?: number | null },
): Promise<OnboardingState> {
  return api<OnboardingState>("/api/onboarding/routine", {
    method: "PUT",
    headers: { ...authHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ days, ...(options ?? {}) }),
  });
}

export async function saveOnboardingCapacity(
  token: string,
  studyAvailability: Record<string, number>,
  weeklyGoalQuestion: number | null = null,
): Promise<OnboardingState> {
  return api<OnboardingState>("/api/onboarding/capacity", {
    method: "PUT",
    headers: { ...authHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({
      study_availability: studyAvailability,
      weekly_goal_questions: weeklyGoalQuestion ?? null,
    }),
  });
}

export async function completeOnboarding(token: string): Promise<OnboardingState> {
  return api<OnboardingState>("/api/onboarding/complete", {
    method: "POST",
    headers: authHeader(token),
  });
}

// -------------------------------------------------------------------- plano

export type StudyActivityKind =
  | "diagnostic_kros"
  | "topic_practice"
  | "multi_topic_simulado"
  | "adaptive_simulado"
  | "dna_drill"
  | "review"
  | "rest";

export type StudyActivityStatus =
  | "pending"
  | "started"
  | "done"
  | "skipped"
  | "rescheduled"
  | "expired";

export type StudyDifficultyClass = "leve" | "padrao" | "critico";
/**
 * Eixo do perfil do aluno (`arquitetura.md` §14). Os outros dois eixos —
 * item e algoritmo — são independentes; `calibrado` pertence ao do item e
 * nunca é aplicado ao perfil.
 */
export type StudyPlanEvidenceLevel =
  | "inicial"
  | "adaptado_por_evidencias"
  | "alta_confianca";

export type StudyChangeType =
  | "added"
  | "kept"
  | "moved"
  | "resized"
  | "removed"
  | "unscheduled";

export type StudyLaunchStatus =
  | "launched"
  | "launched_with_fallback"
  | "unavailable"
  | "requires_regeneration";

export type StudyFallbackReason =
  | "insufficient_candidates"
  | "stratification_failed"
  | "catalog_version_changed"
  | "objective_changed"
  | "availability_changed"
  | "policy_version_changed"
  | "review_task_unavailable"
  | "invalid_recipe_version"
  | "exam_already_occurred";

/** O que destravaria uma atividade que não coube na rotina. */
export type RecommendedWindow = {
  required_minutes: number;
  largest_day_minutes: number;
  missing_minutes: number;
};

export type StudyPlanActivity = {
  activity_id: string;
  /** Nulo quando a atividade não coube — ver `unscheduled_reason`. */
  scheduled_date: string | null;
  slot_order: number;
  kind: StudyActivityKind;
  title: string;
  difficulty_class: StudyDifficultyClass;
  estimated_minutes: number;
  estimated_questions: number;
  status: StudyActivityStatus;
  locked: boolean;
  session_id: string | null;
  review_task_id: string | null;
  observed_minutes: number | null;
  observed_questions: number | null;
  completed_at: string | null;
  change_type: StudyChangeType;
  unscheduled_reason: string | null;
  recommended_window: RecommendedWindow | null;
  rationale: Record<string, unknown>;
};

export type StudyPlan = {
  contract_version: "study-plan-v1";
  plan_id: string;
  revision: number;
  policy_version: string;
  evidence_level: StudyPlanEvidenceLevel;
  horizon_start: string;
  horizon_end: string;
  generated_at: string;
  objectives: Array<Record<string, unknown>>;
  explanation: Record<string, unknown>;
  activities: StudyPlanActivity[];
};

export type StudyPlanActivityExplanation = {
  contract_version: "study-plan-v1";
  activity_id: string;
  title: string;
  policy_version: string;
  intervention: string | null;
  selected_because: string[];
  factors: Record<string, unknown>;
};

export async function getCurrentPlan(token: string): Promise<StudyPlan> {
  return api<StudyPlan>("/api/plan/current", { headers: authHeader(token) });
}

export async function regeneratePlan(token: string): Promise<StudyPlan> {
  return api<StudyPlan>("/api/plan/regenerate", {
    method: "POST",
    headers: authHeader(token),
  });
}

export async function listPlanActivities(
  token: string,
  params?: { date_from?: string; date_to?: string },
): Promise<{ items: StudyPlanActivity[] }> {
  const search = new URLSearchParams();
  if (params?.date_from) search.set("date_from", params.date_from);
  if (params?.date_to) search.set("date_to", params.date_to);
  const qs = search.toString();
  return api<{ items: StudyPlanActivity[] }>(`/api/plan/activities${qs ? `?${qs}` : ""}`, {
    headers: authHeader(token),
  });
}

/**
 * Resultado do início — nunca só a sessão.
 *
 * Se `launch_status` for `launched_with_fallback`, o aluno recebeu algo
 * diferente do prometido e precisa saber por quê.
 */
export type StudyPlanActivityLaunch = {
  contract_version: "study-plan-v1";
  launch_status: StudyLaunchStatus;
  fallback_reason: StudyFallbackReason | null;
  session: QuestionBankSession | null;
};

export async function startPlanActivity(
  token: string,
  activityId: string,
): Promise<StudyPlanActivityLaunch> {
  return api<StudyPlanActivityLaunch>(`/api/plan/activities/${activityId}/start`, {
    method: "POST",
    headers: authHeader(token),
    // Montar um simulado de 100 questões estratificado por área faz várias
    // consultas ao banco; o default de 30s é curto demais aqui.
    timeoutMs: 90000,
  });
}

export async function patchPlanActivity(
  token: string,
  activityId: string,
  patch: {
    status?: "pending" | "skipped" | "rescheduled";
    scheduled_date?: string;
    locked?: boolean;
    estimated_questions?: number;
  },
): Promise<StudyPlanActivity> {
  return api<StudyPlanActivity>(`/api/plan/activities/${activityId}`, {
    method: "PATCH",
    headers: { ...authHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

export async function getPlanActivityExplanation(
  token: string,
  activityId: string,
): Promise<StudyPlanActivityExplanation> {
  return api<StudyPlanActivityExplanation>(
    `/api/plan/activities/${activityId}/explanation`,
    { headers: authHeader(token) },
  );
}
