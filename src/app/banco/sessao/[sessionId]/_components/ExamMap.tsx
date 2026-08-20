"use client";

import type { QuestionBankSessionItem } from "@/lib/api";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type ExamMapProps = {
  items: QuestionBankSessionItem[];
  sessionKindLabel: string;
  currentPosition: number;
  onNavigateTo: (position: number) => void;
  onClose: () => void;
};

function IconClose({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M5 5l10 10" />
      <path d="M15 5 5 15" />
    </svg>
  );
}

export default function ExamMap({ items, sessionKindLabel, currentPosition, onNavigateTo, onClose }: ExamMapProps) {
  const answered = items.filter((item) => item.answered).length;
  const marked = items.filter((item) => item.doubtful).length;
  const open = Math.max(0, items.length - answered);

  return (
    <div className="fixed inset-y-0 right-0 z-30 flex w-[min(22rem,100vw)] flex-col border-l border-edge bg-surface shadow-[var(--soft-shadow)]">
      <div className="border-b border-edge px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Navegação</p>
            <h2 className="mt-0.5 font-serif text-lg font-semibold leading-tight text-ink">
              {sessionKindLabel === "Prova" ? "Mapa da prova" : "Mapa do simulado"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-surface p-2 text-muted hover:bg-surfaceMuted hover:text-ink"
            aria-label="Fechar mapa"
          >
            <IconClose />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1.5 text-center text-xs">
          <div className="rounded-surface border border-edge bg-paper px-2 py-2">
            <p className="font-semibold text-ink">{answered}</p>
            <p className="text-muted">feitas</p>
          </div>
          <div className="rounded-surface border border-edge bg-paper px-2 py-2">
            <p className="font-semibold text-ink">{open}</p>
            <p className="text-muted">abertas</p>
          </div>
          <div className="rounded-surface border border-edge bg-paper px-2 py-2">
            <p className="font-semibold text-warning">{marked}</p>
            <p className="text-muted">marcadas</p>
          </div>
        </div>
      </div>

      <div className="border-b border-edge px-4 py-3">
        <div className="grid grid-cols-2 gap-2 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded border border-edge bg-paper" />
            Não respondida
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded bg-primary" />
            Respondida
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded bg-warning" />
            Marcada
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded border-2 border-primary bg-paper" />
            Atual
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
                  "flex h-10 w-full items-center justify-center rounded-surface border text-xs font-semibold transition-colors",
                  isCurrent && "ring-2 ring-primary ring-offset-2 ring-offset-surface",
                  isDoubtful
                    ? "border-warning bg-warning text-white"
                    : isAnswered
                      ? "border-primary bg-primary text-primaryInk"
                      : "border-edge bg-paper text-muted hover:border-primary hover:text-ink",
                )}
                title={`Questão ${item.position}`}
                aria-current={isCurrent ? "true" : undefined}
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
