import { api, authHeader } from "../shared/http";
import type { QuestionBankSession } from "./question-bank";
import type { Banca } from "@/lib/facies";

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

// ------------------------------------------------------------- prova alvo v1
//
// Caminho paralelo ao objetivo por edital: o aluno escolhe entre as bancas que
// o banco de questões realmente tem. É o que liga "Foco na banca" enquanto não
// existe edição editorial publicada.

export type StudentTargetExamItem = {
  student_objective_id: string;
  priority: number;
  label: string;
  board_code: string;
  /** A chave que efetivamente personaliza. Nula em declaracao anterior a ela. */
  institution_key: string | null;
  exam_name: string | null;
  exam_date: string | null;
};

export type StudentTargetExam = {
  contract_version: "student-target-exam-v1";
  selection_revision: number;
  has_target_exam: boolean;
  items: StudentTargetExamItem[];
};

export type StudentTargetExamInput = {
  /** Uma das duas e obrigatoria. `institution_key` e a que personaliza. */
  board_code?: string | null;
  institution_key?: string | null;
  exam_name?: string | null;
  exam_date?: string | null;
  /** De onde veio a data, e o que o plano pode fazer com ela.
   *
   *  O backend já aceitava o campo; a tela nunca o mandava, então TODO objetivo
   *  caía no default `"estimated"` e o multiplicador cheio de urgência — que só
   *  vale para `"confirmed"` — nunca disparou em produção.
   *
   *  ⚠️ `"confirmed"` só quando a data vem do EDITAL. Ela dobra o peso de
   *  urgência do objetivo: data digitada pelo aluno, ou vinda de fonte
   *  secundária, continua `"estimated"`. */
  date_status?: "estimated" | "confirmed";
};

/**
 * A facies da banca-alvo, pela chave do objetivo do aluno.
 *
 * Nao passa pelo backend: o dataset e estatico e mora neste mesmo servidor
 * Next. Ver `app/api/facies/banca/[key]/route.ts` para por que existe rota em
 * vez de props de server component.
 *
 * `null` quando a banca nao tem facies publicada -- o dataset so publica quem
 * passa do piso de questoes recentes, entao ha objetivo valido sem leitura. E
 * um estado da tela, nao um erro.
 */
export async function getFaciesDaBanca(institutionKey: string): Promise<Banca | null> {
  const resposta = await fetch(
    `/api/facies/banca/${encodeURIComponent(institutionKey)}`,
    { cache: "no-store" },
  );
  if (resposta.status === 404) return null;
  if (!resposta.ok) throw new Error(`facies_banca_${resposta.status}`);
  return (await resposta.json()) as Banca;
}

export async function getMyTargetExam(token: string): Promise<StudentTargetExam> {
  return api<StudentTargetExam>("/api/objectives/target-exam", {
    headers: authHeader(token),
    cache: "no-store",
    clientCache: false,
  });
}

export async function replaceMyTargetExam(
  token: string,
  items: StudentTargetExamInput[],
  expectedRevision: number | null,
): Promise<StudentTargetExam> {
  return api<StudentTargetExam>("/api/objectives/target-exam", {
    method: "PUT",
    headers: { ...authHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ items, expected_revision: expectedRevision }),
  });
}

export type ObjectivePlanningDateV2 = {
  status: "confirmed" | "estimated" | "retracted" | "not_published";
  precision: "exact" | "window" | null;
  exact_date: string | null;
  window_start: string | null;
  window_end: string | null;
  days_remaining: number | null;
  days_remaining_min: number | null;
  days_remaining_max: number | null;
  explanation: string;
};

export type ObjectiveCatalogItemV2 = {
  planning_focus: {
    kind: "selection_process";
    selection_process_id: string;
    selection_process_name: string;
    edition_id: string;
    edition_label: string;
    label: string;
  };
  destination: {
    institution_id: string;
    institution_name: string;
    program_id: string;
    program_name: string;
    specialty_name: string;
    access_modality: "direct" | "prerequisite" | "mixed" | "unknown";
  };
  participation: {
    status: "estimated" | "confirmed" | "not_participating" | "withdrawn";
    requires_acceptance: boolean;
  };
  availability: "available" | "estimated" | "past" | "withdrawn" | "unavailable";
  selectable: boolean;
  planning_date: ObjectivePlanningDateV2;
  source: {
    source_id: string;
    title: string;
    url: string;
    verified_at: string;
    freshness: "fresh" | "stale";
    revision_id: string;
    revision_version: number;
  };
  editorial_state: "published";
};

export type ObjectiveCatalogSearchV2 = {
  contract_version: "objective-catalog-v2";
  catalog_status: "ready" | "empty" | "stale";
  items: ObjectiveCatalogItemV2[];
};

export type StudentObjectiveV2Input = {
  program_id: string;
  edition_id: string;
  accept_estimated_participation: boolean;
  accept_estimated_date: boolean;
};

export type StudentObjectiveV2 = StudentObjectiveV2Input & {
  student_objective_id: string;
  priority: number;
  status: "active" | "unavailable" | "retracted";
  resolved: ObjectiveCatalogItemV2 | null;
};

export type StudentObjectivesV2 = {
  contract_version: "student-objectives-v2";
  selection_revision: number;
  has_selected_objectives: boolean;
  primary_planning_date: string | null;
  planning_horizon_mode: "exact" | "estimated_window" | "rolling_four_weeks";
  items: StudentObjectiveV2[];
};

export async function searchObjectiveCatalogV2(
  token: string,
  query = "",
  limit = 20,
): Promise<ObjectiveCatalogSearchV2> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (query.trim()) params.set("query", query.trim());
  return api<ObjectiveCatalogSearchV2>(`/api/objectives/catalog/v2/search?${params}`, {
    headers: authHeader(token),
  });
}

export async function requestObjectiveCatalogItem(
  token: string,
  requestedLabel: string,
): Promise<{ request_id: string; status: "open" }> {
  return api("/api/objectives/catalog/v2/requests", {
    method: "POST",
    headers: { ...authHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ requested_label: requestedLabel }),
  });
}

export async function getMyObjectivesV2(token: string): Promise<StudentObjectivesV2> {
  return api<StudentObjectivesV2>("/api/objectives/v2/mine", {
    headers: authHeader(token),
  });
}

export async function replaceMyObjectivesV2(
  token: string,
  items: StudentObjectiveV2Input[],
  expectedRevision: number | null,
): Promise<StudentObjectivesV2> {
  return api<StudentObjectivesV2>("/api/objectives/v2/mine", {
    method: "PUT",
    headers: { ...authHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ items, expected_revision: expectedRevision }),
  });
}

// As "metas adaptativas" (`/api/adaptive-targets/*`) foram removidas: eram o
// segundo sistema de prova alvo, capture-only por desenho, atrás de um flag
// sempre `false`, e o editor correspondente nunca chegou a ser montado em tela.
// A prova alvo do aluno é `TargetExamSelector` → `student_objectives`, que agora
// governa o ranking em todos os modos.

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

export async function saveOnboardingObjectivesV2(
  token: string,
  items: StudentObjectiveV2Input[],
  expectedRevision: number | null,
): Promise<OnboardingState> {
  return api<OnboardingState>("/api/onboarding/objectives/v2", {
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
