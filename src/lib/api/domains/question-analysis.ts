import { api, authHeader, fetchRaw, toAPIError } from "../shared/http";
import { repairMojibakeDeep } from "../../textEncoding";
import type { APIError } from "../shared/http";

// ── Question Analysis Types ──────────────────────────────────────

type AnalysisStatus = "completed" | "failed" | "needs_review";
type ProgressiveAnalysisStage = "processing" | "analysis_ready" | "completed" | "failed" | "needs_review";
export type AnalysisDifficultyLevel = "baixa" | "média" | "alta";

type QuestionAnalysisSignals = {
  main_clue: string;
  secondary_clue: string;
  misleading_clue: string | null;
  noise: string[];
  detail_that_kills_the_question: string;
};

export type QuestionAnalysisDifferentialItem = {
  diagnosis: string;
  why_it_enters: string;
  what_favors: string;
  what_weakens: string;
  decisive_finding: string;
};

export type QuestionAnalysisHierarchy = {
  atomic_knowledge: string[];
  micro_inferences: string[];
  semantic_blocks: string[];
  syndromic_recognition: string;
  differential_building: QuestionAnalysisDifferentialItem[];
  fine_discrimination: string;
  meta_test_logic: string;
};

export type QuestionAnalysisConceptGraphNode = {
  concept_id: string;
  label: string;
  granularity: "atomic" | "micro" | "macro";
  concept_type: "criterion" | "mechanism" | "definition" | "differential" | "trap" | "procedure";
  transfer_statement: string;
};

export type QuestionAnalysisConceptGraphEdge = {
  from: string;
  to: string;
  relation: "prerequisite" | "causal" | "contrast" | "exclusion" | "sequence";
  why_short: string;
};

export type QuestionAnalysisConceptGraph = {
  nodes: QuestionAnalysisConceptGraphNode[];
  edges: QuestionAnalysisConceptGraphEdge[];
};

export type QuestionAnalysisLearningTarget = {
  concept_id: string;
  priority: number;
  failure_mode: string;
  action_verb: string;
};

export type QuestionAnalysisCognitiveProcess = {
  process: string;
  essential: boolean;
  stage: string;
  failure_effect: string;
};

export type QuestionAnalysisDifficulty = {
  factual: AnalysisDifficultyLevel;
  interpretative: AnalysisDifficultyLevel;
  integrative: AnalysisDifficultyLevel;
  strategic: AnalysisDifficultyLevel;
  overall_justification: string;
};

export type QuestionAnalysisErrorsByLevel = {
  beginner: string;
  intermediate: string;
  advanced: string;
  by_haste: string;
  by_overconfidence: string;
};

export type QuestionCognitiveAnalysis = {
  question_id: string;
  language: string;
  gabarito: string;
  essence: string;
  turning_point: string;
  big_theme: string;
  subthemes: string[];
  hidden_topics: string[];
  signals: QuestionAnalysisSignals;
  hierarchy: QuestionAnalysisHierarchy;
  cognitive_processes: QuestionAnalysisCognitiveProcess[];
  difficulty: QuestionAnalysisDifficulty;
  bank_trap: string;
  likely_error_if_fast: string;
  decision_rule_30s: string;
  first_elimination_move: string;
  red_flag_for_haste: string;
  next_action_for_student: string;
  micro_drill_prompt: string;
  micro_drill_answer: string;
  errors_by_level: QuestionAnalysisErrorsByLevel;
  golden_rule: string;
  reasoning_ladder: string[];
  concept_graph?: QuestionAnalysisConceptGraph;
  learning_target: QuestionAnalysisLearningTarget[];
  flashcards: Array<{
    kind: "basic" | "cloze";
    front: string | null;
    back: string | null;
    cloze: string | null;
    focus: string;
  }>;
};

export type CadernoDraftNotePayload = {
  area: "GO" | "PD" | "MP" | "CG" | "CM" | "OU";
  theme: string;
  source_type: "question";
  question_outcome: "incorrect";
  insight_question: string;
  body: string;
  weight: number;
  question_id: string;
  external_links: string[];
  attachment_refs: string[];
};

export type CadernoDraft = {
  flashcard_index: number;
  kind: "basic" | "cloze";
  focus: string | null;
  concept_id?: string | null;
  concept_signature?: string | null;
  concept_key?: string | null;
  flashcard_key?: string | null;
  template_type?: string | null;
  granularity?: "atomic" | "micro" | "macro" | null;
  relation_context?: string | null;
  quality_score?: number | null;
  recall_mode?:
    | "recordar"
    | "aplicar"
    | "diferenciar"
    | "evitar_armadilha"
    | "por_que_causal"
    | "exam_core"
    | null;
  retrieval_difficulty?: number | null;
  source_concept_id: string[];
  note_payload: CadernoDraftNotePayload;
};

export type ExistingCadernoDraft = {
  note_id: string;
  concept_signature: string;
  concept_key?: string | null;
  match_origin?: "signature" | "concept_key" | "semantic" | null;
  match_scope?: "context" | "global" | null;
  match_score?: number | null;
  source_origin?: "analise_questao" | "manual_caderno" | null;
  insight_question: string;
  body: string;
  template_type?: string | null;
  granularity?: "atomic" | "micro" | "macro" | null;
};

export type QuestionAnalysisResult = {
  record_id: number;
  question_id: string;
  status: AnalysisStatus;
  analysis: QuestionCognitiveAnalysis | null;
  usage: Record<string, unknown> | null;
  review_lane?: string | null;
  quality_flags?: string[];
  analysis_provenance?: Record<string, unknown>;
  safe_to_autodraft?: boolean | null;
  question_quality_inspection?: Record<string, unknown> | null;
  question_dna_profile?: Record<string, unknown> | null;
  repair_draft?: Record<string, unknown> | null;
  budget_usage_summary?: Record<string, unknown>;
  error_message: string | null;
  caderno_drafts: CadernoDraft[];
  existing_caderno_drafts: ExistingCadernoDraft[];
};

export type AnalyzeSimulationErrorsResponse = {
  simulation_id: string;
  user_id: string;
  results: QuestionAnalysisResult[];
};

type ProgressiveAnalyzeQuestionHandle = {
  record_id: number;
  question_id: string;
  stage: ProgressiveAnalysisStage;
};

type AnalyzeSimulationErrorsProgressiveStartResponse = {
  simulation_id: string;
  user_id: string;
  total: number;
  processing: number;
  analysis_ready: number;
  completed: number;
  failed: number;
  needs_review?: number;
  handles: ProgressiveAnalyzeQuestionHandle[];
};

export type AnalyzeSimulationErrorsProgressiveStatusItem = {
  record_id: number;
  question_id: string;
  stage: ProgressiveAnalysisStage;
  error_message: string | null;
  analysis: QuestionCognitiveAnalysis | null;
  usage: Record<string, unknown> | null;
  review_lane?: string | null;
  quality_flags?: string[];
  analysis_provenance?: Record<string, unknown>;
  safe_to_autodraft?: boolean | null;
  question_quality_inspection?: Record<string, unknown> | null;
  question_dna_profile?: Record<string, unknown> | null;
  repair_draft?: Record<string, unknown> | null;
  budget_usage_summary?: Record<string, unknown>;
  caderno_drafts: CadernoDraft[];
  existing_caderno_drafts: ExistingCadernoDraft[];
};

type AnalyzeSimulationErrorsProgressiveStatusResponse = {
  simulation_id: string;
  user_id: string;
  total: number;
  processing: number;
  analysis_ready: number;
  completed: number;
  failed: number;
  needs_review?: number;
  done: boolean;
  results: AnalyzeSimulationErrorsProgressiveStatusItem[];
};

// ── SSE Parser ───────────────────────────────────────────────────

function _parseSseBlock(block: string): { event: string; data: string } | null {
  const trimmed = block.trim();
  if (!trimmed || trimmed.startsWith(":")) return null;
  const lines = trimmed.split(/\r?\n/);
  let event = "message";
  const dataLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith(":")) continue;
    if (line.startsWith("event:")) {
      event = line.slice("event:".length).trim() || "message";
      continue;
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trim());
    }
  }
  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join("\n") };
}

// ── API Functions ────────────────────────────────────────────────

export async function analyzeSimulationErrors(
  token: string,
  payload: {
    user_id: string;
    simulation_id: string;
    force_reanalyze?: boolean;
    wrong_questions: Array<{
      question_id: string;
      stem: string;
      options: Record<string, string>;
      marked_option: string;
      correct_option: string;
      specialty?: string | null;
      theme?: string | null;
      source_exam?: string | null;
      instruction?: string | null;
      image_attachment_refs: string[] | null;
    }>;
  },
): Promise<AnalyzeSimulationErrorsResponse> {
  return api<AnalyzeSimulationErrorsResponse>(
    "/api/analysis/simulations/analyze-errors",
    {
      method: "POST",
      headers: authHeader(token),
      body: JSON.stringify(payload),
      timeoutMs: 420000,
    },
  );
}

export async function startProgressiveSimulationErrors(
  token: string,
  payload: {
    user_id: string;
    simulation_id: string;
    force_reanalyze?: boolean;
    wrong_questions: Array<{
      question_id: string;
      stem: string;
      options: Record<string, string>;
      marked_option: string;
      correct_option: string;
      specialty?: string | null;
      theme?: string | null;
      source_exam?: string | null;
      instruction?: string | null;
      image_attachment_refs: string[] | null;
    }>;
  },
): Promise<AnalyzeSimulationErrorsProgressiveStartResponse> {
  return api<AnalyzeSimulationErrorsProgressiveStartResponse>(
    "/api/analysis/simulations/analyze-errors/progressive/start",
    {
      method: "POST",
      headers: authHeader(token),
      body: JSON.stringify(payload),
      timeoutMs: 60000,
    },
  );
}

export async function getProgressiveSimulationErrorsStatus(
  token: string,
  payload: {
    user_id: string;
    simulation_id: string;
    record_ids: number[];
    include_completed_payload?: boolean;
  },
): Promise<AnalyzeSimulationErrorsProgressiveStatusResponse> {
  return api<AnalyzeSimulationErrorsProgressiveStatusResponse>(
    "/api/analysis/simulations/analyze-errors/progressive/status",
    {
      method: "POST",
      headers: authHeader(token),
      body: JSON.stringify(payload),
      timeoutMs: 60000,
    },
  );
}

type ProgressiveStatusStreamHandlers = {
  signal?: AbortSignal;
  onSnapshot: (snapshot: AnalyzeSimulationErrorsProgressiveStatusResponse) => void;
  onDone?: (snapshot: AnalyzeSimulationErrorsProgressiveStatusResponse) => void;
};

export async function streamProgressiveSimulationErrorsStatus(
  token: string,
  payload: {
    user_id: string;
    simulation_id: string;
    record_ids: number[];
    include_completed_payload?: boolean;
  },
  handlers: ProgressiveStatusStreamHandlers,
): Promise<void> {
  const response = await fetchRaw("/api/analysis/simulations/analyze-errors/progressive/stream", {
    method: "POST",
    headers: {
      ...authHeader(token),
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(payload),
    signal: handlers.signal,
    timeoutMs: 125000,
    retry: false,
  });
  if (!response.ok) {
    throw (await toAPIError(response)) as APIError;
  }
  if (!response.body) {
    throw { message: "Streaming indisponivel nesta resposta." } as APIError;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary = buffer.indexOf("\n\n");
      while (boundary >= 0) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const parsed = _parseSseBlock(block);
        if (!parsed) {
          boundary = buffer.indexOf("\n\n");
          continue;
        }
        if (parsed.event !== "snapshot" && parsed.event !== "done") {
          boundary = buffer.indexOf("\n\n");
          continue;
        }
        let payloadParsed: AnalyzeSimulationErrorsProgressiveStatusResponse;
        try {
          payloadParsed = repairMojibakeDeep(JSON.parse(parsed.data)) as AnalyzeSimulationErrorsProgressiveStatusResponse;
        } catch {
          boundary = buffer.indexOf("\n\n");
          continue;
        }
        if (parsed.event === "done") {
          handlers.onDone?.(payloadParsed);
          if (!handlers.onDone) {
            handlers.onSnapshot(payloadParsed);
          }
          return;
        }
        handlers.onSnapshot(payloadParsed);
        boundary = buffer.indexOf("\n\n");
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // ignore
    }
  }
}

export async function analyzeQuestion(
  token: string,
  payload: {
    user_id: string;
    simulation_id?: string | null;
    force_reanalyze?: boolean;
    question: {
      question_id: string;
      stem: string;
      options: Record<string, string>;
      marked_option: string;
      correct_option: string;
      specialty?: string | null;
      theme?: string | null;
      source_exam?: string | null;
      instruction?: string | null;
      image_attachment_refs: string[] | null;
    };
  },
): Promise<QuestionAnalysisResult> {
  return api<QuestionAnalysisResult>(
    "/api/analysis/question",
    {
      method: "POST",
      headers: authHeader(token),
      body: JSON.stringify(payload),
      timeoutMs: 300000,
    },
  );
}

export async function getSimulationAnalysisResults(
  token: string,
  simulationId: string,
): Promise<AnalyzeSimulationErrorsResponse> {
  return api<AnalyzeSimulationErrorsResponse>(
    `/api/analysis/simulations/${encodeURIComponent(simulationId)}/results`,
    { headers: authHeader(token) },
  );
}
