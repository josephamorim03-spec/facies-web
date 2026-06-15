import { api, fetchRaw, parseJsonSafe, STUDY_IMPORT_SESSION_CREATE_TIMEOUT_MS } from "../shared/http";

export type QuestionBankAdminWarning = {
  code: string;
  severity: "info" | "warning" | "critical";
  message: string;
  years_detected?: number[];
  quality_score?: number;
  reason?: string;
  provider?: string;
  samples?: { question_number: number | string | null; sample: string }[];
};

export type QuestionBankOcrSummary = {
  enabled?: boolean;
  provider?: string;
  attempted?: boolean;
  available?: boolean;
  runtime_ready?: boolean;
  used?: boolean;
  pages_used?: number;
  unavailable_reason?: string | null;
};

export type QuestionBankQuestionDiagnostic = {
  question_number: number | string | null;
  blockers: string[];
  warnings: string[];
  option_count: number;
  answer: string;
  confidence_score: number;
  requires_image: boolean;
  has_image: boolean;
  extraction_source?: string;
  ocr_used?: boolean;
  stem_sample: string;
};

export type QuestionBankAdminPreviewSummary = {
  detected_metadata: Record<string, unknown>;
  override_metadata: Record<string, unknown>;
  question_overrides?: Record<string, Record<string, unknown>>;
  import_metadata_used: Record<string, unknown>;
  editorial_controls?: {
    classification_preset_policy?: string | null;
    batch_classification_preset?: Record<string, string>;
    batch_source_profile?: Record<string, unknown>;
    question_override_count?: number;
    question_override_numbers?: string[];
  };
  question_editorial_metadata?: QuestionBankEditorialMetadata[];
  years_detected: number[];
  years_applied: number[];
  is_mixed_source: boolean;
  warnings: QuestionBankAdminWarning[];
  quality_summary?: {
    total_questions?: number;
    blocked_questions?: number;
    warning_questions?: number;
    publishable_questions?: number;
    quality_score?: number;
    suspicious?: boolean;
    image_extraction_failed?: boolean;
    ocr_summary?: QuestionBankOcrSummary;
    question_diagnostics?: QuestionBankQuestionDiagnostic[];
  };
  question_diagnostics?: QuestionBankQuestionDiagnostic[];
};

export type QuestionBankEditorialMetadata = {
  question_number: string | null;
  detected_metadata: Record<string, unknown>;
  batch_metadata: Record<string, unknown>;
  override_metadata: Record<string, unknown>;
  resolved_metadata: Record<string, unknown>;
  source_profile: Record<string, unknown>;
  classification_preset: Record<string, unknown>;
  classification_preset_policy: string | null;
  classification_locked_fields: string[];
  classification_ai_fill_fields: string[];
};

export type QuestionBankAdminPreview = {
  exam: Record<string, unknown>;
  questions: Array<{
    number?: number | string;
    stem?: string;
    correct_answer?: string | null;
    confidence_score?: number;
    extraction_source?: string;
    ocr_used?: boolean;
    has_image?: boolean;
    metadata?: Record<string, unknown>;
    editorial_metadata?: QuestionBankEditorialMetadata;
    primary_medical_area?: { code?: string; name?: string } | null;
  }>;
  request_id?: string;
  preview_summary: QuestionBankAdminPreviewSummary;
};

export type QuestionBankAdminImportItem = {
  id: string;
  file_name: string | null;
  file_sha256: string | null;
  source_id: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  detected_metadata: Record<string, unknown>;
  import_metadata: Record<string, unknown>;
  source: {
    institution: string | null;
    exam_name: string | null;
    year: number | null;
    access_type: string | null;
  };
  years_detected: number[];
  years_applied: number[];
  is_mixed_source: boolean;
  source_metadata: Record<string, unknown>;
  pipeline_counts?: {
    pending: number;
    processing: number;
    done: number;
    failed: number;
  };
  pipeline?: QuestionBankAdminPipelineSnapshot;
};

export type QuestionBankAdminPipelineStage = {
  job_type: string;
  pending: number;
  processing: number;
  done: number;
  failed: number;
  avg_duration_ms: number | null;
  last_error: string | null;
  last_error_at: string | null;
};

export type QuestionBankAdminPipelineSnapshot = {
  pipeline_jobs: Array<{ job_type: string; status: string; n: number }>;
  stage_stats: QuestionBankAdminPipelineStage[];
  candidate_counts: Array<{ status: string; n: number }>;
  questions_by_status: Array<{ status: string; content_grade: string | null; n: number }>;
  job_counts: {
    pending_jobs: number;
    processing_jobs: number;
    failed_jobs: number;
    done_jobs: number;
    published_jobs: number;
    human_review_questions: number;
  };
  last_error_by_stage: Record<string, { message?: string; updated_at?: string }>;
};

export type QuestionBankAdminPipelineStatus = {
  summary: {
    published_questions: number;
    imported_files: number;
    pending_jobs: number;
    processing_jobs: number;
    failed_jobs: number;
    done_jobs: number;
    published_jobs: number;
    human_review_questions: number;
  };
  knowledge_nodes: Array<{ type: string; n: number }>;
} & QuestionBankAdminPipelineSnapshot;

export type QuestionBankAdminReadiness = {
  status: "ok" | "degraded";
  database: "ok" | "error";
  admin_api_enabled: boolean;
  llm_enabled: boolean;
  auto_pipeline_enabled: boolean;
  pipeline_workers: number;
  providers: {
    cheap: { provider: string; model: string; configured: boolean };
    strong: { provider: string; model: string; configured: boolean };
  };
  pipeline: QuestionBankAdminPipelineSnapshot;
};

export type QuestionBankAdminCandidate = {
  id: string;
  question_number: number | string | null;
  original_page: number | null;
  status: string | null;
  extraction_confidence: number | null;
  raw_stem: string | null;
  raw_answer: string | null;
  question_id: string | null;
  question_status: string | null;
  content_grade: string | null;
  classification_confidence: number | null;
  question_metadata: Record<string, unknown>;
  source_metadata: Record<string, unknown>;
  year: number | null;
  institution: string | null;
  has_image: boolean;
};

export type QuestionBankAdminCandidatesResponse = {
  imported_file_id: string;
  items: QuestionBankAdminCandidate[];
  total: number;
  limit: number;
  offset: number;
};

export type QuestionBankReviewQueueItem = {
  id: string;
  occurrence_id: string | null;
  source_id: string | null;
  imported_file_id: string;
  question_number: string | null;
  raw_stem: string | null;
  extraction_confidence: number | null;
  status: string;
  created_at: string | null;
  dedup: {
    decision_id: string | null;
    decision: string | null;
    confidence: number | null;
    matched_question_id: string | null;
    matched_candidate_id: string | null;
    evidence: Record<string, unknown>;
  };
};

export async function previewQuestionBankAdminImport(
  file: File,
  metadata: Record<string, unknown>,
  questionOverrides?: Record<string, Record<string, unknown>>,
): Promise<QuestionBankAdminPreview> {
  const form = new FormData();
  form.set("file", file);
  form.set("metadata", JSON.stringify(metadata));
  if (questionOverrides && Object.keys(questionOverrides).length > 0) {
    form.set("question_overrides", JSON.stringify(questionOverrides));
  }
  return api<QuestionBankAdminPreview>("/api/admin/question-bank/imports/preview", {
    method: "POST",
    body: form,
    timeoutMs: STUDY_IMPORT_SESSION_CREATE_TIMEOUT_MS,
    retry: false,
  });
}

export async function importQuestionBankAdminFile(
  file: File,
  metadata: Record<string, unknown>,
  options?: { auto_pipeline?: boolean; question_overrides?: Record<string, Record<string, unknown>> },
): Promise<{
  imported_file_id: string;
  source_id: string | null;
  status: string;
  pipeline_job_id: string | null;
  occurrences_created: number;
  candidates_created: number;
  sources_created: number;
  duplicate_file: boolean;
  years_detected: number[];
  years_applied: number[];
  is_mixed_source: boolean;
  auto_pipeline_launched?: boolean;
  auto_pipeline_triggered?: boolean;
  preview_summary?: QuestionBankAdminPreviewSummary;
}> {
  const form = new FormData();
  form.set("file", file);
  form.set("metadata", JSON.stringify(metadata));
  if (options?.question_overrides && Object.keys(options.question_overrides).length > 0) {
    form.set("question_overrides", JSON.stringify(options.question_overrides));
  }
  if (options?.auto_pipeline) form.set("auto_pipeline", "true");
  return api<{
    imported_file_id: string;
    source_id: string | null;
    status: string;
    pipeline_job_id: string | null;
    occurrences_created: number;
    candidates_created: number;
    sources_created: number;
    duplicate_file: boolean;
    years_detected: number[];
    years_applied: number[];
    is_mixed_source: boolean;
    auto_pipeline_launched?: boolean;
    auto_pipeline_triggered?: boolean;
    preview_summary?: QuestionBankAdminPreviewSummary;
  }>("/api/admin/question-bank/imports/files", {
    method: "POST",
    body: form,
    timeoutMs: STUDY_IMPORT_SESSION_CREATE_TIMEOUT_MS,
    retry: false,
  });
}

export async function listQuestionBankAdminImports(
  options?: { limit?: number; offset?: number },
): Promise<{ imports: QuestionBankAdminImportItem[]; total: number; limit: number; offset: number }> {
  const params = new URLSearchParams();
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.offset) params.set("offset", String(options.offset));
  const qs = params.toString();
  return api<{ imports: QuestionBankAdminImportItem[]; total: number; limit: number; offset: number }>(
    `/api/admin/question-bank/imports${qs ? `?${qs}` : ""}`,
  );
}

export async function getQuestionBankAdminImport(importId: string): Promise<QuestionBankAdminImportItem> {
  return api<QuestionBankAdminImportItem>(`/api/admin/question-bank/imports/${encodeURIComponent(importId)}`);
}

export async function getQuestionBankAdminCandidates(
  importId: string,
  options?: { status?: string; limit?: number; offset?: number },
): Promise<QuestionBankAdminCandidatesResponse> {
  const params = new URLSearchParams();
  if (options?.status) params.set("status", options.status);
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.offset) params.set("offset", String(options.offset));
  const qs = params.toString();
  return api<QuestionBankAdminCandidatesResponse>(
    `/api/admin/question-bank/imports/${encodeURIComponent(importId)}/candidates${qs ? `?${qs}` : ""}`,
  );
}

export async function getQuestionBankAdminPipelineStatus(): Promise<QuestionBankAdminPipelineStatus> {
  return api<QuestionBankAdminPipelineStatus>("/api/admin/question-bank/pipeline/status");
}

export async function getQuestionBankAdminReadiness(): Promise<QuestionBankAdminReadiness> {
  return api<QuestionBankAdminReadiness>("/api/admin/question-bank/pipeline/readiness");
}

export async function processQuestionBankAdminBatch(
  jobType: string,
  batchSize: number,
  workers: number,
  importedFileId?: string,
): Promise<{ job_type: string; processed: number; failed: number; skipped: number }> {
  const params = new URLSearchParams({
    job_type: jobType,
    batch_size: String(batchSize),
    workers: String(workers),
  });
  if (importedFileId) params.set("imported_file_id", importedFileId);
  return api<{ job_type: string; processed: number; failed: number; skipped: number }>(
    `/api/admin/question-bank/pipeline/process-batch?${params.toString()}`,
    {
      method: "POST",
    },
  );
}

export async function runQuestionBankAdminAll(background: boolean, importedFileId?: string): Promise<{
  launched: boolean;
  background: boolean;
  workers?: number;
  imported_file_id?: string | null;
  totals?: Record<string, number>;
}> {
  const params = new URLSearchParams({ background: background ? "true" : "false" });
  if (importedFileId) params.set("imported_file_id", importedFileId);
  return api<{
    launched: boolean;
    background: boolean;
    workers?: number;
    imported_file_id?: string | null;
    totals?: Record<string, number>;
  }>(`/api/admin/question-bank/pipeline/run-all?${params.toString()}`, {
    method: "POST",
  });
}

export async function getQuestionBankReviewQueue(
  options?: { limit?: number; offset?: number; imported_file_id?: string },
): Promise<{ items: QuestionBankReviewQueueItem[]; total: number; limit: number; offset: number }> {
  const params = new URLSearchParams();
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.offset) params.set("offset", String(options.offset));
  if (options?.imported_file_id) params.set("imported_file_id", options.imported_file_id);
  const qs = params.toString();
  return api<{ items: QuestionBankReviewQueueItem[]; total: number; limit: number; offset: number }>(
    `/api/admin/question-bank/candidates/review-queue${qs ? `?${qs}` : ""}`,
  );
}

export async function resolveQuestionBankReviewCandidate(
  candidateId: string,
  action: "accept_as_canonical" | "accept_as_duplicate" | "discard",
  options?: { question_id?: string; reason?: string; review_note?: string },
): Promise<{ candidate_id: string; action: string; question_id?: string; status?: string }> {
  return api<{ candidate_id: string; action: string; question_id?: string; status?: string }>(
    `/api/admin/question-bank/candidates/review-queue/${encodeURIComponent(candidateId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ action, ...options }),
      headers: { "Content-Type": "application/json", "x-krosmed-csrf": "1" },
    },
  );
}

export async function updateQuestionBankQuestionStatus(
  questionId: string,
  action: "publish" | "unpublish" | "block" | "deprecate",
  options?: { reason?: string },
): Promise<{ question_id: string; action: string; status: string }> {
  return api<{ question_id: string; action: string; status: string }>(
    `/api/admin/question-bank/questions/${encodeURIComponent(questionId)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ action, reason: options?.reason ?? `admin_ui_${action}` }),
      headers: { "Content-Type": "application/json", "x-krosmed-csrf": "1" },
    },
  );
}

export async function enqueueQuestionBankQuestionAnalysis(
  questionId: string,
): Promise<{ question_id: string; candidate_id: string; job_id: string; status: string }> {
  return api<{ question_id: string; candidate_id: string; job_id: string; status: string }>(
    `/api/admin/question-bank/questions/${encodeURIComponent(questionId)}/analyze`,
    { method: "POST", headers: { "x-krosmed-csrf": "1" } },
  );
}

// ─── Question management (search / detail / edit / delete) ───────────────────

export type QuestionBankAdminQuestionListItem = {
  id: string;
  stem: string;
  answer: string | null;
  status: string | null;
  content_grade: string | null;
  classification_confidence: number | null;
  board_code: string | null;
  year: number | null;
  institution: string | null;
  primary_node_name: string | null;
  has_image: boolean;
  updated_at: string | null;
};

export type QuestionBankAdminQuestionsResponse = {
  items: QuestionBankAdminQuestionListItem[];
  total: number;
  limit: number;
  offset: number;
};

export type QuestionBankAdminQuestionNode = {
  knowledge_node_id: string;
  role: string | null;
  is_primary: boolean;
  node_name: string | null;
  node_code: string | null;
  node_type: string | null;
};

export type QuestionBankAdminQuestionDetail = {
  id: string;
  stem: string;
  alternatives: Record<string, string>;
  answer: string | null;
  status: string | null;
  content_grade: string | null;
  difficulty_estimate: number | null;
  classification_confidence: number | null;
  is_annulled: boolean;
  is_blocked: boolean;
  version: number | null;
  nodes: QuestionBankAdminQuestionNode[];
  images: { idx: number; content_type: string }[];
  image_refs: string[];
  source: Record<string, unknown>;
  publish_blockers: string[];
  charge_profile: Record<string, unknown>;
  edit_log: { by?: string; at?: string; fields?: string[] }[];
};

export type QuestionBankAdminKnowledgeNode = {
  id: string;
  code: string | null;
  name: string;
  type: string | null;
};

export type QuestionBankAdminQuestionPatch = {
  canonical_stem_md?: string;
  canonical_alternatives?: Record<string, string>;
  canonical_answer?: string;
  difficulty_estimate?: number;
  primary_node_id?: string;
};

export type QuestionBankAdminEditResult = {
  result: "updated" | "blocked" | "duplicate_of" | "not_found";
  question_id: string;
  blockers?: string[];
  duplicate_of?: string;
  changed_fields?: string[];
};

export async function searchQuestionBankAdminQuestions(params?: {
  q?: string;
  status?: string;
  content_grade?: string;
  board_code?: string;
  year?: number;
  knowledge_node_id?: string;
  has_image?: boolean;
  limit?: number;
  offset?: number;
}): Promise<QuestionBankAdminQuestionsResponse> {
  const search = new URLSearchParams();
  if (params?.q?.trim()) search.set("q", params.q.trim());
  if (params?.status) search.set("status", params.status);
  if (params?.content_grade) search.set("content_grade", params.content_grade);
  if (params?.board_code?.trim()) search.set("board_code", params.board_code.trim());
  if (params?.year) search.set("year", String(params.year));
  if (params?.knowledge_node_id) search.set("knowledge_node_id", params.knowledge_node_id);
  if (params?.has_image !== undefined) search.set("has_image", params.has_image ? "true" : "false");
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.offset) search.set("offset", String(params.offset));
  const qs = search.toString();
  return api<QuestionBankAdminQuestionsResponse>(
    `/api/admin/question-bank/questions${qs ? `?${qs}` : ""}`,
  );
}

export async function getQuestionBankAdminQuestion(
  questionId: string,
): Promise<QuestionBankAdminQuestionDetail> {
  return api<QuestionBankAdminQuestionDetail>(
    `/api/admin/question-bank/questions/${encodeURIComponent(questionId)}`,
  );
}

export async function editQuestionBankAdminQuestion(
  questionId: string,
  patch: QuestionBankAdminQuestionPatch,
): Promise<QuestionBankAdminEditResult> {
  // 409 (blocked / duplicate_of) carries a discriminated body — read it directly
  // instead of throwing, so the edit form can show blockers inline.
  const res = await fetchRaw(
    `/api/admin/question-bank/questions/${encodeURIComponent(questionId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ patch }),
      headers: { "Content-Type": "application/json", "x-krosmed-csrf": "1" },
    },
  );
  const data = await parseJsonSafe(res);
  if (data && typeof data === "object" && "result" in data) {
    return data as QuestionBankAdminEditResult;
  }
  throw new Error(`Falha ao editar questão (HTTP ${res.status})`);
}

export async function deleteQuestionBankAdminQuestion(
  questionId: string,
  options?: { hard?: boolean; reason?: string },
): Promise<{ result: string; question_id: string; status?: string }> {
  const search = new URLSearchParams();
  if (options?.hard) search.set("hard", "true");
  if (options?.reason) search.set("reason", options.reason);
  const qs = search.toString();
  return api<{ result: string; question_id: string; status?: string }>(
    `/api/admin/question-bank/questions/${encodeURIComponent(questionId)}${qs ? `?${qs}` : ""}`,
    { method: "DELETE", headers: { "x-krosmed-csrf": "1" } },
  );
}

export async function listQuestionBankAdminKnowledgeNodes(params?: {
  q?: string;
  type?: string;
  limit?: number;
}): Promise<{ items: QuestionBankAdminKnowledgeNode[] }> {
  const search = new URLSearchParams();
  if (params?.q?.trim()) search.set("q", params.q.trim());
  if (params?.type) search.set("type", params.type);
  if (params?.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  return api<{ items: QuestionBankAdminKnowledgeNode[] }>(
    `/api/admin/question-bank/knowledge-nodes${qs ? `?${qs}` : ""}`,
  );
}

export async function patchQuestionBankCandidate(
  candidateId: string,
  fields: {
    raw_stem?: string;
    raw_answer?: string;
    raw_alternatives?: Record<string, string>;
    institution?: string;
    year?: number;
  },
): Promise<{ candidate: QuestionBankAdminCandidate; question: unknown }> {
  return api<{ candidate: QuestionBankAdminCandidate; question: unknown }>(
    `/api/admin/question-bank/candidates/${encodeURIComponent(candidateId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(fields),
      headers: { "Content-Type": "application/json", "x-krosmed-csrf": "1" },
    },
  );
}
