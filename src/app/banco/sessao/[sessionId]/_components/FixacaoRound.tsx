"use client";

import { useMemo, useState } from "react";
import type { QuestionBankOption, QuestionBankSessionItem } from "@/lib/api";

const OPTIONS: QuestionBankOption[] = ["A", "B", "C", "D", "E"];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function primaryTheme(item: QuestionBankSessionItem): string {
  const node = item.knowledge_nodes.find((n) => n.is_primary) ?? item.knowledge_nodes[0];
  return node?.node_name ?? "Questão de fixação";
}

type FixacaoRoundProps = {
  /** The items to re-test - typically the ones answered wrong (and/or doubtful). */
  items: QuestionBankSessionItem[];
  onExit: () => void;
};

/**
 * Ungraded retrieval round shown at the end of a training session. Re-presents the
 * questions the student missed so they actively recall the answer again. Purely
 * client-side: it records nothing and does not touch the recorded attempt or FSRS.
 */
export default function FixacaoRound({ items, onExit }: FixacaoRoundProps) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<QuestionBankOption | null>(null);
  const [outcomes, setOutcomes] = useState<Record<number, boolean>>({});
  const [eliminated, setEliminated] = useState<Record<number, QuestionBankOption[]>>({});

  const item = items[index];
  const total = items.length;
  const recoveredCount = useMemo(() => Object.values(outcomes).filter(Boolean).length, [outcomes]);
  if (!item) return null;

  const correct = item.correct_answer;
  const isLast = index >= total - 1;
  const answered = picked !== null;
  const revealed = Object.prototype.hasOwnProperty.call(outcomes, index);
  const progress = Math.round(((index + (answered ? 1 : 0)) / Math.max(1, total)) * 100);
  const pickedCorrect = picked !== null && picked === correct;

  function pick(option: QuestionBankOption) {
    if (revealed || eliminated[index]?.includes(option)) return;
    setPicked((current) => (current === option ? null : option));
  }

  function toggleEliminate(option: QuestionBankOption) {
    if (revealed) return;
    setEliminated((prev) => {
      const current = prev[index] ?? [];
      const isEliminated = current.includes(option);
      const next = isEliminated ? current.filter((item) => item !== option) : [...current, option];
      if (!isEliminated && picked === option) setPicked(null);
      return { ...prev, [index]: next };
    });
  }

  function reveal() {
    if (picked === null || revealed) return;
    setOutcomes((prev) => ({ ...prev, [index]: picked === correct }));
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
      <div className="sticky top-0 z-10 border-b border-edge bg-surface/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-4xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Rodada de fixação</p>
              <h1 className="mt-0.5 font-serif text-xl font-semibold leading-tight text-ink">Recupere antes de finalizar</h1>
              <p className="mt-1 text-xs text-muted">Sem nota.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-surface border border-edge bg-paper px-3 py-2 text-xs font-semibold tabular-nums text-muted">
                {index + 1}/{total}
              </span>
              <button
                type="button"
                onClick={onExit}
                className="rounded-surface border border-edge px-3 py-2 text-xs font-semibold text-muted transition-colors hover:border-primary hover:text-ink"
              >
                Sair
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-control bg-surfaceMuted">
              <div className="h-full rounded-control bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="w-10 text-right text-xs font-semibold text-muted">{progress}%</span>
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 md:px-6">
        <section className="rounded-surface border border-edge bg-surface p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-control border border-edge bg-paper px-2.5 py-1 text-xs text-muted">
              {primaryTheme(item)}
            </span>
            <span className="text-xs text-muted">
              {recoveredCount} recuperada(s) nesta rodada
            </span>
          </div>
          <p className="mt-4 max-w-[72ch] whitespace-pre-wrap text-base leading-8 text-ink">{item.stem}</p>
        </section>

        <section className="mt-5 grid gap-2.5">
          {OPTIONS.map((option) => {
            if (!item.alternatives[option]) return null;
            const isCorrectOpt = revealed && correct === option;
            const isPickedWrong = revealed && picked === option && correct !== option;
            const isEliminated = eliminated[index]?.includes(option) ?? false;
            return (
              <div
                key={option}
                className={cx(
                  "flex w-full items-stretch overflow-hidden rounded-surface border text-sm transition-colors",
                  isCorrectOpt
                    ? "border-success bg-surface text-success"
                    : isPickedWrong
                      ? "border-danger bg-surface text-danger"
                      : isEliminated
                        ? "border-edge bg-surface opacity-60"
                        : "border-edge bg-surface hover:border-primary",
                )}
              >
                <button
                  type="button"
                  onClick={() => pick(option)}
                  disabled={revealed || isEliminated}
                  className="flex min-w-0 flex-1 items-start gap-3 px-3 py-3 text-left disabled:cursor-not-allowed"
                >
                  <span className={cx(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-control border text-xs font-semibold",
                    isCorrectOpt || isPickedWrong ? "border-current bg-paper" : "border-edge bg-paper text-ink",
                  )}>{option}</span>
                  <span className={cx("min-w-0 flex-1 leading-relaxed", isEliminated && "text-muted line-through")}>{item.alternatives[option]}</span>
                  {isCorrectOpt && <span className="hidden rounded-control border border-current px-2 py-0.5 text-[10px] font-semibold sm:inline">Gabarito</span>}
                </button>
                <button
                  type="button"
                  onClick={() => toggleEliminate(option)}
                  disabled={revealed}
                  aria-pressed={isEliminated}
                  aria-label={isEliminated ? `Restaurar alternativa ${option}` : `Riscar alternativa ${option}`}
                  title={isEliminated ? "Restaurar" : "Riscar"}
                  className={cx("w-11 shrink-0 border-l border-edge text-lg disabled:cursor-not-allowed disabled:opacity-45", isEliminated ? "text-danger" : "text-muted hover:text-danger")}
                >
                  -
                </button>
              </div>
            );
          })}
        </section>

        {revealed && (
          <section
            className={cx(
              "mt-4 rounded-surface border bg-surface p-4 text-sm",
              pickedCorrect ? "border-success/50" : "border-danger/50",
            )}
          >
            <p className={cx("font-serif text-xl font-semibold leading-tight", pickedCorrect ? "text-success" : "text-danger")}>
              {pickedCorrect ? "Recuperou." : `Errou. Gabarito ${correct ?? "-"}`}
            </p>
          </section>
        )}
      </main>

      <footer className="sticky bottom-0 border-t border-edge bg-surface/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-end gap-2">
          {!revealed && picked !== null && (
            <button
              type="button"
              onClick={reveal}
              className="rounded-surface border border-primary bg-primary px-5 py-2 text-sm font-semibold text-primaryInk shadow-sm"
            >
              Ver resposta
            </button>
          )}
          {!revealed && picked === null && (
            <button type="button" onClick={next} className="rounded-surface border border-edge px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-primary hover:text-ink">
              Pular
            </button>
          )}
          {revealed && (
            <button
              type="button"
              onClick={next}
              className="rounded-surface border border-primary bg-primary px-5 py-2 text-sm font-semibold text-primaryInk shadow-sm"
            >
              {isLast ? "Concluir fixação" : "Próxima"}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
