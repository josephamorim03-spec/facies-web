import type { MutableRefObject } from "react";

import { Portal } from "@/components/Portal";
import type {
  AnalyzeSimulationErrorsProgressiveStatusItem,
  AnalyzeSimulationErrorsResponse,
  QuestionAnalysisResult,
  WrongQuestionSummary,
} from "@/lib/api";
import { formatStudyImportDisplayText } from "@/lib/studyImportDisplayText";

import { IconGrid, OPTION_ORDER } from "../_lib/resultadosHelpers";
import type { CorrectionFilter, CorrectionQuestion } from "../_lib/resultadosTypes";

type CorrectionTabProps = {
  sessionId: string;
  correctionQuestionsCount: number;
  correctCount: number;
  wrongCount: number;
  filteredQuestions: CorrectionQuestion[];
  resultFilter: CorrectionFilter;
  onResultFilterChange: (value: CorrectionFilter) => void;
  contentTextClass: string;
  aPlusIconClass: string;
  navDrawerOpen: boolean;
  onOpenNavDrawer: () => void;
  onCloseNavDrawer: () => void;
  onCycleFontPreset: () => void;
  imageUrls: Record<string, string>;
  imageErrors: Record<string, boolean>;
  loadingImageRefs: Record<string, boolean>;
  questionRefs: MutableRefObject<Record<number, HTMLElement | null>>;
  onJumpToQuestion: (questionNumber: number, closeDrawer?: boolean) => void;
  wrongByNumber: Map<number, WrongQuestionSummary>;
  analysisResponse: AnalyzeSimulationErrorsResponse | null;
  perQuestionAnalysis: Record<string, QuestionAnalysisResult>;
  progressiveByQuestion: Record<string, AnalyzeSimulationErrorsProgressiveStatusItem>;
  analyzing: boolean;
  analyzingQuestionId: string | null;
  analyzingSingleDots: string;
  onAnalyzeQuestion: (
    wq: WrongQuestionSummary,
    opt?: { forceReanalyze?: boolean; minRecordId?: number },
  ) => void | Promise<void>;
  onGoToAnalysisTab: () => void;
  onViewAnalysis: (questionId: string) => void;
};

const ICON_BTN = "h-7 w-7 border border-edge inline-flex items-center justify-center text-ink hover:border-ink";

function normalizeImageRefs(rawRefs: string[] | null | undefined): string[] {
  return (rawRefs ?? [])
    .map((ref) => String(ref || "").trim())
    .filter((ref) => ref.length > 0);
}

function optionImageRefSet(question: CorrectionQuestion): Set<string> {
  const refs = new Set<string>();
  for (const optionRefs of Object.values(question.option_image_attachment_refs ?? {})) {
    for (const ref of normalizeImageRefs(optionRefs)) {
      refs.add(ref);
    }
  }
  return refs;
}

function generalImageRefsForCorrectionQuestion(question: CorrectionQuestion): string[] {
  const optionRefs = optionImageRefSet(question);
  return normalizeImageRefs(question.image_attachment_refs).filter((ref) => !optionRefs.has(ref));
}

function IconAiSpark(props: { className?: string }) {
  const { className } = props;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="6" y="7" width="12" height="10" rx="2" />
      <path d="M9.5 11h0.01M14.5 11h0.01M10 14c0.6.55 1.3.82 2 .82s1.4-.27 2-.82" />
      <path d="M12 7V4M8 5l1 1M16 5l-1 1" />
    </svg>
  );
}

export function CorrectionTab(props: CorrectionTabProps) {
  const {
    sessionId,
    correctionQuestionsCount,
    correctCount,
    wrongCount,
    filteredQuestions,
    resultFilter,
    onResultFilterChange,
    contentTextClass,
    aPlusIconClass,
    navDrawerOpen,
    onOpenNavDrawer,
    onCloseNavDrawer,
    onCycleFontPreset,
    imageUrls,
    imageErrors,
    loadingImageRefs,
    questionRefs,
    onJumpToQuestion,
    wrongByNumber,
    analysisResponse,
    perQuestionAnalysis,
    progressiveByQuestion,
    analyzing,
    analyzingQuestionId,
    analyzingSingleDots,
    onAnalyzeQuestion,
    onGoToAnalysisTab,
    onViewAnalysis,
  } = props;

  function renderImagePart(params: {
    attachmentRef: string;
    index: number;
    alt: string;
  }) {
    const { attachmentRef, index, alt } = params;
    const url = imageUrls[attachmentRef];
    const hasError = Boolean(imageErrors[attachmentRef]);
    const loadingPart = Boolean(loadingImageRefs[attachmentRef]);

    if (url) {
      return (
        <div key={attachmentRef} className="border border-edge p-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={alt}
            className="w-full max-h-[460px] object-contain bg-paper"
          />
        </div>
      );
    }
    if (hasError) {
      return (
        <div key={attachmentRef} className="border border-edge p-2 text-xs text-ink">
          Não foi possível carregar a imagem {index + 1} desta questão.
        </div>
      );
    }
    return (
      <div key={attachmentRef} className="border border-edge p-2 text-xs text-ink">
        {loadingPart ? `Carregando imagem ${index + 1}...` : `Preparando imagem ${index + 1}...`}
      </div>
    );
  }

  return (
    <>
      <div className="sticky top-0 z-10 border-y border-edge bg-paper py-2">
        <div className="flex items-center gap-2">
          <div className="grid min-w-0 flex-1 grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => onResultFilterChange("all")}
              className={`min-w-0 text-xs border px-1.5 py-1.5 leading-none ${resultFilter === "all" ? "border-ink bg-ink text-paper" : "border-edge text-ink"}`}
            >
              Todas ({correctionQuestionsCount})
            </button>
            <button
              type="button"
              onClick={() => onResultFilterChange("correct")}
              className={`min-w-0 text-xs border px-1.5 py-1.5 leading-none ${resultFilter === "correct" ? "border-ink bg-ink text-paper" : "border-edge text-ink"}`}
            >
              Certas ({correctCount})
            </button>
            <button
              type="button"
              onClick={() => onResultFilterChange("wrong")}
              className={`min-w-0 text-xs border px-1.5 py-1.5 leading-none ${resultFilter === "wrong" ? "border-ink bg-ink text-paper" : "border-edge text-ink"}`}
            >
              Erradas ({wrongCount})
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onGoToAnalysisTab}
              className={ICON_BTN}
              title="Análise IA"
              aria-label="Análise IA"
            >
              <IconAiSpark className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onCycleFontPreset}
              className={ICON_BTN}
              title="Alterar tamanho da fonte"
              aria-label="Alterar tamanho da fonte"
            >
              <span className={`font-semibold leading-none ${aPlusIconClass}`}>A+</span>
            </button>
            <button
              type="button"
              onClick={onOpenNavDrawer}
              className={ICON_BTN}
              title="Navegar por questões"
              aria-label="Navegar por questões"
            >
              <IconGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {navDrawerOpen && (
        <Portal>
          <div className="fixed inset-0 z-[200]">
            <button type="button" aria-label="Fechar navegação" onClick={onCloseNavDrawer} className="absolute inset-0 bg-black/40" />
            <aside className="absolute right-0 top-0 h-full w-[min(88vw,22rem)] bg-paper border-l border-edge p-3 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-sm">Questões</h2>
                <button type="button" onClick={onCloseNavDrawer} className="text-xs border border-edge px-2 py-1 text-ink">
                  Voltar
                </button>
              </div>
              <div className="grid grid-cols-6 gap-1 overflow-y-auto pr-1 py-px">
                {filteredQuestions.map((question) => {
                  const visualClass = question.status === "correct"
                    ? "border-green-700 bg-green-200 text-green-900"
                    : "border-red-700 bg-red-200 text-red-900";
                  return (
                    <button
                      key={question.question_number}
                      type="button"
                      onClick={() => onJumpToQuestion(question.question_number)}
                      className={`h-9 w-9 text-xs border flex items-center justify-center ${visualClass}`}
                    >
                      {question.question_number}
                    </button>
                  );
                })}
              </div>
            </aside>
          </div>
        </Portal>
      )}

      {filteredQuestions.length === 0 && (
        <p className="text-sm text-ink">Nenhuma questão encontrada para este filtro.</p>
      )}

      <div className="space-y-3">
        {filteredQuestions.map((question) => {
          const qId = `${sessionId}_q${question.question_number}`;
          const pqResult = perQuestionAnalysis[qId];
          const batchResult = analysisResponse?.results.find((r) => r.question_id === qId);
          const progressiveResult = progressiveByQuestion[qId];
          const resolvedResult = pqResult ?? batchResult;
          const generalImageRefs = generalImageRefsForCorrectionQuestion(question);

          return (
            <article
              key={question.question_number}
              data-testid={`study-import-result-question-${question.question_number}`}
              ref={(node) => {
                questionRefs.current[question.question_number] = node;
              }}
              className="border border-edge px-4 py-3 space-y-2 scroll-mt-16"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-medium text-ink">Questão {question.question_number}</h2>
                <span className={`shrink-0 text-xs px-2 py-0.5 border ${question.status === "correct" ? "border-green-700 bg-green-200 text-green-900" : "border-red-700 bg-red-200 text-red-900"}`}>
                  {question.status === "correct" ? "Certa" : "Errada"}
                </span>
              </div>

              {question.has_image && generalImageRefs.length > 0 && (
                <div className="space-y-2">
                  {generalImageRefs.map((ref, index) => {
                    const url = imageUrls[ref];
                    const hasError = Boolean(imageErrors[ref]);
                    const loadingPart = Boolean(loadingImageRefs[ref]);
                    if (url) {
                      return (
                        <div key={`${question.question_number}_${ref}`} className="border border-edge p-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={`Imagem da questão ${question.question_number} parte ${index + 1}`}
                            className="w-full max-h-[460px] object-contain bg-paper"
                          />
                        </div>
                      );
                    }
                    if (hasError) {
                      return (
                        <div key={`${question.question_number}_${ref}`} className="border border-edge p-2 text-xs text-ink">
                          Não foi possível carregar a imagem {index + 1} desta questão.
                        </div>
                      );
                    }
                    return (
                      <div key={`${question.question_number}_${ref}`} className="border border-edge p-2 text-xs text-ink">
                        {loadingPart ? `Carregando imagem ${index + 1}...` : `Preparando imagem ${index + 1}...`}
                      </div>
                    );
                  })}
                </div>
              )}

              <p className={`${contentTextClass} whitespace-pre-wrap break-words [overflow-wrap:anywhere] [text-align:justify]`}>
                {formatStudyImportDisplayText(question.stem)}
              </p>

              <div className="space-y-2">
                {OPTION_ORDER.map((letter) => {
                  const text = formatStudyImportDisplayText(question.options[letter]);
                  const optionImageRefs = normalizeImageRefs(
                    question.option_image_attachment_refs?.[letter],
                  );
                  if (!text && optionImageRefs.length === 0) return null;
                  const isMarked = question.marked_option === letter;
                  const isCorrect = question.correct_option === letter;

                  let optionClass = "border-edge bg-paper text-ink";
                  if (question.status === "correct" && isMarked) {
                    optionClass = "border-green-700 bg-green-200 text-green-950";
                  } else if (question.status === "wrong" && isCorrect) {
                    optionClass = "border-green-700 bg-green-200 text-green-950";
                  } else if (question.status === "wrong" && isMarked) {
                    optionClass = "border-red-700 bg-red-200 text-red-950";
                  }

                  return (
                    <div key={`${question.question_number}_${letter}`} className={`border p-2 ${optionClass}`}>
                      <div className="flex items-start gap-2">
                        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center border text-xs border-current">
                          {letter}
                        </span>
                        <div className="min-w-0 flex-1 space-y-2">
                          <p className={`${contentTextClass} whitespace-pre-wrap break-words [overflow-wrap:anywhere] [text-align:justify]`}>
                            {text}
                          </p>
                          {optionImageRefs.length > 0 && (
                            <div className="space-y-2">
                              {optionImageRefs.map((ref, index) =>
                                renderImagePart({
                                  attachmentRef: ref,
                                  index,
                                  alt: `Imagem da alternativa ${letter} da questão ${question.question_number} parte ${index + 1}`,
                                }),
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {question.status === "wrong" && (
                        <div className="mt-1 text-xs">
                          {isCorrect && <span className="text-green-800">(gabarito)</span>}
                          {isMarked && !isCorrect && <span className="text-red-800">(sua resposta)</span>}
                          {!question.marked_option && isCorrect && <span className="text-ink ml-1">(você deixou em branco)</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {question.status === "wrong" && question.correct_option && question.marked_option && resolvedResult?.status !== "completed" && (!progressiveResult || (progressiveResult.stage !== "processing" && progressiveResult.stage !== "analysis_ready")) && (() => {
                const isAnalyzingThis = analyzingQuestionId === qId;
                const wq = wrongByNumber.get(question.question_number);
                if (!wq || !wq.correct_option || !wq.marked_option) return null;
                return (
                  <button
                    type="button"
                    onClick={() => void onAnalyzeQuestion(wq)}
                    disabled={analyzing || isAnalyzingThis || Boolean(analyzingQuestionId)}
                    className="text-xs border border-edge px-2 py-1 text-ink hover:border-ink hover:text-ink disabled:opacity-50 mt-2"
                  >
                    {isAnalyzingThis ? `Analisando${analyzingSingleDots}` : "Analisar questão"}
                  </button>
                );
              })()}

              {progressiveResult && (progressiveResult.stage === "processing" || progressiveResult.stage === "analysis_ready") && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 border ${progressiveResult.stage === "analysis_ready" ? "border-sky-700 bg-sky-100 text-sky-900" : "border-amber-700 bg-amber-100 text-amber-900"}`}>
                    {progressiveResult.stage === "analysis_ready" ? "Base pronta" : "Em análise"}
                  </span>
                  <button type="button" onClick={() => onViewAnalysis(qId)} className="text-xs underline text-ink">
                    Acompanhar análise
                  </button>
                </div>
              )}

              {resolvedResult?.status === "completed" && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs px-2 py-0.5 border border-green-300 text-green-700">Analisada</span>
                  <button type="button" onClick={() => onViewAnalysis(qId)} className="text-xs text-ink underline">
                    Ver análise
                  </button>
                </div>
              )}

              {resolvedResult?.status === "failed" && (
                <div className="border border-red-300 p-2 mt-2">
                  <p className="text-xs text-red-700">
                    Falha na análise: {resolvedResult.error_message || "Erro desconhecido."}
                  </p>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}
