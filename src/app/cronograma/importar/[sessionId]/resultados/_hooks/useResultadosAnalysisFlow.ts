"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getSimulationAnalysisResults } from "@/lib/api";
import type {
  AnalyzeSimulationErrorsResponse,
  FinalizationResult,
  QuestionAnalysisResult,
  StudyImportQuestion,
  StudyImportSession,
  WrongQuestionSummary,
} from "@/lib/api";
import { useAnimatedDots } from "@/lib/useAnimatedDots";

import {
  ANALYSIS_IMAGE_MISSING_INSTRUCTION,
  asOptionLetter,
  asString,
  normalizeAnalysisResponse,
  OPTION_ORDER,
} from "../_lib/resultadosHelpers";
import type {
  AnalysisQuestionInput,
  ProgressiveByQuestion,
  ProgressiveSummary,
} from "../_lib/resultadosTypes";
import { useBatchAnalysis } from "./useBatchAnalysis";
import type { UseBatchAnalysisReturn } from "./useBatchAnalysis";
import { useProgressiveAnalysis } from "./useProgressiveAnalysis";
import type { UseProgressiveAnalysisReturn } from "./useProgressiveAnalysis";

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

type UseResultadosAnalysisFlowParams = {
  token: string | null;
  userId: string;
  sessionId: string;
  loading: boolean;
  finResult: FinalizationResult | null;
  session: StudyImportSession | null;
  wrongQuestions: WrongQuestionSummary[];
  fullQuestionByNumber: Map<number, StudyImportQuestion>;
  onSingleQuestionReady?: (questionId: string) => void;
  onResetDraftSelection?: () => void;
};

export function useResultadosAnalysisFlow(params: UseResultadosAnalysisFlowParams) {
  const {
    token,
    userId,
    sessionId,
    loading,
    finResult,
    session,
    wrongQuestions,
    fullQuestionByNumber,
    onSingleQuestionReady,
    onResetDraftSelection,
  } = params;

  // ---- Shared state ----

  const [analysisResponse, setAnalysisResponse] = useState<AnalyzeSimulationErrorsResponse | null>(null);
  const [analysisError, setAnalysisError] = useState("");
  const [perQuestionAnalysis, setPerQuestionAnalysis] = useState<Record<string, QuestionAnalysisResult>>({});
  const [progressiveByQuestion, setProgressiveByQuestion] = useState<ProgressiveByQuestion>({});
  const [progressiveSummary, setProgressiveSummary] = useState<ProgressiveSummary>({
    total: 0,
    processing: 0,
    analysis_ready: 0,
    completed: 0,
    failed: 0,
    done: false,
  });

  // ---- Bootstrap existing results ----

  useEffect(() => {
    if (loading || token === null || !userId || !sessionId || !finResult) return;
    if (analysisResponse) return;
    let cancelled = false;
    (async () => {
      try {
        const existing = await getSimulationAnalysisResults(token, sessionId);
        if (!cancelled && existing.results.length > 0) {
          setAnalysisResponse(normalizeAnalysisResponse(existing));
        }
      } catch {
        // silent fallback
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, token, userId, sessionId, finResult, analysisResponse]);

  // ---- Cleanup on sessionId change ----

  useEffect(() => {
    return () => {
      setAnalysisResponse(null);
      setAnalysisError("");
      setPerQuestionAnalysis({});
      setProgressiveByQuestion({});
      setProgressiveSummary({
        total: 0,
        processing: 0,
        analysis_ready: 0,
        completed: 0,
        failed: 0,
        done: false,
      });
    };
  }, [sessionId]);

  // ---- Shared computations (used by both hooks) ----

  const buildAnalysisQuestionInput = useCallback(
    (wq: WrongQuestionSummary): AnalysisQuestionInput => {
      const fullQuestion = fullQuestionByNumber.get(wq.question_number);
      const sourceOptions = fullQuestion?.options ?? wq.options ?? {};
      const normalizedOptions: Record<string, string> = {};
      for (const letter of OPTION_ORDER) {
        const text = sourceOptions[letter];
        if (typeof text === "string" && text.trim().length > 0) {
          normalizedOptions[letter] = text;
        }
      }
      if (Object.keys(normalizedOptions).length === 0) {
        for (const [key, value] of Object.entries(sourceOptions)) {
          if (typeof value !== "string" || value.trim().length === 0) continue;
          normalizedOptions[String(key)] = value;
        }
      }

      const fullStem = asString(fullQuestion?.stem);
      const summaryStem = asString(wq.stem);
      const normalizedStem = fullStem ?? summaryStem ?? "";
      const imageAttachmentRefs = Array.isArray(fullQuestion?.image_attachment_refs)
        ? fullQuestion.image_attachment_refs
          .map((ref) => (typeof ref === "string" ? ref.trim() : ""))
          .filter((ref): ref is string => ref.length > 0)
        : [];
      const hasImage = Boolean(fullQuestion?.has_image || imageAttachmentRefs.length > 0);
      const hasImageWithoutRef = hasImage && imageAttachmentRefs.length === 0;
      const imageDescriptions = Array.isArray(fullQuestion?.image_descriptions)
        ? fullQuestion.image_descriptions.filter((d): d is string => typeof d === "string" && d.trim().length > 0)
        : [];
      let instruction: string | undefined;
      if (imageDescriptions.length > 0) {
        const parts = imageDescriptions.length === 1
          ? imageDescriptions[0]
          : imageDescriptions.map((d, i) => `[Imagem ${i + 1}]: ${d}`).join(" ");
        instruction = `DESCRIÇÃO DA IMAGEM: ${parts}`;
      } else if (hasImageWithoutRef) {
        instruction = ANALYSIS_IMAGE_MISSING_INSTRUCTION;
      }
      return {
        question_number: wq.question_number,
        question_id: `${sessionId}_q${wq.question_number}`,
        stem: normalizedStem,
        options: normalizedOptions,
        marked_option:
          asOptionLetter(wq.marked_option) ?? asOptionLetter(fullQuestion?.state.selected_option),
        correct_option:
          asOptionLetter(wq.correct_option) ?? asOptionLetter(fullQuestion?.correct_answer),
        specialty: session?.area ?? undefined,
        theme: session?.theme ?? undefined,
        source_exam: session?.full_exam_name ?? undefined,
        instruction,
        image_attachment_refs: imageAttachmentRefs,
        has_image: hasImage,
      };
    },
    [fullQuestionByNumber, session?.area, session?.theme, session?.full_exam_name, sessionId],
  );

  const analysisQuestionInputs = useMemo(
    () => wrongQuestions.map((wq) => buildAnalysisQuestionInput(wq)),
    [buildAnalysisQuestionInput, wrongQuestions],
  );

  const questionInputById = useMemo(() => {
    const map = new Map<string, AnalysisQuestionInput>();
    for (const questionInput of analysisQuestionInputs) {
      map.set(questionInput.question_id, questionInput);
    }
    return map;
  }, [analysisQuestionInputs]);

  const eligibleWrongQuestions = useMemo(
    () =>
      analysisQuestionInputs.filter((questionInput) => {
        if (!questionInput.correct_option || !questionInput.marked_option) return false;
        const keys = Object.keys(questionInput.options ?? {});
        return keys.includes(questionInput.correct_option) && keys.includes(questionInput.marked_option);
      }),
    [analysisQuestionInputs],
  );

  const eligibleQuestionIds = useMemo(
    () => eligibleWrongQuestions.map((questionInput) => questionInput.question_id),
    [eligibleWrongQuestions],
  );

  const eligibleQuestionIdSet = useMemo(() => new Set(eligibleQuestionIds), [eligibleQuestionIds]);

  const skippedWrongQuestionsCount = Math.max(0, analysisQuestionInputs.length - eligibleWrongQuestions.length);

  const toProgressiveWrongQuestionPayload = useCallback((questionInput: AnalysisQuestionInput): WrongQuestionPayload => ({
    question_id: questionInput.question_id,
    stem: questionInput.stem,
    options: questionInput.options,
    marked_option: questionInput.marked_option!,
    correct_option: questionInput.correct_option!,
    specialty: questionInput.specialty,
    theme: questionInput.theme,
    source_exam: questionInput.source_exam,
    instruction: questionInput.instruction,
    image_attachment_refs: questionInput.image_attachment_refs,
  }), []);

  // ---- Sub-hooks ----

  const batchAnalysis: UseBatchAnalysisReturn = useBatchAnalysis({
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
  });

  const progressiveAnalysis: UseProgressiveAnalysisReturn = useProgressiveAnalysis({
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
    setAnalyzing: batchAnalysis.setAnalyzing,
    onSingleQuestionReady,
  });

  // ---- Animated dots ----

  const analyzingBatchDots = useAnimatedDots(batchAnalysis.analyzing, 400);
  const analyzingSingleDots = useAnimatedDots(Boolean(progressiveAnalysis.analyzingQuestionId), 400);

  // ---- Compose return value ----

  return {
    // Analyzing state
    analyzing: batchAnalysis.analyzing,
    analyzingQuestionId: progressiveAnalysis.analyzingQuestionId,
    analyzingBatchDots,
    analyzingSingleDots,

    // Analysis data
    analysisResponse,
    setAnalysisResponse,
    analysisError,
    perQuestionAnalysis,
    progressiveByQuestion,
    progressiveSummary,

    // Summary counters
    analysisTrackedCount: progressiveAnalysis.analysisTrackedCount,
    completedAnalyses: progressiveAnalysis.completedAnalyses,
    failedAnalyses: progressiveAnalysis.failedAnalyses,

    // Drafts
    allDrafts: progressiveAnalysis.allDrafts,
    allExistingDrafts: progressiveAnalysis.allExistingDrafts,
    progressivePendingResults: progressiveAnalysis.progressivePendingResults,

    // Eligibility
    eligibleWrongQuestions,
    skippedWrongQuestionsCount,

    // Actions
    handleAnalyze: batchAnalysis.handleAnalyze,
    handleAnalyzeQuestion: progressiveAnalysis.handleAnalyzeQuestion,

    // Setters (for external manipulation)
    setProgressiveByQuestion,
    setProgressiveSummary,
    setPerQuestionAnalysis,

    // Selection
    questionSelectionItems: batchAnalysis.questionSelectionItems,
    selectedQuestionIdsOrdered: batchAnalysis.selectedQuestionIdsOrdered,
    selectedRunnableQuestionIds: batchAnalysis.selectedRunnableQuestionIds,
    activeProgressQuestionIds: batchAnalysis.activeProgressQuestionIds,
    toggleQuestionSelection: batchAnalysis.toggleQuestionSelection,
    selectAllEligibleQuestions: batchAnalysis.selectAllEligibleQuestions,
    clearQuestionSelection: batchAnalysis.clearQuestionSelection,
    setOnlySelectedQuestion: batchAnalysis.setOnlySelectedQuestion,
  };
}
