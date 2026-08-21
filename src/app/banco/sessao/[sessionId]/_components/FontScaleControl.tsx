"use client";

import type { QuestionFontScale } from "./useQuestionFontScale";

type FontScaleControlProps = Pick<
  QuestionFontScale,
  "increase" | "decrease" | "canIncrease" | "canDecrease"
> & {
  className?: string;
};

export default function FontScaleControl({
  increase,
  decrease,
  canIncrease,
  canDecrease,
  className,
}: FontScaleControlProps) {
  return (
    <div
      className={["inline-flex shrink-0 overflow-hidden border border-edge", className]
        .filter(Boolean)
        .join(" ")}
      role="group"
      aria-label="Tamanho do texto da questão"
    >
      <button
        type="button"
        onClick={decrease}
        disabled={!canDecrease}
        aria-label="Diminuir texto da questão"
        title="Diminuir texto"
        className="px-2.5 py-1.5 text-xs font-semibold text-muted transition-colors hover:text-ink disabled:opacity-40"
      >
        A−
      </button>
      <button
        type="button"
        onClick={increase}
        disabled={!canIncrease}
        aria-label="Aumentar texto da questão"
        title="Aumentar texto"
        className="border-l border-edge px-2.5 py-1.5 text-xs font-semibold text-muted transition-colors hover:text-ink disabled:opacity-40"
      >
        A+
      </button>
    </div>
  );
}
