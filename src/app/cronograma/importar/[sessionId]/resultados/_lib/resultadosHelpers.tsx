import type {
  AnalyzeSimulationErrorsProgressiveStatusItem,
  AnalyzeSimulationErrorsResponse,
  CadernoDraft,
  ExistingCadernoDraft,
  QuestionAnalysisResult,
  StudyImportQuestion,
  WrongQuestionSummary,
} from "@/lib/api";

import type {
  CorrectionQuestion,
  NormalizedAnalysis,
  OptionLetter,
  NormalizeAnalysisInput,
} from "./resultadosTypes";

export const OPTION_ORDER: OptionLetter[] = ["A", "B", "C", "D", "E"];
export const MAX_FLASHCARDS_PER_QUESTION = 3;
export const ANALYSIS_BATCH_FALLBACK_POLL_ATTEMPTS = 5;
export const ANALYSIS_BATCH_FALLBACK_POLL_INTERVAL_MS = 1500;
export const ANALYSIS_SINGLE_FALLBACK_POLL_ATTEMPTS = 30;
export const ANALYSIS_SINGLE_FALLBACK_POLL_INTERVAL_MS = 2000;
export const ANALYSIS_PROGRESSIVE_BASE_POLL_INTERVAL_MS = 1500;
export const ANALYSIS_PROGRESSIVE_MAX_POLL_INTERVAL_MS = 8000;
export const ANALYSIS_IMAGE_MISSING_INSTRUCTION =
  "IMPORTANTE: Esta questão possuí imagem associada que não foi enviada no payload. Se a imagem for decisiva para concluir, declare incerteza explicitamente e limite a análise ao que está no texto.";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function extractQuestionNumberFromQuestionId(questionId: string): number | null {
  const match = String(questionId).match(/_q(\d+)$/i);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeQuestionResult(result: QuestionAnalysisResult): QuestionAnalysisResult {
  const dedupDrafts: CadernoDraft[] = [];
  const seenFlashcardIndexes = new Set<number>();
  for (const draft of result.caderno_drafts ?? []) {
    const idx = Number(draft.flashcard_index);
    if (!Number.isFinite(idx) || idx <= 0) continue;
    if (seenFlashcardIndexes.has(idx)) continue;
    seenFlashcardIndexes.add(idx);
    dedupDrafts.push(draft);
    if (dedupDrafts.length >= MAX_FLASHCARDS_PER_QUESTION) break;
  }
  const dedupExisting: ExistingCadernoDraft[] = [];
  const seenExisting = new Set<string>();
  for (const existing of result.existing_caderno_drafts ?? []) {
    const noteId = String(existing.note_id || "").trim();
    const signature = String(existing.concept_signature || "").trim().toLowerCase();
    const conceptKey = String(existing.concept_key || "").trim().toLowerCase();
    const dedupKey = noteId
      ? `note:${noteId}`
      : signature
        ? `sig:${signature}`
        : conceptKey
          ? `key:${conceptKey}`
          : "";
    if (!dedupKey || seenExisting.has(dedupKey)) continue;
    seenExisting.add(dedupKey);
    dedupExisting.push(existing);
    if (dedupExisting.length >= MAX_FLASHCARDS_PER_QUESTION) break;
  }
  return {
    ...result,
    caderno_drafts: dedupDrafts,
    existing_caderno_drafts: dedupExisting,
  };
}

export function shouldReplaceAnalysisResult(current: QuestionAnalysisResult, candidate: QuestionAnalysisResult): boolean {
  if (candidate.record_id > current.record_id) return true;
  if (candidate.record_id < current.record_id) return false;
  if (candidate.status === "completed" && current.status !== "completed") return true;
  if (candidate.status === "completed" && current.status === "completed") {
    const currentHasPayload = Boolean(current.analysis)
      || Boolean(current.usage)
      || (current.caderno_drafts?.length ?? 0) > 0
      || (current.existing_caderno_drafts?.length ?? 0) > 0;
    const candidateHasPayload = Boolean(candidate.analysis)
      || Boolean(candidate.usage)
      || (candidate.caderno_drafts?.length ?? 0) > 0
      || (candidate.existing_caderno_drafts?.length ?? 0) > 0;
    if (candidateHasPayload && !currentHasPayload) return true;
  }
  return false;
}

export function normalizeAnalysisResponse(
  response: AnalyzeSimulationErrorsResponse | null,
): AnalyzeSimulationErrorsResponse | null {
  if (!response) return null;
  const byQuestionId = new Map<string, QuestionAnalysisResult>();
  for (const raw of response.results ?? []) {
    const normalized = normalizeQuestionResult(raw);
    const existing = byQuestionId.get(normalized.question_id);
    if (!existing || shouldReplaceAnalysisResult(existing, normalized)) {
      byQuestionId.set(normalized.question_id, normalized);
    }
  }
  const sorted = Array.from(byQuestionId.values()).sort((a, b) => {
    const qa = extractQuestionNumberFromQuestionId(a.question_id);
    const qb = extractQuestionNumberFromQuestionId(b.question_id);
    if (qa !== null && qb !== null) return qa - qb;
    if (qa !== null) return -1;
    if (qb !== null) return 1;
    return a.question_id.localeCompare(b.question_id);
  });
  return {
    ...response,
    results: sorted,
  };
}

export function mergeQuestionResultIntoResponse(
  response: AnalyzeSimulationErrorsResponse | null,
  simulationId: string,
  userId: string,
  result: QuestionAnalysisResult,
): AnalyzeSimulationErrorsResponse {
  const base: AnalyzeSimulationErrorsResponse = response ?? {
    simulation_id: simulationId,
    user_id: userId,
    results: [],
  };
  return normalizeAnalysisResponse({
    ...base,
    results: [...base.results, result],
  }) as AnalyzeSimulationErrorsResponse;
}

const PROGRESSIVE_STAGE_PRIORITY: Record<string, number> = {
  processing: 1,
  analysis_ready: 2,
  completed: 3,
  failed: 3,
};

export function shouldReplaceProgressiveResult(
  current: AnalyzeSimulationErrorsProgressiveStatusItem | undefined,
  candidate: AnalyzeSimulationErrorsProgressiveStatusItem,
): boolean {
  if (!current) return true;
  if (candidate.record_id > current.record_id) return true;
  if (candidate.record_id < current.record_id) return false;
  const currentPriority = PROGRESSIVE_STAGE_PRIORITY[current.stage] ?? 0;
  const candidatePriority = PROGRESSIVE_STAGE_PRIORITY[candidate.stage] ?? 0;
  if (candidatePriority > currentPriority) return true;
  if (candidatePriority < currentPriority) return false;
  if (candidate.stage === "analysis_ready" && current.stage === "analysis_ready") {
    const currentHasAnalysis = Boolean(current.analysis);
    const candidateHasAnalysis = Boolean(candidate.analysis);
    return candidateHasAnalysis && !currentHasAnalysis;
  }
  return false;
}

export function IconGrid({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : null;
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asString(item))
    .filter((item): item is string => Boolean(item));
}

function foldText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function parseOptionLetter(value: string): OptionLetter | null {
  const folded = foldText(value.trim());
  const direct = folded.match(/^\s*[\(\[]?\s*([A-E])(?:\s*[\)\].:-])?(?:\s|$)/);
  if (direct?.[1]) return direct[1] as OptionLetter;
  const context = folded.match(/\b(?:ALTERNATIVA|LETRA|OPCAO)\s*([A-E])\b/);
  if (context?.[1]) return context[1] as OptionLetter;
  if (folded.length <= 4) {
    const short = folded.match(/\b([A-E])\b/);
    if (short?.[1]) return short[1] as OptionLetter;
  }
  return null;
}

export function canonicalOptionLetter(
  value: string | null | undefined,
  validOptionKeys?: Iterable<string>,
): OptionLetter | null {
  if (!value) return null;
  const parsed = parseOptionLetter(value);
  if (!parsed) return null;
  if (!validOptionKeys) return parsed;
  const valid = new Set<OptionLetter>();
  for (const key of validOptionKeys) {
    const fromKey = parseOptionLetter(String(key));
    if (fromKey) valid.add(fromKey);
  }
  if (valid.size === 0) return parsed;
  return valid.has(parsed) ? parsed : null;
}

export function asOptionLetter(value: string | null | undefined): OptionLetter | null {
  return canonicalOptionLetter(value);
}

export function normalizeAnalysis(analysis: NormalizeAnalysisInput): NormalizedAnalysis {
  const root = asRecord(analysis);
  const signals = asRecord(root?.signals);
  const errorsByLevel = asRecord(root?.errors_by_level);
  const conceptGraph = asRecord(root?.concept_graph);
  const nodesRaw = Array.isArray(conceptGraph?.nodes) ? conceptGraph?.nodes : [];
  const learningTargetsRaw = Array.isArray(root?.learning_targets) ? root?.learning_targets : [];
  const nodeById = new Map<string, Record<string, unknown>>();
  for (const node of nodesRaw) {
    const nodeRecord = asRecord(node);
    if (!nodeRecord) continue;
    const conceptId = asString(nodeRecord.concept_id);
    if (!conceptId) continue;
    nodeById.set(conceptId, nodeRecord);
  }
  const targetByConcept = new Map<string, Record<string, unknown>>();
  for (const target of learningTargetsRaw) {
    const targetRecord = asRecord(target);
    if (!targetRecord) continue;
    const conceptId = asString(targetRecord.concept_id);
    if (!conceptId || targetByConcept.has(conceptId)) continue;
    targetByConcept.set(conceptId, targetRecord);
  }
  const atomicEssentials = Array.from(nodeById.entries())
    .map(([conceptId, node]) => {
      const granularity = asString(node.granularity);
      if (granularity !== "atomic") return null;
      const target = targetByConcept.get(conceptId);
      const rawPriority = target ? Number(target.priority) : Number.NaN;
      const priority = Number.isFinite(rawPriority) ? Math.trunc(rawPriority) : null;
      return {
        conceptId,
        label: asString(node.label) ?? conceptId,
        transferStatement: asString(node.transfer_statement),
        priority,
        actionVerb: asString(target?.action_verb),
        failureMode: asString(target?.failure_mode),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return {
    essence: asString(root?.essence),
    microDrillPrompt: asString(root?.micro_drill_prompt),
    microDrillAnswer: asString(root?.micro_drill_answer),
    mainClue: asString(signals?.main_clue),
    killerDetail: asString(signals?.detail_that_kills_the_question),
    errorsByLevel: {
      beginner: asString(errorsByLevel?.beginner),
      intermediate: asString(errorsByLevel?.intermediate),
      advanced: asString(errorsByLevel?.advanced),
      byHaste: asString(errorsByLevel?.by_haste),
      byOverconfidence: asString(errorsByLevel?.by_overconfidence),
    },
    reasoningLadder: asStringArray(root?.reasoning_ladder),
    atomicEssentials,
  };
}

export function getImageContextFromUsage(usage: Record<string, unknown> | null | undefined): {
  attempted: boolean;
  included: boolean;
  fallbackToText: boolean;
  fallbackReason: string | null;
  candidateCount: number;
  includedCount: number;
  consideredByAiCount: number;
  itemReasons: string[];
} {
  const root = asRecord(usage);
  const imageContext = asRecord(root?.image_context);
  if (!imageContext) {
    return {
      attempted: false,
      included: false,
      fallbackToText: false,
      fallbackReason: null,
      candidateCount: 0,
      includedCount: 0,
      consideredByAiCount: 0,
      itemReasons: [],
    };
  }
  const rawItems = Array.isArray(imageContext.items) ? imageContext.items : [];
  const reasons = rawItems
    .map((item) => asRecord(item))
    .map((item) => asString(item?.reason))
    .filter((reason): reason is string => Boolean(reason) && reason !== "included");
  const candidateCountRaw = Number(imageContext.candidate_count);
  const includedCountRaw = Number(imageContext.included_count);
  const consideredByAiCountRaw = Number(imageContext.considered_by_ai_count);
  return {
    attempted: Boolean(imageContext.attempted),
    included: Boolean(imageContext.included),
    fallbackToText: Boolean(imageContext.fallback_to_text),
    fallbackReason: asString(imageContext.fallback_reason),
    candidateCount: Number.isFinite(candidateCountRaw) ? Math.trunc(candidateCountRaw) : 0,
    includedCount: Number.isFinite(includedCountRaw) ? Math.trunc(includedCountRaw) : 0,
    consideredByAiCount: Number.isFinite(consideredByAiCountRaw) ? Math.trunc(consideredByAiCountRaw) : 0,
    itemReasons: reasons,
  };
}

export function imageFallbackReasonLabel(reason: string | null): string {
  if (!reason) return "indisponivel";
  if (reason === "load_failed") return "falha ao carregar";
  if (reason === "too_large") return "arquivo acima do limite";
  if (reason === "empty_bytes") return "arquivo vazio";
  if (reason === "missing_ref") return "referencia ausente";
  return reason.replaceAll("_", " ");
}

export function getAtomicityQualityFromUsage(usage: Record<string, unknown> | null | undefined): {
  atomicityOk: boolean | null;
  atomicNodesCount: number;
  learningTargetsCount: number;
  atomicRetryUsed: boolean;
  message: string | null;
} {
  const root = asRecord(usage);
  const quality = asRecord(root?.quality);
  if (!quality) {
    return {
      atomicityOk: null,
      atomicNodesCount: 0,
      learningTargetsCount: 0,
      atomicRetryUsed: false,
      message: null,
    };
  }
  const atomicNodesRaw = Number(quality.atomic_nodes_count);
  const learningTargetsRaw = Number(quality.learning_targets_count);
  const atomicityOkValue = quality.atomicity_ok;
  const atomicityOk = typeof atomicityOkValue === "boolean" ? atomicityOkValue : null;
  return {
    atomicityOk,
    atomicNodesCount: Number.isFinite(atomicNodesRaw) ? Math.trunc(atomicNodesRaw) : 0,
    learningTargetsCount: Number.isFinite(learningTargetsRaw) ? Math.trunc(learningTargetsRaw) : 0,
    atomicRetryUsed: Boolean(quality.atomic_retry_used),
    message: asString(quality.message),
  };
}

export function countErrorsByLevelFilled(normalized: NormalizedAnalysis): number {
  return Object.values(normalized.errorsByLevel).filter(Boolean).length;
}

export function buildCorrectionQuestion(
  question: StudyImportQuestion,
  wrongSummary: WrongQuestionSummary | undefined,
): CorrectionQuestion | null {
  if (question.is_annulled) return null;

  const markedOption = asOptionLetter(question.state.selected_option)
    ?? asOptionLetter(wrongSummary?.marked_option);
  const correctOption = asOptionLetter(question.correct_answer)
    ?? asOptionLetter(wrongSummary?.correct_option);

  let status: CorrectionQuestion["status"];
  if (markedOption && correctOption) {
    status = markedOption === correctOption ? "correct" : "wrong";
  } else if (wrongSummary) {
    status = "wrong";
  } else {
    status = "correct";
  }

  return {
    question_number: question.question_number,
    stem: question.stem || wrongSummary?.stem || "",
    options: question.options,
    status,
    marked_option: markedOption,
    correct_option: correctOption,
    has_image: question.has_image,
    image_attachment_refs: question.image_attachment_refs ?? [],
    option_image_attachment_refs: question.option_image_attachment_refs ?? {},
  };
}
