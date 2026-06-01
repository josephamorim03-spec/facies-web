"use client";

import type { QuestionBankAvailability, QuestionBankQuestion, QuestionBankResolutionMode } from "@/lib/api";

function sourceLabel(source: Record<string, unknown>): string {
  const institution = String(source?.institution ?? "").trim();
  const board = String(source?.board_code ?? "").trim();
  const year = String(source?.year ?? "").trim();
  return [institution || "Instituição não informada", board || "Banca não informada", year].filter(Boolean).join(" · ");
}

type QuestionListProps = {
  questions: QuestionBankQuestion[];
  selectedTopicSummary: string;
  resolutionMode: QuestionBankResolutionMode;
  busy: boolean;
  availability: QuestionBankAvailability | null;
  onStartSession: () => void;
};

export default function QuestionList({
  questions,
  selectedTopicSummary,
  resolutionMode,
  busy,
  availability,
  onStartSession,
}: QuestionListProps) {
  if (questions.length === 0) return null;

  const startLabel = resolutionMode === "training" ? "Iniciar treino" : "Iniciar simulado";
  const canStart = !busy && !!availability && availability.available_count > 0;

  return (
    <section className="km-card p-4 md:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Prévia</p>
          <h2 className="mt-1 font-serif text-2xl font-semibold">Questões encontradas</h2>
          <p className="mt-1 text-sm text-muted">{selectedTopicSummary}</p>
        </div>
        <button
          type="button"
          onClick={onStartSession}
          disabled={!canStart}
          className="rounded-xl border border-primary bg-primary px-5 py-2 text-sm font-semibold text-primaryInk shadow-sm disabled:opacity-50"
        >
          {startLabel}
        </button>
      </div>
      <div className="mt-4 grid gap-3">
        {questions.map((question) => (
          <article key={question.id} className="rounded-xl border border-edge bg-paper p-4">
            <p className="line-clamp-4 text-sm leading-relaxed">{question.stem}</p>
            <p className="mt-2 text-xs text-muted">{sourceLabel(question.source)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
