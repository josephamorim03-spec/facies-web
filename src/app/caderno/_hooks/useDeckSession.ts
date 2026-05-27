"use client";

import { useCallback, useRef, useState } from "react";
import {
  OperationalNoteItem,
  OperationalTurboResult,
  submitOperationalTurboReview,
} from "@/lib/api";

type UseDeckSessionArgs = {
  token: string;
  onPostRate?: () => Promise<void>;
};

export function useDeckSession({ token, onPostRate }: UseDeckSessionArgs) {
  const [deck, setDeck] = useState<OperationalNoteItem[]>([]);
  const [viewIndex, setViewIndex] = useState(0);
  const [ratings, setRatings] = useState<Record<string, OperationalTurboResult>>({});
  const [revealed, setRevealed] = useState(false);
  const loading = false;
  const [feedback, setFeedback] = useState("");
  const [cardTimings, setCardTimings] = useState<number[]>([]);
  const [areaStats, setAreaStats] = useState<Record<string, { correct: number; total: number }>>({});
  const cardStartedAtRef = useRef<number | null>(null);
  const pendingSubmitByNoteRef = useRef<Set<string>>(new Set());

  function loadDeck(notes: OperationalNoteItem[]) {
    setDeck(notes);
    setViewIndex(0);
    setRatings({});
    setRevealed(false);
    setFeedback("");
    setCardTimings([]);
    setAreaStats({});
    cardStartedAtRef.current = notes.length > 0 ? Date.now() : null;
    pendingSubmitByNoteRef.current.clear();
  }

  function navigatePrev() {
    setViewIndex(v => Math.max(0, v - 1));
    setRevealed(false);
    cardStartedAtRef.current = Date.now();
  }

  function navigateNext() {
    setViewIndex(v => (v + 1 < deck.length ? v + 1 : v));
    setRevealed(false);
    cardStartedAtRef.current = Date.now();
  }

  const rateCard = useCallback(
    async (result: OperationalTurboResult) => {
      const note = deck[viewIndex];
      if (!note) return;
      if (pendingSubmitByNoteRef.current.has(note.note_id)) return;
      if (ratings[note.note_id]) return;

      if (cardStartedAtRef.current !== null) {
        setCardTimings(prev => [...prev, Date.now() - cardStartedAtRef.current!]);
        cardStartedAtRef.current = null;
      }

      setFeedback("");
      try {
        const newRatings = { ...ratings, [note.note_id]: result };
        const isCorrect = result === "good" || result === "easy";
        setAreaStats((prev) => ({
          ...prev,
          [note.area]: {
            correct: (prev[note.area]?.correct ?? 0) + (isCorrect ? 1 : 0),
            total: (prev[note.area]?.total ?? 0) + 1,
          },
        }));
        setRatings(newRatings);

        setRevealed(false);

        const allRated = deck.every(n => n.note_id in newRatings);
        if (allRated) {
          // Out-of-bounds sentinel → currentNote = null regardless of batching
          setViewIndex(deck.length);
          // Skip onPostRate — eliminates the second await that creates a render race
        } else {
          // Advance to next unrated card (forward first, then wrap)
          let nextIndex = viewIndex;
          for (let i = viewIndex + 1; i < deck.length; i++) {
            if (!newRatings[deck[i].note_id]) { nextIndex = i; break; }
          }
          if (nextIndex === viewIndex) {
            for (let i = 0; i < viewIndex; i++) {
              if (!newRatings[deck[i].note_id]) { nextIndex = i; break; }
            }
          }
          setViewIndex(nextIndex);
        }
        pendingSubmitByNoteRef.current.add(note.note_id);
        await submitOperationalTurboReview(token, note.note_id, { result });
        if (onPostRate && !allRated) await onPostRate();
      } catch (e) {
        setFeedback((e as Error)?.message ?? "Erro ao registrar revisão.");
      } finally {
        pendingSubmitByNoteRef.current.delete(note.note_id);
        cardStartedAtRef.current = Date.now();
      }
    },
    [token, deck, viewIndex, ratings, onPostRate],
  );

  function repeatSession() {
    setRatings({});
    setViewIndex(0);
    setRevealed(false);
    setCardTimings([]);
    setAreaStats({});
    pendingSubmitByNoteRef.current.clear();
    cardStartedAtRef.current = deck.length > 0 ? Date.now() : null;
  }

  function resetSession() {
    setDeck([]);
    setViewIndex(0);
    setRatings({});
    setRevealed(false);
    setFeedback("");
    setCardTimings([]);
    setAreaStats({});
    cardStartedAtRef.current = null;
    pendingSubmitByNoteRef.current.clear();
  }

  const sessionDone = deck.length > 0 && deck.every(n => n.note_id in ratings);
  const currentNote = sessionDone ? null : (deck.length > 0 ? (deck[viewIndex] ?? null) : null);
  const sessionCorrect = Object.values(ratings).filter(r => r === "easy" || r === "good").length;
  const sessionIncorrect = Object.values(ratings).filter(r => r === "again" || r === "hard").length;
  const canNavigatePrev = !sessionDone && viewIndex > 0;
  const canNavigateNext = !sessionDone && viewIndex + 1 < deck.length;

  return {
    note: currentNote,
    turboLoading: loading,
    turboFeedback: feedback,
    turboRevealed: revealed,
    setTurboRevealed: setRevealed,
    sessionCorrect,
    sessionIncorrect,
    sessionDone,
    canRepeatSession: sessionDone,
    canNavigatePrev,
    canNavigateNext,
    isActionLocked: false,
    cardTimings,
    areaStats,
    deckSize: deck.length,
    loadDeck,
    navigatePrev,
    navigateNext,
    rateCard,
    repeatSession,
    resetSession,
  };
}
