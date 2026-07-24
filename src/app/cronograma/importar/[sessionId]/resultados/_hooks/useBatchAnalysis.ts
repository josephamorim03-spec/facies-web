"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  startProgressiveSimulationErrors,
} from "@/lib/api";
import type {
  AnalyzeSimulationErrorsProgressiveStatusItem,
  AnalyzeSimulationErrorsResponse,
  QuestionAnalysisResult,
  WrongQuestionSummary,
} from "@/lib/api";

import {
  ANALYSIS_PROGRESSIVE_BASE_POLL_INTERVAL_MS,
  normalizeAnalysisResponse,
  shouldReplaceAnalysisResult,
  shouldReplaceProgressiveResult,
} from "../_lib/resultadosHelpers";
import type {
  AnalysisQuestionInput,
  AnalysisSelectionItem,
  ProgressiveByQuestion,
  ProgressiveSummary,
} from "../_lib/resultadosTypes";
import {
  type PollingRefs,
  createPollingRefs,
  mergeProgressiveResults,
  pollProgressiveStatus,
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
  image_attachment_refs?: string[] | null;
};

type UseBatchAnalysisParams = {
  token: string | null;
  userId: string;
  sessionId: string;
  loading: boolean;
  wrongQuestions: WrongQuestionSummary[];
  analysisQuestionInputs: AnalysisQuestionInput[];
  questionInputById: Map<string, AnalysisQuestionInput>;
  eligibleWrongQuestions: AnalysisQuestionInput[];
  eligibleQuestionIdSet: Set<string>;
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
  onResetDraftSelection?: () => void;
};

export type UseBatchAnalysisReturn = {
  analyzing: boolean;
  analyzingBatchDots: string;
  activeProgressQuestionIds: string[];
  questionSelectionItems: AnalysisSelectionItem[];
  selectedQuestionIdsOrdered: string[];
  selectedRunnableQuestionIds: string[];
  toggleQuestionSelection: (questionId: string) => void;
  selectAllEligibleQuestions: () => void;
  clearQuestionSelection: () => void;
  setOnlySelectedQuestion: (questionId: string) => void;
  handleAnalyze: () => Promise<void>;
  setAnalyzing: React.Dispatch<React.SetStateAction<boolean>>;
};

export function useBatchAnalysis(params: UseBatchAnalysisParams): UseBatchAnalysisReturn {
  const {
    token,
    userId,
    sessionId,
    loading,
    wrongQuestions,
    analysisQuestionInputs,
    questionInputById,
    eligibleWrongQuestions,
    eligibleQuestionIdSet,
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
    onResetDraftSelection,
  } = params;

  const [analyzing, setAnalyzing] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [activeProgressQuestionIds, setActiveProgressQuestionIds] = useState<string[]>([]);
  const [progressivePollNonce, setProgressivePollNonce] = useState(0);

  const refs = useRef<PollingRefs>(createPollingRefs());
  const selectionInitializedRef = useRef(false);

  // ---- Selection memos ----

  const trackedResultsByQuestionId = useMemo(() => {
    const map = new Map<string, QuestionAnalysisResult>();
    const register = (result: QuestionAnalysisResult | null | undefined) => {
      if (!result) return;
      const current = map.get(result.question_id);
      if (!current || shouldReplaceAnalysisResult(current, result)) {
        map.set(result.question_id, result);
      }
    };
    for (const result of analysisResponse?.results ?? []) {
      register(result);
    }
    for (const result of Object.values(perQuestionAnalysis)) {
      register(result);
    }
    return map;
  }, [analysisResponse, perQuestionAnalysis]);

  const questionSelectionItems = useMemo<AnalysisSelectionItem[]>(() => {
    return wrongQuestions
      .map((questionSummary) => {
        const questionId = `${sessionId}_q${questionSummary.question_number}`;
        const progressive = progressiveByQuestion[questionId];
        const tracked = trackedResultsByQuestionId.get(questionId);
        const eligible = eligibleQuestionIdSet.has(questionId);

        let status: AnalysisSelectionItem["status"] = "idle";
        let statusLabel = "";
        let helperText = "Pronta para entrar no próximo lote.";

        if (!eligible) {
          status = "ineligible";
          statusLabel = "Nao elegivel";
          helperText = "Esta questão precisa de marcação e gabarito válidos para a IA.";
        } else if (progressive?.stage === "processing") {
          status = "processing";
          statusLabel = "Processando";
          helperText = "A IA já esta trabalhando nesta questão.";
        } else if (progressive?.stage === "analysis_ready") {
          status = "analysis_ready";
          statusLabel = "Base pronta";
          helperText = "A leitura principal chegou; os detalhes finais ainda estao sendo montados.";
        } else if (tracked?.status === "completed") {
          status = "completed";
          statusLabel = "Analisada";
          helperText = "Já analisada. Se quiser refazer, use a reanálise do card abaixo.";
        } else if (tracked?.status === "failed") {
          status = "failed";
          statusLabel = "Falhou";
          helperText = "Falhou antes e pode entrar novamente na seleção.";
        }

        return {
          questionId,
          questionNumber: questionSummary.question_number,
          eligible,
          selected: selectedQuestionIds.has(questionId),
          runnable: eligible && status !== "processing" && status !== "analysis_ready" && status !== "completed",
          status,
          statusLabel,
          helperText,
        };
      })
      .sort((a, b) => a.questionNumber - b.questionNumber);
  }, [eligibleQuestionIdSet, progressiveByQuestion, selectedQuestionIds, sessionId, trackedResultsByQuestionId, wrongQuestions]);

  const questionSelectionItemById = useMemo(() => {
    const map = new Map<string, AnalysisSelectionItem>();
    for (const item of questionSelectionItems) {
      map.set(item.questionId, item);
    }
    return map;
  }, [questionSelectionItems]);

  const selectedQuestionIdsOrdered = useMemo(
    () => questionSelectionItems.filter((item) => item.selected).map((item) => item.questionId),
    [questionSelectionItems],
  );

  const selectedRunnableQuestionIds = useMemo(
    () => questionSelectionItems.filter((item) => item.selected && item.runnable).map((item) => item.questionId),
    [questionSelectionItems],
  );

  // ---- Selection effects ----

  useEffect(() => {
    if (loading) return;
    if (selectionInitializedRef.current) return;
    if (questionSelectionItems.length === 0) return;
    selectionInitializedRef.current = true;
    setSelectedQuestionIds(new Set(questionSelectionItems.filter((item) => item.runnable).map((item) => item.questionId)));
  }, [loading, questionSelectionItems]);

  useEffect(() => {
    if (questionSelectionItems.length === 0) return;
    setSelectedQuestionIds((prev) => {
      let changed = false;
      const next = new Set<string>();
      for (const questionId of prev) {
        const item = questionSelectionItemById.get(questionId);
        if (!item || !item.eligible || item.status === "completed") {
          changed = true;
          continue;
        }
        next.add(questionId);
      }
      return changed ? next : prev;
    });
  }, [questionSelectionItemById, questionSelectionItems]);

  // ---- Selection actions ----

  const toggleQuestionSelection = useCallback((questionId: string) => {
    const item = questionSelectionItemById.get(questionId);
    if (!item || !item.runnable) return;
    setSelectedQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  }, [questionSelectionItemById]);

  const selectAllEligibleQuestions = useCallback(() => {
    setSelectedQuestionIds(new Set(questionSelectionItems.filter((item) => item.runnable).map((item) => item.questionId)));
  }, [questionSelectionItems]);

  const clearQuestionSelection = useCallback(() => {
    setSelectedQuestionIds(new Set());
  }, []);

  const setOnlySelectedQuestion = useCallback((questionId: string) => {
    const item = questionSelectionItemById.get(questionId);
    if (!item?.eligible) return;
    setSelectedQuestionIds(new Set(item.runnable ? [questionId] : []));
  }, [questionSelectionItemById]);

  // ---- Polling helpers ----

  const bumpProgressivePollNonce = useCallback(() => {
    setProgressivePollNonce((prev) => prev + 1);
  }, []);

  const completeProgressiveRuntime = useCallback(
    async (authToken: string) => {
      const shouldHydrateOnDone = refs.current.progressiveHydrateOnDoneRef.current;
      resetPollingRefs(refs.current);
      if (!shouldHydrateOnDone) return;
      try {
        const { getSimulationAnalysisResults } = await import("@/lib/api");
        const latest = await getSimulationAnalysisResults(authToken, sessionId);
        setAnalysisResponse(normalizeAnalysisResponse(latest));
      } catch {
        // fallback: keep merged progressive finals
      }
    },
    [sessionId, setAnalysisResponse],
  );

  const handleMerge = useCallback(
    (items: AnalyzeSimulationErrorsProgressiveStatusItem[]) => {
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
    [setProgressiveSummary],
  );

  const handleDone = useCallback(async () => {
    if (token === null) return;
    await completeProgressiveRuntime(token);
  }, [completeProgressiveRuntime, token]);

  const handleFallbackHydrate = useCallback(
    (normalizedLatest: AnalyzeSimulationErrorsResponse) => {
      setAnalysisResponse((prev) => {
        if (!prev) return normalizedLatest;
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

  // ---- Batch analysis orchestration ----

  const startBatchProgressiveAnalyze = useCallback(async (): Promise<void> => {
    if (token === null || !userId || !sessionId) return;
    if (analyzing || refs.current.progressiveStartedRef.current) return;
    if (refs.current.analyzingSingleRef.current || refs.current.analyzingBatchRef.current) return;
    if (wrongQuestions.length === 0) return;

    const targetQuestionInputs = selectedRunnableQuestionIds
      .map((questionId) => questionInputById.get(questionId) ?? null)
      .filter((questionInput): questionInput is AnalysisQuestionInput => Boolean(questionInput));
    const wrongQuestionsPayload = targetQuestionInputs.map(toProgressiveWrongQuestionPayload);

    if (wrongQuestionsPayload.length === 0) {
      setAnalysisError(
        selectedQuestionIdsOrdered.length === 0
          ? "Selecione pelo menos uma questão pronta para analisar."
          : "As questões marcadas já foram analisadas ou estão em andamento.",
      );
      return;
    }

    onResetDraftSelection?.();
    refs.current.analyzingBatchRef.current = true;
    refs.current.progressiveStartedRef.current = true;
    refs.current.progressivePollInFlightRef.current = false;
    refs.current.progressiveRecordIdsRef.current = [];
    refs.current.progressiveFingerprintRef.current = "";
    refs.current.progressivePollFailureCountRef.current = 0;
    refs.current.progressivePollDelayMsRef.current = ANALYSIS_PROGRESSIVE_BASE_POLL_INTERVAL_MS;
    refs.current.progressiveModeRef.current = "batch";
    refs.current.progressiveHydrateOnDoneRef.current = true;
    refs.current.progressiveSingleQuestionIdRef.current = null;
    setActiveProgressQuestionIds(targetQuestionInputs.map((questionInput) => questionInput.question_id));
    setAnalyzing(true);
    setAnalysisError("");
    setProgressiveByQuestion((prev) => {
      const next = { ...prev };
      for (const questionInput of targetQuestionInputs) {
        next[questionInput.question_id] = {
          record_id: 0,
          question_id: questionInput.question_id,
          stage: "processing",
          error_message: null,
          analysis: null,
          usage: null,
          caderno_drafts: [],
          existing_caderno_drafts: [],
        };
      }
      return next;
    });
    setProgressiveSummary({
      total: targetQuestionInputs.length,
      processing: targetQuestionInputs.length,
      analysis_ready: 0,
      completed: 0,
      failed: 0,
      done: false,
    });

    try {
      const started = await startProgressiveSimulationErrors(token, {
        user_id: userId,
        simulation_id: sessionId,
        wrong_questions: wrongQuestionsPayload,
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
          const existing = next[handle.question_id];
          const candidate: AnalyzeSimulationErrorsProgressiveStatusItem = {
            record_id: handle.record_id,
            question_id: handle.question_id,
            stage: handle.stage,
            error_message: null,
            analysis: null,
            usage: null,
            caderno_drafts: [],
            existing_caderno_drafts: [],
          };
          if (!existing || shouldReplaceProgressiveResult(existing, candidate)) {
            next[handle.question_id] = candidate;
          }
        }
        return next;
      });
      const continuePolling = await doPollProgressiveStatus(token);
      if (!continuePolling) {
        setAnalyzing(false);
      } else {
        doStartProgressiveStatusStream(token);
      }
    } catch (err: any) {
      setAnalyzing(false);
      setActiveProgressQuestionIds([]);
      resetPollingRefs(refs.current);
      setAnalysisError(err?.message ?? "Falha ao iniciar análise em lote.");
    }
  }, [
    analyzing,
    doPollProgressiveStatus,
    doStartProgressiveStatusStream,
    onResetDraftSelection,
    questionInputById,
    selectedQuestionIdsOrdered.length,
    selectedRunnableQuestionIds,
    sessionId,
    setAnalysisError,
    setProgressiveByQuestion,
    setProgressiveSummary,
    token,
    toProgressiveWrongQuestionPayload,
    userId,
    wrongQuestions.length,
  ]);

  const handleAnalyze = useCallback(async () => {
    await startBatchProgressiveAnalyze();
  }, [startBatchProgressiveAnalyze]);

  // ---- Polling effects ----

  useEffect(() => {
    if (token === null || !userId || !sessionId) return;
    if (!refs.current.progressiveStartedRef.current) return;
    if (refs.current.progressiveRecordIdsRef.current.length === 0) return;
    if (progressiveSummary.done) return;
    if (refs.current.progressiveStreamActiveRef.current) return;
    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      if (cancelled) return;
      void doPollProgressiveStatus(token);
    }, refs.current.progressivePollDelayMsRef.current);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [
    doPollProgressiveStatus,
    progressiveSummary.analysis_ready,
    progressiveSummary.done,
    progressiveSummary.processing,
    progressivePollNonce,
    sessionId,
    token,
    userId,
  ]);

  useEffect(() => {
    if (token === null || !userId || !sessionId) return;
    if (!refs.current.progressiveStartedRef.current) return;
    if (refs.current.progressiveRecordIdsRef.current.length === 0) return;
    if (progressiveSummary.done) return;
    if (refs.current.progressiveStreamActiveRef.current) return;

    const handleWakeUp = () => {
      if (document.visibilityState === "hidden") return;
      if (refs.current.progressiveStreamActiveRef.current) return;
      void doPollProgressiveStatus(token);
    };

    window.addEventListener("focus", handleWakeUp);
    document.addEventListener("visibilitychange", handleWakeUp);
    return () => {
      window.removeEventListener("focus", handleWakeUp);
      document.removeEventListener("visibilitychange", handleWakeUp);
    };
  }, [doPollProgressiveStatus, progressiveSummary.done, sessionId, token, userId]);

  return {
    analyzing,
    analyzingBatchDots: "",
    activeProgressQuestionIds,
    questionSelectionItems,
    selectedQuestionIdsOrdered,
    selectedRunnableQuestionIds,
    toggleQuestionSelection,
    selectAllEligibleQuestions,
    clearQuestionSelection,
    setOnlySelectedQuestion,
    handleAnalyze,
    setAnalyzing,
  };
}
