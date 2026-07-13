"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  type OperationalNoteItem,
  type OperationalTurboCardContext,
  type OperationalTurboOverview,
  type OperationalTurboReviewChange,
  type OperationalTurboResult,
} from "@/lib/api";
import { useTurboCardState } from "./_hooks/useTurboCardState";
import { useTurboSessionGuard } from "./_hooks/useTurboSessionGuard";
import { TurboLobby } from "./_components/TurboLobby";
import { TurboCard } from "./_components/TurboCard";
import { TurboPerformanceReport } from "./_components/TurboPerformanceReport";

const ESTIMATED_MS_PER_CARD = 22000;

type TurboReviewPanelProps = {
  turboLoading: boolean;
  turboFeedback: string;
  turboNote: OperationalNoteItem | null;
  turboRevealed: boolean;
  sessionCorrect: number;
  sessionIncorrect: number;
  sessionDone: boolean;
  canRepeatSession: boolean;
  isStandbyRound: boolean;
  isActionLocked: boolean;
  isTurboMode: boolean;
  availableCount: number;
  turboOverview?: OperationalTurboOverview | null;
  finalTurboOverview?: OperationalTurboOverview | null;
  currentCardContext?: OperationalTurboCardContext | null;
  lastReviewChange?: OperationalTurboReviewChange | null;
  reviewChanges?: OperationalTurboReviewChange[];
  deckSize: number;
  canSwipePrev: boolean;
  canSwipeNext: boolean;
  cardTimings: number[];
  onCloseAction: () => void;
  onContinueReviewAction?: () => void;
  onRevealAction: () => void;
  onStartAction: (count: number) => void | Promise<void>;
  onStartRepeatAction: () => void | Promise<void>;
  onNavigatePrevAction: () => void | Promise<void>;
  onNavigateNextAction: () => void | Promise<void>;
  onRateAction: (result: OperationalTurboResult) => void | Promise<void>;
  sessionStarted: boolean;
  areaStats?: Record<string, { correct: number; total: number }>;
  token: string;
  lobbyAccentColor?: string;
};

export function TurboReviewPanel({
  turboLoading,
  turboFeedback,
  turboNote,
  turboRevealed,
  sessionCorrect,
  sessionIncorrect,
  sessionDone,
  canRepeatSession,
  isStandbyRound,
  isActionLocked,
  isTurboMode,
  availableCount,
  turboOverview,
  finalTurboOverview,
  currentCardContext,
  lastReviewChange,
  reviewChanges = [],
  deckSize,
  canSwipePrev,
  canSwipeNext,
  cardTimings,
  onCloseAction,
  onContinueReviewAction,
  onRevealAction,
  onStartAction,
  onStartRepeatAction,
  onNavigatePrevAction,
  onNavigateNextAction,
  onRateAction,
  sessionStarted,
  areaStats = {},
  token,
  lobbyAccentColor,
}: TurboReviewPanelProps) {
  // ── Timer state (shared between card view and performance report)
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [progressEnabled, setProgressEnabled] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [finalElapsed, setFinalElapsed] = useState(0);
  const sessionStartedAtRef = useRef<number | null>(null);

  // Start timer when first card appears
  useEffect(() => {
    if (turboNote && sessionStartedAtRef.current === null) {
      sessionStartedAtRef.current = Date.now();
    }
  }, [turboNote]);

  // Capture total elapsed when session ends
  useEffect(() => {
    if (sessionDone && sessionStartedAtRef.current !== null) {
      setFinalElapsed(Date.now() - sessionStartedAtRef.current);
    }
  }, [sessionDone]);

  // Tick interval
  useEffect(() => {
    if (!timerEnabled) return;
    const id = setInterval(() => {
      if (sessionStartedAtRef.current !== null) {
        setElapsed(Date.now() - sessionStartedAtRef.current);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [timerEnabled]);

  // ── Card state hook
  const cardState = useTurboCardState({
    turboNote,
    turboRevealed,
    turboLoading,
    isActionLocked,
    canSwipePrev,
    canSwipeNext,
    token,
    onRevealAction,
    onRateAction,
    onNavigatePrevAction,
    onNavigateNextAction,
  });

  // ── Session guard hook
  const sessionGuard = useTurboSessionGuard({
    sessionStarted,
    sessionDone,
    onCloseAction,
  });

  // ── Derived
  const answeredCards = sessionCorrect + sessionIncorrect;
  const totalCards = Math.max(deckSize, answeredCards);
  const estimatedMs = (turboOverview?.due_count ?? availableCount) * ESTIMATED_MS_PER_CARD;

  return (
    <>
      <style>{`
        @keyframes turbo-card-flip-out {
          0% { transform: perspective(1400px) rotateY(0deg); opacity: 1; }
          100% { transform: perspective(1400px) rotateY(90deg); opacity: 0.9; }
        }
        @keyframes turbo-card-flip-in {
          0% { transform: perspective(1400px) rotateY(-90deg); opacity: 0.9; }
          100% { transform: perspective(1400px) rotateY(0deg); opacity: 1; }
        }
        .turbo-card-flip-out {
          animation: turbo-card-flip-out 150ms cubic-bezier(0.45, 0, 0.8, 0.2) both;
          transform-origin: center center;
          backface-visibility: hidden;
          will-change: transform, opacity;
        }
        .turbo-card-flip-in {
          animation: turbo-card-flip-in 190ms cubic-bezier(0.16, 0.84, 0.2, 1) both;
          transform-origin: center center;
          backface-visibility: hidden;
          will-change: transform, opacity;
        }
        @media (prefers-reduced-motion: reduce) {
          .turbo-card-flip-out,
          .turbo-card-flip-in {
            animation: none !important;
          }
        }
      `}</style>
      <div className="space-y-4">
        {turboFeedback && <p className="text-sm text-ink">{turboFeedback}</p>}

        {/* Confirm close */}
        {sessionGuard.confirmClose && (
          <div className="space-y-3 rounded-lg border border-edge bg-surface p-4 shadow-sm">
            <p className="text-sm">Tem certeza que deseja sair? Os cards já avaliados foram salvos, mas os restantes serão descartados.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => sessionGuard.setConfirmClose(false)}
                className="rounded-xl border border-edge bg-surface px-3 py-1.5 text-xs text-muted hover:border-primary hover:text-ink"
              >
                Continuar
              </button>
              <button
                type="button"
                onClick={sessionGuard.confirmCloseSession}
                className="rounded-xl border border-danger bg-surface px-3 py-1.5 text-xs text-danger hover:bg-surfaceMuted"
              >
                Sair da sessão
              </button>
            </div>
          </div>
        )}

        {/* Lobby */}
        {!sessionGuard.confirmClose && !turboLoading && !sessionDone && !turboNote && (
          <TurboLobby
            turboOverview={turboOverview}
            availableCount={availableCount}
            isTurboMode={isTurboMode}
            lobbyAccentColor={lobbyAccentColor}
            onStartAction={onStartAction}
          />
        )}

        {/* Loading (only before first card) */}
        {turboLoading && !sessionStarted && !turboNote && !sessionDone && (
          <div className="flex items-center justify-center py-10">
            <p className="text-sm text-muted">Carregando...</p>
          </div>
        )}

        {/* Active card */}
        {!sessionGuard.confirmClose && turboNote && (
          <TurboCard
            turboNote={turboNote}
            turboLoading={turboLoading}
            isActionLocked={isActionLocked}
            isStandbyRound={isStandbyRound}
            isTurboMode={isTurboMode}
            currentCardContext={currentCardContext}
            lastReviewChange={lastReviewChange}
            deckSize={deckSize}
            sessionCorrect={sessionCorrect}
            sessionIncorrect={sessionIncorrect}
            sessionDone={sessionDone}
            cardState={cardState}
            onRateAction={onRateAction}
            timerEnabled={timerEnabled}
            setTimerEnabled={setTimerEnabled}
            progressEnabled={progressEnabled}
            setProgressEnabled={setProgressEnabled}
            elapsed={elapsed}
            estimatedMs={estimatedMs}
          />
        )}

        {/* Done — performance report */}
        {!sessionGuard.confirmClose && !turboLoading && sessionDone && !turboNote && (
          <TurboPerformanceReport
            totalCards={totalCards}
            sessionCorrect={sessionCorrect}
            sessionIncorrect={sessionIncorrect}
            cardTimings={cardTimings}
            finalElapsed={finalElapsed}
            isTurboMode={isTurboMode}
            reviewChanges={reviewChanges}
            finalTurboOverview={finalTurboOverview}
            areaStats={areaStats}
            canRepeatSession={canRepeatSession}
            turboLoading={turboLoading}
            isActionLocked={isActionLocked}
            onStartRepeatAction={onStartRepeatAction}
            handleCloseClick={sessionGuard.handleCloseClick}
            onContinueReviewAction={onContinueReviewAction}
          />
        )}
      </div>
    </>
  );
}
