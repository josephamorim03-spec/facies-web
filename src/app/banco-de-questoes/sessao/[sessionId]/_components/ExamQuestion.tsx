/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import type { QuestionBankOption, QuestionBankSessionItem, QuestionBankSessionStatus } from "@/lib/api";
import { formatClock } from "@/lib/formatDuration";

const OPTIONS: QuestionBankOption[] = ["A", "B", "C", "D", "E"];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function sourceLabel(source: Record<string, unknown>): string {
  const institution = String(source?.institution ?? "").trim();
  const board = String(source?.board_code ?? "").trim();
  const year = String(source?.year ?? "").trim();
  return [institution || "Instituição", board, year].filter(Boolean).join(" · ");
}

function IconFlag({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M5 17V4" />
      <path d="M5 4h8l-1 3 1 3H5" />
    </svg>
  );
}

function IconGrid({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3.5" y="3.5" width="5" height="5" rx="1" />
      <rect x="11.5" y="3.5" width="5" height="5" rx="1" />
      <rect x="3.5" y="11.5" width="5" height="5" rx="1" />
      <rect x="11.5" y="11.5" width="5" height="5" rx="1" />
    </svg>
  );
}

function IconMinus({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M4 10h12" />
    </svg>
  );
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
  finalizeLabel?: string;
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
  finalizeLabel,
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
  const primaryNode = item.knowledge_nodes.find((n) => n.is_primary) ?? item.knowledge_nodes[0];

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || el?.isContentEditable) return;

      if (event.key === "ArrowRight") {
        if (position < total) {
          event.preventDefault();
          onNext();
        }
        return;
      }
      if (event.key === "ArrowLeft") {
        if (position > 1) {
          event.preventDefault();
          onPrev();
        }
        return;
      }
      if (finalized || busy) return;
      if (event.key === "Enter") {
        if (tag !== "BUTTON" && position < total) {
          event.preventDefault();
          onNext();
        }
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
      <header className="sticky top-0 z-10 border-b border-edge bg-surface/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-6xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                {sessionKindLabel} em execução
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="truncate font-serif text-lg font-semibold leading-tight text-ink">
                  {examLabel}
                </span>
                {primaryNode?.node_name && (
                  <span className="max-w-[14rem] truncate rounded-full border border-edge bg-paper px-2 py-0.5 text-xs text-muted">
                    {primaryNode.node_name}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cx(
                  "rounded-lg border px-3 py-2 font-mono text-sm font-semibold tabular-nums transition-colors",
                  isCritical
                    ? "border-danger/40 text-danger"
                    : isLate
                      ? "border-warning/40 text-warning"
                      : "border-edge text-ink",
                )}
                aria-label={`Tempo de ${sessionKindLabel.toLowerCase()}`}
              >
                {formatClock(elapsedSeconds)}
              </span>
              <button
                type="button"
                onClick={onOpenMap}
                className="inline-flex items-center gap-1.5 rounded-lg border border-edge px-3 py-2 text-xs font-semibold text-muted hover:border-primary hover:text-ink"
              >
                <IconGrid className="h-3.5 w-3.5" />
                Mapa
              </button>
              {!finalized && (
                <button
                  type="button"
                  onClick={onFinalize}
                  disabled={busy}
                  className="rounded-lg border border-danger px-3 py-2 text-xs font-semibold text-danger hover:bg-danger hover:text-white disabled:opacity-50"
                >
                  {finalizeLabel ?? `Finalizar ${sessionKindLabel.toLowerCase()}`}
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2 text-xs text-muted">
                <span>Questão {position} de {total}</span>
                <span>{progress}% respondido</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surfaceMuted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
              <div className="rounded-lg border border-edge bg-paper px-3 py-2">
                <p className="font-semibold text-ink">{answeredCount}</p>
                <p className="text-muted">feitas</p>
              </div>
              <div className="rounded-lg border border-edge bg-paper px-3 py-2">
                <p className="font-semibold text-ink">{unansweredCount}</p>
                <p className="text-muted">abertas</p>
              </div>
              <div className="rounded-lg border border-edge bg-paper px-3 py-2">
                <p className="font-semibold text-warning">{doubtfulCount}</p>
                <p className="text-muted">marcadas</p>
              </div>
            </div>
          </div>
          {averageSeconds > 0 && (
            <p className="text-right text-xs text-muted">{averageSeconds}s por questão em média</p>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="font-semibold text-ink">Atalhos:</span>
            <span>A-E ou 1-5 respondem</span>
            <span>Setas navegam</span>
            <span>Enter avanca</span>
            <span>M marca revisao</span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-7 md:px-6">
        <section className="rounded-lg border border-edge bg-surface p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">{sourceLabel(item.source)}</p>
            {item.selected_option && (
              <span className="rounded-full border border-primary/40 bg-[var(--amber-tint)] px-2.5 py-1 text-xs font-semibold text-primary">
                Resposta {item.selected_option}
              </span>
            )}
          </div>
          <p className="mt-4 whitespace-pre-wrap text-base leading-9 text-ink">
            {item.stem}
          </p>

          {item.image_refs.length > 0 && (
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {item.image_refs.map((src) => (
                <img
                  key={src}
                  src={src}
                  alt="Imagem da questão"
                  className="rounded-lg border border-edge bg-surface"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ))}
            </div>
          )}
        </section>

        <section className="mt-5 grid gap-2.5">
          {OPTIONS.map((option) => {
            if (!item.alternatives[option]) return null;
            const selected = item.selected_option === option;
            const isEliminated = eliminated.includes(option);
            return (
              <div
                key={option}
                className={cx(
                  "flex items-stretch overflow-hidden rounded-lg border text-sm transition-colors",
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
                    title={isEliminated ? "Restaurar" : "Riscar"}
                    className={cx(
                      "flex w-12 shrink-0 items-center justify-center border-l border-edge transition-colors",
                      isEliminated ? "text-danger" : "text-muted hover:text-danger",
                    )}
                  >
                    <IconMinus />
                  </button>
                )}
              </div>
            );
          })}
        </section>
      </main>

      <footer className="sticky bottom-0 border-t border-edge bg-surface/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onToggleDoubtful}
            className={cx(
              "inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors",
              item.doubtful
                ? "border-warning bg-warning text-white"
                : "border-edge text-muted hover:border-warning hover:text-warning",
            )}
          >
            <IconFlag className="h-3.5 w-3.5" />
            {item.doubtful ? "Marcada" : "Marcar para revisão"}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={position <= 1}
              onClick={onPrev}
              className="rounded-lg border border-edge px-4 py-2 text-sm font-semibold text-muted hover:border-primary hover:text-ink disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={position >= total}
              onClick={onNext}
              className="rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primaryInk shadow-sm disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
