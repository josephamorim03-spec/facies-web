"use client";

import { useState } from "react";
import type { QuestionBankOption, QuestionBankSessionItem } from "@/lib/api";

const OPTIONS: QuestionBankOption[] = ["A", "B", "C", "D", "E"];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type FixacaoRoundProps = {
  /** The items to re-test — typically the ones answered wrong (and/or doubtful). */
  items: QuestionBankSessionItem[];
  onExit: () => void;
};

/**
 * Ungraded retrieval round shown at the end of a training session. Re-presents the
 * questions the student missed so they actively recall the answer again (spaced
 * retrieval practice). Purely client-side: it records nothing and does not touch the
 * recorded attempt or FSRS — the goal is reinforcement before finalizing.
 */
export default function FixacaoRound({ items, onExit }: FixacaoRoundProps) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<QuestionBankOption | null>(null);

  const item = items[index];
  const total = items.length;
  if (!item) {
    onExit();
    return null;
  }

  const correct = item.correct_answer;
  const isLast = index >= total - 1;
  const answered = picked !== null;

  function pick(option: QuestionBankOption) {
    if (answered) return;
    setPicked(option);
  }

  function next() {
    if (isLast) {
      onExit();
      return;
    }
    setIndex((i) => i + 1);
    setPicked(null);
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-edge bg-surface px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Rodada de fixação</p>
            <p className="text-xs text-muted">Recupere a resposta de novo — sem registrar nota.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold tabular-nums text-muted">{index + 1}/{total}</span>
            <button
              type="button"
              onClick={onExit}
              className="rounded-lg border border-edge px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-primary hover:text-ink"
            >
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-6">
        <p className="max-w-[65ch] whitespace-pre-wrap text-base leading-8 text-ink">{item.stem}</p>

        <div className="mt-6 grid gap-2">
          {OPTIONS.map((option) => {
            if (!item.alternatives[option]) return null;
            const isCorrectOpt = answered && correct === option;
            const isPickedWrong = answered && picked === option && correct !== option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => pick(option)}
                disabled={answered}
                className={cx(
                  "flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left text-sm transition-colors disabled:cursor-default",
                  isCorrectOpt
                    ? "border-success bg-surface text-success"
                    : isPickedWrong
                      ? "border-danger bg-surface text-danger"
                      : "border-edge bg-surface hover:border-primary",
                )}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-edge bg-paper text-xs font-semibold text-ink">
                  {option}
                </span>
                <span className="min-w-0 flex-1 leading-relaxed">{item.alternatives[option]}</span>
              </button>
            );
          })}
        </div>

        {answered && (
          <div
            className={cx(
              "mt-4 rounded-xl border p-4 text-sm",
              picked === correct ? "border-success" : "border-danger",
            )}
          >
            <p className={cx("font-semibold", picked === correct ? "text-success" : "text-danger")}>
              {picked === correct ? "Você recuperou — agora está fixando." : `Ainda escapa · gabarito ${correct ?? "—"}`}
            </p>
            {picked !== correct && (
              <p className="mt-1 text-xs text-muted">Releia o raciocínio correto; um flashcard ajuda a fechar essa lacuna.</p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 border-t border-edge bg-surface px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-end gap-2">
          {!answered && (
            <button
              type="button"
              onClick={next}
              className="rounded-xl border border-edge px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-primary hover:text-ink"
            >
              Pular
            </button>
          )}
          {answered && (
            <button
              type="button"
              onClick={next}
              className="rounded-xl border border-primary bg-primary px-5 py-2 text-sm font-semibold text-primaryInk shadow-sm"
            >
              {isLast ? "Concluir fixação" : "Próxima"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
