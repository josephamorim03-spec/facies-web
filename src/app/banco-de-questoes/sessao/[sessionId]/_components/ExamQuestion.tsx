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
  sessionKindLabel: string;
  answeredCount: number;
  doubtfulCount: number;
  unansweredCount: number;
  busy: boolean;
  eliminated: QuestionBankOption[];
  onToggleEliminate: (option: QuestionBankOption) => void;
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
  sessionKindLabel,
  answeredCount,
  doubtfulCount,
  unansweredCount,
  busy,
  eliminated,
  onToggleEliminate,
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
  const progress = Math.round((Math.max(0, answeredCount) / Math.max(1, total)) * 100);
  const averageSeconds = answeredCount > 0 ? Math.round(elapsedSeconds / answeredCount) : 0;

  // Keyboard shortcuts for the timed exam: A–E (or 1–5) to answer/change, ←/→ to
  // navigate, M to mark for review. Ignored while typing or with a button focused.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || el?.isContentEditable) return;

      if (event.key === "ArrowRight") {
        if (position < total) { event.preventDefault(); onNext(); }
        return;
      }
      if (event.key === "ArrowLeft") {
        if (position > 1) { event.preventDefault(); onPrev(); }
        return;
      }
      if (finalized || busy) return;
      if (event.key === "Enter") {
        if (tag !== "BUTTON" && position < total) { event.preventDefault(); onNext(); }
        return;
      }
      if (event.key.toLowerCase() === "m") {
        event.preventDefault();
        onToggleDoubtful();
        return;
      }
      const key = event.key.toUpperCase();
      const option = OPTIONS.includes(key as QuestionBankOption)
        ? (key as QuestionBankOption)
        : key >= "1" && key <= "5"
          ? OPTIONS[Number(key) - 1]
          : undefined;
      if (option && item.alternatives[option]) {
        event.preventDefault();
        onAnswer(option);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [position, total, finalized, busy, item.alternatives, onAnswer, onNext, onPrev, onToggleDoubtful]);

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      {/* Exam header */}
      <header className="sticky top-0 z-10 border-b border-edge bg-surface px-4 py-3">
        <div className="mx-auto max-w-5xl space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="hidden truncate text-sm font-semibold text-ink sm:block">{examLabel}</span>
              <span className="text-xs text-muted">·</span>
              <span className="whitespace-nowrap text-sm text-muted">Questão {position}/{total}</span>
              {item.knowledge_nodes.find((n) => n.is_primary)?.node_name && (
                <span className="hidden max-w-[12rem] truncate rounded-full border border-edge bg-surfaceMuted px-2 py-0.5 text-xs text-muted sm:block">
                  {item.knowledge_nodes.find((n) => n.is_primary)!.node_name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span
                className={cx(
                  "font-mono text-sm tabular-nums transition-colors",
                  isCritical ? "font-bold text-danger" : isLate ? "text-warning" : "text-muted",
                )}
                aria-label={`Tempo de ${sessionKindLabel.toLowerCase()}`}
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
                  Finalizar {sessionKindLabel.toLowerCase()}
                </button>
              )}
            </div>
          </div>
          <div>
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
              <span>{answeredCount} respondidas · {unansweredCount} em aberto · {doubtfulCount} marcadas</span>
              <span>{progress}%{averageSeconds > 0 ? ` · ${averageSeconds}s/questão` : ""}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surfaceMuted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
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
              <img
                key={src}
                src={src}
                alt="Imagem da questão"
                className="rounded-xl border border-edge bg-surface"
                onError={(event) => {
                  // Sessões antigas podem ter URLs assinadas já expiradas.
                  event.currentTarget.style.display = "none";
                }}
              />
            ))}
          </div>
        )}

        {/* Alternatives */}
        <div className="mt-8 grid gap-3">
          {OPTIONS.map((option) => {
            if (!item.alternatives[option]) return null;
            const selected = item.selected_option === option;
            const isEliminated = eliminated.includes(option);
            return (
              <div
                key={option}
                className={cx(
                  "flex items-stretch overflow-hidden rounded-xl border text-sm transition-colors",
                  selected
                    ? "border-primary bg-[var(--amber-tint)] text-ink"
                    : isEliminated
                      ? "border-edge bg-surface opacity-60"
                      : "border-edge bg-surface hover:border-primary",
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (isEliminated) onToggleEliminate(option);
                    onAnswer(option);
                  }}
                  disabled={busy || finalized}
                  className="flex min-w-0 flex-1 items-start gap-4 px-4 py-4 text-left disabled:cursor-not-allowed"
                >
                  <span className={cx(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                    selected ? "border-primary bg-primary text-primaryInk" : "border-edge bg-paper text-ink",
                  )}>
                    {option}
                  </span>
                  <span className={cx("min-w-0 flex-1 leading-relaxed", isEliminated && !selected && "text-muted line-through")}>
                    {item.alternatives[option]}
                  </span>
                </button>
                {!finalized && (
                  <button
                    type="button"
                    onClick={() => onToggleEliminate(option)}
                    disabled={busy}
                    aria-pressed={isEliminated}
                    aria-label={isEliminated ? `Restaurar alternativa ${option}` : `Riscar alternativa ${option}`}
                    title={isEliminated ? "Restaurar" : "Riscar (eliminar)"}
                    className={cx(
                      "flex w-12 shrink-0 items-center justify-center border-l border-edge transition-colors",
                      isEliminated ? "text-danger" : "text-muted hover:text-danger",
                    )}
                  >
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                      <path d="M4 10h12" />
                    </svg>
                  </button>
                )}
              </div>
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
            {item.doubtful ? (
              <span className="inline-flex items-center gap-1.5">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                  <path d="m5 10 3 3 7-8" />
                </svg>
                Marcada
              </span>
            ) : "Marcar para revisão"}
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
