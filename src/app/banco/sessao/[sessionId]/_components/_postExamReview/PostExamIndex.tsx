"use client";

import type { QuestionBankSessionItem } from "@/lib/api";

import { cx } from "./utils";

type PostExamIndexProps = {
  items: QuestionBankSessionItem[];
  currentPosition: number;
  onSelect: (index: number) => void;
};

/**
 * Índice da revisão, em grade.
 *
 * A correção pós-prova era uma lista plana: cada aba renderizava TODAS as
 * questões com enunciado e alternativas abertos. Numa prova de 60, revisar 25
 * erros virava uma rolagem sem começo nem fim — sem saber quantas faltavam, sem
 * voltar para uma específica, sem sair do meio.
 *
 * A grade é a mesma do `ExamMap` que o aluno acabou de usar durante a prova: os
 * mesmos quadrados numerados, no mesmo lugar da tela. Reaproveitar o modelo
 * mental custa zero e é o que faz a tela ser lida sem instrução.
 */
export function PostExamIndex({ items, currentPosition, onSelect }: PostExamIndexProps) {
  if (items.length <= 1) return null;

  return (
    <section aria-labelledby="post-exam-index-title" className="border border-edge bg-surface p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3
          id="post-exam-index-title"
          className="text-nano font-semibold uppercase tracking-[0.14em] text-muted"
        >
          Índice
        </h3>
        <p className="text-xs text-muted">{items.length} questões neste filtro</p>
      </div>

      <div className="mt-2 grid grid-cols-8 gap-1.5 sm:grid-cols-10">
        {items.map((item, index) => {
          const isCurrent = item.position === currentPosition;
          // O estado aqui é o RESULTADO, não "respondida": a prova acabou, e o
          // que o aluno procura na grade é onde ele errou.
          const isWrong = item.is_correct === false;
          const isRight = item.is_correct === true;
          return (
            <button
              key={item.question_id}
              type="button"
              onClick={() => onSelect(index)}
              aria-current={isCurrent ? "true" : undefined}
              aria-label={`Questão ${item.position}${
                isWrong ? ", errou" : isRight ? ", acertou" : ""
              }`}
              className={cx(
                "flex min-h-10 w-full items-center justify-center border text-xs font-semibold tabular-nums transition-colors",
                isCurrent && "ring-2 ring-primary ring-offset-2 ring-offset-surface",
                isWrong
                  ? "border-danger bg-danger text-paper"
                  : isRight
                    ? "border-success bg-success text-paper"
                    : "border-edge bg-paper text-muted hover:border-primary hover:text-ink",
              )}
            >
              {item.position}
            </button>
          );
        })}
      </div>
    </section>
  );
}
