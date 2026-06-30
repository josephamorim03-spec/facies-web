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

  const item = items[index];
  const total = items.length;
  const recoveredCount = useMemo(() => Object.values(outcomes).filter(Boolean).length, [outcomes]);
  if (!item) return null;

  const correct = item.correct_answer;
  const isLast = index >= total - 1;
  const answered = picked !== null;
  const progress = Math.round(((index + (answered ? 1 : 0)) / Math.max(1, total)) * 100);
  const pickedCorrect = picked !== null && picked === correct;

  function pick(option: QuestionBankOption) {
    if (answered) return;
    setPicked(option);
    setOutcomes((prev) => ({ ...prev, [index]: option === correct }));
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
              <p className="mt-1 text-xs text-muted">Sem nota. A meta é puxar o raciocínio de novo e deixar menos escorregadio.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg border border-edge bg-paper px-3 py-2 text-xs font-semibold tabular-nums text-muted">
                {index + 1}/{total}
              </span>
              <button
                type="button"
                onClick={onExit}
                className="rounded-lg border border-edge px-3 py-2 text-xs font-semibold text-muted transition-colors hover:border-primary hover:text-ink"
              >
                Sair
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surfaceMuted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="w-10 text-right text-xs font-semibold text-muted">{progress}%</span>
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 md:px-6">
        <section className="rounded-lg border border-edge bg-surface p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-full border border-edge bg-paper px-2.5 py-1 text-xs text-muted">
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
            const isCorrectOpt = answered && correct === option;
            const isPickedWrong = answered && picked === option && correct !== option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => pick(option)}
                disabled={answered}
                className={cx(
                  "flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left text-sm transition-colors disabled:cursor-default",
                  isCorrectOpt
                    ? "border-success bg-surface text-success"
                    : isPickedWrong
                      ? "border-danger bg-surface text-danger"
                      : "border-edge bg-surface hover:border-primary",
                )}
              >
                <span className={cx(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                  isCorrectOpt || isPickedWrong ? "border-current bg-paper" : "border-edge bg-paper text-ink",
                )}>
                  {option}
                </span>
                <span className="min-w-0 flex-1 leading-relaxed">{item.alternatives[option]}</span>
                {isCorrectOpt && (
                  <span className="hidden rounded-full border border-current px-2 py-0.5 text-[10px] font-semibold sm:inline">Gabarito</span>
                )}
              </button>
            );
          })}
        </section>

        {answered && (
          <section
            className={cx(
              "mt-4 rounded-lg border bg-surface p-4 text-sm",
              pickedCorrect ? "border-success/50" : "border-danger/50",
            )}
          >
            <p className={cx("font-serif text-xl font-semibold leading-tight", pickedCorrect ? "text-success" : "text-danger")}>
              {pickedCorrect ? "Recuperou. Esse erro perdeu força." : `Ainda escapa. Gabarito ${correct ?? "-"}`}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {pickedCorrect
                ? "Você não só viu a resposta: conseguiu puxá-la de novo. Esse é o ganho que fixa."
                : "Releia a alternativa correta e compare com a armadilha. Se ainda doer, transforme em flashcard."}
            </p>
          </section>
        )}
      </main>

      <footer className="sticky bottom-0 border-t border-edge bg-surface/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-end gap-2">
          {!answered && (
            <button
              type="button"
              onClick={next}
              className="rounded-lg border border-edge px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-primary hover:text-ink"
            >
              Pular
            </button>
          )}
          {answered && (
            <button
              type="button"
              onClick={next}
              className="rounded-lg border border-primary bg-primary px-5 py-2 text-sm font-semibold text-primaryInk shadow-sm"
            >
              {isLast ? "Concluir fixação" : "Próxima"}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
