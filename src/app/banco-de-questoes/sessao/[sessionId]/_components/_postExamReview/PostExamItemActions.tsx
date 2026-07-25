"use client";

import type { PostExamReviewTab } from "./types";

type PostExamItemActionsProps = {
  activeTab: PostExamReviewTab;
  activeReview: boolean;
  selectedDiagnosis: string | null;
  onSaveRule: () => void;
  onCreateCard: () => void;
  onReviewTrap: () => void;
  onReport: () => void;
};

export function PostExamItemActions({
  activeTab,
  activeReview,
  selectedDiagnosis,
  onSaveRule,
  onCreateCard,
  onReviewTrap,
  onReport,
}: PostExamItemActionsProps) {
  if (activeTab !== "erros") return null;

  return (
    <>
      <button
        type="button"
        onClick={onSaveRule}
        className="rounded-lg border border-edge px-3 py-1.5 text-xs font-semibold text-ink hover:border-primary"
      >
        Salvar regra
      </button>
      <button
        type="button"
        onClick={onCreateCard}
        className="rounded-lg border border-edge px-3 py-1.5 text-xs font-semibold text-muted hover:text-ink"
      >
        Criar card
      </button>
      {selectedDiagnosis && (
        <button
          type="button"
          onClick={onReviewTrap}
          className="rounded-lg border border-edge px-3 py-1.5 text-xs font-semibold text-muted hover:text-ink"
        >
          Rever armadilha
        </button>
      )}
      <button
        type="button"
        onClick={onReport}
        className="rounded-lg border border-edge px-3 py-1.5 text-xs font-semibold text-muted hover:text-ink"
      >
        {activeReview ? "Reportar" : "Reportar item"}
      </button>
    </>
  );
}
