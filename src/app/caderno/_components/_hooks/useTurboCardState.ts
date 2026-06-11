"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchTurboIntervalPreview,
  resolveOperationalAttachmentDisplayUrl,
  type OperationalNoteItem,
  type OperationalTurboResult,
  type TurboIntervalPreview,
} from "@/lib/api";

export type UseTurboCardStateParams = {
  turboNote: OperationalNoteItem | null;
  turboRevealed: boolean;
  turboLoading: boolean;
  isActionLocked: boolean;
  canSwipePrev: boolean;
  canSwipeNext: boolean;
  token: string;
  onRevealAction: () => void;
  onRateAction: (result: OperationalTurboResult) => void | Promise<void>;
  onNavigatePrevAction: () => void | Promise<void>;
  onNavigateNextAction: () => void | Promise<void>;
};

export type UseTurboCardStateReturn = {
  // Flip
  flipPhase: "idle" | "out" | "in";
  showAnswer: boolean;
  triggerRevealFlip: () => void;

  // Swipe
  dragX: number;
  dragY: number;
  flying: "left" | "right" | "up" | null;
  isDragging: boolean;
  isCardExiting: boolean;
  isTouchLayout: boolean;
  mobileGestureHint: string | null;
  setIsCardExiting: (v: boolean) => void;
  handlePointerDown: (e: React.PointerEvent) => void;
  handlePointerMove: (e: React.PointerEvent) => void;
  handlePointerUp: (e: React.PointerEvent) => void;
  handlePointerCancel: (e: React.PointerEvent) => void;

  // Images
  imageUrls: Record<string, string>;
  imageErrors: Record<string, boolean>;

  // Interval preview
  intervalPreview: TurboIntervalPreview | null;

  // Desktop hotkeys
  isDesktopHotkeys: boolean;
};

export function useTurboCardState(params: UseTurboCardStateParams): UseTurboCardStateReturn {
  const {
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
  } = params;

  const [isDesktopHotkeys, setIsDesktopHotkeys] = useState(false);
  const [isTouchLayout, setIsTouchLayout] = useState(false);
  useEffect(() => {
    const desktopMedia = window.matchMedia("(min-width: 768px) and (pointer: fine)");
    const touchMedia = window.matchMedia("(max-width: 767px), (pointer: coarse)");
    const update = () => {
      setIsDesktopHotkeys(desktopMedia.matches);
      setIsTouchLayout(touchMedia.matches);
    };
    update();
    desktopMedia.addEventListener("change", update);
    touchMedia.addEventListener("change", update);
    return () => {
      desktopMedia.removeEventListener("change", update);
      touchMedia.removeEventListener("change", update);
    };
  }, []);

  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const imageFetchInFlightRef = useRef<Set<string>>(new Set());
  const blobUrlsByRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!turboNote) return;
    const imageRefs = turboNote.attachment_refs.filter(
      (ref) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(ref),
    );
    if (imageRefs.length === 0) return;
    const pending = imageRefs.filter(
      (ref) =>
        !imageUrls[ref] &&
        !imageErrors[ref] &&
        !imageFetchInFlightRef.current.has(ref),
    );
    if (pending.length === 0) return;

    let cancelled = false;
    for (const ref of pending) {
      imageFetchInFlightRef.current.add(ref);
      (async () => {
        try {
          const resolved = await resolveOperationalAttachmentDisplayUrl(token, ref);
          if (cancelled) {
            resolved.revoke?.();
            return;
          }
          setImageUrls((prev) => {
            const previous = prev[ref];
            if (previous && previous.startsWith("blob:")) {
              URL.revokeObjectURL(previous);
            }
            return { ...prev, [ref]: resolved.url };
          });
          const previousBlobUrl = blobUrlsByRef.current[ref];
          if (previousBlobUrl && previousBlobUrl !== resolved.url) {
            URL.revokeObjectURL(previousBlobUrl);
          }
          if (resolved.revoke) {
            blobUrlsByRef.current[ref] = resolved.url;
          } else {
            delete blobUrlsByRef.current[ref];
          }
        } catch {
          if (!cancelled) {
            setImageErrors((prev) => ({ ...prev, [ref]: true }));
          }
        } finally {
          imageFetchInFlightRef.current.delete(ref);
        }
      })();
    }

    return () => {
      cancelled = true;
    };
  }, [imageErrors, imageUrls, token, turboNote]);

  useEffect(() => {
    const inFlight = imageFetchInFlightRef.current;
    return () => {
      const previous = Object.values(blobUrlsByRef.current);
      for (const url of previous) {
        URL.revokeObjectURL(url);
      }
      blobUrlsByRef.current = {};
      inFlight.clear();
    };
  }, []);

  const [intervalPreview, setIntervalPreview] = useState<TurboIntervalPreview | null>(null);
  useEffect(() => {
    setIntervalPreview(null);
    if (!turboNote?.note_id) return;
    let cancelled = false;
    void fetchTurboIntervalPreview(token, turboNote.note_id)
      .then((preview) => {
        if (!cancelled) setIntervalPreview(preview);
      })
      .catch(() => {
        if (!cancelled) setIntervalPreview(null);
      });
    return () => {
      cancelled = true;
    };
  }, [token, turboNote?.note_id]);

  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [flying, setFlying] = useState<"left" | "right" | "up" | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [flipPhase, setFlipPhase] = useState<"idle" | "out" | "in">("idle");
  const [showAnswer, setShowAnswer] = useState(false);
  const [isCardExiting, setIsCardExiting] = useState(false);
  const pointerStartXRef = useRef(0);
  const pointerStartYRef = useRef(0);
  const dragXRef = useRef(0);
  const dragYRef = useRef(0);
  const dragAxisRef = useRef<"x" | "y" | null>(null);
  const isDraggingRef = useRef(false);
  const flipTimersRef = useRef<number[]>([]);

  const clearFlipTimers = useCallback(() => {
    for (const id of flipTimersRef.current) {
      window.clearTimeout(id);
    }
    flipTimersRef.current = [];
  }, []);

  const triggerRevealFlip = useCallback(() => {
    if (!turboNote || showAnswer || turboLoading || isActionLocked) return;
    if (flipPhase !== "idle") return;

    const reduceMotion = typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setShowAnswer(true);
      onRevealAction();
      return;
    }

    clearFlipTimers();
    setFlipPhase("out");

    const outId = window.setTimeout(() => {
      setShowAnswer(true);
      onRevealAction();
      setFlipPhase("in");
    }, 150);
    const inId = window.setTimeout(() => {
      setFlipPhase("idle");
    }, 340);

    flipTimersRef.current.push(outId, inId);
  }, [turboNote, showAnswer, turboLoading, isActionLocked, flipPhase, onRevealAction, clearFlipTimers]);

  useEffect(() => {
    clearFlipTimers();
    setFlipPhase("idle");
    setShowAnswer(Boolean(turboRevealed));
    setIsCardExiting(false);
  }, [turboNote?.note_id, clearFlipTimers, turboRevealed]);

  useEffect(() => {
    if (turboRevealed && showAnswer === false) {
      setShowAnswer(true);
    }
  }, [turboRevealed, showAnswer]);

  useEffect(() => {
    return () => clearFlipTimers();
  }, [clearFlipTimers]);

  useEffect(() => {
    if (!isDesktopHotkeys) return;
    function onKey(e: KeyboardEvent) {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName ?? "")) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (!showAnswer || turboLoading || isActionLocked) return;
      if (e.key === "1") { e.preventDefault(); void onRateAction("again"); }
      else if (e.key === "2") { e.preventDefault(); void onRateAction("hard"); }
      else if (e.key === "3") { e.preventDefault(); void onRateAction("good"); }
      else if (e.key === "4") { e.preventDefault(); void onRateAction("easy"); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isDesktopHotkeys, showAnswer, turboLoading, isActionLocked, onRateAction]);

  function resetSwipeVisualState() {
    dragXRef.current = 0;
    dragYRef.current = 0;
    dragAxisRef.current = null;
    setDragX(0);
    setDragY(0);
    setFlying(null);
  }

  function releasePointerCaptureSafe(e: React.PointerEvent) {
    const target = e.currentTarget as HTMLElement;
    if (target.hasPointerCapture(e.pointerId)) {
      target.releasePointerCapture(e.pointerId);
    }
  }

  function isInteractiveTarget(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) return false;
    return Boolean(
      target.closest(
        "button, a, input, textarea, select, [role='button'], [contenteditable='true'], img, [data-prevent-reveal-tap='true']",
      ),
    );
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (turboLoading || isActionLocked) return;
    if (flipPhase !== "idle") return;
    if (isInteractiveTarget(e.target)) return;
    if (!canSwipePrev && !canSwipeNext && !(isTouchLayout && !showAnswer)) return;
    isDraggingRef.current = true;
    setIsDragging(true);
    pointerStartXRef.current = e.clientX;
    pointerStartYRef.current = e.clientY;
    dragXRef.current = 0;
    dragYRef.current = 0;
    dragAxisRef.current = null;
    setDragX(0);
    setDragY(0);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - pointerStartXRef.current;
    const deltaY = e.clientY - pointerStartYRef.current;
    if (!dragAxisRef.current) {
      if (Math.abs(deltaY) > 12 && Math.abs(deltaY) > Math.abs(deltaX) + 6 && isTouchLayout && !showAnswer) {
        dragAxisRef.current = "y";
      } else if (Math.abs(deltaX) > 12) {
        dragAxisRef.current = "x";
      }
    }

    if (dragAxisRef.current === "y") {
      const nextDragY = Math.min(0, deltaY);
      dragXRef.current = 0;
      dragYRef.current = nextDragY;
      setDragX(0);
      setDragY(nextDragY);
      if (e.cancelable) e.preventDefault();
      return;
    }

    let nextDragX = deltaX;
    if (nextDragX > 0 && !canSwipePrev) nextDragX = Math.min(nextDragX, 24);
    if (nextDragX < 0 && !canSwipeNext) nextDragX = Math.max(nextDragX, -24);
    dragXRef.current = nextDragX;
    dragYRef.current = 0;
    setDragY(0);
    setDragX(nextDragX);
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    releasePointerCaptureSafe(e);

    if (dragAxisRef.current === "y") {
      const finalDragY = dragYRef.current;
      if (finalDragY <= -80 && isTouchLayout && !showAnswer) {
        setFlying("up");
        window.setTimeout(() => {
          resetSwipeVisualState();
          triggerRevealFlip();
        }, 140);
        return;
      }
      resetSwipeVisualState();
      return;
    }

    const finalDragX = dragXRef.current;
    const intendsNext = finalDragX <= -60 && canSwipeNext;
    const intendsPrev = finalDragX >= 60 && canSwipePrev;
    if (!intendsNext && !intendsPrev) {
      resetSwipeVisualState();
      return;
    }

    const dir: "left" | "right" = intendsNext ? "left" : "right";
    setFlying(dir);
    window.setTimeout(() => {
      setIsCardExiting(true);
      resetSwipeVisualState();
      if (dir === "left") void onNavigateNextAction();
      else void onNavigatePrevAction();
    }, 220);
  }

  function handlePointerCancel(e: React.PointerEvent) {
    releasePointerCaptureSafe(e);
    isDraggingRef.current = false;
    setIsDragging(false);
    resetSwipeVisualState();
  }

  return {
    flipPhase,
    showAnswer,
    triggerRevealFlip,
    dragX,
    dragY,
    flying,
    isDragging,
    isCardExiting,
    isTouchLayout,
    mobileGestureHint: isTouchLayout && !showAnswer ? "Arraste para cima para revelar" : null,
    setIsCardExiting,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    imageUrls,
    imageErrors,
    intervalPreview,
    isDesktopHotkeys,
  };
}
