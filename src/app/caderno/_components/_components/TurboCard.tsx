"use client";

import React from "react";
import {
  type OperationalNoteItem,
  type OperationalTurboCardContext,
  type OperationalTurboReviewChange,
  type OperationalTurboResult,
} from "@/lib/api";
import { AREA_COLORS, Area } from "../../_lib/cadernoShared";
import type { UseTurboCardStateReturn } from "../_hooks/useTurboCardState";

const TURBO_VIEWPORT_MIN_HEIGHT = "calc(100svh - 5.5rem)";

function IconClock({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function fmtTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function formatIntervalLabel(days: number | undefined): string {
  if (typeof days !== "number" || !Number.isFinite(days)) return "";
  if (days <= 0.25) return "volta hoje";
  if (days <= 1.5) return "volta amanhã";
  const rounded = Math.max(2, Math.round(days));
  return `volta em ${rounded} dias`;
}

const RATING_EFFECT_TONE: Record<"again" | "hard" | "good" | "easy", string> = {
  again: "text-red-400",
  hard: "text-amber-500",
  good: "text-emerald-700",
  easy: "text-sky-700",
};

export type TurboCardProps = {
  turboNote: OperationalNoteItem;
  turboLoading: boolean;
  isActionLocked: boolean;
  isStandbyRound: boolean;
  isTurboMode: boolean;
  currentCardContext?: OperationalTurboCardContext | null;
  lastReviewChange?: OperationalTurboReviewChange | null;
  deckSize: number;
  sessionCorrect: number;
  sessionIncorrect: number;
  sessionDone: boolean;
  cardState: UseTurboCardStateReturn;
  onRateAction: (result: OperationalTurboResult) => void | Promise<void>;
  // Timer state (owned by panel)
  timerEnabled: boolean;
  setTimerEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  progressEnabled: boolean;
  setProgressEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  elapsed: number;
  estimatedMs: number;
};

export function TurboCard({
  turboNote,
  turboLoading,
  isActionLocked,
  isStandbyRound,
  isTurboMode,
  currentCardContext,
  lastReviewChange,
  deckSize,
  sessionCorrect,
  sessionIncorrect,
  sessionDone,
  cardState,
  onRateAction,
  timerEnabled,
  setTimerEnabled,
  progressEnabled,
  setProgressEnabled,
  elapsed,
  estimatedMs,
}: TurboCardProps) {
  const areaColor = AREA_COLORS[turboNote.area as Area] ?? "#888";
  const currentWhyLabel = currentCardContext?.label ?? "Este card entrou na fila de agora.";
  const lastChangeLabel = lastReviewChange
    ? formatIntervalLabel(lastReviewChange.next_due_in_days)
    : "";

  // Timer display
  const timerPct = estimatedMs > 0 ? elapsed / estimatedMs : 0;
  const timerColor = isTurboMode
    ? timerPct >= 1.2 ? "text-red-500 animate-pulse"
      : timerPct >= 1.0 ? "text-red-500"
      : timerPct >= 0.8 ? "text-amber-500"
      : "text-muted"
    : "text-muted";

  // Progress
  const answeredCards = sessionCorrect + sessionIncorrect;
  const totalCards = Math.max(deckSize, answeredCards);
  const progressNumerator = sessionDone ? totalCards : answeredCards;
  const progressRatio = totalCards > 0 ? Math.min(1, progressNumerator / totalCards) : 0;
  const progressPercent = Math.round(progressRatio * 100);

  return (
    <div className="space-y-3 overflow-x-clip flex flex-col min-h-0" style={{ minHeight: TURBO_VIEWPORT_MIN_HEIGHT }}>

      {/* Top controls */}
      <div className="flex items-center justify-between gap-3">
        {lastChangeLabel ? (
          <span className="text-[10px] border border-edge px-1.5 py-0.5 text-muted leading-none">
            ↩ {lastChangeLabel}
          </span>
        ) : <span className="min-h-[1rem] block" />}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setTimerEnabled((v: boolean) => !v)}
            aria-pressed={timerEnabled}
            className="text-xs text-muted hover:text-ink flex items-center gap-1 p-2 -m-2"
            title={timerEnabled ? "Ocultar timer" : "Mostrar timer"}
          >
            <IconClock className="w-3 h-3" />
            <span>{timerEnabled ? "on" : "off"}</span>
          </button>
          {timerEnabled && (
            <span className={`text-xs font-mono tabular-nums ${timerColor}`}>
              {fmtTime(elapsed)} / {fmtTime(estimatedMs)}
            </span>
          )}
        </div>
      </div>

      {/* Card */}
      <div
        data-testid="turbo-card"
        data-allow-horizontal-swipe="true"
        className="flex-1 min-h-0 select-none relative overflow-hidden flex items-center"
        style={{
          transform: cardState.flying
            ? `translateX(${cardState.flying === "left" ? "-150%" : "150%"})`
            : `translateX(${cardState.dragX}px)`,
          opacity: cardState.flying ? 0 : cardState.isCardExiting ? 0 : Math.max(0.35, 1 - Math.abs(cardState.dragX) / 280),
          transition: cardState.flying
            ? "transform 0.22s ease, opacity 0.18s ease"
            : cardState.isCardExiting
            ? "opacity 0.1s ease"
            : "none",
          touchAction: "pan-y",
          cursor: cardState.flipPhase !== "idle" ? "default" : (cardState.isDragging ? "grabbing" : "default"),
        }}
        onPointerDown={cardState.handlePointerDown}
        onPointerMove={cardState.handlePointerMove}
        onPointerUp={cardState.handlePointerUp}
        onPointerCancel={cardState.handlePointerCancel}
      >
        <div
          className={`border-2 w-full min-h-[16rem] max-h-full flex flex-col p-4 rounded-[2px] ${
            cardState.flipPhase === "out" ? "turbo-card-flip-out" : cardState.flipPhase === "in" ? "turbo-card-flip-in" : ""
          }`}
          style={{
            borderColor: areaColor,
            backgroundColor: `${areaColor}0d`,
          }}
        >
          <div className="flex items-center justify-between gap-1">
            <span
              className="text-xs font-semibold px-2 py-0.5 text-white uppercase tracking-widest"
              style={{ backgroundColor: areaColor }}
            >
              {turboNote.area} - {turboNote.theme}
            </span>
            <div className="flex items-center gap-1">
              {(turboNote.turbo_incorrect ?? 0) >= 4 && (
                <span className="text-[9px] text-red-400 border border-red-200 px-1 py-0.5 rounded-sm">difícil</span>
              )}
              {isStandbyRound && (
                <span className="text-xs text-muted border border-edge px-1">pendente</span>
              )}
            </div>
          </div>
          <p className="mt-2">
            <span className="inline-flex items-center gap-1 text-[10px] border border-edge px-1.5 py-0.5 text-muted leading-none">
              ↳ {currentWhyLabel}
            </span>
          </p>

          <div className="mt-3 flex-1 overflow-hidden space-y-3">
            <p className="text-xl leading-snug font-serif [text-align:justify]">{turboNote.insight_question}</p>

            {turboNote.attachment_refs.filter(ref => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(ref)).map(ref => (
              cardState.imageUrls[ref] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={ref}
                  src={cardState.imageUrls[ref]}
                  alt=""
                  className="max-h-48 w-auto rounded object-contain mx-auto mt-2"
                  draggable={false}
                />
              ) : cardState.imageErrors[ref] ? (
                <div
                  key={ref}
                  className="w-full rounded border border-edge px-3 py-2 text-xs text-muted text-center mt-2"
                >
                  Falha ao carregar imagem
                </div>
              ) : (
                <div key={ref} className="h-16 w-full rounded animate-pulse" style={{ backgroundColor: `${areaColor}20` }} />
              )
            ))}

            {cardState.showAnswer && (
              <>
                <div className="w-full mt-2" style={{ borderTop: `1px solid ${areaColor}40` }} />
                <p className="pt-2 text-xl leading-snug font-serif whitespace-pre-wrap text-ink [text-align:justify]">
                  {turboNote.body}
                </p>
              </>
            )}
          </div>

          {!cardState.showAnswer && (
            <div className="mt-auto pt-3 border-t border-edge/70 flex flex-col items-center">
              <button
                data-testid="turbo-reveal"
                data-prevent-reveal-tap="true"
                onClick={(e) => { e.stopPropagation(); cardState.triggerRevealFlip(); }}
                className="text-xs px-4 py-2 min-h-[40px] min-w-[120px] hover:opacity-80 active:scale-[0.98] transition"
                style={{ border: `1px solid ${areaColor}`, color: areaColor }}
              >
                Revelar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Rating buttons */}
      {cardState.showAnswer && (
        <div className="flex gap-1.5">
          <button
            data-testid="turbo-rate-again"
            onClick={() => { cardState.setIsCardExiting(true); void onRateAction("again"); }}
            disabled={turboLoading || isActionLocked}
            className="flex-1 flex flex-col items-center border border-red-300 text-red-600 px-2 py-2 text-sm hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Errei</span>
            {cardState.intervalPreview ? (
              <span className={`text-[10px] ${RATING_EFFECT_TONE.again}`}>{formatIntervalLabel(cardState.intervalPreview.again)}</span>
            ) : null}
            {cardState.isDesktopHotkeys ? <span className="text-[9px] text-red-400 hidden md:block">[1]</span> : null}
          </button>
          <button
            data-testid="turbo-rate-hard"
            onClick={() => { cardState.setIsCardExiting(true); void onRateAction("hard"); }}
            disabled={turboLoading || isActionLocked}
            className="flex-1 flex flex-col items-center border border-amber-300 text-amber-600 px-2 py-2 text-sm hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Difícil</span>
            {cardState.intervalPreview ? (
              <span className={`text-[10px] ${RATING_EFFECT_TONE.hard}`}>{formatIntervalLabel(cardState.intervalPreview.hard)}</span>
            ) : null}
            {cardState.isDesktopHotkeys ? <span className="text-[9px] text-amber-400 hidden md:block">[2]</span> : null}
          </button>
          <button
            data-testid="turbo-rate-good"
            onClick={() => { cardState.setIsCardExiting(true); void onRateAction("good"); }}
            disabled={turboLoading || isActionLocked}
            className="flex-1 flex flex-col items-center border border-emerald-500 text-emerald-800 px-2 py-2 text-sm hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Bom</span>
            {cardState.intervalPreview ? (
              <span className={`text-[10px] ${RATING_EFFECT_TONE.good}`}>{formatIntervalLabel(cardState.intervalPreview.good)}</span>
            ) : null}
            {cardState.isDesktopHotkeys ? <span className="text-[9px] text-emerald-700 hidden md:block">[3]</span> : null}
          </button>
          <button
            data-testid="turbo-rate-easy"
            onClick={() => { cardState.setIsCardExiting(true); void onRateAction("easy"); }}
            disabled={turboLoading || isActionLocked}
            className="flex-1 flex flex-col items-center border border-sky-500 text-sky-800 px-2 py-2 text-sm hover:bg-sky-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Fácil</span>
            {cardState.intervalPreview ? (
              <span className={`text-[10px] ${RATING_EFFECT_TONE.easy}`}>{formatIntervalLabel(cardState.intervalPreview.easy)}</span>
            ) : null}
            {cardState.isDesktopHotkeys ? <span className="text-[9px] text-sky-700 hidden md:block">[4]</span> : null}
          </button>
        </div>
      )}

      {/* Progress bar */}
      <div
        className="pt-1"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.4rem)" }}
      >
        {progressEnabled ? (
          <div className="space-y-1">
            <div className="h-2 w-full bg-edge overflow-hidden rounded-full">
              <div
                className="h-full bg-ink transition-[width] duration-200 ease-out rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted tabular-nums">
                {progressNumerator} de {totalCards} cards
              </p>
              <button
                onClick={() => setProgressEnabled(false)}
                className="text-sm text-muted hover:text-ink p-2 -m-2 leading-none"
                title="Ocultar barra de progresso"
                aria-label="Ocultar barra de progresso"
              >
                ×
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end">
            <button
              onClick={() => setProgressEnabled(true)}
              className="text-xs text-muted hover:text-ink"
              title="Mostrar barra de progresso"
              aria-label="Mostrar barra de progresso"
            >
              ▸ progresso
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
