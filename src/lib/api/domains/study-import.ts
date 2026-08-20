import { api, authHeader } from "../shared/http";
import { invalidateStudentExperienceCache } from "./student-experience";
import type { FsrsReviewRating, StudyKind, FullExamType } from "../types";

// ── Study Import Types ───────────────────────────────────────────

export type { StudyKind, FullExamType };
export type ImportSessionStatus = "active" | "finalized" | "invalidated";
export type ImportQuestionOption = "A" | "B" | "C" | "D" | "E";

export type StudyImportQuestionState = {
  selected_option: ImportQuestionOption | null;
  eliminated_options: ImportQuestionOption[];
  doubtful: boolean;
  answered: boolean;
};

export type StudyImportQuestion = {
  question_number: number;
  stem: string;
  options: Record<ImportQuestionOption, string>;
  is_annulled: boolean;
  has_image: boolean;
  image_attachment_refs: string[];
  option_image_attachment_refs: Partial<Record<ImportQuestionOption, string[]>>;
  image_descriptions: string[];
  state: StudyImportQuestionState;
  correct_answer: ImportQuestionOption | null;
};

export type StudyImportQuestionPage = {
  items: StudyImportQuestion[];
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  only_unanswered: boolean;
};

export type StudyImportSession = {
  session_id: string;
  status: ImportSessionStatus;
  study_kind: StudyKind;
  area: string | null;
  theme: string | null;
  subtheme: string | null;
  full_exam_name: string | null;
  full_exam_year: number | null;
  full_exam_type: FullExamType | null;
  user_weight: number;
  performed_at: string;
  source_attachment_ref: string;
  parser_model: string | null;
  total_questions: number;
  question_numbers: number[];
  answered_count: number;
  unanswered_count: number;
  unanswered_question_numbers: number[];
  doubtful_count: number;
  created_at: string;
  updated_at: string;
  finalized_at: string | null;
  directed_study_id: string | null;
  review_task_id: string | null;
  detected_metadata?: {
    exam_name?: string | null;
    year?: number | null;
    institution?: string | null;
    board_code?: string | null;
    area?: string | null;
  } | null;
};

export type BackgroundJobStatus = "queued" | "running" | "succeeded" | "failed";

export type BackgroundJobAccepted = {
  job_id: string;
  status_url: string;
  status: BackgroundJobStatus;
};

export type BackgroundJob = {
  job_id: string;
  type: string;
  status: BackgroundJobStatus;
  progress: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

export type StudyImportSessionCreateResult = StudyImportSession | BackgroundJobAccepted;

export type WrongQuestionSummary = {
  question_number: number;
  stem: string;
  options: Record<string, string>;
  marked_option: string | null;
  correct_option: string | null;
};

export type ReviewTask = {
  task_id: string;
  user_id: string;
  area: string;
  theme: string;
  subtheme: string | null;
  source_study_id: string;
  due_date: string;
  ideal_due_date: string;
  due_at: string;
  ideal_due_at: string;
  is_critical: boolean;
  is_overdue: boolean;
  status: string;
  expected_questions: number;
  priority_score: number;
  knowledge_node_id: string | null;
  node_mastery: number | null;
  node_retention: number | null;
  node_volatility: number | null;
  at_risk: boolean;
  question_practice_count: number;
};

export type ReviewAgenda = {
  tasks: ReviewTask[];
  question_practice_total: number;
  generated_at: string;
};

export type FinalizationResult = {
  study_id: string;
  created_tasks: ReviewTask[];
  total_questions: number;
  correct_questions: number;
  wrong_question_summaries: WrongQuestionSummary[];
};

export type DirectedStudyOut = {
  study_id: string;
  created_tasks: ReviewTask[];
};

export type QuestionOverrideResult = {
  session_id: string;
  question_number: number;
  override_type: "aceitar_ia" | "anulada" | null;
  updated_total: number;
  updated_correct: number;
};

export type SessionOverridesResult = {
  session_id: string;
  overrides: Record<number, "aceitar_ia" | "anulada">;
  updated_total: number;
  updated_correct: number;
};

export type DirectedStudyListItem = {
  study_id: string;
  area: string;
  theme: string;
  subtheme: string | null;
  total_questions: number;
  correct_questions: number;
  user_weight: number;
  performed_at: string;
  created_at: string;
  accuracy: number;
  is_review: boolean;
  fsrs_rating: FsrsReviewRating | null;
  study_kind: StudyKind;
  full_exam_name: string | null;
  full_exam_year: number | null;
  full_exam_type: FullExamType | null;
  origin_review_task_id: string | null;
  import_session_id: string | null;
};

export type DirectedStudyEditImpactPreview = {
  study_id: string;
  is_review: boolean;
  total_questions_before: number;
  correct_questions_before: number;
  accuracy_before_pct: number;
  total_questions_after: number;
  correct_questions_after: number;
  accuracy_after_pct: number;
  next_due_before: string | null;
  next_due_after: string | null;
  affected_future_studies: number;
  will_recalculate_future_chain: boolean;
};

// ── Constants ────────────────────────────────────────────────────

const STUDY_IMPORT_SESSION_CREATE_TIMEOUT_MS = 180000;
const STUDY_IMPORT_JOB_POLL_INTERVAL_MS = 1500;

// ── Profile ──────────────────────────────────────────────────────

export type UserProfile = {
  user_id: string;
  weekly_goal_questions: number;
  timezone: string;
  reschedule_mode: "suggest" | "auto" | "never" | string;
  shift_12h_capacity: number | null;
  shift_24h_capacity: number | null;
  display_name: string | null;
  photo_url: string | null;
  priority_boards: string[];
  weekly_goal_notifications_enabled: boolean;
  calendar_change_alerts_enabled: boolean;
  calendar_recommendations_enabled: boolean;
  default_feedback_timing: "immediate" | "post_result";
  default_feedback_reveal_policy: "guided_choice" | "reveal_all";
  /** Quando o aluno declara confiança: no fim da sessão ou a cada questão. */
  confidence_timing: "post_session" | "per_question";
  has_chosen_feedback_default: boolean;
  has_completed_initial_goal_setup: boolean;
  access_status: "active" | "expired" | "pending_key";
};

export async function getProfile(token: string): Promise<UserProfile> {
  return api<UserProfile>("/api/profile", { headers: authHeader(token) });
}

export async function updateProfile(
  token: string,
  payload: {
    weekly_goal_questions?: number;
    timezone?: string;
    shift_12h_capacity?: number | null;
    shift_24h_capacity?: number | null;
    display_name?: string;
    reschedule_mode?: string;
    priority_boards?: string[];
    weekly_goal_notifications_enabled?: boolean;
    calendar_change_alerts_enabled?: boolean;
    calendar_recommendations_enabled?: boolean;
    default_feedback_timing?: "immediate" | "post_result";
    default_feedback_reveal_policy?: "guided_choice" | "reveal_all";
    confidence_timing?: "post_session" | "per_question";
    has_chosen_feedback_default?: boolean;
  }
): Promise<UserProfile> {
  const profile = await api<UserProfile>("/api/profile", {
    method: "PATCH",
    headers: authHeader(token),
    body: JSON.stringify(payload),
  });
  invalidateStudentExperienceCache();
  return profile;
}

// ── Directed Study ───────────────────────────────────────────────

export async function createDirectedStudy(
  token: string,
  payload: {
    topic?: { area: string; theme: string; subtheme?: string | null; knowledge_node_id?: string | null };
    total_questions: number;
    correct_questions: number;
    user_weight?: number;
    performed_at?: string | null;
    is_review?: boolean;
    fsrs_rating?: FsrsReviewRating;
    review_task_id?: string;
    study_kind?: StudyKind;
    full_exam?: {
      name: string;
      year: number;
      exam_type: FullExamType;
    };
  }
): Promise<DirectedStudyOut> {
  const study = await api<DirectedStudyOut>("/api/studies/directed", {
    method: "POST",
    headers: authHeader(token),
    body: JSON.stringify(payload),
  });
  invalidateStudentExperienceCache();
  return study;
}

export async function listDirectedStudies(token: string): Promise<DirectedStudyListItem[]> {
  return api<DirectedStudyListItem[]>("/api/studies/directed", { headers: authHeader(token) });
}

export async function updateDirectedStudy(
  token: string,
  studyId: string,
  payload: { total_questions?: number; correct_questions?: number; confirm_impact?: boolean }
): Promise<DirectedStudyListItem> {
  const study = await api<DirectedStudyListItem>(`/api/studies/directed/${studyId}`, {
    method: "PATCH",
    headers: authHeader(token),
    body: JSON.stringify(payload),
  });
  invalidateStudentExperienceCache();
  return study;
}

export async function deleteDirectedStudy(token: string, studyId: string): Promise<void> {
  await api<void>(`/api/studies/directed/${studyId}`, {
    method: "DELETE",
    headers: authHeader(token),
  });
  invalidateStudentExperienceCache();
}

// ── Study Import Session ─────────────────────────────────────────

export async function createStudyImportSession(
  token: string,
  payload: {
    study_kind: StudyKind;
    area?: string;
    theme?: string;
    subtheme?: string | null;
    full_exam_name?: string;
    full_exam_year?: number;
    full_exam_type?: FullExamType;
    user_weight?: number;
    performed_at?: string;
    attachment_refs: string;
    review_task_id?: string;
  },
): Promise<StudyImportSessionCreateResult> {
  return api<StudyImportSessionCreateResult>("/api/studies/import/sessions", {
    method: "POST",
    headers: authHeader(token),
    body: JSON.stringify(payload),
    timeoutMs: STUDY_IMPORT_SESSION_CREATE_TIMEOUT_MS,
  });
}

export function isBackgroundJobAccepted(value: unknown): value is BackgroundJobAccepted {
  if (!value || typeof value !== "object") return false;
  return typeof (value as { job_id?: unknown }).job_id === "string";
}

function isStudyImportSession(value: unknown): value is StudyImportSession {
  if (!value || typeof value !== "object") return false;
  return typeof (value as { session_id?: unknown }).session_id === "string";
}

async function waitForPollInterval(durationMs: number, signal?: AbortSignal): Promise<void> {
  if (durationMs <= 0) return;
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  await new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(resolve, durationMs);
    const onAbort = () => {
      window.clearTimeout(timeoutId);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export async function getBackgroundJob(token: string, jobId: string): Promise<BackgroundJob> {
  return api<BackgroundJob>(`/api/jobs/${encodeURIComponent(jobId)}`, {
    headers: authHeader(token),
  });
}

export async function waitForStudyImportSessionJob(
  token: string,
  accepted: BackgroundJobAccepted,
  options?: { pollIntervalMs?: number; timeoutMs?: number; signal?: AbortSignal },
): Promise<StudyImportSession> {
  const startedAt = Date.now();
  const timeoutMs = options?.timeoutMs ?? STUDY_IMPORT_SESSION_CREATE_TIMEOUT_MS;
  const pollIntervalMs = options?.pollIntervalMs ?? STUDY_IMPORT_JOB_POLL_INTERVAL_MS;

  while (Date.now() - startedAt <= timeoutMs) {
    const job = await getBackgroundJob(token, accepted.job_id);
    if (job.status === "succeeded") {
      const session = job.result?.session;
      if (isStudyImportSession(session)) return session;
      throw new Error("Importação concluída sem sessão válida.");
    }
    if (job.status === "failed") {
      throw new Error(job.error || "Importação falhou durante o processamento.");
    }

    const remainingMs = timeoutMs - (Date.now() - startedAt);
    await waitForPollInterval(Math.min(pollIntervalMs, Math.max(0, remainingMs)), options?.signal);
  }

  throw new Error("Importação ainda est? em processamento. Tente novamente em instantes.");
}

export async function getStudyImportSession(
  token: string,
  sessionId: string,
): Promise<StudyImportSession> {
  return api<StudyImportSession>(`/api/studies/import/sessions/${sessionId}`, {
    headers: authHeader(token),
  });
}

export async function listStudyImportSessionQuestions(
  token: string,
  sessionId: string,
  params: { page: number; page_size: 1 | 5 | 10; only_unanswered?: boolean },
): Promise<StudyImportQuestionPage> {
  const q = new URLSearchParams({
    page: String(params.page),
    page_size: String(params.page_size),
  });
  if (params.only_unanswered) q.set("only_unanswered", "true");
  return api<StudyImportQuestionPage>(
    `/api/studies/import/sessions/${sessionId}/questions?${q.toString()}`,
    { headers: authHeader(token) },
  );
}

export async function updateStudyImportQuestionState(
  token: string,
  sessionId: string,
  questionNumber: number,
  payload: {
    selected_option?: ImportQuestionOption | null;
    eliminated_options?: ImportQuestionOption[] | null;
    doubtful?: boolean;
  },
): Promise<StudyImportQuestion> {
  return api<StudyImportQuestion>(
    `/api/studies/import/sessions/${sessionId}/questions/${questionNumber}/state`,
    {
      method: "PUT",
      headers: authHeader(token),
      body: JSON.stringify(payload),
    },
  );
}

export async function finalizeStudyImportSession(
  token: string,
  sessionId: string,
  options?: { confirm_unanswered?: boolean },
): Promise<FinalizationResult> {
  const q = new URLSearchParams({
    confirm_unanswered: options?.confirm_unanswered ? "true" : "false",
  });
  return api<FinalizationResult>(
    `/api/studies/import/sessions/${sessionId}/finalize?${q.toString()}`,
    {
      method: "POST",
      headers: authHeader(token),
    },
  );
}

// ── Question Overrides ───────────────────────────────────────────

export async function getSessionOverrides(
  token: string,
  sessionId: string,
): Promise<SessionOverridesResult> {
  return api<SessionOverridesResult>(
    `/api/import/sessions/${encodeURIComponent(sessionId)}/overrides`,
    { headers: authHeader(token) },
  );
}

export async function setQuestionOverride(
  token: string,
  sessionId: string,
  questionNumber: number,
  overrideType: "aceitar_ia" | "anulada",
): Promise<QuestionOverrideResult> {
  return api<QuestionOverrideResult>(
    `/api/import/sessions/${encodeURIComponent(sessionId)}/questions/${questionNumber}/override`,
    {
      method: "POST",
      headers: { ...authHeader(token), "Content-Type": "application/json" },
      body: JSON.stringify({ override_type: overrideType }),
    },
  );
}

export async function deleteQuestionOverride(
  token: string,
  sessionId: string,
  questionNumber: number,
): Promise<QuestionOverrideResult> {
  return api<QuestionOverrideResult>(
    `/api/import/sessions/${encodeURIComponent(sessionId)}/questions/${questionNumber}/override`,
    {
      method: "DELETE",
      headers: authHeader(token),
    },
  );
}

// ── Review Tasks ─────────────────────────────────────────────────

export async function listReviewTasks(
  token: string,
  params?: { status?: string; date?: string; revision_filter?: "all" | "recent" | "old" }
): Promise<ReviewTask[]> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.date) q.set("date", params.date);
  if (params?.revision_filter && params.revision_filter !== "all") q.set("revision_filter", params.revision_filter);
  const qs = q.toString() ? `?${q.toString()}` : "";
  return api<ReviewTask[]>(`/api/reviews/tasks${qs}`, { headers: authHeader(token) });
}

export async function getReviewAgenda(token: string): Promise<ReviewAgenda> {
  return api<ReviewAgenda>("/api/reviews/agenda", { headers: authHeader(token) });
}

export async function updateReviewTask(
  token: string,
  taskId: string,
  payload: { status?: string; due_date?: string }
): Promise<ReviewTask> {
  return api<ReviewTask>(`/api/reviews/tasks/${taskId}`, {
    method: "PATCH",
    headers: authHeader(token),
    body: JSON.stringify(payload),
  });
}

export async function autoRescheduleReviewTask(
  token: string,
  taskId: string
): Promise<ReviewTask> {
  return api<ReviewTask>(`/api/reviews/tasks/${taskId}/auto-reschedule`, {
    method: "POST",
    headers: authHeader(token),
  });
}

export async function previewAutoRescheduleReviewTask(
  token: string,
  taskId: string
): Promise<ReviewTask> {
  return api<ReviewTask>(`/api/reviews/tasks/${taskId}/auto-reschedule?preview=1`, {
    method: "POST",
    headers: authHeader(token),
  });
}

// ── Study Topic Consistency ──────────────────────────────────────

export type StudyTopicConsistency = {
  area: string;
  theme: string;
  total_questions: number;
  correct_questions: number;
  accuracy_pct: number;
  review_count: number;
  stable_review_ratio_pct: number | null;
  consistency_score: number | null;
};

export async function listStudyTopicConsistency(token: string): Promise<StudyTopicConsistency[]> {
  return api<StudyTopicConsistency[]>("/api/studies/consistency", { headers: authHeader(token) });
}
