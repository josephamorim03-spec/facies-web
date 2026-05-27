import { useCallback, useState } from "react";

import { createOperationalNote } from "@/lib/api";
import type { AnalyzeSimulationErrorsResponse, QuestionAnalysisResult } from "@/lib/api";

function stableHash(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function buildDraftIdempotencyKey(
  questionId: string,
  draft: QuestionAnalysisResult["caderno_drafts"][number],
): string {
  const normalizedQuestion = String(questionId || "q")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 48);
  const index = Number(draft.flashcard_index);
  const normalizedIndex = Number.isFinite(index) && index > 0 ? String(index) : "0";
  const semanticBasis = [
    questionId,
    String(draft.flashcard_index ?? ""),
    String(draft.flashcard_key ?? ""),
    String(draft.note_payload.insight_question ?? ""),
    String(draft.note_payload.body ?? ""),
  ]
    .join("|")
    .trim()
    .toLowerCase();
  const digest = stableHash(semanticBasis);
  return `analysis-draft-${normalizedQuestion}-${normalizedIndex}-${digest}`;
}

export function useResultadosDraftSelection(
  params: {
    token: string | null;
    analysisResponse: AnalyzeSimulationErrorsResponse | null;
  },
) {
  const { token } = params;

  const [selectedDrafts, setSelectedDrafts] = useState<Set<string>>(new Set());
  const [expandedFlashcardQuestions, setExpandedFlashcardQuestions] = useState<Set<string>>(new Set());
  const [expandedDraftBodies, setExpandedDraftBodies] = useState<Set<string>>(new Set());
  const [savingDrafts, setSavingDrafts] = useState(false);
  const [savedDrafts, setSavedDrafts] = useState<Set<string>>(new Set());
  const [saveFeedbackByQuestion, setSaveFeedbackByQuestion] = useState<Record<string, string>>({});

  const resetDraftSelection = useCallback(() => {
    setSelectedDrafts(new Set());
    setExpandedFlashcardQuestions(new Set());
    setExpandedDraftBodies(new Set());
    setSavedDrafts(new Set());
    setSaveFeedbackByQuestion({});
  }, []);

  const draftKey = useCallback((questionId: string, index: number) => `${questionId}_${index}`, []);

  const toggleDraft = useCallback((key: string) => {
    if (savedDrafts.has(key)) return;
    setSelectedDrafts((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, [savedDrafts]);

  const toggleFlashcardsForQuestion = useCallback((questionId: string) => {
    setExpandedFlashcardQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  }, []);

  const toggleDraftBody = useCallback((key: string) => {
    setExpandedDraftBodies((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleSaveDraftsForQuestion = useCallback(async (result: QuestionAnalysisResult) => {
    if (savingDrafts || token === null) return;
    const selectedInQuestion = result.caderno_drafts
      .map((draft) => ({ draft, key: draftKey(result.question_id, draft.flashcard_index) }))
      .filter(({ key }) => selectedDrafts.has(key));
    if (selectedInQuestion.length === 0) return;

    setSavingDrafts(true);
    const justSaved: string[] = [];
    let failedCount = 0;

    for (const { draft, key } of selectedInQuestion) {
      try {
        const idempotencyKey = buildDraftIdempotencyKey(result.question_id, draft);
        await createOperationalNote(token, {
          area: draft.note_payload.area,
          theme: draft.note_payload.theme,
          source_type: draft.note_payload.source_type,
          question_outcome: draft.note_payload.question_outcome,
          insight_question: draft.note_payload.insight_question,
          body: draft.note_payload.body,
          weight: draft.note_payload.weight,
          question_id: draft.note_payload.question_id,
          external_links: draft.note_payload.external_links,
          attachment_refs: draft.note_payload.attachment_refs,
        }, { idempotencyKey });
        justSaved.push(key);
      } catch {
        failedCount++;
      }
    }

    setSavingDrafts(false);
    setSelectedDrafts((prev) => {
      const next = new Set(prev);
      for (const k of justSaved) next.delete(k);
      return next;
    });
    setSavedDrafts((prev) => {
      const next = new Set(prev);
      for (const k of justSaved) next.add(k);
      return next;
    });

    const savedCount = justSaved.length;
    const total = selectedInQuestion.length;
    const msg =
      failedCount === 0
        ? `${savedCount} flashcard${savedCount !== 1 ? "s" : ""} salvo${savedCount !== 1 ? "s" : ""} no caderno.`
        : `${savedCount} de ${total} salvos (${failedCount} falharam).`;
    setSaveFeedbackByQuestion((prev) => ({ ...prev, [result.question_id]: msg }));
    setTimeout(() => {
      setSaveFeedbackByQuestion((prev) => {
        const next = { ...prev };
        delete next[result.question_id];
        return next;
      });
    }, 3000);
  }, [draftKey, savingDrafts, selectedDrafts, token]);

  return {
    selectedDrafts,
    setSelectedDrafts,
    expandedFlashcardQuestions,
    setExpandedFlashcardQuestions,
    expandedDraftBodies,
    setExpandedDraftBodies,
    savingDrafts,
    savedDrafts,
    saveFeedbackByQuestion,
    draftKey,
    toggleDraft,
    toggleFlashcardsForQuestion,
    toggleDraftBody,
    handleSaveDraftsForQuestion,
    resetDraftSelection,
  };
}
