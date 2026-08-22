"use client";

import type { QuestionBankQuestion } from "@/lib/api";
import { formatSourceLabel } from "@/lib/formatSource";

function accuracyChipClass(ratio: number): string {
  if (ratio >= 0.7) return "border-success/40 text-success";
  if (ratio >= 0.5) return "border-warning/40 text-warning";
  return "border-danger/40 text-danger";
}

type QuestionListProps = {
  questions: QuestionBankQuestion[];
  selectedTopicSummary: string;
};

export default function QuestionList({
  questions,
  selectedTopicSummary,
}: QuestionListProps) {
  if (questions.length === 0) return null;

  return (
    <section className="km-card p-4 md:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="paper-eyebrow">Prévia</p>
          <h2 className="mt-1 font-serif text-2xl font-semibold">Questões encontradas</h2>
          <p className="mt-1 text-sm text-muted">{selectedTopicSummary}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3">
        {questions.map((question) => {
          const stats = question.attempt_stats;
          const ratio = stats && stats.attempt_count > 0 ? stats.correct_count / stats.attempt_count : null;
          return (
            <article key={question.id} className="rounded-surface border border-edge bg-paper p-4">
              <p className="line-clamp-4 text-sm leading-relaxed">{question.stem}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <p className="text-xs text-muted">{formatSourceLabel(question.source)}</p>
                {stats && ratio !== null && (
                  <span
                    className={`border px-2 py-0.5 text-micro font-semibold ${accuracyChipClass(ratio)}`}
                  >
                    Você: {stats.correct_count}/{stats.attempt_count} · {Math.round(ratio * 100)}%
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
