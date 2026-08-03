"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import {
  analyzeQuestion,
  startProgressiveSimulationErrors,
} from "@/lib/api";
import type {
  AnalyzeSimulationErrorsProgressiveStatusItem,
  AnalyzeSimulationErrorsResponse,
  CadernoDraft,
  ExistingCadernoDraft,
  QuestionAnalysisResult,
  WrongQuestionSummary,
} from "@/lib/api";

import {
  ANALYSIS_SINGLE_FALLBACK_POLL_ATTEMPTS,
  ANALYSIS_SINGLE_FALLBACK_POLL_INTERVAL_MS,
  ANALYSIS_PROGRESSIVE_BASE_POLL_INTERVAL_MS,
  extractQuestionNumberFromQuestionId,
  mergeQuestionResultIntoResponse,
  normalizeQuestionResult,
} from "../_lib/resultadosHelpers";
import type {
  AnalysisQuestionInput,
  ProgressiveByQuestion,
  ProgressiveSummary,
} from "../_lib/resultadosTypes";
import {
  type PollingRefs,
  createPollingRefs,
  pollProgressiveStatus,
  pollSimulationResults,
  resetPollingRefs,
  startProgressiveStatusStream,
} from "../_lib/analysisPollingService";

type WrongQuestionPayload = {
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

type UseProgressiveAnalysisParams = {
  token: string | null;
  userId: string;
  sessionId: string;
  buildAnalysisQuestionInput: (wq: WrongQuestionSummary) => AnalysisQuestionInput;
  toProgressiveWrongQuestionPayload: (input: AnalysisQuestionInput) => WrongQuestionPayload;
  analysisResponse: AnalyzeSimulationErrorsResponse | null;
  setAnalysisResponse: React.Dispatch<React.SetStateAction<AnalyzeSimulationErrorsResponse | null>>;
  perQuestionAnalysis: Record<string, QuestionAnalysisResult>;
  setPerQuestionAnalysis: React.Dispatch<React.SetStateAction<Record<string, QuestionAnalysisResult>>>;
  progressiveByQuestion: ProgressiveByQuestion;
  setProgressiveByQuestion: React.Dispatch<React.SetStateAction<ProgressiveByQuestion>>;
  progressiveSummary: ProgressiveSummary;
  setProgressiveSummary: React.Dispatch<React.SetStateAction<ProgressiveSummary>>;
  setAnalysisError: React.Dispatch<React.SetStateAction<string>>;
  setAnalyzing: React.Dispatch<React.SetStateAction<boolean>>;
  onSingleQuestionReady?: (questionId: string) => void;
};

export type UseProgressiveAnalysisReturn = {
  analyzingQuestionId: string | null;
  analyzingSingleDots: string;
  handleAnalyzeQuestion: (
    wq: WrongQuestionSummary,
    opt: { forceReanalyze?: boolean; minRecordId?: number },
  ) => Promise<void>;
  allDrafts: Array<{ draft: CadernoDraft; questionId: string }>;
  allExistingDrafts: Array<{ draft: ExistingCadernoDraft; questionId: string }>;
  progressivePendingResults: AnalyzeSimulationErrorsProgressiveStatusItem[];
  analysisTrackedCount: number;
  completedAnalyses: number;
  failedAnalyses: number;
};

export function useProgressiveAnalysis(params: UseProgressiveAnalysisParams): UseProgressiveAnalysisReturn {
  const {
    token,
    userId,
    sessionId,
    buildAnalysisQuestionInput,
    toProgressiveWrongQuestionPayload,
    analysisResponse,
    setAnalysisResponse,
    perQuestionAnalysis,
    setPerQuestionAnalysis,
    progressiveByQuestion,
    setProgressiveByQuestion,
    progressiveSummary,
    setProgressiveSummary,
    setAnalysisError,
    setAnalyzing,
    onSingleQuestionReady,
  } = params;

  const [analyzingQuestionId, setAnalyzingQuestionId] = useState<string | null>(null);

  const refs = useRef<PollingRefs>(createPollingRefs());

  // ---- Polling helpers ----

  const completeProgressiveRuntime = useCallback(
    async (authToken: string) => {
      const singleQuestionId = refs.current.progressiveSingleQuestionIdRef.current;
      resetPollingRefs(refs.current);
      if (singleQuestionId) {
        onSingleQuestionReady?.(singleQuestionId);
      }
    },
    [onSingleQuestionReady],
  );

  const handleMerge = useCallback(
    (items: AnalyzeSimulationErrorsProgressiveStatusItem[]) => {
      if (!items || items.length === 0) return;
      const { mergeProgressiveResults } = require("../_lib/analysisPollingService");
      const merged = mergeProgressiveResults(
        items,
        progressiveByQuestion,
        perQuestionAnalysis,
        analysisResponse,
        sessionId,
        userId,
      );
      setProgressiveByQuestion(merged.progressiveByQuestion);
      setPerQuestionAnalysis(merged.perQuestionAnalysis);
      setAnalysisResponse(merged.analysisResponse);
    },
    [progressiveByQuestion, perQuestionAnalysis, analysisResponse, sessionId, userId, setProgressiveByQuestion, setPerQuestionAnalysis, setAnalysisResponse],
  );

  const handleSnapshot = useCallback(
    (snapshot: ProgressiveSummary) => {
      setProgressiveSummary(snapshot);
      const stillRunning = !snapshot.done;
      setAnalyzing(stillRunning);
    },
    [setProgressiveSummary, setAnalyzing],
  );

  const handleDone = useCallback(async () => {
    if (token === null) return;
    await completeProgressiveRuntime(token);
  }, [completeProgressiveRuntime, token]);

  const handleFallbackHydrate = useCallback(
    (normalizedLatest: AnalyzeSimulationErrorsResponse) => {
      setAnalysisResponse((prev) => {
        if (!prev) return normalizedLatest;
        const { normalizeAnalysisResponse } = require("../_lib/resultadosHelpers");
        return normalizeAnalysisResponse({
          ...normalizedLatest,
          results: [...prev.results, ...normalizedLatest.results],
        });
      });
    },
    [setAnalysisResponse],
  );

  const doPollProgressiveStatus = useCallback(
    async (authToken: string): Promise<boolean> => {
      return pollProgressiveStatus(
        authToken,
        sessionId,
        userId,
        refs.current,
        handleSnapshot,
        handleMerge,
        handleDone,
        handleFallbackHydrate,
      );
    },
    [sessionId, userId, handleSnapshot, handleMerge, handleDone, handleFallbackHydrate],
  );

  const doStartProgressiveStatusStream = useCallback(
    (authToken: string) => {
      startProgressiveStatusStream(
        authToken,
        sessionId,
        userId,
        refs.current,
        handleSnapshot,
        handleMerge,
        handleDone,
      );
    },
    [sessionId, userId, handleSnapshot, handleMerge, handleDone],
  );

  // ---- Single question analysis ----

  const startSingleProgressiveAnalyze = useCallback(
    async (
      questionInput: AnalysisQuestionInput,
      opt: { forceReanalyze?: boolean; minRecordId?: number },
    ): Promise<void> => {
      if (token === null || !userId || !sessionId) return;
      const questionId = questionInput.question_id;
      if (
        !questionInput.marked_option
        || !questionInput.correct_option
        || !questionInput.options[questionInput.marked_option]
        || !questionInput.options[questionInput.correct_option]
      ) return;
      if (
        refs.current.progressiveStartedRef.current
        || refs.current.analyzingBatchRef.current
        || Boolean(refs.current.analyzingSingleRef.current)
        || Boolean(analyzingQuestionId)
      ) return;

      const forceReanalyze = Boolean(opt.forceReanalyze);
      const optimisticPending: AnalyzeSimulationErrorsProgressiveStatusItem = {
        record_id: 0,
        question_id: questionId,
        stage: "processing",
        error_message: null,
        analysis: null,
        usage: null,
        caderno_drafts: [],
        existing_caderno_drafts: [],
      };

      refs.current.analyzingSingleRef.current = questionId;
      setAnalyzingQuestionId(questionId);
      refs.current.progressiveStartedRef.current = true;
      refs.current.progressivePollInFlightRef.current = false;
      refs.current.progressiveRecordIdsRef.current = [];
      refs.current.progressivePollDelayMsRef.current = ANALYSIS_PROGRESSIVE_BASE_POLL_INTERVAL_MS;
      refs.current.progressiveFingerprintRef.current = "";
      refs.current.progressivePollFailureCountRef.current = 0;
      refs.current.progressiveModeRef.current = "single";
      refs.current.progressiveHydrateOnDoneRef.current = false;
      refs.current.progressiveSingleQuestionIdRef.current = questionId;
      setAnalysisError("");
      setAnalyzing(true);
      setProgressiveByQuestion((prev) => ({ ...prev, [questionId]: optimisticPending }));
      setProgressiveSummary({
        total: 1,
        processing: 1,
        analysis_ready: 0,
        completed: 0,
        failed: 0,
        done: false,
      });

      try {
        const started = await startProgressiveSimulationErrors(token, {
          user_id: userId,
          simulation_id: sessionId,
          force_reanalyze: forceReanalyze ? true : undefined,
          wrong_questions: [toProgressiveWrongQuestionPayload(questionInput)],
        });
        refs.current.progressiveRecordIdsRef.current = (started.handles ?? []).map((handle) => handle.record_id);
        setProgressiveSummary({
          total: started.total,
          processing: started.processing,
          analysis_ready: started.analysis_ready,
          completed: started.completed,
          failed: started.failed,
          done: started.processing === 0 && started.analysis_ready === 0,
        });
        setProgressiveByQuestion((prev) => {
          const next = { ...prev };
          for (const handle of started.handles ?? []) {
            if (!handle.question_id) continue;
            next[handle.question_id] = {
              record_id: handle.record_id,
              question_id: handle.question_id,
              stage: handle.stage,
              error_message: null,
              analysis: null,
              usage: null,
              caderno_drafts: [],
              existing_caderno_drafts: [],
            };
          }
          return next;
        });
        const continuePolling = await doPollProgressiveStatus(token);
        if (!continuePolling) {
          setAnalyzing(false);
        } else {
          doStartProgressiveStatusStream(token);
        }
      } catch {
        setAnalyzing(false);
        resetPollingRefs(refs.current);
        try {
          const resultRaw = await analyzeQuestion(token, {
            user_id: userId,
            simulation_id: sessionId,
            force_reanalyze: forceReanalyze ? true : undefined,
            question: {
              question_id: questionInput.question_id,
              stem: questionInput.stem,
              options: questionInput.options,
              marked_option: questionInput.marked_option,
              correct_option: questionInput.correct_option,
              specialty: questionInput.specialty,
              theme: questionInput.theme,
              source_exam: questionInput.source_exam,
              instruction: questionInput.instruction,
              image_attachment_refs: questionInput.image_attachment_refs,
            },
          });
          const result = normalizeQuestionResult(resultRaw);
          setPerQuestionAnalysis((prev) => ({ ...prev, [questionId]: result }));
          setAnalysisResponse((prev) => mergeQuestionResultIntoResponse(prev, sessionId, userId, result));
          onSingleQuestionReady?.(questionId);
        } catch {
          const polled = await pollSimulationResults(
            token,
            sessionId,
            questionId,
            forceReanalyze ? opt.minRecordId : undefined,
            ANALYSIS_SINGLE_FALLBACK_POLL_ATTEMPTS,
            ANALYSIS_SINGLE_FALLBACK_POLL_INTERVAL_MS,
          );
          if (polled) {
            setAnalysisResponse(polled.response);
          }
          if (polled?.result) {
            const foundResult = polled.result;
            setPerQuestionAnalysis((prev) => ({ ...prev, [questionId]: foundResult }));
            setAnalysisResponse((prev) => mergeQuestionResultIntoResponse(prev, sessionId, userId, foundResult));
            onSingleQuestionReady?.(questionId);
          } else {
            setAnalysisError(
              forceReanalyze
                ? "Falha ao reanalisar a questão agora. Tente novamente em instantes."
                : "Falha ao analisar a questão agora. Tente novamente em instantes.",
            );
          }
        } finally {
          refs.current.analyzingSingleRef.current = null;
          setAnalyzingQuestionId(null);
        }
      }
    },
    [
      analyzingQuestionId,
      doPollProgressiveStatus,
      doStartProgressiveStatusStream,
      onSingleQuestionReady,
      sessionId,
      setAnalysisError,
      setAnalyzing,
      setProgressiveByQuestion,
      setProgressiveSummary,
      setAnalysisResponse,
      setPerQuestionAnalysis,
      token,
      toProgressiveWrongQuestionPayload,
      userId,
    ],
  );

  const handleAnalyzeQuestion = useCallback(
    async (
      wq: WrongQuestionSummary,
      opt: { forceReanalyze?: boolean; minRecordId?: number },
    ) => {
      const questionInput = buildAnalysisQuestionInput(wq);
      await startSingleProgressiveAnalyze(questionInput, opt);
    },
    [buildAnalysisQuestionInput, startSingleProgressiveAnalyze],
  );

  // ---- Draft memos ----

  const allDrafts = useMemo(() => {
    if (!analysisResponse) return [];
    const drafts: Array<{ draft: CadernoDraft; questionId: string }> = [];
    for (const result of analysisResponse.results) {
      if (result.status !== "completed") continue;
      for (const draft of result.caderno_drafts) {
        drafts.push({ draft, questionId: result.question_id });
      }
    }
    return drafts;
  }, [analysisResponse]);

  const allExistingDrafts = useMemo(() => {
    if (!analysisResponse) return [];
    const existing: Array<{ draft: ExistingCadernoDraft; questionId: string }> = [];
    for (const result of analysisResponse.results) {
      if (result.status !== "completed") continue;
      for (const draft of result.existing_caderno_drafts ?? []) {
        existing.push({ draft, questionId: result.question_id });
      }
    }
    return existing;
  }, [analysisResponse]);

  const progressivePendingResults = useMemo(() => {
    return Object.values(progressiveByQuestion)
      .filter((item) => item.stage === "processing" || item.stage === "analysis_ready")
      .sort((a, b) => {
        const qa = extractQuestionNumberFromQuestionId(a.question_id) ?? Number.MAX_SAFE_INTEGER;
        const qb = extractQuestionNumberFromQuestionId(b.question_id) ?? Number.MAX_SAFE_INTEGER;
        if (qa !== qb) return qa - qb;
        return a.question_id.localeCompare(b.question_id);
      });
  }, [progressiveByQuestion]);

  // ---- Summary counters ----

  const completedFromResponse = analysisResponse?.results.filter((r) => r.status === "completed").length ?? 0;
  const failedFromResponse = analysisResponse?.results.filter((r) => r.status === "failed").length ?? 0;
  const analysisTrackedCount = Math.max(analysisResponse?.results.length ?? 0, progressiveSummary.total);
  const completedAnalyses = Math.max(completedFromResponse, progressiveSummary.completed);
  const failedAnalyses = Math.max(failedFromResponse, progressiveSummary.failed);

  return {
    analyzingQuestionId,
    analyzingSingleDots: "",
    handleAnalyzeQuestion,
    allDrafts,
    allExistingDrafts,
    progressivePendingResults,
    analysisTrackedCount,
    completedAnalyses,
    failedAnalyses,
  };
}
