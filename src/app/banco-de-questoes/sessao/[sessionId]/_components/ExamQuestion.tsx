/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import type { QuestionBankOption, QuestionBankSessionItem, QuestionBankSessionStatus } from "@/lib/api";

const OPTIONS: QuestionBankOption[] = ["A", "B", "C", "D", "E"];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

type ExamQuestionProps = {
  item: QuestionBankSessionItem;
  position: number;
  total: number;
  sessionStatus: QuestionBankSessionStatus;
  sessionStartedAt: string;
  examLabel: string;
  busy: boolean;
  onAnswer: (option: QuestionBankOption) => void;
  onToggleDoubtful: () => void;
  onPrev: () => void;
  onNext: () => void;
  onOpenMap: () => void;
  onFinalize: () => void;
};

export default function ExamQuestion({
  item,
  position,
  total,
  sessionStatus,
  sessionStartedAt,
  examLabel,
  busy,
  onAnswer,
  onToggleDoubtful,
  onPrev,
  onNext,
  onOpenMap,
  onFinalize,
}: ExamQuestionProps) {
  const finalized = sessionStatus === "finalized";
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const start = new Date(sessionStartedAt).getTime();
    const tick = () => {
      setElapsedSeconds(Math.floor((Date.now() - start) / 1000));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [sessionStartedAt]);

  const isLate = elapsedSeconds >= 60 * 90;
  const isCritical = elapsedSeconds >= 60 * 120;

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      {/* Exam header */}
      <header className="sticky top-0 z-10 border-b border-edge bg-surface px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="hidden text-sm font-semibold text-ink sm:block truncate">{examLabel}</span>
            <span className="text-xs text-muted">·</span>
            <span className="text-sm text-muted whitespace-nowrap">Questão {position}/{total}</span>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={cx(
                "font-mono text-sm tabular-nums transition-colors",
                isCritical ? "font-bold text-danger" : isLate ? "text-warning" : "text-muted",
              )}
              aria-label="Tempo de prova"
            >
              {formatDuration(elapsedSeconds)}
            </span>
            <button
              type="button"
              onClick={onOpenMap}
              className="rounded-xl border border-edge px-3 py-1.5 text-xs font-semibold text-muted hover:border-primary hover:text-ink"
            >
              Mapa
            </button>
            {!finalized && (
              <button
                type="button"
                onClick={onFinalize}
                disabled={busy}
                className="rounded-xl border border-danger px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger hover:text-white disabled:opacity-50"
              >
                Finalizar prova
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 md:px-6">
        {/* Stem */}
        <p className="whitespace-pre-wrap text-base leading-9 text-ink">
          {item.stem}
        </p>

        {/* Images */}
        {item.image_refs.length > 0 && (
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {item.image_refs.map((src) => (
              <img key={src} src={src} alt="Imagem da questão" className="rounded-xl border border-edge bg-surface" />
            ))}
          </div>
        )}

        {/* Alternatives */}
        <div className="mt-8 grid gap-3">
          {OPTIONS.map((option) => {
            if (!item.alternatives[option]) return null;
            const selected = item.selected_option === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => onAnswer(option)}
                disabled={busy || finalized}
                className={cx(
                  "flex w-full items-start gap-4 rounded-xl border px-4 py-4 text-left text-sm transition-colors disabled:cursor-not-allowed",
                  selected
                    ? "border-primary bg-[var(--amber-tint)] text-ink"
                    : "border-edge bg-surface hover:border-primary disabled:opacity-70",
                )}
              >
                <span className={cx(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                  selected ? "border-primary bg-primary text-primaryInk" : "border-edge bg-paper text-ink",
                )}>
                  {option}
                </span>
                <span className="min-w-0 flex-1 leading-relaxed">{item.alternatives[option]}</span>
              </button>
            );
          })}
        </div>
      </main>

      {/* Footer navigation */}
      <footer className="sticky bottom-0 border-t border-edge bg-surface px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <button
            type="button"
            onClick={onToggleDoubtful}
            className={cx(
              "rounded-xl border px-4 py-2 text-sm font-semibold transition-colors",
              item.doubtful
                ? "border-warning bg-warning text-white"
                : "border-edge text-muted hover:border-warning hover:text-warning",
            )}
          >
            {item.doubtful ? "✓ Marcada" : "Marcar para revisão"}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={position <= 1}
              onClick={onPrev}
              className="rounded-xl border border-edge px-4 py-2 text-sm font-semibold text-muted hover:border-primary hover:text-ink disabled:opacity-40"
            >
              ← Anterior
            </button>
            <button
              type="button"
              disabled={position >= total}
              onClick={onNext}
              className="rounded-xl border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primaryInk shadow-sm disabled:opacity-40"
            >
              Próxima →
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
