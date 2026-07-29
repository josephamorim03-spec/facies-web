import { useEffect, useRef, useState } from "react";
import {
  MONTH_SWIPE_ANIMATION_MS,
  MONTH_SWIPE_AXIS_LOCK_PX,
  MONTH_SWIPE_CANCEL_MS,
  MONTH_SWIPE_COMMIT_MIN_PX,
  MONTH_SWIPE_COMMIT_RATIO,
  MONTH_SWIPE_SUPPRESS_TAP_MS,
} from "../constants";

type SwipeDirection = "prev" | "next";
type SwipeAxis = "x" | "y" | null;

export type MonthTransitionPhase = "idle" | "dragging" | "animating";

export type MonthTransitionState = {
  phase: MonthTransitionPhase;
  direction: SwipeDirection | null;
  offsetPx: number;
  durationMs: number;
  shouldCommit: boolean;
  previewYear: number | null;
  previewMonth: number | null;
};

function getTouchById(list: TouchList, touchId: number): Touch | null {
  for (let i = 0; i < list.length; i += 1) {
    const touch = list.item(i);
    if (touch && touch.identifier === touchId) return touch;
  }
  return null;
}

function getTrackedTouch(list: TouchList, touchId: number | null): Touch | null {
  if (touchId !== null) {
    const tracked = getTouchById(list, touchId);
    if (tracked) return tracked;
  }
  if (list.length > 0) return list.item(0);
  return null;
}

function shouldIgnoreMonthSwipeStart(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest("[data-calendar-swipe-ignore='true']")) return true;
  return Boolean(
    target.closest("button, a, input, textarea, select, [contenteditable='true'], [draggable='true']"),
  );
}

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const shifted = new Date(year, month + delta, 1);
  return { year: shifted.getFullYear(), month: shifted.getMonth() };
}

function idleTransition(): MonthTransitionState {
  return {
    phase: "idle",
    direction: null,
    offsetPx: 0,
    durationMs: 0,
    shouldCommit: false,
    previewYear: null,
    previewMonth: null,
  };
}

export function useCalendarMonthNavigation() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const isCurrentMonth = year === currentYear && month === currentMonth;

  const [transition, setTransition] = useState<MonthTransitionState>(idleTransition);
  const transitionRef = useRef<MonthTransitionState>(transition);
  const viewportWidthRef = useRef(0);

  const monthSwipeTouchId = useRef<number | null>(null);
  const monthSwipeStart = useRef<{ x: number; y: number } | null>(null);
  const monthSwipeAxisLock = useRef<SwipeAxis>(null);
  const monthSwipeSuppressTapUntil = useRef(0);
  const finalizeTransitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    transitionRef.current = transition;
  }, [transition]);

  useEffect(() => {
    return () => {
      if (finalizeTransitionTimer.current) {
        clearTimeout(finalizeTransitionTimer.current);
        finalizeTransitionTimer.current = null;
      }
    };
  }, []);

  function clearMonthSwipeState() {
    monthSwipeTouchId.current = null;
    monthSwipeStart.current = null;
    monthSwipeAxisLock.current = null;
  }

  function setViewportWidth(width: number) {
    viewportWidthRef.current = Math.max(0, width);
  }

  function resolveViewportWidth(fallbackWidth?: number): number {
    const known = viewportWidthRef.current;
    if (known > 0) return known;
    if (fallbackWidth && fallbackWidth > 0) return fallbackWidth;
    if (typeof window !== "undefined" && window.innerWidth > 0) return window.innerWidth;
    return 320;
  }

  function resolvePreview(direction: SwipeDirection): { year: number; month: number } {
    return shiftMonth(year, month, direction === "next" ? 1 : -1);
  }

  function clearFinalizeTimer() {
    if (finalizeTransitionTimer.current) {
      clearTimeout(finalizeTransitionTimer.current);
      finalizeTransitionTimer.current = null;
    }
  }

  function queueFinalizeTransition(durationMs: number) {
    clearFinalizeTimer();
    finalizeTransitionTimer.current = setTimeout(() => {
      finalizeTransitionTimer.current = null;
      const live = transitionRef.current;
      if (live.phase !== "animating") return;
      if (
        live.shouldCommit &&
        live.previewYear !== null &&
        live.previewMonth !== null
      ) {
        setYear(live.previewYear);
        setMonth(live.previewMonth);
      }
      setTransition(idleTransition());
    }, Math.max(0, durationMs) + 24);
  }

  function startCommitAnimation(direction: SwipeDirection, source: "swipe" | "button", fallbackWidth?: number) {
    const width = resolveViewportWidth(fallbackWidth);
    if (width <= 0) {
      const next = shiftMonth(year, month, direction === "next" ? 1 : -1);
      setYear(next.year);
      setMonth(next.month);
      setTransition(idleTransition());
      clearMonthSwipeState();
      return;
    }

    const preview = resolvePreview(direction);
    const targetOffset = direction === "next" ? -width : width;
    const nextTransition: MonthTransitionState = {
      phase: "animating",
      direction,
      offsetPx: targetOffset,
      durationMs: MONTH_SWIPE_ANIMATION_MS,
      shouldCommit: true,
      previewYear: preview.year,
      previewMonth: preview.month,
    };
    setTransition(nextTransition);
    transitionRef.current = nextTransition;
    queueFinalizeTransition(MONTH_SWIPE_ANIMATION_MS);
    if (source === "swipe") {
      monthSwipeSuppressTapUntil.current = Date.now() + MONTH_SWIPE_SUPPRESS_TAP_MS;
    }
    clearMonthSwipeState();
  }

  function prevMonth() {
    if (transitionRef.current.phase !== "idle") return;
    startCommitAnimation("prev", "button");
  }

  function nextMonth() {
    if (transitionRef.current.phase !== "idle") return;
    startCommitAnimation("next", "button");
  }

  function goToToday() {
    clearFinalizeTimer();
    setTransition(idleTransition());
    setYear(currentYear);
    setMonth(currentMonth);
    clearMonthSwipeState();
  }

  function goToMonth(nextYear: number, nextMonth: number) {
    if (!Number.isFinite(nextYear) || !Number.isFinite(nextMonth)) return;
    const normalized = shiftMonth(Math.trunc(nextYear), Math.trunc(nextMonth), 0);
    clearFinalizeTimer();
    setTransition(idleTransition());
    setYear(normalized.year);
    setMonth(normalized.month);
    clearMonthSwipeState();
    monthSwipeSuppressTapUntil.current = Date.now() + MONTH_SWIPE_SUPPRESS_TAP_MS;
  }

  function handleMonthGridTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    if (transitionRef.current.phase === "animating") {
      clearMonthSwipeState();
      return;
    }
    if (e.touches.length !== 1 || shouldIgnoreMonthSwipeStart(e.target)) {
      clearMonthSwipeState();
      return;
    }
    const touch = e.touches.item(0);
    if (!touch) {
      clearMonthSwipeState();
      return;
    }
    monthSwipeTouchId.current = touch.identifier;
    monthSwipeStart.current = { x: touch.clientX, y: touch.clientY };
    monthSwipeAxisLock.current = null;
  }

  function handleMonthGridTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    if (!monthSwipeStart.current) return;
    if (transitionRef.current.phase === "animating") return;

    const touch = getTrackedTouch(e.nativeEvent.touches, monthSwipeTouchId.current);
    if (!touch) {
      clearMonthSwipeState();
      setTransition(idleTransition());
      return;
    }
    monthSwipeTouchId.current = touch.identifier;

    const dx = touch.clientX - monthSwipeStart.current.x;
    const dy = touch.clientY - monthSwipeStart.current.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (!monthSwipeAxisLock.current) {
      if (absX < MONTH_SWIPE_AXIS_LOCK_PX && absY < MONTH_SWIPE_AXIS_LOCK_PX) return;
      if (absX > absY + MONTH_SWIPE_AXIS_LOCK_PX) {
        monthSwipeAxisLock.current = "x";
      } else if (absY > absX + MONTH_SWIPE_AXIS_LOCK_PX) {
        monthSwipeAxisLock.current = "y";
      } else {
        return;
      }
    }

    if (monthSwipeAxisLock.current !== "x") return;
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();

    const viewportWidth = resolveViewportWidth(e.currentTarget.getBoundingClientRect().width);
    const maxOffset = Math.max(MONTH_SWIPE_COMMIT_MIN_PX, viewportWidth || 0);
    const clampedDx = Math.max(-maxOffset, Math.min(maxOffset, dx));
    if (Math.abs(clampedDx) < 1) return;

    const direction: SwipeDirection = clampedDx < 0 ? "next" : "prev";
    const preview = resolvePreview(direction);
    setTransition({
      phase: "dragging",
      direction,
      offsetPx: clampedDx,
      durationMs: 0,
      shouldCommit: false,
      previewYear: preview.year,
      previewMonth: preview.month,
    });
  }

  function handleMonthGridTouchEnd() {
    const live = transitionRef.current;
    clearMonthSwipeState();

    if (live.phase !== "dragging" || !live.direction) {
      return;
    }

    const viewportWidth = resolveViewportWidth();
    const threshold = Math.max(MONTH_SWIPE_COMMIT_MIN_PX, viewportWidth * MONTH_SWIPE_COMMIT_RATIO);
    const shouldCommit = Math.abs(live.offsetPx) >= threshold;
    const preview = resolvePreview(live.direction);
    const widthForTarget = viewportWidth > 0 ? viewportWidth : Math.abs(live.offsetPx);
    const targetOffset = shouldCommit
      ? (live.direction === "next" ? -widthForTarget : widthForTarget)
      : 0;
    const durationMs = shouldCommit ? MONTH_SWIPE_ANIMATION_MS : MONTH_SWIPE_CANCEL_MS;

    const nextTransition: MonthTransitionState = {
      phase: "animating",
      direction: live.direction,
      offsetPx: targetOffset,
      durationMs,
      shouldCommit,
      previewYear: preview.year,
      previewMonth: preview.month,
    };
    setTransition(nextTransition);
    transitionRef.current = nextTransition;
    queueFinalizeTransition(durationMs);

    if (shouldCommit) {
      monthSwipeSuppressTapUntil.current = Date.now() + MONTH_SWIPE_SUPPRESS_TAP_MS;
    }
  }

  function consumeSuppressTap(): boolean {
    if (Date.now() > monthSwipeSuppressTapUntil.current) return false;
    monthSwipeSuppressTapUntil.current = 0;
    return true;
  }

  return {
    year,
    month,
    currentYear,
    currentMonth,
    isCurrentMonth,
    monthSwipeSuppressTapUntil,
    transition,
    setViewportWidth,
    prevMonth,
    nextMonth,
    goToToday,
    goToMonth,
    handleMonthGridTouchStart,
    handleMonthGridTouchMove,
    handleMonthGridTouchEnd,
    consumeSuppressTap,
  };
}
