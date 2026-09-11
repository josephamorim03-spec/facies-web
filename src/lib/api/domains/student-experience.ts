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

/** Um numero que o motor usou, ja formatado pelo servidor. */
export type StudentTodayFactor = {
  key: string;
  label: string;
  /**
   * Vem pronto do servidor de proposito: o cliente nao tem como saber se `0.62`
   * e' razao ou contagem, e adivinhar errado publica um numero falso.
   */
  value: string;
  meaning: string;
};

/** O porque ESTRUTURADO da acao -- o que `rationale` achata numa frase. */
export type StudentTodayExplanation = {
  selected_because: string[];
  factors: StudentTodayFactor[];
  confidence_label: string | null;
  confidence_reason: string | null;
  policy_version: string | null;
};

export type StudentTodayAction = {
  kind: string;
  title: string;
  rationale: string;
  estimated_minutes: number | null;
  href: string;
  cta_label: string;
  source: string;
  priority_reason: string;
  confidence: "low" | "medium" | "high";
  /** Grande area, quando a origem sabe qual e. Nulo = nao ha area. */
  area: string | null;
  /**
   * Os numeros por tras da frase. Ausente quando a origem nao os produz --
   * objeto vazio se leria como "sem motivo", que e' diferente de "sem dado".
   */
  explanation?: StudentTodayExplanation | null;
  execution?: {
    kind: "trainer_action" | "resume_session" | "href";
    recommendation_id: string | null;
    action_id: string | null;
    session_id: string | null;
    href: string | null;
  } | null;
  agenda_occurrence_id?: string | null;
};

export type StudentAgendaItem = {
  occurrence_id: string;
  date: string;
  source: "study_plan" | "review_queue" | "study_history" | "calendar" | "question_bank" | "flashcards";
  kind:
    | "plan_activity"
    | "review_task"
    | "directed_study"
    | "calendar_event"
    | "question_session"
    | "flashcard_review";
  status: "scheduled" | "pending" | "in_progress" | "done" | "overdue" | "skipped";
  title: string;
  area: string | null;
  rationale: string | null;
  href: string | null;
  estimated_minutes: number;
  expected_questions: number;
  completed_questions: number;
  plan_activity_id: string | null;
  review_task_id: string | null;
  directed_study_id: string | null;
  session_id: string | null;
  event_id: string | null;
  capabilities: {
    can_start: boolean;
    can_reschedule: boolean;
    can_edit: boolean;
    can_delete: boolean;
  };
};

export type StudentAgendaDay = {
  date: string;
  is_today: boolean;
  planned_minutes: number;
  planned_questions: number;
  recommended_questions: number | null;
  completed_items: number;
  total_items: number;
  overdue_items: number;
  overloaded: boolean;
  items: StudentAgendaItem[];
};

export type StudentAgenda = {
  contract_version: "student-agenda-v1";
  generated_at: string;
  status: "complete" | "partial" | "stale";
  timezone: string;
  today: string;
  date_from: string;
  date_to: string;
  summary: {
    completed_items: number;
    total_items: number;
    overdue_items: number;
    questions_done_week: number;
    weekly_goal_questions: number;
    weekly_progress_pct: number | null;
  };
  overdue: StudentAgendaItem[];
  days: StudentAgendaDay[];
  missing_sources: string[];
};

export type StudentToday = {
  contract_version: "student-today-v1";
  generated_at: string;
  status: "complete" | "partial" | "stale";
  primary_action: StudentTodayAction;
  backup_actions: StudentTodayAction[];
  today_load: {
    label: "leve" | "adequada" | "cheia" | "excessiva";
    estimated_minutes: number;
    recommended_limit_minutes: number;
    overload_alert: boolean;
    short_message: string;
  };
  schedule_preview: {
    date: string;
    items: Array<{
      task_id: string;
      title: string;
      area: string | null;
      due_date: string;
      expected_questions: number;
      is_overdue: boolean;
      is_critical: boolean;
      href: string;
    }>;
    overdue_count: number;
    hidden_count: number;
    reschedule_recommended: boolean;
  };
  review_snapshot: {
    pending_reviews: number;
    overdue_reviews: number;
    cards_due: number;
    estimated_minutes: number;
  };
  progress_snapshot: {
    questions_done_week: number;
    weekly_goal_questions: number;
    weekly_progress_pct: number | null;
    accuracy_pct: number | null;
  };
  details: {
    active_session: StudentExperience["active_session"];
    trainer_action: TrainerAction | null;
    secondary_actions: TrainerAction[];
    schedule_suggestions_count: number;
    evidence_confidence: "low" | "medium" | "high";
  };
  /**
   * De onde veio o tamanho do dia — e o que foi preciso supor.
   *
   * Ja' viajava no contrato (`TrainerEffortBudgetOut`, visivel no
   * `schema.d.ts`) e este tipo escrito a mao nao o declarava, entao nenhuma
   * tela conseguia ler a PROCEDENCIA da taxa sem erro de compilacao. Sem ela,
   * "cerca de 175 questoes" e' um numero sem fonte: o produto nao sabe dizer
   * se mediu o aluno ou se supos 2 minutos.
   *
   * Sao os quatro campos que as telas usam; o contrato tem mais.
   */
  effort_budget?: {
    usable_minutes: number;
    question_capacity: number;
    minutes_per_question: number;
    /** `observed` = ritmo medido deste aluno; `constant` = fallback. */
    pace_source: "observed" | "constant";
  } | null;
  missing_sources: string[];
};

/**
 * A leitura diária da evolução (`student-evolution-v1`).
 *
 * Só os campos que a tela usa; o contrato tem mais (sono, energia, associações).
 * ⚠️ A granularidade é do SERVIDOR, e ele só devolve dia a dia até 31 dias
 * (`DAILY_MAX_DAYS`) — pedir 6 semanas devolve baldes semanais, e o mosaico de
 * dias viraria um mosaico de semanas sem avisar.
 */
export type EvolutionPoint = {
  bucket: string;
  observed_minutes: number | null;
  on_call_days: number;
  covered_days: number;
};

export type StudentEvolution = {
  contract_version: "student-evolution-v1";
  window: { range_key: string; date_from: string; date_to: string; granularity: string };
  points: EvolutionPoint[];
};

export async function getStudentEvolution(
  token: string,
  range = "4w",
): Promise<StudentEvolution> {
  return api<StudentEvolution>(`/api/student/evolution?range=${encodeURIComponent(range)}`, {
    headers: authHeader(token),
  });
}

export type StudentSurfaceHome = {
  contract_version:
    | "question-bank-practice-home-v1"
    | "student-review-home-v1"
    | "student-track-v1"
    | "student-plan-v1";
  generated_at: string;
  status: "complete" | "partial" | "stale";
  primary_action: StudentTodayAction;
  backup_actions: StudentTodayAction[];
  load_note: StudentToday["today_load"] | null;
  insight: {
    title: string;
    message: string;
    severity: "neutral" | "positive" | "attention" | "critical";
    action_kind: string;
    href: string;
    confidence: "low" | "medium" | "high";
  } | null;
  support_metric: {
    label: string;
    value: number | string | null;
    unit: string;
    period: "week" | "all" | "now";
    source: string;
    interpretation: string;
  } | null;
  deep_links: Array<{
    label: string;
    href: string;
    reason: string;
  }>;
  data_quality: "sufficient" | "limited" | "partial" | "stale";
  goal_status: {
    weekly_goal: number;
    weekly_progress_pct: number | null;
    load_label: "leve" | "adequada" | "cheia" | "excessiva";
    overload_alert: boolean;
    recommended_action: string;
  } | null;
  details: Record<string, unknown>;
  missing_sources: string[];
};

const CACHE_MS = 10_000;
let cached: { tokenKey: string; period: string; at: number; value: StudentExperience } | null = null;
const inflight = new Map<string, Promise<StudentExperience>>();
let todayCached: { tokenKey: string; at: number; value: StudentToday } | null = null;
const todayInflight = new Map<string, Promise<StudentToday>>();
const agendaCache = new Map<string, { at: number; value: StudentAgenda }>();
const agendaInflight = new Map<string, Promise<StudentAgenda>>();

export const STUDENT_EXPERIENCE_INVALIDATED_EVENT = "kros:student-experience-invalidated";

export function invalidateStudentExperienceCache(): void {
  cached = null;
  todayCached = null;
  inflight.clear();
  todayInflight.clear();
  agendaCache.clear();
  agendaInflight.clear();
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

export async function getStudentToday(token: string): Promise<StudentToday> {
  const tokenKey = token.slice(0, 12);
  if (todayCached && todayCached.tokenKey === tokenKey && Date.now() - todayCached.at < CACHE_MS) {
    return todayCached.value;
  }
  const active = todayInflight.get(tokenKey);
  if (active) return active;
  const request = api<StudentToday>("/api/student/today", {
    headers: authHeader(token),
    cache: "no-store",
  })
    .then((value) => {
      todayCached = { tokenKey, at: Date.now(), value };
      return value;
    })
    .finally(() => {
      todayInflight.delete(tokenKey);
    });
  todayInflight.set(tokenKey, request);
  return request;
}

export async function getStudentAgenda(
  token: string,
  dateFrom: string,
  dateTo: string,
): Promise<StudentAgenda> {
  const tokenKey = token.slice(0, 12);
  const requestKey = `${tokenKey}:${dateFrom}:${dateTo}`;
  const cachedAgenda = agendaCache.get(requestKey);
  if (cachedAgenda && Date.now() - cachedAgenda.at < CACHE_MS) return cachedAgenda.value;
  const active = agendaInflight.get(requestKey);
  if (active) return active;
  const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
  const request = api<StudentAgenda>(`/api/student/agenda?${params.toString()}`, {
    headers: authHeader(token),
    cache: "no-store",
  })
    .then((value) => {
      agendaCache.set(requestKey, { at: Date.now(), value });
      return value;
    })
    .finally(() => agendaInflight.delete(requestKey));
  agendaInflight.set(requestKey, request);
  return request;
}

export async function getStudentReviewHome(token: string): Promise<StudentSurfaceHome> {
  return api<StudentSurfaceHome>("/api/student/review-home", {
    headers: authHeader(token),
    cache: "no-store",
  });
}

export async function getStudentTrack(token: string): Promise<StudentSurfaceHome> {
  return api<StudentSurfaceHome>("/api/student/track", {
    headers: authHeader(token),
    cache: "no-store",
  });
}

export async function getStudentPlan(token: string): Promise<StudentSurfaceHome> {
  return api<StudentSurfaceHome>("/api/student/plan", {
    headers: authHeader(token),
    cache: "no-store",
  });
}
