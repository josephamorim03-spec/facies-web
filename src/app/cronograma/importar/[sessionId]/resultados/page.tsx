"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";

import { Skeleton } from "@/components/Skeleton";
import type { WrongQuestionSummary } from "@/lib/api";

import { AnalysisTab } from "./_components/AnalysisTab";
import { CorrectionTab } from "./_components/CorrectionTab";
import { ExitSessionDialog } from "./_components/ExitSessionDialog";
import { useResultadosAnalysisFlow } from "./_hooks/useResultadosAnalysisFlow";
import { useResultadosDraftSelection } from "./_hooks/useResultadosDraftSelection";
import { useResultadosOverrides } from "./_hooks/useResultadosOverrides";
import { useResultadosSessionData } from "./_hooks/useResultadosSessionData";
import { extractQuestionNumberFromQuestionId } from "./_lib/resultadosHelpers";

export default function ResultadosPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = String(params.sessionId ?? "");
  const [activeTab, setActiveTab] = useState<"correcao" | "analise">("correcao");

  const questionRefs = useRef<Record<number, HTMLElement | null>>({});
  const scrollToAnalysisRef = useRef<string | null>(null);
  const scrollToCorrectionRef = useRef<number | null>(null);
  const resetDraftSelectionRef = useRef<() => void>(() => {});

  const sessionData = useResultadosSessionData({ sessionId });
  const analysisFlow = useResultadosAnalysisFlow({
    token: sessionData.token,
    userId: sessionData.userId,
    sessionId,
    loading: sessionData.loading,
    finResult: sessionData.finResult,
    session: sessionData.session,
    wrongQuestions: sessionData.wrongQuestions,
    fullQuestionByNumber: sessionData.fullQuestionByNumber,
    onSingleQuestionReady: (questionId) => {
      scrollToAnalysisRef.current = questionId;
      setActiveTab("analise");
    },
    onResetDraftSelection: () => resetDraftSelectionRef.current(),
  });
  const draftSelection = useResultadosDraftSelection({
    token: sessionData.token,
    analysisResponse: analysisFlow.analysisResponse,
  });
  const overridesHook = useResultadosOverrides({
    token: sessionData.token,
    sessionId,
    baseTotal: sessionData.totalQuestions,
    baseCorrect: sessionData.correctQuestions,
  });
  const displayAccuracy = overridesHook.displayTotal > 0
    ? Math.round((overridesHook.displayCorrect / overridesHook.displayTotal) * 100)
    : 0;

  useEffect(() => {
    resetDraftSelectionRef.current = draftSelection.resetDraftSelection;
  }, [draftSelection.resetDraftSelection]);

  useEffect(() => {
    if (scrollToAnalysisRef.current && activeTab === "analise") {
      const ref = scrollToAnalysisRef.current;
      requestAnimationFrame(() => {
        const el = document.getElementById(`analysis-${ref}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          scrollToAnalysisRef.current = null;
        }
      });
    }
    if (scrollToCorrectionRef.current !== null && activeTab === "correcao") {
      const num = scrollToCorrectionRef.current;
      requestAnimationFrame(() => {
        const node = questionRefs.current[num];
        if (node) {
          node.scrollIntoView({ behavior: "smooth", block: "start" });
          scrollToCorrectionRef.current = null;
        }
      });
    }
  }, [
    activeTab,
    analysisFlow.analysisResponse?.results.length,
    analysisFlow.progressivePendingResults.length,
    analysisFlow.analyzingQuestionId,
  ]);

  useEffect(() => {
    if (activeTab !== "correcao") {
      sessionData.setNavDrawerOpen(false);
    }
  }, [activeTab, sessionData]);

  const jumpToQuestionNumber = useCallback((questionNumber: number, closeDrawer: boolean = true) => {
    const node = questionRefs.current[questionNumber];
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (closeDrawer) {
      sessionData.setNavDrawerOpen(false);
    }
  }, [sessionData]);

  const handleAnalyzeAll = useCallback(async () => {
    const firstSelectedQuestionId = analysisFlow.selectedRunnableQuestionIds[0]
      ?? analysisFlow.selectedQuestionIdsOrdered[0]
      ?? null;
    if (firstSelectedQuestionId) {
      scrollToAnalysisRef.current = firstSelectedQuestionId;
    }
    setActiveTab("analise");
    await analysisFlow.handleAnalyze();
  }, [analysisFlow]);

  const handleAnalyzeQuestion = useCallback(async (
    wrongQuestion: WrongQuestionSummary,
    opt: { forceReanalyze?: boolean; minRecordId?: number } = {},
  ) => {
    scrollToAnalysisRef.current = `${sessionId}_q${wrongQuestion.question_number}`;
    setActiveTab("analise");
    await analysisFlow.handleAnalyzeQuestion(wrongQuestion, opt);
  }, [analysisFlow, sessionId]);

  const handleGoToCorrection = useCallback((questionId: string) => {
    const questionNumber = extractQuestionNumberFromQuestionId(questionId);
    if (questionNumber === null) return;
    scrollToCorrectionRef.current = questionNumber;
    setActiveTab("correcao");
  }, []);

  const handleViewAnalysis = useCallback((questionId: string) => {
    scrollToAnalysisRef.current = questionId;
    setActiveTab("analise");
  }, []);

  if (sessionData.token === null || sessionData.loading) {
    return <ResultadosLoadingSkeleton />;
  }

  if (sessionData.error) {
    return (
      <div className="space-y-3">
        <h1 className="font-serif text-lg">Resultados</h1>
        <p className="text-sm text-danger">{sessionData.error}</p>
        <button
          type="button"
          onClick={() => sessionData.requestExitConfirmation("/agenda-operacional")}
          className="text-xs border border-edge px-2 py-1 text-muted"
        >
          Voltar ao cronograma
        </button>
      </div>
    );
  }

  if (!sessionData.finResult) {
    return (
      <div className="space-y-3">
        <h1 className="font-serif text-lg">Resultados</h1>
        <p className="text-sm text-muted">Dados de resultado não encontrados.</p>
        <button
          type="button"
          onClick={() => sessionData.requestExitConfirmation("/agenda-operacional")}
          className="text-xs border border-edge px-2 py-1 text-muted"
        >
          Voltar ao cronograma
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 pb-24 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] sm:px-6 sm:pt-[calc(env(safe-area-inset-top,0px)+1rem)] lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-serif text-lg">Correção do simulado</h1>
        <button
          type="button"
          onClick={() => sessionData.requestExitConfirmation("/agenda-operacional")}
          className="text-xs border border-edge px-2 py-1 text-ink"
        >
          Voltar
        </button>
      </div>

      <div className="border border-edge p-3 space-y-2" data-testid="study-import-results-summary">
        <div className="text-sm font-medium">{sessionData.title}</div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{displayAccuracy}%</span>
          <span className="text-sm text-muted">
            {overridesHook.displayCorrect}/{overridesHook.displayTotal} acertos
          </span>
        </div>
        <div className="h-2 bg-amber-tint/50 border border-edge overflow-hidden">
          <div
            className="h-full transition-all"
            style={{
              width: `${displayAccuracy}%`,
              backgroundColor: displayAccuracy >= 70 ? "#22c55e" : displayAccuracy >= 50 ? "#eab308" : "#ef4444",
            }}
          />
        </div>
        {sessionData.wrongQuestions.length === 0 && (
          <p className="text-sm text-success">Parabéns! Você acertou todas as questões.</p>
        )}
      </div>

      <div className="flex flex-wrap gap-4 border-b border-edge">
        <button
          type="button"
          data-testid="study-import-results-correction-tab"
          className={`pb-2 text-sm ${activeTab === "correcao" ? "border-b-2 border-ink font-medium text-ink" : "text-ink"}`}
          onClick={() => setActiveTab("correcao")}
        >
          Correção
        </button>
        <button
          type="button"
          data-testid="study-import-results-analysis-tab"
          className={`pb-2 text-sm ${activeTab === "analise" ? "border-b-2 border-ink font-medium text-ink" : "text-ink"}`}
          onClick={() => setActiveTab("analise")}
        >
          Análise IA{analysisFlow.analysisTrackedCount > 0 ? ` (${analysisFlow.analysisTrackedCount})` : ""}
        </button>
      </div>

      {activeTab === "correcao" && (
        <CorrectionTab
          sessionId={sessionId}
          correctionQuestionsCount={sessionData.correctionQuestions.length}
          correctCount={sessionData.correctCount}
          wrongCount={sessionData.wrongCount}
          filteredQuestions={sessionData.filteredQuestions}
          resultFilter={sessionData.resultFilter}
          onResultFilterChange={sessionData.setResultFilter}
          contentTextClass={sessionData.contentTextClass}
          aPlusIconClass={sessionData.aPlusIconClass}
          navDrawerOpen={sessionData.navDrawerOpen}
          onOpenNavDrawer={() => sessionData.setNavDrawerOpen(true)}
          onCloseNavDrawer={() => sessionData.setNavDrawerOpen(false)}
          onCycleFontPreset={sessionData.cycleFontPreset}
          imageUrls={sessionData.imageUrls}
          imageErrors={sessionData.imageErrors}
          loadingImageRefs={sessionData.loadingImageRefs}
          questionRefs={questionRefs}
          onJumpToQuestion={jumpToQuestionNumber}
          wrongByNumber={sessionData.wrongByNumber}
          analysisResponse={analysisFlow.analysisResponse}
          perQuestionAnalysis={analysisFlow.perQuestionAnalysis}
          progressiveByQuestion={analysisFlow.progressiveByQuestion}
          analyzing={analysisFlow.analyzing}
          analyzingQuestionId={analysisFlow.analyzingQuestionId}
          analyzingSingleDots={analysisFlow.analyzingSingleDots}
          onAnalyzeQuestion={handleAnalyzeQuestion}
          onGoToAnalysisTab={() => setActiveTab("analise")}
          onViewAnalysis={handleViewAnalysis}
        />
      )}

      {activeTab === "analise" && (
        <AnalysisTab
          analysisError={analysisFlow.analysisError}
          analyzing={analysisFlow.analyzing}
          analyzingBatchDots={analysisFlow.analyzingBatchDots}
          analyzingQuestionId={analysisFlow.analyzingQuestionId}
          analyzingSingleDots={analysisFlow.analyzingSingleDots}
          onAnalyzeAll={handleAnalyzeAll}
          questionSelectionItems={analysisFlow.questionSelectionItems}
          selectedQuestionIdsOrdered={analysisFlow.selectedQuestionIdsOrdered}
          selectedRunnableQuestionIds={analysisFlow.selectedRunnableQuestionIds}
          activeProgressQuestionIds={analysisFlow.activeProgressQuestionIds}
          onToggleQuestionSelection={analysisFlow.toggleQuestionSelection}
          onSelectAllEligibleQuestions={analysisFlow.selectAllEligibleQuestions}
          onClearQuestionSelection={analysisFlow.clearQuestionSelection}
          progressivePendingResults={analysisFlow.progressivePendingResults}
          analysisResponse={analysisFlow.analysisResponse}
          wrongByNumber={sessionData.wrongByNumber}
          fullQuestionByNumber={sessionData.fullQuestionByNumber}
          onGoToCorrection={handleGoToCorrection}
          onAnalyzeQuestion={handleAnalyzeQuestion}
          selectedDrafts={draftSelection.selectedDrafts}
          savedDrafts={draftSelection.savedDrafts}
          expandedDraftBodies={draftSelection.expandedDraftBodies}
          expandedFlashcardQuestions={draftSelection.expandedFlashcardQuestions}
          savingDrafts={draftSelection.savingDrafts}
          saveFeedbackByQuestion={draftSelection.saveFeedbackByQuestion}
          draftKey={draftSelection.draftKey}
          toggleDraft={draftSelection.toggleDraft}
          toggleFlashcardsForQuestion={draftSelection.toggleFlashcardsForQuestion}
          toggleDraftBody={draftSelection.toggleDraftBody}
          onSaveDraftsForQuestion={draftSelection.handleSaveDraftsForQuestion}
          existingOverrides={overridesHook.overrides}
          loadingOverrideQuestion={overridesHook.loadingQuestion}
          onApplyOverride={overridesHook.applyOverride}
          onRemoveOverride={overridesHook.removeOverride}
        />
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => sessionData.requestExitConfirmation("/agenda-operacional")}
          className="text-xs border border-edge px-3 py-2 text-ink"
        >
          Voltar ao cronograma
        </button>
      </div>

      <ExitSessionDialog
        open={sessionData.exitConfirmOpen}
        onCancel={sessionData.cancelExit}
        onConfirm={sessionData.confirmExit}
      />
    </div>
  );
}

function ResultadosLoadingSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 pb-24 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] sm:px-6 sm:pt-[calc(env(safe-area-inset-top,0px)+1rem)] lg:px-8">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-8 w-20" />
      </div>

      <div className="border border-edge p-3 space-y-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-2 w-full" />
      </div>

      <div className="flex gap-4 border-b border-edge pb-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-24" />
      </div>

      <div className="space-y-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="border border-edge p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-8/12" />
          </div>
        ))}
      </div>
    </div>
  );
}
