import React, { useState } from "react";

import type { QuestionAnalysisResult, StudyImportQuestion, WrongQuestionSummary } from "@/lib/api";

import {
  canonicalOptionLetter,
  countErrorsByLevelFilled,
  extractQuestionNumberFromQuestionId,
  getAtomicityQualityFromUsage,
  getImageContextFromUsage,
  imageFallbackReasonLabel,
  normalizeAnalysis,
} from "../_lib/resultadosHelpers";

type AnalysisResultCardProps = {
  result: QuestionAnalysisResult;
  questionSummary: WrongQuestionSummary | undefined;
  isReanalyzingThis: boolean;
  analyzing: boolean;
  analyzingQuestionId: string | null;
  analyzingSingleDots: string;
  fullQuestionByNumber: Map<number, StudyImportQuestion>;
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
  onGoToCorrection: (questionId: string) => void;
  onReanalyze: (questionSummary: WrongQuestionSummary, opts?: { forceReanalyze?: boolean; minRecordId?: number }) => void;
  existingOverride: "aceitar_ia" | "anulada" | undefined;
  isLoadingOverride: boolean;
  onApplyOverride: (type: "aceitar_ia" | "anulada") => Promise<void>;
  onRemoveOverride: () => Promise<void>;
};

const EXISTING_MATCH_ORIGIN_LABEL: Record<string, string> = {
  signature: "Mesma assinatura conceitual",
  concept_key: "Mesmo conceito",
  semantic: "Cobertura semantica no tema",
};

const EXISTING_SOURCE_ORIGIN_LABEL: Record<string, string> = {
  analise_questao: "Via analise",
  manual_caderno: "Manual",
};

function existingMatchOriginLabel(origin: string | null | undefined): string | null {
  if (!origin) return null;
  return EXISTING_MATCH_ORIGIN_LABEL[origin] ?? null;
}

function existingSourceOriginLabel(origin: string | null | undefined): string | null {
  if (!origin) return null;
  return EXISTING_SOURCE_ORIGIN_LABEL[origin] ?? null;
}

export function AnalysisResultCard(props: AnalysisResultCardProps) {
  const {
    result,
    questionSummary,
    isReanalyzingThis,
    analyzing,
    analyzingQuestionId,
    analyzingSingleDots,
    fullQuestionByNumber,
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
    onGoToCorrection,
    onReanalyze,
    existingOverride,
    isLoadingOverride,
    onApplyOverride,
    onRemoveOverride,
  } = props;

  // "pending" = no override yet; "aceitar_ia"/"anulada" = API-persisted override
  const divergenceResolution = existingOverride ?? "pending";
  // dismissed = user clicked "Manter como erro" (local only, no API call)
  const [dismissed, setDismissed] = useState(false);

  const imageContext = getImageContextFromUsage(result.usage as Record<string, unknown> | null | undefined);
  const validOptionKeys = questionSummary ? Object.keys(questionSummary.options ?? {}) : [];
  const aiGabaritoCanonical = canonicalOptionLetter(result.analysis?.gabarito, validOptionKeys);
  const officialCorrectCanonical = canonicalOptionLetter(questionSummary?.correct_option, validOptionKeys);
  const userMarkedCanonical = canonicalOptionLetter(questionSummary?.marked_option, validOptionKeys);
  const aiGabarito = aiGabaritoCanonical ?? (result.analysis?.gabarito ?? "").toUpperCase().trim();
  const officialCorrect = officialCorrectCanonical ?? (questionSummary?.correct_option ?? "").toUpperCase().trim();
  const userMarked = userMarkedCanonical ?? (questionSummary?.marked_option ?? "").toUpperCase().trim();
  const suppressDivergenceForMissingImageContext = imageContext.candidateCount > 0 && !imageContext.included;

  const hasDivergence =
    result.status === "completed" &&
    Boolean(result.analysis) &&
    !suppressDivergenceForMissingImageContext &&
    Boolean(aiGabaritoCanonical) &&
    Boolean(officialCorrectCanonical) &&
    aiGabaritoCanonical !== officialCorrectCanonical;

  const aiAgreesWithUser =
    hasDivergence && Boolean(userMarkedCanonical) && aiGabaritoCanonical === userMarkedCanonical;

  const normalized = result.status === "completed" && result.analysis
    ? normalizeAnalysis(result.analysis)
    : null;
  const atomicityQuality = getAtomicityQualityFromUsage(
    result.usage as Record<string, unknown> | null | undefined,
  );
  const existingDrafts = result.existing_caderno_drafts ?? [];
  const newDraftCount = result.caderno_drafts.length;
  const existingDraftCount = existingDrafts.length;
  const onlyExistingCoverage = existingDraftCount > 0 && newDraftCount === 0;
  const [existingExpanded, setExistingExpanded] = useState(existingDraftCount > 0);
  const draftKeysForQuestion = result.caderno_drafts.map((draft) =>
    draftKey(result.question_id, draft.flashcard_index),
  );
  const selectedCountForQuestion = draftKeysForQuestion.filter((key) => selectedDrafts.has(key)).length;
  const savedCountForQuestion = draftKeysForQuestion.filter((key) => savedDrafts.has(key)).length;

  return (
    <div key={result.question_id} id={`analysis-${result.question_id}`} className="border border-edge p-4 sm:p-5 space-y-4 scroll-mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onGoToCorrection(result.question_id)}
          className="min-w-0 text-sm font-medium underline text-left"
        >
          Q{result.question_id.split("_q").pop()}
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {result.status === "completed" && questionSummary && (
            <button
              type="button"
              onClick={() =>
                onReanalyze(questionSummary, {
                  forceReanalyze: true,
                  minRecordId: result.record_id,
                })
              }
              disabled={analyzing || isReanalyzingThis || Boolean(analyzingQuestionId)}
              className="text-xs border border-edge px-2 py-1 text-muted hover:border-ink hover:text-ink disabled:opacity-50 whitespace-nowrap"
            >
              {isReanalyzingThis ? `Analisando${analyzingSingleDots}` : "Reanalisar"}
            </button>
          )}
          <span
            className={`text-xs px-2 py-0.5 border ${
              result.status === "completed"
                ? "border-green-300 text-green-700"
                : "border-red-300 text-red-600"
            }`}
          >
            {result.status === "completed" ? "Analisada" : "Falhou"}
          </span>
          {hasDivergence && (
            <span className="text-xs px-2 py-0.5 border border-amber-400 text-amber-700">
              Divergência
            </span>
          )}
        </div>
      </div>

      {hasDivergence && (
        <div className="border border-amber-400 bg-amber-50 p-3 space-y-2">
          {divergenceResolution === "pending" && !dismissed && (
            <>
              <p className="text-sm font-medium text-amber-900">Divergência detectada</p>
              <p className="text-xs text-amber-800">
                A IA aponta <strong>{aiGabarito}</strong> como gabarito correto, mas o gabarito oficial é{" "}
                <strong>{officialCorrect}</strong>.
                {aiAgreesWithUser && (
                  <> A IA concorda com a sua resposta (<strong>{userMarked}</strong>).</>
                )}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDismissed(true)}
                  disabled={isLoadingOverride}
                  className="text-xs border border-amber-500 text-amber-800 px-2 py-1 hover:bg-amber-100 disabled:opacity-50"
                >
                  Manter como erro
                </button>
                {aiAgreesWithUser && (
                  <button
                    type="button"
                    onClick={() => void onApplyOverride("aceitar_ia")}
                    disabled={isLoadingOverride}
                    className="text-xs border border-emerald-500 text-emerald-800 px-2 py-1 hover:bg-emerald-50 disabled:opacity-50"
                  >
                    {isLoadingOverride ? "Salvando..." : "Marcar como acerto (análise da IA)"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void onApplyOverride("anulada")}
                  disabled={isLoadingOverride}
                  className="text-xs border border-edge text-muted px-2 py-1 hover:border-ink hover:text-ink disabled:opacity-50"
                >
                  {isLoadingOverride ? "Salvando..." : "Anular questão"}
                </button>
              </div>
            </>
          )}
          {(divergenceResolution !== "pending" || dismissed) && (
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-xs text-amber-800">
                {divergenceResolution === "anulada" && "Questão anulada. Nenhum flashcard será gerado."}
                {divergenceResolution === "aceitar_ia" && "Marcada como acerto pela análise da IA. Nenhum flashcard será gerado."}
                {divergenceResolution === "pending" && dismissed && "Resultado mantido como erro. Flashcards gerados normalmente."}
              </p>
              <button
                type="button"
                onClick={() => {
                  if (divergenceResolution !== "pending") {
                    void onRemoveOverride();
                  } else {
                    setDismissed(false);
                  }
                }}
                disabled={isLoadingOverride}
                className="text-xs text-amber-700 underline whitespace-nowrap disabled:opacity-50"
              >
                {isLoadingOverride ? "Salvando..." : "Desfazer"}
              </button>
            </div>
          )}
        </div>
      )}

      {result.status === "failed" && result.error_message && (
        <p className="text-xs text-red-600">{result.error_message}</p>
      )}

      {result.status === "completed" && result.analysis && (
        <div className="space-y-3">
          {(() => {
            const questionNumber = extractQuestionNumberFromQuestionId(result.question_id);
            if (questionNumber === null) return null;
            const fullQuestion = fullQuestionByNumber.get(questionNumber);
            const hasImage = Boolean(fullQuestion?.has_image);
            if (!hasImage) return null;
            const imageDescriptions = fullQuestion?.image_descriptions ?? [];

            let contextBanner: React.ReactNode;
            if (imageContext.included) {
              const included = imageContext.includedCount > 0
                ? imageContext.includedCount
                : imageContext.consideredByAiCount;
              const candidates = imageContext.candidateCount > 0
                ? imageContext.candidateCount
                : included;
              if (included < candidates) {
                const reasonText = imageContext.itemReasons.length > 0
                  ? ` Motivos não incluídos: ${Array.from(new Set(imageContext.itemReasons)).map((reason) => imageFallbackReasonLabel(reason)).join(", ")}.`
                  : "";
                contextBanner = (
                  <p className="text-xs border border-amber-300 bg-amber-50 text-amber-800 px-3 py-2">
                    Análise parcial de imagem: {included}/{candidates} imagem(ns) considerada(s) pela IA.{reasonText}
                  </p>
                );
              } else {
                contextBanner = (
                  <p className="text-xs border border-emerald-300 bg-emerald-50 text-emerald-800 px-3 py-2">
                    Imagem(ns) considerada(s) pela IA: {included}/{candidates}.
                  </p>
                );
              }
            } else {
              const reasonLabel = imageFallbackReasonLabel(imageContext.fallbackReason);
              contextBanner = (
                <p className="text-xs border border-amber-300 bg-amber-50 text-amber-800 px-3 py-2">
                  Análise parcial (sem imagem): 0/{imageContext.candidateCount} imagem(ns) considerada(s). Motivo: {reasonLabel}.
                </p>
              );
            }

            return (
              <>
                {contextBanner}
                {imageDescriptions.length > 0 && (
                  <div className="border border-sky-200 bg-sky-50 px-3 py-2 space-y-1">
                    <p className="text-xs text-sky-700 uppercase tracking-wide">Descrição da imagem (visão IA)</p>
                    {imageDescriptions.map((desc, i) => (
                      <p key={i} className="text-xs text-sky-900 break-words [overflow-wrap:anywhere]">{desc}</p>
                    ))}
                  </div>
                )}
              </>
            );
          })()}

          {normalized && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {normalized.essence && (
                  <div className="border border-edge p-3">
                    <p className="text-xs text-muted uppercase tracking-wide">Essência</p>
                    <p className="text-sm mt-1.5 break-words [overflow-wrap:anywhere]">{normalized.essence}</p>
                  </div>
                )}
                {normalized.mainClue && (
                  <div className="border border-edge p-3">
                    <p className="text-xs text-muted uppercase tracking-wide">Pista principal</p>
                    <p className="text-sm mt-1.5 break-words [overflow-wrap:anywhere]">{normalized.mainClue}</p>
                  </div>
                )}
                {normalized.killerDetail && (
                  <div className="border border-edge p-3">
                    <p className="text-xs text-muted uppercase tracking-wide">Detalhe decisivo</p>
                    <p className="text-sm mt-1.5 break-words [overflow-wrap:anywhere]">{normalized.killerDetail}</p>
                  </div>
                )}
              </div>

              {countErrorsByLevelFilled(normalized) > 0 && (
                <div className="border border-edge p-3">
                  <p className="text-xs text-muted uppercase tracking-wide">Erros prováveis por nível</p>
                  <div className="text-sm mt-1.5 space-y-1.5 break-words [overflow-wrap:anywhere]">
                    {normalized.errorsByLevel.beginner && <p><strong>Iniciante:</strong> {normalized.errorsByLevel.beginner}</p>}
                    {normalized.errorsByLevel.intermediate && <p><strong>Intermediário:</strong> {normalized.errorsByLevel.intermediate}</p>}
                    {normalized.errorsByLevel.advanced && <p><strong>Avançado:</strong> {normalized.errorsByLevel.advanced}</p>}
                    {normalized.errorsByLevel.byHaste && <p><strong>Por pressa:</strong> {normalized.errorsByLevel.byHaste}</p>}
                    {normalized.errorsByLevel.byOverconfidence && <p><strong>Por excesso de confiança:</strong> {normalized.errorsByLevel.byOverconfidence}</p>}
                  </div>
                </div>
              )}

              {normalized.reasoningLadder.length > 0 && (
                <div className="border border-edge p-3">
                  <p className="text-xs text-muted uppercase tracking-wide">Linha de raciocínio</p>
                  <ol className="mt-1.5 list-decimal space-y-1.5 pl-4 text-sm break-words [overflow-wrap:anywhere]">
                    {normalized.reasoningLadder.map((item, idx) => (
                      <li key={`${result.question_id}_ladder_${idx}`}>{item}</li>
                    ))}
                  </ol>
                </div>
              )}

              {(normalized.microDrillPrompt || normalized.microDrillAnswer) && (
                <div className="border border-edge p-3 space-y-1.5">
                  <p className="text-xs text-muted uppercase tracking-wide">Micro treino</p>
                  {normalized.microDrillPrompt && (
                    <p className="text-sm break-words [overflow-wrap:anywhere]"><strong>Pergunta:</strong> {normalized.microDrillPrompt}</p>
                  )}
                  {normalized.microDrillAnswer && (
                    <p className="text-sm break-words [overflow-wrap:anywhere]"><strong>Gabarito:</strong> {normalized.microDrillAnswer}</p>
                  )}
                </div>
              )}

              {atomicityQuality.atomicityOk === false && (
                <div className="border border-amber-300 bg-amber-50 p-3">
                  <p className="text-xs text-amber-800 uppercase tracking-wide">Granularidade atômica reduzida</p>
                  <p className="mt-1.5 text-sm text-amber-900 break-words [overflow-wrap:anywhere]">
                    {atomicityQuality.message || "A análise ficou com granularidade atômica abaixo do ideal."}
                  </p>
                  <p className="mt-1 text-xs text-amber-800 break-words [overflow-wrap:anywhere]">
                    Nós atômicos: {atomicityQuality.atomicNodesCount} | Alvos válidos: {atomicityQuality.learningTargetsCount}
                    {atomicityQuality.atomicRetryUsed ? " | Retry corretivo aplicado" : ""}
                  </p>
                </div>
              )}

              {normalized.atomicEssentials.length > 0 && (
                <div className="border border-edge p-3">
                  <p className="text-xs text-muted uppercase tracking-wide">Conhecimentos atômicos essenciais</p>
                  <div className="mt-1.5 space-y-2">
                    {normalized.atomicEssentials.map((item) => (
                      <div key={`${result.question_id}_${item.conceptId}`} className="border border-edge p-3">
                        <p className="text-sm font-medium break-words [overflow-wrap:anywhere]">{item.label}</p>
                        {item.transferStatement && (
                          <p className="mt-1 text-sm text-muted break-words [overflow-wrap:anywhere]">{item.transferStatement}</p>
                        )}
                        {(typeof item.priority === "number" || item.actionVerb) && (
                          <p className="mt-1 text-xs text-muted break-words [overflow-wrap:anywhere]">
                            {typeof item.priority === "number" ? `Prioridade ${item.priority}` : ""}
                            {item.actionVerb ? `${typeof item.priority === "number" ? " | " : ""}Ação: ${item.actionVerb}` : ""}
                          </p>
                        )}
                        {item.failureMode && (
                          <p className="mt-1 text-sm text-muted break-words [overflow-wrap:anywhere]">
                            <strong>Falha típica:</strong> {item.failureMode}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {hasDivergence && divergenceResolution === "pending" && (newDraftCount > 0 || existingDraftCount > 0) && (
            <p className="text-xs border border-amber-300 bg-amber-50 text-amber-800 px-3 py-2">
              Selecione uma opção acima para definir se os flashcards serão utilizados.
            </p>
          )}

          {!(hasDivergence && (divergenceResolution === "anulada" || divergenceResolution === "aceitar_ia")) &&
            (newDraftCount > 0 || existingDraftCount > 0) && (
            <div className="space-y-2">
              {onlyExistingCoverage ? (
                <div className="border border-amber-400 bg-amber-50 p-3">
                  <p className="text-xs font-medium text-amber-900 break-words [overflow-wrap:anywhere]">
                    ⚠ Conceito já no seu caderno — e você errou.
                  </p>
                  <p className="mt-1 text-xs text-amber-800 break-words [overflow-wrap:anywhere]">
                    Você tem {existingDraftCount} flashcard(s) salvo(s) sobre este tema. Revise-os.
                  </p>
                </div>
              ) : existingDraftCount > 0 ? (
                <div className="border border-amber-300 bg-amber-50 p-3">
                  <p className="text-xs text-amber-800 break-words [overflow-wrap:anywhere]">
                    Você já tem flashcard(s) sobre este conceito.
                  </p>
                </div>
              ) : (
                <div className="border border-edge p-2">
                  <p className="text-xs font-medium text-ink break-words [overflow-wrap:anywhere]">
                    Resumo dos flashcards desta questão.
                  </p>
                  <p className="mt-1 text-xs text-muted break-words [overflow-wrap:anywhere]">
                    {newDraftCount} novo{newDraftCount !== 1 ? "s" : ""} / {existingDraftCount} existente{existingDraftCount !== 1 ? "s" : ""}
                  </p>
                </div>
              )}

              {existingDraftCount > 0 && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="min-w-0 text-xs text-muted break-words [overflow-wrap:anywhere]">
                      {onlyExistingCoverage
                        ? "Seus flashcards sobre este conceito:"
                        : `Flashcard(s) existente(s) no seu caderno (${existingDraftCount}):`}
                    </p>
                    <button
                      type="button"
                      onClick={() => setExistingExpanded((prev) => !prev)}
                      className="text-xs border border-edge px-2 py-1 text-muted hover:border-ink hover:text-ink"
                    >
                      {existingExpanded ? "Ocultar" : "Ver mais"}
                    </button>
                  </div>
                  {existingExpanded && (
                    <div className="space-y-1">
                      {existingDrafts.map((draft) => {
                        const bodyKey = draft.note_id || draft.concept_signature;
                        const body = draft.body;
                        const bodyTruncated = body.length > 200;
                        const isBodyExpanded = expandedDraftBodies.has(bodyKey);
                        const matchOriginLabel = existingMatchOriginLabel(draft.match_origin);
                        const sourceOriginLabel = existingSourceOriginLabel(draft.source_origin);
                        return (
                          <div key={bodyKey} className="border border-edge bg-ink/5 p-2">
                            <div className="mb-1 flex flex-wrap items-center gap-1">
                              {matchOriginLabel && (
                                <span className="text-xs px-2 py-0.5 border border-amber-300 text-amber-700 whitespace-nowrap">
                                  {matchOriginLabel}
                                </span>
                              )}
                              {sourceOriginLabel && (
                                <span className="text-xs px-2 py-0.5 border border-sky-300 text-sky-700 whitespace-nowrap">
                                  {sourceOriginLabel}
                                </span>
                              )}
                              <span className="text-xs px-2 py-0.5 border border-emerald-300 text-emerald-700 whitespace-nowrap">
                                Salvo
                              </span>
                            </div>
                            <p className="text-xs font-medium break-words [overflow-wrap:anywhere] [text-align:justify]">{draft.insight_question}</p>
                            <p className="mt-1 text-xs text-muted whitespace-pre-wrap break-words [overflow-wrap:anywhere] [text-align:justify]">
                              {bodyTruncated && !isBodyExpanded ? `${body.slice(0, 200)}...` : body}
                              {bodyTruncated && (
                                <button
                                  type="button"
                                  className="ml-1 text-xs text-ink underline"
                                  onClick={() => toggleDraftBody(bodyKey)}
                                >
                                  {isBodyExpanded ? "Ver menos" : "Ver mais"}
                                </button>
                              )}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {newDraftCount > 0 && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="min-w-0 text-xs text-muted break-words [overflow-wrap:anywhere]">
                      Flashcards novos ({newDraftCount}):
                    </p>
                    <button
                      type="button"
                      onClick={() => toggleFlashcardsForQuestion(result.question_id)}
                      className="text-xs border border-edge px-2 py-1 text-muted hover:border-ink hover:text-ink"
                    >
                      {expandedFlashcardQuestions.has(result.question_id)
                        ? "Ocultar flashcards"
                        : `Ver flashcards (${newDraftCount})`}
                    </button>
                  </div>
                  {expandedFlashcardQuestions.has(result.question_id) && (
                    <div className="space-y-2">
                      {selectedCountForQuestion > 0 && (
                        <div className="flex flex-wrap items-center justify-end gap-3">
                          {saveFeedbackByQuestion[result.question_id] && (
                            <p className={`text-xs break-words [overflow-wrap:anywhere] ${saveFeedbackByQuestion[result.question_id].includes("falharam") ? "text-red-600" : "text-emerald-700"}`}>
                              {saveFeedbackByQuestion[result.question_id]}
                            </p>
                          )}
                          <button
                            type="button"
                            onClick={() => void onSaveDraftsForQuestion(result)}
                            disabled={savingDrafts}
                            className="text-xs border border-ink px-3 py-1.5 disabled:opacity-50"
                          >
                            {savingDrafts ? "Salvando..." : `Salvar ${selectedCountForQuestion} no caderno`}
                          </button>
                        </div>
                      )}
                      {!saveFeedbackByQuestion[result.question_id] && savedCountForQuestion > 0 && selectedCountForQuestion === 0 && (
                        <p className="text-xs text-emerald-700 break-words [overflow-wrap:anywhere]">
                          {savedCountForQuestion} flashcard{savedCountForQuestion !== 1 ? "s" : ""} salvo{savedCountForQuestion !== 1 ? "s" : ""} desta questão.
                        </p>
                      )}
                      <div className="space-y-1">
                        {result.caderno_drafts.map((draft) => {
                          const key = draftKey(result.question_id, draft.flashcard_index);
                          const isSelected = selectedDrafts.has(key);
                          const isSaved = savedDrafts.has(key);
                          const body = draft.note_payload.body;
                          const bodyTruncated = body.length > 200;
                          const isBodyExpanded = expandedDraftBodies.has(key);
                          return (
                            <div
                              key={key}
                              className={`border p-2 ${
                                isSaved
                                  ? "border-edge bg-ink/5 opacity-70"
                                  : isSelected
                                    ? "border-ink bg-ink/5 cursor-pointer"
                                    : "border-edge cursor-pointer"
                              }`}
                              onClick={isSaved ? undefined : () => toggleDraft(key)}
                            >
                              <div className="flex items-start gap-2">
                                {isSaved ? (
                                  <span className="mt-0.5 flex-shrink-0 text-xs px-2 py-0.5 border border-emerald-300 text-emerald-700 whitespace-nowrap">Salvo</span>
                                ) : (
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleDraft(key)}
                                    className="mt-0.5 flex-shrink-0"
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium break-words [overflow-wrap:anywhere]">
                                    {draft.note_payload.insight_question}
                                  </p>
                                  {typeof draft.retrieval_difficulty === "number" && (
                                    <p className="mt-0.5 text-xs text-muted">
                                      Dificuldade de recuperação:{" "}
                                      <span className={
                                        draft.retrieval_difficulty === 3
                                          ? "text-red-600 font-medium"
                                          : draft.retrieval_difficulty === 1
                                            ? "text-emerald-700"
                                            : "text-amber-700"
                                      }>
                                        {draft.retrieval_difficulty === 1
                                          ? "Direta (1)"
                                          : draft.retrieval_difficulty === 2
                                            ? "Moderada (2)"
                                            : "Alta — discriminação fina (3)"}
                                      </span>
                                    </p>
                                  )}
                                  <p className="mt-1 text-xs text-muted whitespace-pre-wrap break-words [overflow-wrap:anywhere] [text-align:justify]">
                                    {bodyTruncated && !isBodyExpanded ? `${body.slice(0, 200)}...` : body}
                                    {bodyTruncated && (
                                      <button
                                        type="button"
                                        className="ml-1 text-xs text-ink underline"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleDraftBody(key);
                                        }}
                                      >
                                        {isBodyExpanded ? "Ver menos" : "Ver mais"}
                                      </button>
                                    )}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
