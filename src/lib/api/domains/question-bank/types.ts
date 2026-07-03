import type { FinalizationResult, ReviewTask } from "../study-import";
import type { FullExamType, StudyKind } from "../../types";

export type QuestionBankOption = "A" | "B" | "C" | "D" | "E";
export type QuestionBankMode = "adaptive" | "by_topic" | "by_exam";
export type QuestionBankResolutionMode = "training" | "simulation";
export type QuestionBankSessionStatus = "active" | "finalized" | "invalidated";
export type QuestionBankScoringMode = "immediate" | "deferred_until_finalize";
export type QuestionBankAnswerStatus = "unanswered" | "answered" | "correct" | "wrong" | "all" | "unanswered_or_wrong" | "needs_review" | "near_miss";
export type QuestionBankCorrectionStatus = "all" | "with_correction" | "without_correction";

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

export type QuestionBankBoard = {
  board_code: string;
  board_name: string;
  question_count: number;
  first_year?: number | null;
  last_year?: number | null;
};

export type QuestionBankSourceOption = {
  option_key: string;
  label: string;
  option_kind: "board" | "institution";
  question_count: number;
  first_year?: number | null;
  last_year?: number | null;
};

export type QuestionBankYearStat = {
  year: number;
  question_count: number;
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
  display_order?: number | null;
  description: string | null;
  question_count: number;
  primary_question_count: number;
  board_count: number;
  avg_link_weight?: number | null;
  avg_confidence?: number | null;
  difficulty_mean: number | null;
  classification_confidence_mean?: number | null;
  first_seen_year?: number | null;
  last_seen_year?: number | null;
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
  correction_status: QuestionBankCorrectionStatus;
};

export type QuestionBankAttemptStats = {
  attempt_count: number;
  correct_count: number;
  error_count: number;
  doubtful_count: number;
  rolling_accuracy: number | null;
  last_is_correct: boolean | null;
  last_answered_at: string | null;
};

export type QuestionBankQuestionAttempt = {
  attempt_id: string;
  session_id: string;
  selected_option: QuestionBankOption | null;
  is_correct: boolean;
  time_ms: number | null;
  doubtful: boolean;
  confidence_self_rating: number | null;
  answered_at: string;
};

export type QuestionBankCognitiveSignal = {
  schema_version: string;
  primary_family: string;
  primary_tag: string;
  secondary_tag: string | null;
  confidence: number;
  evidence: Array<{ code: string; params?: Record<string, unknown> }>;
  forcing_hint: string | null;
  source_attempt_id: string | null;
  source_selected_option: QuestionBankOption | null;
  refined_from?: string | null;
};

export type QuestionBankQuestionHistory = {
  question_id: string;
  stats: QuestionBankAttemptStats;
  attempts: QuestionBankQuestionAttempt[];
};

export type QuestionBankReviewQueue = {
  due_count: number;
  struggling_count: number;
  total: number;
};

export type QuestionBankNextActionKind = "review_queue" | "weak_area" | "fresh_practice";
export type QuestionBankNextActionSignalSeverity = "info" | "success" | "warning" | "critical";
export type QuestionBankNextActionSignal = {
  key: string;
  label: string;
  severity: QuestionBankNextActionSignalSeverity;
};

export type QuestionBankNextActionStartPayload = {
  mode: "adaptive";
  resolution_mode: "training";
  area?: string | null;
  answer_status: QuestionBankAnswerStatus;
  only_unanswered: boolean;
  limit: number;
};

export type QuestionBankNextAction = {
  kind: QuestionBankNextActionKind;
  title: string;
  subtitle: string;
  meta: string;
  cta_label: string;
  /** Pedagogical rationale in the tutor voice. Additive field. */
  rationale: string | null;
  area: string | null;
  area_label: string | null;
  signals: QuestionBankNextActionSignal[];
  start_payload: QuestionBankNextActionStartPayload;
  generated_at: string;
};

export type QuestionBankAreaReadiness = {
  area: string;
  label: string;
  questions_seen: number;
  accuracy: number | null;
  wrong_count: number;
  due_count: number;
  readiness: number;
  level: "consolidando" | "atencao" | "critico";
  next_action: string;
};

export type QuestionBankExamState = {
  simulation_count: number;
  accuracy: number | null;
  avg_time_ms: number | null;
  slow_rate: number | null;
};

export type QuestionBankPerformance = {
  areas: QuestionBankAreaReadiness[];
  exam: QuestionBankExamState;
  generated_at: string;
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
  attempt_stats?: QuestionBankAttemptStats | null;
};

export type QuestionBankReportType = "error" | "unclear" | "outdated" | "other";

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
  confidence_self_rating: number | null;
  answered: boolean;
  needs_correction: boolean;
  correct_answer: QuestionBankOption | null;
  is_correct: boolean | null;
  distractor_diagnosis?: Record<string, string>;
  cognitive_signal?: QuestionBankCognitiveSignal | null;
  difficulty_estimate?: number | null;
  pedagogical_profile?: Record<string, unknown>;
  adaptive_explanation?: { title: string; reasons: string[] } | null;
  editorial_quality?: { badge: string; message: string | null } | null;
  is_annulled: boolean;
  reported_problem: boolean;
  report_type: QuestionBankReportType | null;
  report_reason: string | null;
  reported_at: string | null;
  excluded_from_scoring: boolean;
  exclusion_reason: string | null;
  exclusion_note: string | null;
  excluded_at: string | null;
  attempt_stats?: QuestionBankAttemptStats | null;
};

export type QuestionBankSession = {
  session_id: string;
  status: QuestionBankSessionStatus;
  mode: QuestionBankMode;
  resolution_mode: QuestionBankResolutionMode;
  scoring_mode: QuestionBankScoringMode;
  study_kind: StudyKind;
  full_exam_name: string | null;
  full_exam_year: number | null;
  full_exam_type: FullExamType | null;
  review_trail_enabled: boolean;
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
  answered_time_ms: number;
  items: QuestionBankSessionItem[];
  created_at: string;
  updated_at: string;
  results_revealed_at: string | null;
  finalized_at: string | null;
  directed_study_id: string | null;
  review_task_id: string | null;
  reported_problem_count: number;
  excluded_from_scoring_count: number;
  scorable_question_count: number;
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

export type QuestionBankAnchorObjectiveWeakness = {
  trap_pattern: string;
  label: string;
  error_count: number;
  knowledge_node_id?: string | null;
  mastery_score?: number | null;
  retention_score?: number | null;
  exposure_count?: number | null;
  last_error_at?: string | null;
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
  anchor_objective_weaknesses?: QuestionBankAnchorObjectiveWeakness[];
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

export type QuestionBankStudentEventType =
  | "question_presented"
  | "answer_selected"
  | "answer_changed"
  | "option_eliminated"
  | "confidence_marked"
  | "doubt_marked"
  | "answer_revealed"
  | "guided_checkpoint_answered"
  | "correction_saved"
  | "flashcard_created"
  | "session_finalized";

export type QuestionBankStudentEventPayload = {
  event_id: string;
  event_type: QuestionBankStudentEventType;
  occurred_at?: string | null;
  payload?: Record<string, unknown>;
};

export type QuestionBankGuidedReviewValue = "yes" | "partial" | "no" | "unsure";
export type QuestionBankGuidedReviewCheckpoint = {
  checkpoint_key: string;
  prompt: string;
  kind: string;
  knowledge_node_id: string | null;
  knowledge_node_name: string | null;
  high_value_reason: string | null;
  micro_question: string | null;
  response_options: Record<QuestionBankGuidedReviewValue, string>;
};

export type QuestionBankGuidedReviewResponse = {
  response_id?: string | null;
  checkpoint_key: string;
  knowledge_node_id?: string | null;
  response_value: string;
  confidence_self_rating?: number | null;
  free_text?: string | null;
  created_at?: string | null;
};

export type QuestionBankGuidedReview = {
  question_id: string;
  position: number;
  eligible: boolean;
  rationale: string | null;
  checkpoints: QuestionBankGuidedReviewCheckpoint[];
  existing_responses: QuestionBankGuidedReviewResponse[];
};

export type QuestionBankLearnerCompetency = {
  knowledge_node_id: string;
  node_name: string | null;
  node_type: string | null;
  exposure_count: number;
  mastery_score: number;
  retention_score: number;
  confidence: number;
  uncertainty: number;
  needs_review: boolean;
  overconfidence_score: number;
  trap_sensitivity: number;
  next_action: string | null;
};

export type QuestionBankLearnerModel = {
  user_id: string;
  generated_at: string;
  competencies: QuestionBankLearnerCompetency[];
  metacognition: Record<string, unknown>;
  adaptive_summary: Record<string, unknown>;
};

export type QuestionBankLearningInsight = {
  insight_id: string;
  insight_type: string;
  title: string;
  body: string;
  severity: string;
  payload: Record<string, unknown>;
  generated_at: string;
};

export type QuestionBankSessionCreatePayload = {
  mode?: QuestionBankMode;
  resolution_mode?: QuestionBankResolutionMode;
  study_kind?: StudyKind;
  full_exam_name?: string | null;
  full_exam_year?: number | null;
  full_exam_type?: FullExamType | null;
  generate_review_trail?: boolean | null;
  question_ids?: string[];
  knowledge_node_ids?: string[];
  area?: string;
  search?: string;
  institution?: string;
  institutions?: string[];
  board_codes?: string[];
  year_from?: number;
  year_to?: number;
  years?: number[];
  limit?: number;
  only_unanswered?: boolean;
  answer_status?: QuestionBankAnswerStatus;
  correction_status?: QuestionBankCorrectionStatus;
  performed_at?: string;
  review_task_id?: string;
};
