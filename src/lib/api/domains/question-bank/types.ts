import type { FinalizationResult, ReviewTask } from "../study-import";
import type { FullExamType, StudyKind } from "../../types";

export type QuestionBankOption = "A" | "B" | "C" | "D" | "E";
export type QuestionBankMode = "adaptive" | "by_topic" | "by_exam";
export type QuestionBankResolutionMode = "training" | "simulation";
export type QuestionBankSessionStatus = "active" | "finalized" | "invalidated";
export type QuestionBankScoringMode = "immediate" | "deferred_until_finalize";
export type QuestionBankAnswerStatus = "unanswered" | "answered" | "correct" | "wrong" | "all" | "unanswered_or_wrong" | "needs_review" | "near_miss";
export type QuestionBankCorrectionStatus = "all" | "with_correction" | "without_correction";
export type QuestionTextHighlightKind = "ponto_chave" | "pegadinha";
export type QuestionTextHighlightTarget = "stem" | "alternative";
export type QuestionPostAnswerReflection = "correct_guess" | "correct_secure" | "wrong_distraction" | "wrong_concept";

export type QuestionTextHighlight = {
  highlight_id: string;
  question_id: string;
  session_id: string | null;
  target: QuestionTextHighlightTarget;
  option: QuestionBankOption | null;
  kind: QuestionTextHighlightKind;
  selected_text: string;
  prefix: string;
  suffix: string;
  occurrence_index: number;
  created_at: string;
  updated_at: string;
};

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
  option_kind: "board" | "exam" | "institution";
  question_count: number;
  first_year?: number | null;
  last_year?: number | null;
};

export type QuestionBankSourceEntity = {
  entity_id: string;
  canonical_key: string;
  label: string;
  entity_kind: "institution" | "organizer" | "selection_process";
  status: "active";
  aliases: string[];
  question_count: number;
  first_year?: number | null;
  last_year?: number | null;
};

export type QuestionBankSourceEntities = {
  contract_version: "question-source-entities-v1";
  catalog_release: string | null;
  items: QuestionBankSourceEntity[];
};

export type QuestionBankStateOption = {
  state_code: string;
  label: string;
  question_count: number;
  first_year?: number | null;
  last_year?: number | null;
};

export type QuestionBankYearStat = {
  // year=null is the "sem ano informado" bucket from the cross-filtered facets;
  // the global /years endpoint never returns null.
  year: number | null;
  question_count: number;
};

export type QuestionBankFacets = {
  years: QuestionBankYearStat[];
  boards: QuestionBankSourceOption[];
  exams: QuestionBankSourceOption[];
  institutions: QuestionBankSourceOption[];
  states: QuestionBankStateOption[];
};

export type QuestionBankReadModel = {
  generation: number;
  projected_at: string | null;
  lag_seconds: number | null;
  status: "legacy" | "ready" | "stale";
  projected_count: number | null;
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
  recommendation_rank: number;
  recommendation_reason: "knowledge_gap" | "high_yield" | "under_covered" | "scheduled";
  ranking_policy_version: string;
};

export type QuestionBankBootstrap = {
  topics: QuestionBankTopic[];
  sources: QuestionBankSourceOption[];
  states: QuestionBankStateOption[];
  years: QuestionBankYearStat[];
  total_global: number;
  read_model: QuestionBankReadModel;
};

export type QuestionBankAvailability = {
  total_count: number;
  answered_count: number;
  unanswered_count: number;
  available_count: number;
  max_selectable: number;
  answer_status?: QuestionBankAnswerStatus;
  correction_status?: QuestionBankCorrectionStatus;
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

export type QuestionBankEditorialProfile = {
  editorial_state: string;
  review_lane: string;
  student_trust_weight: number;
  flags: string[];
  publish_blockers: string[];
  last_human_review_at: string | null;
  last_ai_review_at: string | null;
  review_source: string | null;
  item_stats_snapshot: Record<string, unknown>;
  adaptive_impact: unknown;
  warning_message: string | null;
};

export type QuestionBankQualityInspectionFlag = {
  code: string;
  severity: "info" | "warning" | "blocking";
  message: string;
};

export type QuestionBankQualityInspection = {
  inspection_status: string;
  warning_flags: QuestionBankQualityInspectionFlag[];
  blocking_flags: QuestionBankQualityInspectionFlag[];
  negative_stem_detected: boolean;
  trap_patterns: string[];
  editorial_risks: string[];
  requires_human_review: boolean;
  suggested_fix_available: boolean;
  last_checked_at: string | null;
};

export type QuestionBankDnaProfile = {
  schema_version: string;
  charge_pattern: string | null;
  reasoning_type: string | null;
  answer_type: string | null;
  negative_structure: string | null;
  trap_signatures: string[];
  distractor_quality: Record<string, unknown>;
  difficulty_signals: Record<string, unknown>;
  similarity_keys: string[];
  quality_flags: string[];
};

export type QuestionBankAiRequestCapability = {
  can_request: boolean;
  request_mode: string;
  reason: string | null;
};

export type QuestionBankAiQuota = {
  feature_key: string;
  quota_total: number;
  quota_used: number;
  quota_remaining: number;
  estimated_units: number;
  estimated_cost_band: string;
  estimated_latency_band: string;
  cache_eligible: boolean;
  will_consume_new_budget: boolean;
  reset_at: string | null;
  quota_exceeded: boolean;
};

export type QuestionBankAiCacheSummary = {
  cache_status: "none" | "personal" | "shared";
  cache_eligible: boolean;
  cache_reason: string | null;
  analysis_record_id: number | null;
};

export type QuestionBankQuestionAttempt = {
  attempt_id: string;
  session_id: string;
  selected_option: QuestionBankOption | null;
  eliminated_options: QuestionBankOption[];
  answer_state: "unanswered" | "draft" | "committed";
  answer_committed: boolean;
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

export type QuestionBankAreaReadiness = {
  area: string;
  label: string;
  questions_seen: number;
  accuracy: number | null;
  wrong_count: number;
  practice_count: number;
  readiness: number;
  level: "consolidando" | "atencao" | "critico";
  next_action: string;
};

export type QuestionBankExamState = {
  simulation_count: number;
  question_count: number;
  accuracy: number | null;
  avg_time_ms: number | null;
  slow_rate: number | null;
};

export type QuestionBankPerformance = {
  areas: QuestionBankAreaReadiness[];
  exam: QuestionBankExamState;
  generated_at: string;
  unique_questions: number;
  total_attempts: number;
  first_attempt_correct: number;
  first_attempt_accuracy: number | null;
  repeat_attempts: number;
  repeat_correct: number;
  repeat_accuracy: number | null;
  corrected_questions: number;
};

// ── Exam debrief (Fase 3) ────────────────────────────────────────────────────
export type ExamDebriefSummary = {
  total_questions: number;
  answered: number;
  omitted: number;
  discarded: number;
  correct: number;
  wrong: number;
  accuracy: number;
  total_time_ms: number;
  avg_time_ms: number | null;
  time_budget_minutes: number | null;
  observed_score: number;
};
export type ExamDebriefBlock = {
  label: string;
  count: number;
  accuracy: number | null;
  avg_time_ms: number | null;
  omissions: number;
  avg_confidence: number | null;
  overconfident_wrong: number;
  delta_accuracy_vs_prev: number | null;
};
export type ExamDebriefTimeline = {
  by_position_thirds: ExamDebriefBlock[];
  by_position_quarters: ExamDebriefBlock[];
  by_trajectory_thirds: ExamDebriefBlock[];
};
export type ExamDebriefPacing = {
  expected_ms_per_question: number | null;
  residual_ms: number | null;
  slow_count: number;
  fast_count: number;
  final_acceleration: boolean;
  fatigue_suspected: boolean;
  speededness: { method: string; detected: boolean; detail: string | null };
  label: string;
};
export type ExamDebriefCalibration = {
  bins: Array<{ confidence: number; count: number; accuracy: number | null }>;
  brier: number | null;
  overconfident_wrong: number;
  uncertain_correct: number;
  confidence_gap: number | null;
  coverage: number;
};
export type ExamDebriefStrategy = {
  marked: number;
  eliminated: number;
  omitted: number;
  changed: number | null;
  right_to_wrong: number | null;
  wrong_to_right: number | null;
  revisited: number | null;
  never_visited: number | null;
};
export type ExamDebriefNode = {
  knowledge_node_id: string;
  node_name: string | null;
  node_type: string | null;
  correct: number;
  wrong: number;
  accuracy: number;
};
export type ExamDebriefFollowupAction = {
  kind: string;
  title: string;
  rationale: string;
  href: string;
};
export type ExamDebriefDataQuality = {
  timing_source: string;
  timing_coverage: number;
  confidence_coverage: number;
  pacing_basis: string;
  idle_suspect: boolean;
  notes: string[];
};
export type QuestionBankExamDebrief = {
  session_id: string;
  summary: ExamDebriefSummary;
  timeline: ExamDebriefTimeline;
  pacing: ExamDebriefPacing;
  calibration: ExamDebriefCalibration;
  strategy: ExamDebriefStrategy;
  knowledge_breakdown: ExamDebriefNode[];
  cognitive_breakdown: Record<string, number>;
  dominant_cognitive_tag: string | null;
  trainer_followup: ExamDebriefFollowupAction[];
  data_quality: ExamDebriefDataQuality;
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
  attempt_stats: QuestionBankAttemptStats | null;
  bookmarked?: boolean;
};

export type QuestionBankReportType =
  | "error"
  | "unclear"
  | "outdated"
  | "other"
  | "wrong_answer"
  | "bad_structure"
  | "missing_options"
  | "truncated_or_merged_stem"
  | "missing_media"
  | "wrong_metadata";

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
  eliminated_options: QuestionBankOption[];
  answer_state: "unanswered" | "draft" | "committed";
  answer_committed: boolean;
  doubtful: boolean;
  bookmarked?: boolean;
  confidence_self_rating: number | null;
  answered: boolean;
  needs_correction: boolean;
  correct_answer: QuestionBankOption | null;
  is_correct: boolean | null;
  distractor_diagnosis: Record<string, string>;
  cognitive_signal?: QuestionBankCognitiveSignal | null;
  difficulty_estimate?: number | null;
  pedagogical_profile?: Record<string, unknown>;
  editorial_profile?: QuestionBankEditorialProfile | null;
  question_quality_inspection?: QuestionBankQualityInspection | null;
  question_dna_profile?: QuestionBankDnaProfile | null;
  pedagogical_profile_version?: number | null;
  student_trust_weight?: number | null;
  primary_microcompetency_label?: string | null;
  anchor_objective_label?: string | null;
  ai_request_status: "idle" | "cached" | "queued" | "running" | "blocked_by_quality" | "completed";
  ai_request_capability?: QuestionBankAiRequestCapability | null;
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
  attempt_stats: QuestionBankAttemptStats | null;
  text_highlights: QuestionTextHighlight[];
  post_answer_reflection?: QuestionPostAnswerReflection | null;
};

export type QuestionBankSession = {
  session_id: string;
  status: QuestionBankSessionStatus;
  mode: QuestionBankMode;
  resolution_mode: QuestionBankResolutionMode;
  session_purpose: QuestionBankSessionPurpose;
  session_purpose_inferred: boolean;
  session_kind: QuestionBankSessionKind;
  feedback_timing: QuestionBankFeedbackTiming;
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
  kros_mode: KrosMode | null;
  kros_composition: KrosComposition | Record<string, never>;
  total_questions: number;
  answered_count: number;
  unanswered_count: number;
  unanswered_question_numbers: number[];
  draft_count: number;
  draft_question_numbers: number[];
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
  trust_adjusted_mastery?: number | null;
  retention_score: number;
  days_since_last_seen: number | null;
  last_error_at: string | null;
  recommended_blocks?: QuestionBankRecommendedBlock | null;
};

export type QuestionBankRecommendedBlock = {
  node_id: string;
  node_name: string;
  label: string;
  why_now: string;
  failure_mode?: string | null;
  action_mode: string;
  recommended_question_count: number;
  estimated_minutes: number;
  success_signal?: string | null;
  if_wrong_then?: string | null;
  if_right_then?: string | null;
  trust_adjusted_confidence: number;
  evidence: Array<{ factor: string; detail: string; value: number }>;
};

export type QuestionBankAnchorObjectiveWeakness = {
  trap_patterns: string;
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
  anchor_objective_weaknesses: QuestionBankAnchorObjectiveWeakness[];
  recommended_blocks: QuestionBankRecommendedBlock[];
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
  recommended_topics: string[];
};

export type QuestionBankAiRequestPreview = {
  can_request: boolean;
  request_mode: string;
  checks_to_run: string[];
  question_quality_inspection: QuestionBankQualityInspection;
  question_dna_profile?: QuestionBankDnaProfile | null;
  ai_request_capability?: QuestionBankAiRequestCapability | null;
  quota: QuestionBankAiQuota;
  cache_summary: QuestionBankAiCacheSummary;
  estimated_cost_band: string;
  estimated_latency_band: string;
  blocked_reason: string | null;
  recommended_next_step: string | null;
};

export type QuestionBankAiRequestResult = {
  request_id: string;
  status: string;
  question_quality_inspection: QuestionBankQualityInspection;
  quota_after: QuestionBankAiQuota;
  cache_used: boolean;
  review_task_id: string | null;
  repair_draft_id: string | null;
  analysis_record_id: number | null;
};

export type QuestionBankAiRequestStatusResult = {
  request_id: string;
  status: string;
  question_quality_inspection?: QuestionBankQualityInspection | null;
  question_dna_profile?: QuestionBankDnaProfile | null;
  quota_after?: QuestionBankAiQuota | null;
  cache_used: boolean;
  review_task_id: string | null;
  repair_draft_id: string | null;
  analysis_record_id: number | null;
  repair_draft?: Record<string, unknown> | null;
  budget_usage_summary: Record<string, unknown>;
};

export type QuestionBankStudentEventType =
  | "question_presented"
  | "question_view_ended"
  | "answer_selected"
  | "answer_changed"
  | "answer_cleared"
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

export type QuestionBankSessionCreatePayload = {
  mode?: QuestionBankMode;
  resolution_mode?: QuestionBankResolutionMode;
  session_kind?: QuestionBankSessionKind;
  feedback_timing?: QuestionBankFeedbackTiming;
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
  exam_codes?: string[];
  state_codes?: string[];
  year_from?: number;
  year_to?: number;
  years?: number[];
  include_no_year?: boolean;
  limit?: number;
  only_unanswered?: boolean;
  correction_only?: boolean;
  answer_status?: QuestionBankAnswerStatus;
  correction_status?: QuestionBankCorrectionStatus;
  performed_at?: string;
  review_task_id?: string;
  session_purpose?: "diagnostic";
  /** Preset de seleção do Kros. Só aceito com `session_kind: "kros"`. */
  kros_mode?: KrosMode;
  diagnostic_area_quota?: Record<string, number>;
  diagnostic_area_counts?: Record<string, number>;
  time_limit_minutes?: number;
};

/**
 * Presets de seleção do Kros. Espelha `app/domain/kros_modes.py` — a tabela lá
 * é a fonte de verdade do comportamento; aqui só existe o vocabulário.
 */
export type KrosMode = "equilibrado" | "prioridade_erros" | "terreno_novo" | "foco_banca";

/** Linha rotulada de uma contagem agregada (intervenção, categoria, dificuldade). */
export type KrosCompositionCount = {
  key: string;
  label: string;
  count: number;
};

export type KrosCompositionMicro = {
  node_id: string;
  label: string;
  node_type: string | null;
  count: number;
  /** 0–1, média dos itens do nó. `null` quando o aluno ainda não tem histórico. */
  mastery: number | null;
  performance: number | null;
};

/**
 * Composição AGREGADA da prova: como ela foi montada, sem dizer nada sobre uma
 * questão específica. É o que alimenta o "ver mais" do lobby.
 */
export type KrosComposition = {
  kros_mode: string;
  ranking_policy_version: string;
  total: number;
  by_novelty: { new_count: number; revisited_count: number };
  by_intervention: KrosCompositionCount[];
  by_category: KrosCompositionCount[];
  by_difficulty: KrosCompositionCount[];
  by_area: { area: string; count: number }[];
  by_board: { board_code: string; count: number }[];
  top_microcompetencies: KrosCompositionMicro[];
};

export type KrosPreview = {
  kros_mode: KrosMode;
  requested_limit: number;
  /** Teto real do pool. A barra trava aqui em vez de deixar o aluno tomar 409. */
  max_available: number;
  estimated_minutes: number;
  min_size: number;
  max_size: number;
  size_step: number;
  size_anchors: number[];
  composition: KrosComposition;
  /**
   * Bancas alvo do aluno, na ordem de prioridade dele. Vazio quando ele não
   * declarou prova alvo — e aí o modo "foco na banca" não tem o que priorizar.
   */
  target_boards: string[];
};

export type QuestionBankSessionPurpose =
  | "diagnostic"
  | "adaptive_practice"
  | "adaptive_simulation"
  | "institutional_exam";

export type QuestionBankSessionKind =
  | "kros"
  | "bank_topic"
  | "bank_combined"
  | "institutional_exam";

export type QuestionBankFeedbackTiming = "immediate" | "post_result";

export type QuestionBankSessionDeleteResult = {
  session_id: string;
  deleted: boolean;
  adaptive_evidence_retained: boolean;
  retained_answer_count: number;
};
