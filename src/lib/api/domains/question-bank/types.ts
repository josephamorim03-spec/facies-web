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

/**
 * Uma prova que o aluno pode declarar como alvo.
 *
 * Substitui `QuestionBankBoard` nesse papel. A lista de bancas chega VAZIA:
 * `board_code` é NULL em 100% do acervo, então o seletor que lia dali dizia ao
 * aluno que não havia prova publicada. `institution_key` cobre o acervo inteiro.
 */
export type QuestionBankInstitution = {
  institution_key: string;
  institution_label: string;
  question_count: number;
  /** Últimos 6 anos — banca muda de foco, e a média de 20 anos esconde isso. */
  recent_question_count: number;
  first_year?: number | null;
  last_year?: number | null;
  state: string | null;
  /** Até onde o ranking desta instituição desce sem virar ruído. */
  reliable_grain: "subtheme" | "theme";
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
  /** A demanda da prova ALVO, quando o aluno declarou uma. `null` é o caso normal. */
  target_bank_demand_score?: number | null;
  target_demand_evidence?: QuestionBankTargetDemandEvidence | null;
  board_frequency: Record<string, number>;
  charge_patterns: Record<string, number>;
  answer_types: Record<string, number>;
  recommendation_rank: number;
  recommendation_reason: "knowledge_gap" | "high_yield" | "under_covered" | "scheduled";
  /** O motivo em uma frase, montada no backend. Nunca cita número que não tem. */
  recommendation_explanation?: string | null;
  ranking_policy_version: string;
};

/**
 * O número por trás de "a sua prova cobra isto".
 *
 * Só vem preenchido quando o aluno declarou prova alvo E a instituição tem massa
 * naquele grão. Ausente é o caso normal — e a tela NÃO deve inventar texto
 * genérico no lugar: um "recomendado para você" sem número é o que faz o aluno
 * parar de acreditar no resto.
 */
export type QuestionBankTargetDemandEvidence = {
  institution_label: string | null;
  recent_question_count: number;
  institution_recent_question_count: number;
  node_role: string | null;
  score: number;
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

/** Procedência da questão — allowlist, espelhando `QuestionBankSourceOut`. */
export type QuestionBankSource = {
  exam_name?: string | null;
  year?: number | null;
  year_min?: number | null;
  year_max?: number | null;
  institution?: string | null;
  board_name?: string | null;
  board_code?: string | null;
};

/** Por que a questão foi escolhida — só rótulos.
 *
 * Os 14 fatores numéricos do modelo (`mastery`, `target_difficulty`, o score)
 * ficaram no backend: expostos, deixavam inferir a função de seleção e forçar o
 * banco a servir item fácil. Ver `QuestionBankSelectionReasonOut`.
 */
export type QuestionBankSelectionReason = {
  selected_because: string[];
  intervention?: string | null;
  intervention_label?: string | null;
  selection_category?: string | null;
  review_target_type?: string | null;
  review_relation?: string | null;
  review_trigger_question_id?: string | null;
  selection_node_name?: string | null;
  selection_node_type?: string | null;
  editorial_notice?: string | null;
  editorial_warning?: string | null;
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
  // Sem `metadata` de propósito: o dict canônico carrega `distractor_diagnosis`,
  // que omite a alternativa correta — a letra que falta é o gabarito. Ver o
  // docstring de `QuestionBankQuestionOut` no backend.
  source: QuestionBankSource;
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
  | "wrong_metadata"
  // Aponta para o pacote pedagógico, não para o enunciado. Único tipo que
  // despromove o artefato aprovado na hora, sem esperar triagem.
  | "ai_correction_error";

export type QuestionBankSessionItem = {
  question_id: string;
  question_version: number | null;
  position: number;
  stem: string;
  alternatives: Record<string, string>;
  image_refs: string[];
  table_refs: unknown[];
  knowledge_nodes: QuestionBankNode[];
  selection_reason: QuestionBankSelectionReason;
  source: QuestionBankSource;
  selected_option: QuestionBankOption | null;
  eliminated_options: QuestionBankOption[];
  answer_state: "unanswered" | "draft" | "committed";
  answer_committed: boolean;
  doubtful: boolean;
  bookmarked?: boolean;
  confidence_self_rating: number | null;
  answered: boolean;
  result_state: "correct" | "incorrect" | "unanswered" | "excluded" | "annulled";
  feedback_state: "concealed" | "revealed" | "unavailable";
  reasoning_review_eligible: boolean;
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
  /** Era certa a epoca e por isso PONTUA -- o aviso e "a conduta mudou", nao "nao conta". */
  is_outdated: boolean;
  /**
   * Por que a fonte tirou a questao do ar. E inferencia: nenhuma banca publica o
   * motivo em campo, entao `justificativa` ja chega prefixada com "Provavel
   * motivo:" e a tela nao deve desfazer esse hedge.
   */
  annulled_justification?: {
    motivo_code: string;
    motivo_label: string | null;
    justificativa: string;
    is_inferencia: boolean;
  } | null;
  /**
   * Gabarito DUPLO: a banca aceitou mais de uma alternativa, reconhecendo o
   * proprio erro. Nao e anulacao -- a questao vale e pontua, e marcar qualquer
   * uma das aceitas conta como acerto. Diferente de `annulled_justification`,
   * aqui nao ha hedge: a decisao esta no gabarito da banca.
   */
  dual_answer?: {
    accepted: string[];
    fonte_do_gabarito: string;
    nota: string;
  } | null;
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
  feedback_reveal_policy: QuestionBankFeedbackRevealPolicy;
  all_feedback_revealed: boolean;
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

export type LearningPackageRequestStatus =
  | "queued"
  | "submitted"
  | "resolving_cheap"
  | "validating"
  | "repairing_cheap"
  | "resolving_strong"
  | "enriching_package"
  | "needs_review"
  | "partial"
  | "ready"
  | "failed"
  | "superseded";

export type LearningPackageRequest = {
  request_id: string;
  session_id: string;
  position: number;
  attempt_id: string;
  question_id: string;
  question_version: number | null;
  outcome: "correct" | "wrong";
  priority: "high" | "normal";
  status: LearningPackageRequestStatus;
  workflow_id: string | null;
  delivery_source: string | null;
  error: string | null;
  request_kind: "learning_package";
  schema_version: string;
  artifact_states: Record<string, string>;
  last_reconciled_at: string | null;
  next_reconcile_at: string | null;
  reconcile_step: number;
  created_at: string;
  updated_at: string;
};

export type LearningPackageArtifact = {
  artifact_id: string;
  schema_version: string;
  pipeline_version: string;
  payload: unknown;
  approved_at: string | null;
  resolution_id?: string | null;
};

/** Payload de `clinical_resolution`, espelhando `learning-package.v1`.
 *
 * Tipado de propósito: com `payload: unknown` o painel leu por um ano um campo
 * `explanation` que o contrato nunca teve, e o bloco inteiro de correção
 * comentada — incluindo `option_analysis` — nunca renderizou sem nenhum erro
 * de compilação. Campos opcionais porque um pacote `partial` chega incompleto.
 */
export type ClinicalResolutionPayload = {
  selected_option?: string;
  confidence?: number;
  central_concept?: string;
  decisive_clues?: string[];
  option_analysis?: Record<string, string>;
  pedagogical_justification?: string;
  risk_flags?: string[];
};

export type PedagogicalProfileCheckpoint = {
  checkpoint_key: string;
  step_order: number;
  prompt: string;
  kind:
    | "problem_representation"
    | "interpretation"
    | "diagnosis"
    | "risk_stratification"
    | "management"
    | "safety";
  knowledge_node_id: string;
  high_value_reason: string;
  gap_feedback: string;
};

export type PedagogicalProfileV2Payload = {
  learning_objective: string;
  common_error: string;
  cognitive_level: string;
  checkpoints: PedagogicalProfileCheckpoint[];
};

export type LearningPackageArtifacts = Record<string, LearningPackageArtifact> & {
  clinical_resolution?: (LearningPackageArtifact & {
    payload: ClinicalResolutionPayload;
  }) | null;
  pedagogical_profile?: (LearningPackageArtifact & {
    schema_version: "pedagogical-profile.v2";
    payload: PedagogicalProfileV2Payload;
  }) | null;
};

export type LearningPackage = {
  question_id: string;
  question_version: number;
  schema_version: "learning-package.v1";
  status: "partial" | "ready";
  artifacts: LearningPackageArtifacts;
  missing_artifacts: string[];
  updated_at: string | null;
  delivery_source: "canonical";
};

export type LearningPackageResult = {
  request: LearningPackageRequest;
  result: LearningPackage | null;
  refresh_pending: boolean;
};

export type CanonicalFlashcardNote = {
  note_id: string;
  question_id: string | null;
  question_version: number | null;
  source_artifact_id: string | null;
  source_artifact_schema_version: string | null;
  source_template_id: string;
  front: string;
  back: string;
  srs_enrollment_state: "enrolled" | "not_enrolled";
  turbo_due_at: string | null;
  created_at: string;
  updated_at: string;
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
  feedback_reveal_policy?: QuestionBankFeedbackRevealPolicy;
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
  /**
   * Completa a prova com o que a banca tirou do ar depois. Dois campos porque o
   * tratamento difere -- anulada nao pontua, desatualizada pontua -- ainda que a
   * tela ofereca uma escolha so ao aluno.
   */
  include_annulled?: boolean;
  include_outdated?: boolean;
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
  /**
   * Tamanho que cabe no tempo declarado na Rota, e a faixa de ajuste fino em
   * torno dele. `null`/vazio quando a chamada não declarou tempo — a prévia
   * continua servindo o caminho antigo, de barra livre.
   *
   * Vêm do servidor, e não do cliente, pelo mesmo motivo dos campos acima:
   * `KROS_MINUTES_PER_QUESTION` já está espelhado à mão aqui uma vez, e
   * duplicar a regra de novo garantiria divergência.
   */
  suggested_size: number | null;
  size_band: number[];
  composition: KrosComposition;
  /**
   * Bancas alvo do aluno, na ordem de prioridade dele. Vazio quando ele não
   * declarou prova alvo — e aí o modo "foco na banca" não tem o que priorizar.
   */
  target_boards: string[];
  /**
   * Subconjunto de `target_boards` que o pool de candidatos não cobre.
   *
   * Este era o modo de falha real da preferência de banca: o aluno declarava a
   * prova alvo, nada casava, e ele recebia uma prova idêntica à de quem não
   * declarou nada — sem nunca saber. O sintoma só existia em log de servidor.
   */
  unsatisfied_target_boards: string[];
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
export type QuestionBankFeedbackRevealPolicy = "guided_choice" | "reveal_all";

export type QuestionBankReasoningCheckpoint = {
  checkpoint_key: string;
  step_order: number;
  prompt: string;
  kind: string;
  knowledge_node_id: string;
  /**
   * Preenchido só nos itens de `chain`. `not_asked` é o que dá sentido ao
   * curto-circuito para o aluno: o elo aparece, com o enunciado, mas nunca foi
   * perguntado.
   */
  state: "verified" | "current" | "gap" | "not_asked" | null;
};

export type QuestionBankReasoningReview = {
  run_id: string | null;
  question_id: string;
  question_version: number;
  position: number;
  eligible: boolean;
  status:
    | "unavailable"
    | "active"
    | "gap_identified"
    | "awaiting_attribution"
    | "completed"
    | "abandoned_by_reveal";
  current_checkpoint: QuestionBankReasoningCheckpoint | null;
  /**
   * A cadeia inteira, com o estado de cada elo. É o que permite mostrar o que
   * vinha DEPOIS da lacuna sem perguntar — perguntar conduta a quem não fechou
   * o diagnóstico mede chute, e chute contamina o perfil.
   */
  chain: QuestionBankReasoningCheckpoint[];
  first_gap: {
    checkpoint_key: string;
    knowledge_node_id: string;
    knowledge_node_name: string | null;
    response_value: "partial" | "no" | "unsure";
    feedback: string;
  } | null;
  attribution_options: Record<string, string>;
  feedback_state: "concealed" | "revealed" | "unavailable";
};

export type QuestionBankSessionDeleteResult = {
  session_id: string;
  deleted: boolean;
  adaptive_evidence_retained: boolean;
  retained_answer_count: number;
};
