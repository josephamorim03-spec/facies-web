import { useCallback, useEffect, useRef, useState } from "react";
import {
  navigateOperationalTurboSession,
  repeatOperationalTurboSession,
  startOperationalTurboSession,
  submitOperationalTurboSessionAction,
  type APIError,
  type OperationalNoteItem,
  type OperationalAreaCode,
  type OperationalTurboCardContext,
  type OperationalTurboReviewChange,
  type OperationalTurboResult,
  type OperationalTurboSessionSnapshot,
} from "@/lib/api";

function turboStartFeedback(error: unknown): string {
  const apiError = (error ?? {}) as APIError;
  const rawDetails = (apiError.details ?? {}) as Record<string, unknown>;
  const detail = (rawDetails?.detail ?? rawDetails ?? null) as Record<string, unknown> | null;
  const code =
    typeof detail?.code === "string"
      ? detail.code
      : typeof rawDetails?.code === "string"
        ? rawDetails.code
        : "";

  if (code === "turbo_min_cards_required") {
    return typeof detail?.message === "string"
      ? detail.message
      : "Selecione pelo menos 10 cards para iniciar a sessão.";
  }

  if (apiError.status === 500 || code === "turbo_session_start_failed") {
    return "Nao foi possivel iniciar o Turbo agora. Tente novamente em alguns segundos.";
  }

  return (error as Error)?.message ?? "Erro no turbo.";
}

type UseTurboSessionArgs = {
  token: string;
  onPostActionSync?: () => Promise<void>;
};

export function useTurboSession({ token, onPostActionSync }: UseTurboSessionArgs) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [note, setNote] = useState<OperationalNoteItem | null>(null);
  const [turboLoading, setTurboLoading] = useState(false);
  const [turboFeedback, setTurboFeedback] = useState("");
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionIncorrect, setSessionIncorrect] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [sessionPending, setSessionPending] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);
  const [isRepeatSession, setIsRepeatSession] = useState(false);
  const [canRepeatSession, setCanRepeatSession] = useState(false);
  const [canNavigatePrev, setCanNavigatePrev] = useState(false);
  const [canNavigateNext, setCanNavigateNext] = useState(false);
  const [isStandbyRound, setIsStandbyRound] = useState(false);
  const [currentCardContext, setCurrentCardContext] = useState<OperationalTurboCardContext | null>(null);
  const [lastReviewChange, setLastReviewChange] = useState<OperationalTurboReviewChange | null>(null);
  const [reviewChanges, setReviewChanges] = useState<OperationalTurboReviewChange[]>([]);
  const [turboRevealed, setTurboRevealed] = useState(false);
  const [cardTimings, setCardTimings] = useState<number[]>([]);
  const [areaStats, setAreaStats] = useState<Record<string, { correct: number; total: number }>>({});
  const turboActionLockRef = useRef(false);
  const cardStartedAtRef = useRef<number | null>(null);

  const applySnapshot = useCallback((snapshot: OperationalTurboSessionSnapshot) => {
    setSessionId(snapshot.session_id);
    setSessionTotal(snapshot.session_total);
    setSessionPending(snapshot.session_pending);
    setSessionCorrect(snapshot.session_correct);
    setSessionIncorrect(snapshot.session_incorrect);
    setSessionDone(snapshot.session_done);
    setIsRepeatSession(snapshot.is_repeat_session);
    setCanRepeatSession(snapshot.can_repeat_session);
    setCanNavigatePrev(snapshot.can_navigate_prev);
    setCanNavigateNext(snapshot.can_navigate_next);
    setIsStandbyRound(snapshot.is_standby_round);
    setCurrentCardContext(snapshot.current_card_context ?? null);
    setLastReviewChange(snapshot.last_review_change ?? null);
    if (snapshot.last_review_change) {
      setReviewChanges((prev) => [...prev, snapshot.last_review_change!]);
    }
    setNote(snapshot.note);
    setTurboRevealed(false);
    if (snapshot.note) cardStartedAtRef.current = Date.now();
  }, []);

  const resetSession = useCallback(() => {
    turboActionLockRef.current = false;
    setSessionId(null);
    setNote(null);
    setTurboLoading(false);
    setTurboFeedback("");
    setSessionTotal(0);
    setSessionPending(0);
    setSessionCorrect(0);
    setSessionIncorrect(0);
    setSessionDone(false);
    setIsRepeatSession(false);
    setCanRepeatSession(false);
    setCanNavigatePrev(false);
    setCanNavigateNext(false);
    setIsStandbyRound(false);
    setCurrentCardContext(null);
    setLastReviewChange(null);
    setReviewChanges([]);
    setTurboRevealed(false);
    setCardTimings([]);
    setAreaStats({});
    cardStartedAtRef.current = null;
  }, []);

  const startSession = useCallback(async (
    noteIds?: string[],
    targetCards?: number,
    area?: OperationalAreaCode,
    trainer?: { recommendationId: string; actionId: string },
  ) => {
    turboActionLockRef.current = false;
    setTurboLoading(true);
    setTurboFeedback("");
    setAreaStats({});
    setCurrentCardContext(null);
    setLastReviewChange(null);
    setReviewChanges([]);
    try {
      const snapshot = await startOperationalTurboSession(
        token,
        noteIds?.length || typeof targetCards === "number" || area
          ? {
            ...(noteIds?.length ? { noteIds } : {}),
            ...(typeof targetCards === "number" ? { targetCards } : {}),
            ...(area ? { area } : {}),
            ...(trainer?.recommendationId ? { recommendationId: trainer.recommendationId } : {}),
            ...(trainer?.actionId ? { actionId: trainer.actionId } : {}),
          }
          : undefined,
      );
      applySnapshot(snapshot);
    } catch (e: unknown) {
      setTurboFeedback(turboStartFeedback(e));
    } finally {
      setTurboLoading(false);
    }
  }, [token, applySnapshot]);

  const submitAction = useCallback(
    async (result: OperationalTurboResult) => {
      if (!sessionId) return;
      if (turboActionLockRef.current) return;
      const ratedArea = note?.area ?? null;
      const isCorrect = result === "good" || result === "easy";
      turboActionLockRef.current = true;
      if (cardStartedAtRef.current !== null) {
        setCardTimings((prev) => [...prev, Date.now() - cardStartedAtRef.current!]);
        cardStartedAtRef.current = null;
      }
      setTurboLoading(true);
      setTurboFeedback("");
      setTurboRevealed(false);
      try {
        const snapshot = await submitOperationalTurboSessionAction(token, sessionId, { result });
        applySnapshot(snapshot);
        if (ratedArea && result !== "skip") {
          setAreaStats((prev) => ({
            ...prev,
            [ratedArea]: {
              correct: (prev[ratedArea]?.correct ?? 0) + (isCorrect ? 1 : 0),
              total: (prev[ratedArea]?.total ?? 0) + 1,
            },
          }));
        }
        if (onPostActionSync) {
          await onPostActionSync();
        }
      } catch (e: unknown) {
        setTurboFeedback((e as Error)?.message ?? "Erro ao registrar revisão.");
      } finally {
        setTurboLoading(false);
        turboActionLockRef.current = false;
      }
    },
    [token, sessionId, note?.area, applySnapshot, onPostActionSync]
  );

  const startRepeat = useCallback(async () => {
    if (!sessionId) return;
    if (turboActionLockRef.current) return;
    turboActionLockRef.current = true;
    setTurboLoading(true);
    setTurboFeedback("");
    setAreaStats({});
    setCurrentCardContext(null);
    setLastReviewChange(null);
    setReviewChanges([]);
    try {
      const snapshot = await repeatOperationalTurboSession(token, sessionId);
      applySnapshot(snapshot);
    } catch (e: unknown) {
      setTurboFeedback((e as Error)?.message ?? "Erro ao repetir sessão.");
    } finally {
      setTurboLoading(false);
      turboActionLockRef.current = false;
    }
  }, [token, sessionId, applySnapshot]);

  const navigateSession = useCallback(
    async (direction: "prev" | "next") => {
      if (!sessionId) return;
      if (turboActionLockRef.current) return;
      turboActionLockRef.current = true;
      setTurboLoading(true);
      setTurboFeedback("");
      try {
        const snapshot = await navigateOperationalTurboSession(token, sessionId, { direction });
        applySnapshot(snapshot);
      } catch (e: unknown) {
        setTurboFeedback((e as Error)?.message ?? "Erro ao navegar nos cards.");
      } finally {
        setTurboLoading(false);
        turboActionLockRef.current = false;
      }
    },
    [token, sessionId, applySnapshot]
  );

  return {
    sessionId,
    note,
    turboLoading,
    turboFeedback,
    turboRevealed,
    setTurboRevealed,
    sessionTotal,
    sessionPending,
    sessionCorrect,
    sessionIncorrect,
    sessionDone,
    isRepeatSession,
    canRepeatSession,
    canNavigatePrev,
    canNavigateNext,
    isStandbyRound,
    currentCardContext,
    lastReviewChange,
    reviewChanges,
    startSession,
    submitAction,
    navigateSession,
    startRepeat,
    resetSession,
    isActionLocked: turboActionLockRef.current,
    cardTimings,
    areaStats,
  };
}
