import { api, authHeader } from "../shared/http";
import type { FinalizationResult, ReviewTask } from "./study-import";

export type QuestionBankOption = "A" | "B" | "C" | "D" | "E";
export type QuestionBankMode = "adaptive" | "by_topic" | "by_exam";
export type QuestionBankResolutionMode = "training" | "simulation";
export type QuestionBankSessionStatus = "active" | "finalized" | "invalidated";
export type QuestionBankAnswerStatus = "unanswered" | "answered" | "correct" | "wrong" | "all" | "unanswered_or_wrong";
export type QuestionBankNode = {
  knowledge_node_id: string;
  parent_knowledge_node_id: string | null;
  node_code: string | null;
  node_name: string | null;
  node_type: string | null;
  node_path: string[];
  path_label: string | null;
  depth: number | null;
  role: string | null;
  weight: number | null;
  confidence: number | null;
  is_primary: boolean;
  source: string | null;
};
export type QuestionBankTopic = {
  knowledge_node_id: string;
  parent_knowledge_node_id: string | null;
  node_code: string | null;
  node_name: string;
  node_type: string | null;
  node_path: string[];
  path_label: string | null;
  depth: number | null;
  description: string | null;
  question_count: number;
  primary_question_count: number;
  board_count: number;
  difficulty_mean: number | null;
  recurrence_score: number;
  bank_demand_score: number;
  board_frequency: Record<string, number>;
  charge_patterns: Record<string, number>;
  answer_types: Record<string, number>;
  adaptive_weight: number;
  adaptive_weight_score: number;
  adaptive_weight_factors: Record<string, number>;
};
export type QuestionBankAvailability = {
  total_count: number;
  answered_count: number;
  unanswered_count: number;
  available_count: number;
  max_selectable: number;
  answer_status: QuestionBankAnswerStatus;
};
export type QuestionBankQuestion = {
  id: string;
  stem: string;
  alternatives: Record<string, string>;
  charge_profile: unknown;
  difficulty_estimate: number | null;
  content_grade: string | null;
  image_refs: string[];
  table_refs: unknown[];
  metadata: Record<string, unknown>;
  source: Record<string, unknown>;
  knowledge_nodes: QuestionBankNode[];
};
export type QuestionBankSessionItem = {
  question_id: string;
  position: number;
  stem: string;
  alternatives: Record<string, string>;
  image_refs: string[];
  table_refs: unknown[];
  knowledge_nodes: QuestionBankNode[];
  selection_reason: Record<string, unknown>;
  source: Record<string, unknown>;
  selected_option: QuestionBankOption | null;
  doubtful: boolean;
  answered: boolean;
  needs_correction: boolean;
  correct_answer: QuestionBankOption | null;
  is_correct: boolean | null;
  difficulty_estimate?: number | null;
};
export type QuestionBankSession = {
  session_id: string;
  status: QuestionBankSessionStatus;
  mode: QuestionBankMode;
  resolution_mode: QuestionBankResolutionMode;
  primary_knowledge_node_id: string | null;
  area: string | null;
  theme: string | null;
  subtheme: string | null;
  adaptive_weight: number;
  adaptive_weight_score: number;
  adaptive_weight_factors: Record<string, number>;
  performed_at: string;
  filters: Record<string, unknown>;
  total_questions: number;
  answered_count: number;
  unanswered_count: number;
  unanswered_question_numbers: number[];
  doubtful_count: number;
  items: QuestionBankSessionItem[];
  created_at: string;
  updated_at: string;
  finalized_at: string | null;
  directed_study_id: string | null;
  review_task_id: string | null;
};
export type QuestionBankLongitudinalNode = {
  knowledge_node_id: string;
  node_name: string | null;
  exposure_count: number;
  correct_count: number;
  error_count: number;
  performance_score: number;
  mastery_score: number;
  retention_score: number;
  days_since_last_seen: number | null;
  last_error_at: string | null;
};
export type QuestionBankLongitudinalDiagnosis = {
  user_id: string;
  total_nodes_studied: number;
  nodes: QuestionBankLongitudinalNode[];
  weak_node_ids: string[];
  at_risk_node_ids: string[];
  charge_pattern_errors: Record<string, number>;
  answer_type_errors: Record<string, number>;
  reasoning_type_errors: Record<string, number>;
  trap_sensitivity: number;
  overconfidence_score: number;
  impulsive_rate: number;
};
export type QuestionBankCorrectionItem = {
  response_id: string;
  question_id: string;
  knowledge_node_id: string | null;
  prompt: string | null;
  response_value: string;
  confidence_delta: number;
  created_at: string;
};
export type QuestionBankFinalizeResult = FinalizationResult & {
  created_tasks: ReviewTask[];
  session: QuestionBankSession;
  recommended_topics?: string[];
};
export type QuestionBankSessionCreatePayload = {
  mode?: QuestionBankMode;
  resolution_mode?: QuestionBankResolutionMode;
  question_ids?: string[];
  knowledge_node_ids?: string[];
  area?: string;
  search?: string;
  institution?: string;
  board_codes?: string[];
  year_from?: number;
  year_to?: number;
  years?: number[];
  limit?: number;
  only_unanswered?: boolean;
  answer_status?: QuestionBankAnswerStatus;
  performed_at?: string;
  review_task_id?: string;
};

function appendArrayParams(q: URLSearchParams, key: string, values?: string[]) {
  for (const value of values ?? []) {
    if (value.trim()) q.append(key, value.trim());
  }
}

export async function browseQuestionBankTopics(
  token: string,
  params: { area?: string; search?: string; institution?: string; node_type?: string; board_codes?: string[]; year_from?: number; year_to?: number; years?: number[]; limit?: number } = {},
): Promise<QuestionBankTopic[]> {
  const q = new URLSearchParams();
  if (params.area?.trim()) q.set("area", params.area.trim());
  if (params.search?.trim()) q.set("search", params.search.trim());
  if (params.institution?.trim()) q.set("institution", params.institution.trim());
  if (params.node_type?.trim()) q.set("node_type", params.node_type.trim());
  if (params.year_from) q.set("year_from", String(params.year_from));
  if (params.year_to) q.set("year_to", String(params.year_to));
  if (params.limit) q.set("limit", String(params.limit));
  appendArrayParams(q, "board_codes", params.board_codes);
  appendArrayParams(q, "years", params.years?.map(String));
  return api<QuestionBankTopic[]>(`/api/question-bank/topics${q.toString() ? `?${q.toString()}` : ""}`, { headers: authHeader(token) });
}

export async function previewQuestionBankAvailability(
  token: string,
  params: { knowledge_node_ids?: string[]; area?: string; search?: string; institution?: string; board_codes?: string[]; year_from?: number; year_to?: number; years?: number[]; answer_status?: QuestionBankAnswerStatus; only_unanswered?: boolean } = {},
): Promise<QuestionBankAvailability> {
  const q = new URLSearchParams();
  appendArrayParams(q, "knowledge_node_ids", params.knowledge_node_ids);
  appendArrayParams(q, "board_codes", params.board_codes);
  appendArrayParams(q, "years", params.years?.map(String));
  if (params.area?.trim()) q.set("area", params.area.trim());
  if (params.search?.trim()) q.set("search", params.search.trim());
  if (params.institution?.trim()) q.set("institution", params.institution.trim());
  if (params.year_from) q.set("year_from", String(params.year_from));
  if (params.year_to) q.set("year_to", String(params.year_to));
  if (params.answer_status) q.set("answer_status", params.answer_status);
  if (params.only_unanswered !== undefined) q.set("only_unanswered", params.only_unanswered ? "true" : "false");
  return api<QuestionBankAvailability>(`/api/question-bank/availability${q.toString() ? `?${q.toString()}` : ""}`, { headers: authHeader(token) });
}

export async function browseQuestionBankQuestions(
  token: string,
  params: { knowledge_node_ids?: string[]; area?: string; search?: string; institution?: string; board_codes?: string[]; year_from?: number; year_to?: number; years?: number[]; limit?: number; answer_status?: QuestionBankAnswerStatus; only_unanswered?: boolean } = {},
): Promise<QuestionBankQuestion[]> {
  const q = new URLSearchParams();
  appendArrayParams(q, "knowledge_node_ids", params.knowledge_node_ids);
  appendArrayParams(q, "board_codes", params.board_codes);
  appendArrayParams(q, "years", params.years?.map(String));
  if (params.area?.trim()) q.set("area", params.area.trim());
  if (params.search?.trim()) q.set("search", params.search.trim());
  if (params.institution?.trim()) q.set("institution", params.institution.trim());
  if (params.year_from) q.set("year_from", String(params.year_from));
  if (params.year_to) q.set("year_to", String(params.year_to));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.answer_status) q.set("answer_status", params.answer_status);
  if (params.only_unanswered !== undefined) q.set("only_unanswered", params.only_unanswered ? "true" : "false");
  return api<QuestionBankQuestion[]>(`/api/question-bank/questions${q.toString() ? `?${q.toString()}` : ""}`, { headers: authHeader(token) });
}

export async function createQuestionBankSession(token: string, payload: QuestionBankSessionCreatePayload): Promise<QuestionBankSession> {
  return api<QuestionBankSession>("/api/question-bank/sessions", { method: "POST", headers: authHeader(token), body: JSON.stringify(payload) });
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

export async function getQuestionBankLongitudinalDiagnosis(token: string): Promise<QuestionBankLongitudinalDiagnosis> {
  return api<QuestionBankLongitudinalDiagnosis>("/api/question-bank/diagnosis/longitudinal", { headers: authHeader(token) });
}

export async function recordQuestionBankAttempt(
  token: string,
  sessionId: string,
  position: number,
  payload: { selected_option: QuestionBankOption; time_ms?: number | null; doubtful?: boolean; confidence_self_rating?: number | null },
): Promise<QuestionBankSession> {
  return api<QuestionBankSession>(`/api/question-bank/sessions/${encodeURIComponent(sessionId)}/items/${position}/attempt`, { method: "PUT", headers: authHeader(token), body: JSON.stringify(payload) });
}

export async function recordQuestionBankCorrection(
  token: string,
  sessionId: string,
  position: number,
  payload: { prompt?: string | null; response_value: string; confidence_delta?: number; metadata?: Record<string, unknown> },
): Promise<{ response_id: string; session: QuestionBankSession }> {
  return api<{ response_id: string; session: QuestionBankSession }>(`/api/question-bank/sessions/${encodeURIComponent(sessionId)}/items/${position}/correction`, { method: "POST", headers: authHeader(token), body: JSON.stringify(payload) });
}

export async function getSessionCorrections(
  token: string,
  sessionId: string,
): Promise<QuestionBankCorrectionItem[]> {
  return api<QuestionBankCorrectionItem[]>(
    `/api/question-bank/sessions/${encodeURIComponent(sessionId)}/corrections`,
    { headers: authHeader(token) },
  );
}

export async function finalizeQuestionBankSession(token: string, sessionId: string, options?: { confirm_unanswered?: boolean }): Promise<QuestionBankFinalizeResult> {
  const q = new URLSearchParams({ confirm_unanswered: options?.confirm_unanswered ? "true" : "false" });
  return api<QuestionBankFinalizeResult>(`/api/question-bank/sessions/${encodeURIComponent(sessionId)}/finalize?${q.toString()}`, { method: "POST", headers: authHeader(token) });
}

export type QuestionBankReportType = "error" | "unclear" | "outdated" | "other";

export async function reportQuestionProblem(
  token: string,
  questionId: string,
  payload: { report_type?: QuestionBankReportType; report_reason?: string },
): Promise<{ reported: boolean; report_id: string }> {
  return api<{ reported: boolean; report_id: string }>(
    `/api/question-bank/questions/${encodeURIComponent(questionId)}/report`,
    { method: "POST", headers: authHeader(token), body: JSON.stringify(payload) },
  );
}
