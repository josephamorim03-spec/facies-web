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
  /**
   * O cabecalho e parametrizado porque esta lista serve DUAS perguntas
   * diferentes: no `/banco` ela e a previa do que o filtro encontrou, e em
   * `/banco/guardadas` ela e a colecao do aluno. Duplicar o componente para
   * mudar duas linhas de texto e como as quatro copias da folha nasceram.
   */
  eyebrow?: string;
  title?: string;
};

export default function QuestionList({
  questions,
  selectedTopicSummary,
  eyebrow = "Prévia",
  title = "Questões encontradas",
}: QuestionListProps) {
  if (questions.length === 0) return null;

  return (
    <section className="km-card p-4 md:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="paper-eyebrow">{eyebrow}</p>
          <h2 className="mt-1 font-serif text-2xl font-semibold">{title}</h2>
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
                    // Mono 400, e nao sans 600: "1/4 · 25%" e DADO. Em 11/600 o
                    // par tamanho/peso nao existe em nenhum dos 22 artboards, e
                    // o negrito num numero pequeno so o faz gritar sem o tornar
                    // mais legivel — a mono tabular alinha as colunas, que e o
                    // que se quer de uma contagem repetida linha a linha.
                    className={`border px-2 py-0.5 font-mono text-micro tabular-nums ${accuracyChipClass(ratio)}`}
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
