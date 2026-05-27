import {
  getProgressiveSimulationErrorsStatus,
  getSimulationAnalysisResults,
  streamProgressiveSimulationErrorsStatus,
} from "@/lib/api";
import type {
  AnalyzeSimulationErrorsProgressiveStatusItem,
  AnalyzeSimulationErrorsResponse,
  QuestionAnalysisResult,
} from "@/lib/api";
import {
  ANALYSIS_BATCH_FALLBACK_POLL_ATTEMPTS,
  ANALYSIS_BATCH_FALLBACK_POLL_INTERVAL_MS,
  ANALYSIS_PROGRESSIVE_BASE_POLL_INTERVAL_MS,
  ANALYSIS_PROGRESSIVE_MAX_POLL_INTERVAL_MS,
  mergeQuestionResultIntoResponse,
  normalizeAnalysisResponse,
  normalizeQuestionResult,
  shouldReplaceAnalysisResult,
  shouldReplaceProgressiveResult,
  sleep,
} from "./resultadosHelpers";
import type { ProgressiveByQuestion, ProgressiveSummary } from "./resultadosTypes";

export type PollingRefs = {
  progressiveStartedRef: React.MutableRefObject<boolean>;
  progressivePollInFlightRef: React.MutableRefObject<boolean>;
  progressiveRecordIdsRef: React.MutableRefObject<number[]>;
  progressivePollDelayMsRef: React.MutableRefObject<number>;
  progressiveFingerprintRef: React.MutableRefObject<string>;
  progressivePollFailureCountRef: React.MutableRefObject<number>;
  progressiveModeRef: React.MutableRefObject<"batch" | "single" | null>;
  progressiveHydrateOnDoneRef: React.MutableRefObject<boolean>;
  progressiveSingleQuestionIdRef: React.MutableRefObject<string | null>;
  progressiveStreamAbortRef: React.MutableRefObject<AbortController | null>;
  progressiveStreamActiveRef: React.MutableRefObject<boolean>;
  analyzingBatchRef: React.MutableRefObject<boolean>;
  analyzingSingleRef: React.MutableRefObject<string | null>;
};

export function createPollingRefs(): PollingRefs {
  return {
    progressiveStartedRef: { current: false },
    progressivePollInFlightRef: { current: false },
    progressiveRecordIdsRef: { current: [] },
    progressivePollDelayMsRef: { current: ANALYSIS_PROGRESSIVE_BASE_POLL_INTERVAL_MS },
    progressiveFingerprintRef: { current: "" },
    progressivePollFailureCountRef: { current: 0 },
    progressiveModeRef: { current: null },
    progressiveHydrateOnDoneRef: { current: false },
    progressiveSingleQuestionIdRef: { current: null },
    progressiveStreamAbortRef: { current: null },
    progressiveStreamActiveRef: { current: false },
    analyzingBatchRef: { current: false },
    analyzingSingleRef: { current: null },
  };
}

export function resetPollingRefs(refs: PollingRefs): void {
  refs.progressiveStreamAbortRef.current?.abort();
  refs.progressiveStreamAbortRef.current = null;
  refs.progressiveStreamActiveRef.current = false;
  const mode = refs.progressiveModeRef.current;
  if (mode === "batch") {
    refs.analyzingBatchRef.current = false;
  }
  if (mode === "single") {
    refs.analyzingSingleRef.current = null;
  }
  refs.progressiveStartedRef.current = false;
  refs.progressivePollInFlightRef.current = false;
  refs.progressiveRecordIdsRef.current = [];
  refs.progressivePollDelayMsRef.current = ANALYSIS_PROGRESSIVE_BASE_POLL_INTERVAL_MS;
  refs.progressiveFingerprintRef.current = "";
  refs.progressivePollFailureCountRef.current = 0;
  refs.progressiveModeRef.current = null;
  refs.progressiveHydrateOnDoneRef.current = false;
  refs.progressiveSingleQuestionIdRef.current = null;
}

export async function pollSimulationResults(
  authToken: string,
  simulationId: string,
  questionId?: string,
  minRecordId?: number,
  attempts: number = ANALYSIS_BATCH_FALLBACK_POLL_ATTEMPTS,
  intervalMs: number = ANALYSIS_BATCH_FALLBACK_POLL_INTERVAL_MS,
): Promise<{ response: AnalyzeSimulationErrorsResponse; result: QuestionAnalysisResult | null } | null> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const fallback = normalizeAnalysisResponse(
        await getSimulationAnalysisResults(authToken, simulationId),
      );
      if (fallback && fallback.results.length > 0) {
        if (!questionId) {
          return { response: fallback, result: null };
        }
        const found = fallback.results.find((item) => item.question_id === questionId) ?? null;
        if (found) {
          if (minRecordId && found.record_id <= minRecordId) {
            // keep polling until a newer persisted record appears
          } else {
            return { response: fallback, result: found };
          }
        }
      }
    } catch {
      // noop: continue polling for persisted results
    }
    if (attempt < attempts) {
      await sleep(intervalMs);
    }
  }
  return null;
}

export function mergeProgressiveResults(
  items: AnalyzeSimulationErrorsProgressiveStatusItem[],
  prevProgressiveByQuestion: ProgressiveByQuestion,
  prevPerQuestionAnalysis: Record<string, QuestionAnalysisResult>,
  prevAnalysisResponse: AnalyzeSimulationErrorsResponse | null,
  sessionId: string,
  userId: string,
): {
  progressiveByQuestion: ProgressiveByQuestion;
  perQuestionAnalysis: Record<string, QuestionAnalysisResult>;
  analysisResponse: AnalyzeSimulationErrorsResponse | null;
} {
  if (!items || items.length === 0) {
    return {
      progressiveByQuestion: prevProgressiveByQuestion,
      perQuestionAnalysis: prevPerQuestionAnalysis,
      analysisResponse: prevAnalysisResponse,
    };
  }

  const nextProgressiveByQuestion = { ...prevProgressiveByQuestion };
  for (const item of items) {
    if (!item.question_id) continue;
    if (shouldReplaceProgressiveResult(nextProgressiveByQuestion[item.question_id], item)) {
      nextProgressiveByQuestion[item.question_id] = item;
    }
  }

  const finalized: QuestionAnalysisResult[] = [];
  for (const item of items) {
    if (!item.question_id) continue;
    if (item.stage !== "completed" && item.stage !== "failed") continue;
    finalized.push(
      normalizeQuestionResult({
        record_id: item.record_id,
        question_id: item.question_id,
        status: item.stage === "completed" ? "completed" : "failed",
        analysis: item.analysis,
        usage: item.usage,
        error_message: item.error_message,
        caderno_drafts: item.caderno_drafts ?? [],
        existing_caderno_drafts: item.existing_caderno_drafts ?? [],
      }),
    );
  }

  let nextPerQuestionAnalysis = prevPerQuestionAnalysis;
  if (finalized.length > 0) {
    nextPerQuestionAnalysis = { ...prevPerQuestionAnalysis };
    for (const result of finalized) {
      const current = nextPerQuestionAnalysis[result.question_id];
      if (!current || shouldReplaceAnalysisResult(current, result)) {
        nextPerQuestionAnalysis[result.question_id] = result;
      }
    }
  }

  let nextAnalysisResponse = prevAnalysisResponse;
  for (const result of finalized) {
    nextAnalysisResponse = mergeQuestionResultIntoResponse(
      nextAnalysisResponse,
      sessionId,
      userId,
      result,
    );
  }

  return {
    progressiveByQuestion: nextProgressiveByQuestion,
    perQuestionAnalysis: nextPerQuestionAnalysis,
    analysisResponse: nextAnalysisResponse,
  };
}

export async function startProgressiveStatusStream(
  authToken: string,
  sessionId: string,
  userId: string,
  refs: PollingRefs,
  onSnapshot: (snapshot: ProgressiveSummary) => void,
  onMerge: (items: AnalyzeSimulationErrorsProgressiveStatusItem[]) => void,
  onDone: () => void,
): Promise<void> {
  const recordIds = refs.progressiveRecordIdsRef.current;
  if (!sessionId || !userId || recordIds.length === 0) return;
  if (refs.progressiveStreamActiveRef.current) return;

  refs.progressiveStreamAbortRef.current?.abort();
  const abortController = new AbortController();
  refs.progressiveStreamAbortRef.current = abortController;
  refs.progressiveStreamActiveRef.current = true;
  const includeCompletedPayload = true;

  void streamProgressiveSimulationErrorsStatus(
    authToken,
    {
      user_id: userId,
      simulation_id: sessionId,
      record_ids: recordIds,
      include_completed_payload: includeCompletedPayload,
    },
    {
      signal: abortController.signal,
      onSnapshot: (snapshot) => {
        if (abortController.signal.aborted) return;
        onSnapshot({
          total: snapshot.total,
          processing: snapshot.processing,
          analysis_ready: snapshot.analysis_ready,
          completed: snapshot.completed,
          failed: snapshot.failed,
          done: snapshot.done,
        });
        onMerge(snapshot.results ?? []);
        refs.progressivePollFailureCountRef.current = 0;
        const stillRunning = !snapshot.done;
        if (!stillRunning) {
          refs.progressiveStreamActiveRef.current = false;
          if (refs.progressiveStreamAbortRef.current === abortController) {
            refs.progressiveStreamAbortRef.current = null;
          }
          onDone();
        }
      },
      onDone: (snapshot) => {
        if (abortController.signal.aborted) return;
        onSnapshot({
          total: snapshot.total,
          processing: snapshot.processing,
          analysis_ready: snapshot.analysis_ready,
          completed: snapshot.completed,
          failed: snapshot.failed,
          done: snapshot.done,
        });
        onMerge(snapshot.results ?? []);
        refs.progressiveStreamActiveRef.current = false;
        if (refs.progressiveStreamAbortRef.current === abortController) {
          refs.progressiveStreamAbortRef.current = null;
        }
        onDone();
      },
    },
  ).then(() => {
    if (abortController.signal.aborted) return;
    if (refs.progressiveStartedRef.current) {
      refs.progressiveStreamActiveRef.current = false;
      if (refs.progressiveStreamAbortRef.current === abortController) {
        refs.progressiveStreamAbortRef.current = null;
      }
    }
  }).catch(() => {
    if (abortController.signal.aborted) return;
    refs.progressiveStreamActiveRef.current = false;
    if (refs.progressiveStreamAbortRef.current === abortController) {
      refs.progressiveStreamAbortRef.current = null;
    }
  });
}

export async function pollProgressiveStatus(
  authToken: string,
  sessionId: string,
  userId: string,
  refs: PollingRefs,
  onSnapshot: (snapshot: ProgressiveSummary) => void,
  onMerge: (items: AnalyzeSimulationErrorsProgressiveStatusItem[]) => void,
  onDone: () => void,
  onFallbackHydrate: (response: AnalyzeSimulationErrorsResponse) => void,
): Promise<boolean> {
  const recordIds = refs.progressiveRecordIdsRef.current;
  if (!sessionId || !userId || recordIds.length === 0) return false;
  if (refs.progressiveStreamActiveRef.current) return true;
  if (refs.progressivePollInFlightRef.current) return true;
  refs.progressivePollInFlightRef.current = true;
  try {
    const includeCompletedPayload = true;
    const snapshot = await getProgressiveSimulationErrorsStatus(authToken, {
      user_id: userId,
      simulation_id: sessionId,
      record_ids: recordIds,
      include_completed_payload: includeCompletedPayload,
    });
    onSnapshot({
      total: snapshot.total,
      processing: snapshot.processing,
      analysis_ready: snapshot.analysis_ready,
      completed: snapshot.completed,
      failed: snapshot.failed,
      done: snapshot.done,
    });
    refs.progressivePollFailureCountRef.current = 0;
    onMerge(snapshot.results ?? []);

    const fingerprint = (snapshot.results ?? [])
      .map((item) => `${item.record_id}:${item.stage}:${item.error_message ?? ""}`)
      .sort()
      .join("|");
    if (fingerprint && fingerprint === refs.progressiveFingerprintRef.current) {
      refs.progressivePollDelayMsRef.current = Math.min(
        ANALYSIS_PROGRESSIVE_MAX_POLL_INTERVAL_MS,
        Math.round(refs.progressivePollDelayMsRef.current * 1.5),
      );
    } else {
      refs.progressiveFingerprintRef.current = fingerprint;
      refs.progressivePollDelayMsRef.current = ANALYSIS_PROGRESSIVE_BASE_POLL_INTERVAL_MS;
    }

    const stillRunning = !snapshot.done;
    if (stillRunning) {
      return true;
    }

    await onDone();
    return false;
  } catch {
    refs.progressivePollFailureCountRef.current += 1;
    refs.progressivePollDelayMsRef.current = Math.min(
      ANALYSIS_PROGRESSIVE_MAX_POLL_INTERVAL_MS,
      Math.max(
        ANALYSIS_PROGRESSIVE_BASE_POLL_INTERVAL_MS,
        Math.round(refs.progressivePollDelayMsRef.current * 1.5),
      ),
    );

    try {
      const latest = await getSimulationAnalysisResults(authToken, sessionId);
      const normalizedLatest = normalizeAnalysisResponse(latest);
      if (normalizedLatest) {
        onFallbackHydrate(normalizedLatest);
      }
    } catch {
      // keep polling: background requests can fail transiently while the worker is still running
    }

    return true;
  } finally {
    refs.progressivePollInFlightRef.current = false;
  }
}
