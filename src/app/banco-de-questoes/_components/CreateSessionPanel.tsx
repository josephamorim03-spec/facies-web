"use client";

import type { QuestionBankAvailability, QuestionBankResolutionMode } from "@/lib/api";

function availabilityText(availability: QuestionBankAvailability | null): string {
  if (!availability) return "Calculando disponibilidade";
  if (availability.answer_status === "answered") return `${availability.answered_count} já realizadas`;
  if (availability.answer_status === "all") return `${availability.total_count} questões encontradas`;
  return `${availability.unanswered_count} questões disponíveis`;
}

type CreateSessionPanelProps = {
  availability: QuestionBankAvailability | null;
  loadingPreview: boolean;
  busy: boolean;
  clampedLimit: number;
  resolutionMode: QuestionBankResolutionMode;
  onRefreshAvailability: () => void;
  onPreviewQuestions: () => void;
  onStartSession: () => void;
};

export default function CreateSessionPanel({
  availability,
  loadingPreview,
  busy,
  resolutionMode,
  onRefreshAvailability,
  onPreviewQuestions,
  onStartSession,
}: CreateSessionPanelProps) {
  const startLabel = resolutionMode === "training" ? "Iniciar treino" : "Iniciar simulado";
  const canStart = !busy && !!availability && availability.available_count > 0;

  return (
    <div className="flex flex-col gap-4 bg-surfaceMuted px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5">
      <div className="min-w-0">
        <p className="text-lg font-semibold leading-tight text-ink">
          {loadingPreview ? "Calculando disponibilidade" : availabilityText(availability)}
        </p>
        {availability ? (
          <p className="mt-1 text-sm text-muted">
            {availability.unanswered_count} não realizadas · {availability.answered_count} já realizadas · {availability.total_count} no filtro
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted">A prévia atualiza automaticamente quando os filtros mudam.</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onRefreshAvailability}
          disabled={loadingPreview || busy}
          className="rounded-xl border border-edge bg-surface px-4 py-2 text-sm font-semibold text-muted hover:border-primary hover:text-ink disabled:opacity-50"
        >
          Recalcular
        </button>
        <button
          type="button"
          onClick={onPreviewQuestions}
          disabled={busy || !canStart}
          className="rounded-xl border border-primary bg-surface px-4 py-2 text-sm font-semibold text-primary hover:bg-paper disabled:opacity-50"
        >
          Ver prévia
        </button>
        <button
          type="button"
          onClick={onStartSession}
          disabled={busy || !canStart}
          className="rounded-xl border border-primary bg-primary px-5 py-2 text-sm font-semibold text-primaryInk shadow-sm hover:brightness-105 disabled:opacity-50"
        >
          {startLabel}
        </button>
      </div>
    </div>
  );
}
