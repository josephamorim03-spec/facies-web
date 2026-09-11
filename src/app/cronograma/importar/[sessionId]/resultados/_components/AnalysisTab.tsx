import { useState } from "react";

import { Portal } from "@/components/Portal";

import type {
  AnalyzeSimulationErrorsProgressiveStatusItem,
  AnalyzeSimulationErrorsResponse,
  QuestionAnalysisResult,
  StudyImportQuestion,
  WrongQuestionSummary,
} from "@/lib/api";

import type { AnalysisSelectionItem } from "../_lib/resultadosTypes";
import { extractQuestionNumberFromQuestionId } from "../_lib/resultadosHelpers";
import { AnalysisResultCard } from "./AnalysisResultCard";
import { ProgressivePendingList } from "./ProgressivePendingList";

function IconAiSpark({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="butt"
      strokeLinejoin="miter"
      className={className}
      aria-hidden="true"
    >
      <rect x="6" y="7" width="12" height="10"/>
      <path d="M9.5 11h0.01M14.5 11h0.01M10 14c0.6.55 1.3.82 2 .82s1.4-.27 2-.82" />
      <path d="M12 7V4M8 5l1 1M16 5l-1 1" />
    </svg>
  );
}

type AnalysisTabProps = {
  analysisError: string;
  analyzing: boolean;
  analyzingBatchDots: string;
  analyzingQuestionId: string | null;
  analyzingSingleDots: string;
  onAnalyzeAll: () => void | Promise<void>;
  questionSelectionItems: AnalysisSelectionItem[];
  selectedQuestionIdsOrdered: string[];
  selectedRunnableQuestionIds: string[];
  activeProgressQuestionIds: string[];
  onToggleQuestionSelection: (questionId: string) => void;
  onSelectAllEligibleQuestions: () => void;
  onClearQuestionSelection: () => void;
  progressivePendingResults: AnalyzeSimulationErrorsProgressiveStatusItem[];
  analysisResponse: AnalyzeSimulationErrorsResponse | null;
  wrongByNumber: Map<number, WrongQuestionSummary>;
  fullQuestionByNumber: Map<number, StudyImportQuestion>;
  onGoToCorrection: (questionId: string) => void;
  onAnalyzeQuestion: (wq: WrongQuestionSummary, opt: { forceReanalyze?: boolean; minRecordId?: number }) => void | Promise<void>;
  selectedDrafts: Set<string>;
  savedDrafts: Set<string>;
  expandedDraftBodies: Set<string>;
  expandedFlashcardQuestions: Set<string>;
  savingDrafts: boolean;
  saveFeedbackByQuestion: Record<string, string>;
  draftKey: (questionId: string, index: number) => string;
  toggleDraft: (key: string) => void;
  toggleFlashcardsForQuestion: (questionId: string) => void;
  toggleDraftBody: (key: string) => void;
  onSaveDraftsForQuestion: (result: QuestionAnalysisResult) => Promise<void>;
  existingOverrides: Record<number, "aceitar_ia" | "anulada">;
  loadingOverrideQuestion: number | null;
  onApplyOverride: (questionNumber: number, type: "aceitar_ia" | "anulada") => Promise<void>;
  onRemoveOverride: (questionNumber: number) => Promise<void>;
};

function questionChipClass(item: AnalysisSelectionItem): string {
  if (item.status === "completed") return "border-success bg-surfaceMuted text-success hover:bg-success";
  if (item.status === "processing" || item.status === "analysis_ready") return "border-warning bg-surfaceMuted text-warning";
  if (item.status === "failed") return "border-danger bg-surfaceMuted text-danger hover:bg-surfaceMuted";
  if (item.status === "ineligible") return "border-edge text-muted opacity-40 cursor-default";
  if (item.selected) return "border-primary bg-primary text-primaryInk";
  return "border-edge text-ink hover:border-ink";
}

function questionChipTitle(item: AnalysisSelectionItem): string {
  if (item.status === "completed") return `Q${item.questionNumber}: análise pronta — clique para ver`;
  if (item.status === "processing" || item.status === "analysis_ready") return `Q${item.questionNumber}: em processamento`;
  if (item.status === "failed") return `Q${item.questionNumber}: falhou`;
  if (item.status === "ineligible") return `Q${item.questionNumber}: não elegível`;
  return item.selected ? `Q${item.questionNumber}: selecionada — clique para desmarcar` : `Q${item.questionNumber}: clique para selecionar`;
}

export function AnalysisTab(props: AnalysisTabProps) {
  const {
    analysisError,
    analyzing,
    analyzingBatchDots,
    analyzingQuestionId,
    analyzingSingleDots,
    onAnalyzeAll,
    questionSelectionItems,
    selectedQuestionIdsOrdered,
    selectedRunnableQuestionIds,
    activeProgressQuestionIds,
    onToggleQuestionSelection,
    onSelectAllEligibleQuestions,
    onClearQuestionSelection,
    progressivePendingResults,
    analysisResponse,
    wrongByNumber,
    fullQuestionByNumber,
    onGoToCorrection,
    onAnalyzeQuestion,
    selectedDrafts,
    savedDrafts,
    expandedDraftBodies,
    expandedFlashcardQuestions,
    savingDrafts,
    saveFeedbackByQuestion,
    draftKey,
    toggleDraft,
    toggleFlashcardsForQuestion,
    toggleDraftBody,
    onSaveDraftsForQuestion,
    existingOverrides,
    loadingOverrideQuestion,
    onApplyOverride,
    onRemoveOverride,
  } = props;

  const [analysisNavOpen, setAnalysisNavOpen] = useState(false);

  const activeScopeCount = analyzing ? activeProgressQuestionIds.length : selectedRunnableQuestionIds.length;

  const hasEligibleIdle = questionSelectionItems.some(
    (item) => item.status === "idle" && item.runnable && !item.selected,
  );
  const hasFailedSelectable = questionSelectionItems.some(
    (item) => item.status === "failed" && item.runnable && !item.selected,
  );

  const jumpToAnalysisCard = (questionId: string) => {
    const target = document.getElementById(`analysis-${questionId}`);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const selectNotAnalyzed = () => {
    for (const item of questionSelectionItems) {
      if (item.status !== "idle" || !item.runnable || item.selected) continue;
      onToggleQuestionSelection(item.questionId);
    }
  };

  const selectFailed = () => {
    for (const item of questionSelectionItems) {
      if (item.status !== "failed" || !item.runnable || item.selected) continue;
      onToggleQuestionSelection(item.questionId);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border border-edge p-3 space-y-2">
        {/* Grid unificado de questões: pendente=seleciona, pronto=navega */}
        {questionSelectionItems.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {questionSelectionItems.map((item) => {
              const isNavigable = item.status === "completed" || item.status === "processing" || item.status === "analysis_ready" || item.status === "failed";
              const isIneligible = item.status === "ineligible";

              const handleClick = () => {
                if (isIneligible) return;
                if (isNavigable) {
                  jumpToAnalysisCard(item.questionId);
                } else {
                  onToggleQuestionSelection(item.questionId);
                }
              };

              return (
                <button
                  key={item.questionId}
                  type="button"
                  onClick={handleClick}
                  disabled={isIneligible}
                  title={questionChipTitle(item)}
                  className={`h-7 min-w-[2rem] px-1.5 text-xs border transition-colors ${questionChipClass(item)}`}
                >
                  {item.questionNumber}
                </button>
              );
            })}
          </div>
        )}

        {/* Linha de ações */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {hasEligibleIdle && (
              <button
                type="button"
                onClick={onSelectAllEligibleQuestions}
                className="text-muted underline hover:text-ink"
              >
                Selecionar todas elegiveis
              </button>
            )}
            {hasEligibleIdle && (
              <button
                type="button"
                onClick={selectNotAnalyzed}
                className="text-muted underline hover:text-ink"
              >
                Selecionar nao analisadas
              </button>
            )}
            {hasFailedSelectable && (
              <button
                type="button"
                onClick={selectFailed}
                className="text-muted underline hover:text-ink"
              >
                Selecionar com falha
              </button>
            )}
            {selectedQuestionIdsOrdered.length > 0 && (
              <button
                type="button"
                onClick={onClearQuestionSelection}
                className="text-muted underline hover:text-ink"
              >
                Limpar selecao
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => void onAnalyzeAll()}
            disabled={analyzing || Boolean(analyzingQuestionId) || activeScopeCount === 0}
            className="text-sm border border-ink px-3 py-1.5 text-ink disabled:opacity-50"
          >
            {analyzing
              ? `Analisando${analyzingBatchDots}`
              : `Analisar selecionadas (${activeScopeCount})`}
          </button>
        </div>

        {analysisError && <p className="text-xs text-danger">{analysisError}</p>}
      </div>

      <ProgressivePendingList items={progressivePendingResults} onGoToCorrection={onGoToCorrection} />

      {/* FAB flutuante de navegação */}
      {questionSelectionItems.length > 0 && (
        <Portal>
          <button
            type="button"
            onClick={() => setAnalysisNavOpen(true)}
            title="Navegar por análises"
            aria-label="Navegar por análises"
            className="acima-da-barra-de-abas acima-da-barra-de-abas--solto fixed left-4 z-40 flex h-12 w-12 items-center justify-center border border-ink bg-ink text-paper shadow-overlay"
          >
            <IconAiSpark className="h-5 w-5" />
          </button>
        </Portal>
      )}

      {/* Drawer de navegação de análises */}
      {analysisNavOpen && (
        <Portal>
        <div className="fixed inset-0 z-[200]">
          <button
            type="button"
            aria-label="Fechar navegação"
            onClick={() => setAnalysisNavOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <aside className="absolute right-0 top-0 h-full w-[min(88vw,22rem)] bg-paper border-l border-edge p-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconAiSpark className="h-4 w-4" />
                <h2 className="font-serif">Análises</h2>
              </div>
              <button
                type="button"
                onClick={() => setAnalysisNavOpen(false)}
                className="text-xs border border-edge px-2 py-1 text-ink"
              >
                Voltar
              </button>
            </div>
            <div className="grid grid-cols-6 gap-1 overflow-y-auto pr-1 py-px">
              {questionSelectionItems.map((item) => {
                const isCompleted = item.status === "completed";
                const isProcessing = item.status === "processing" || item.status === "analysis_ready";
                const isNavigable = isCompleted || isProcessing;

                const visualClass = isCompleted
                  ? "border-success bg-surfaceMuted text-success"
                  : isProcessing
                    ? "border-warning bg-surfaceMuted text-warning"
                    : "border-edge text-muted opacity-50 cursor-default";

                return (
                  <button
                    key={`nav_${item.questionId}`}
                    type="button"
                    disabled={!isNavigable}
                    onClick={() => {
                      if (!isNavigable) return;
                      setAnalysisNavOpen(false);
                      setTimeout(() => jumpToAnalysisCard(item.questionId), 50);
                    }}
                    className={`h-9 w-9 text-xs border flex items-center justify-center ${visualClass}`}
                  >
                    {item.questionNumber}
                  </button>
                );
              })}
            </div>
          </aside>
        </div>
        </Portal>
      )}

      {analysisResponse && (
        <div className="space-y-3">
          {analysisResponse.results.map((result) => {
            const questionNumber = extractQuestionNumberFromQuestionId(result.question_id);
            const questionSummary = questionNumber === null ? undefined : wrongByNumber.get(questionNumber);
            const isReanalyzingThis = analyzingQuestionId === result.question_id;
            return (
              <AnalysisResultCard
                key={result.question_id}
                result={result}
                questionSummary={questionSummary}
                isReanalyzingThis={isReanalyzingThis}
                analyzing={analyzing}
                analyzingQuestionId={analyzingQuestionId}
                analyzingSingleDots={analyzingSingleDots}
                fullQuestionByNumber={fullQuestionByNumber}
                selectedDrafts={selectedDrafts}
                savedDrafts={savedDrafts}
                expandedDraftBodies={expandedDraftBodies}
                expandedFlashcardQuestions={expandedFlashcardQuestions}
                savingDrafts={savingDrafts}
                saveFeedbackByQuestion={saveFeedbackByQuestion}
                draftKey={draftKey}
                toggleDraft={toggleDraft}
                toggleFlashcardsForQuestion={toggleFlashcardsForQuestion}
                toggleDraftBody={toggleDraftBody}
                onSaveDraftsForQuestion={onSaveDraftsForQuestion}
                onGoToCorrection={onGoToCorrection}
                onReanalyze={(summary, opts) => void onAnalyzeQuestion(summary, opts)}
                existingOverride={questionNumber !== null ? existingOverrides[questionNumber] : undefined}
                isLoadingOverride={questionNumber !== null && loadingOverrideQuestion === questionNumber}
                onApplyOverride={async (type) => {
                  if (questionNumber !== null) await onApplyOverride(questionNumber, type);
                }}
                onRemoveOverride={async () => {
                  if (questionNumber !== null) await onRemoveOverride(questionNumber);
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
