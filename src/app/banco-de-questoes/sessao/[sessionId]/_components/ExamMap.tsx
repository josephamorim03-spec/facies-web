"use client";

import type { QuestionBankSessionItem } from "@/lib/api";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type ExamMapProps = {
  items: QuestionBankSessionItem[];
  currentPosition: number;
  onNavigateTo: (position: number) => void;
  onClose: () => void;
};

export default function ExamMap({ items, currentPosition, onNavigateTo, onClose }: ExamMapProps) {
  return (
    <div className="fixed inset-y-0 right-0 z-30 flex w-72 flex-col border-l border-edge bg-surface shadow-[var(--soft-shadow)] md:w-64">
      <div className="flex items-center justify-between border-b border-edge px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">Mapa da prova</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-muted hover:bg-surfaceMuted hover:text-ink"
          aria-label="Fechar mapa"
        >
          ✕
        </button>
      </div>

      <div className="border-b border-edge px-4 py-2">
        <div className="flex flex-wrap gap-3 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded border border-edge bg-paper" />
            Não vista
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded bg-surfaceMuted" />
            Vista
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded bg-primary" />
            Respondida
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded bg-warning" />
            Marcada
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-5 gap-1.5">
          {items.map((item) => {
            const isCurrent = item.position === currentPosition;
            const isAnswered = item.answered;
            const isDoubtful = item.doubtful;

            return (
              <button
                key={item.position}
                type="button"
                onClick={() => onNavigateTo(item.position)}
                className={cx(
                  "flex h-9 w-full items-center justify-center rounded-lg text-xs font-semibold transition-colors",
                  isCurrent && "ring-2 ring-primary ring-offset-1",
                  isDoubtful
                    ? "bg-warning text-white"
                    : isAnswered
                      ? "bg-primary text-primaryInk"
                      : "border border-edge bg-paper text-muted hover:border-primary hover:text-ink",
                )}
                title={`Questão ${item.position}`}
              >
                {item.position}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
