"use client";

import { useEffect, useRef, useState } from "react";
import type { OperationalStreak } from "@/lib/api";

type Props = {
  streak: OperationalStreak | null;
  loading?: boolean;
};

type PopupPosition = {
  left: number;
  top: number;
  width: number;
};

const POPUP_MARGIN = 8;
const POPUP_GAP = 8;
const POPUP_MAX_WIDTH = 256;
const POPUP_ESTIMATED_HEIGHT = 140;
const MOBILE_AUTO_CLOSE_MS = 6000;
const RISK_WARNING_HOUR = 20;
const CLOCK_TICK_MS = 30000;

function detectMobilePortraitMode(): boolean {
  if (typeof window === "undefined") return false;
  const isNarrowViewport = window.matchMedia
    ? window.matchMedia("(max-width: 767px)").matches
    : window.innerWidth < 768;
  const isPortrait = window.matchMedia
    ? window.matchMedia("(orientation: portrait)").matches
    : window.innerHeight >= window.innerWidth;
  return isNarrowViewport && isPortrait;
}

function isAfterRiskWarningHour(): boolean {
  return new Date().getHours() >= RISK_WARNING_HOUR;
}

export function CronogramaStreakCard({ streak, loading = false }: Props) {
  const [popupOpen, setPopupOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [isMobilePortrait, setIsMobilePortrait] = useState(false);
  const [isAfterRiskHour, setIsAfterRiskHour] = useState(false);
  const [popupPosition, setPopupPosition] = useState<PopupPosition>({
    left: POPUP_MARGIN,
    top: POPUP_MARGIN,
    width: POPUP_MAX_WIDTH,
  });

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const compactRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const updateHourState = () => {
      setIsAfterRiskHour(isAfterRiskWarningHour());
    };
    updateHourState();
    const timer = window.setInterval(updateHourState, CLOCK_TICK_MS);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const updateMode = () => {
      const nextIsMobilePortrait = detectMobilePortraitMode();
      setIsMobilePortrait(nextIsMobilePortrait);
      if (!nextIsMobilePortrait) {
        setMobileExpanded(false);
      }
    };
    updateMode();
    window.addEventListener("resize", updateMode);
    window.addEventListener("orientationchange", updateMode);
    return () => {
      window.removeEventListener("resize", updateMode);
      window.removeEventListener("orientationchange", updateMode);
    };
  }, []);

  useEffect(() => {
    if (!mobileExpanded) return;
    const timer = window.setTimeout(() => {
      setMobileExpanded(false);
    }, MOBILE_AUTO_CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [mobileExpanded]);

  useEffect(() => {
    if (!mobileExpanded) return;

    function closeOnOutsidePointer(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) {
        setMobileExpanded(false);
        return;
      }
      if (!compactRef.current?.contains(target)) {
        setMobileExpanded(false);
      }
    }

    function closeOnInteraction() {
      setMobileExpanded(false);
    }

    window.addEventListener("pointerdown", closeOnOutsidePointer, true);
    window.addEventListener("scroll", closeOnInteraction, true);
    window.addEventListener("wheel", closeOnInteraction, { passive: true });
    window.addEventListener("keydown", closeOnInteraction);

    return () => {
      window.removeEventListener("pointerdown", closeOnOutsidePointer, true);
      window.removeEventListener("scroll", closeOnInteraction, true);
      window.removeEventListener("wheel", closeOnInteraction);
      window.removeEventListener("keydown", closeOnInteraction);
    };
  }, [mobileExpanded]);

  useEffect(() => {
    if (!popupOpen) {
      return;
    }

    function updatePopupPosition() {
      const trigger = triggerRef.current;
      if (!trigger) {
        return;
      }

      const rect = trigger.getBoundingClientRect();
      const width = Math.min(POPUP_MAX_WIDTH, window.innerWidth - POPUP_MARGIN * 2);
      const centeredLeft = rect.left + rect.width / 2 - width / 2;
      const left = Math.min(
        Math.max(POPUP_MARGIN, centeredLeft),
        window.innerWidth - width - POPUP_MARGIN,
      );

      const fitsBelow =
        rect.bottom + POPUP_GAP + POPUP_ESTIMATED_HEIGHT <= window.innerHeight - POPUP_MARGIN;
      const top = fitsBelow
        ? rect.bottom + POPUP_GAP
        : Math.max(POPUP_MARGIN, rect.top - POPUP_ESTIMATED_HEIGHT - POPUP_GAP);

      setPopupPosition({ left, top, width });
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPopupOpen(false);
      }
    }

    updatePopupPosition();
    window.addEventListener("resize", updatePopupPosition);
    window.addEventListener("scroll", updatePopupPosition, true);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", updatePopupPosition);
      window.removeEventListener("scroll", updatePopupPosition, true);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [popupOpen]);

  const showProtection = Boolean(streak?.active_protection);
  const showRisk = Boolean(streak?.streak_at_risk) && isAfterRiskHour && !showProtection;

  if (loading) {
    return (
      <div className="flex justify-center" data-testid="streak-skeleton">
        <div className="h-3 w-full max-w-md animate-pulse rounded bg-edge" />
      </div>
    );
  }

  if (streak === null) {
    return null;
  }

  const hasNoActiveStreak = streak.streak_days === 0;
  const streakBest = streak.streak_max ?? 0;

  if (isMobilePortrait) {
    return (
      <div ref={compactRef} className="relative min-w-0" data-streak-mode="compact">
        <div className="mx-auto flex w-fit max-w-full items-center gap-2 text-xs text-muted">
          <button
            type="button"
            onClick={() => setMobileExpanded((value) => !value)}
            className="flex items-center gap-2 shrink-0"
            aria-expanded={mobileExpanded}
            aria-label="Detalhes da streak"
            data-testid="streak-compact-trigger"
          >
            <span className="font-bold uppercase text-ink shrink-0">STREAK:</span>
            <span
              className={`shrink-0 ${showRisk ? "text-red-600 font-medium" : "text-ink"}`}
              data-testid="streak-compact-days"
            >
              {streak.streak_days} {streak.streak_days === 1 ? "dia" : "dias"}
            </span>
            {showRisk && (
              <button
                ref={triggerRef}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setPopupOpen((value) => !value);
                }}
                className={`inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] font-bold leading-none transition-colors ${
                  popupOpen
                    ? "border-red-500 bg-red-100 text-red-700 dark:border-red-400 dark:bg-red-950/70 dark:text-red-300"
                    : "border-red-300 text-red-600 hover:bg-red-50 dark:border-red-500 dark:text-red-400 dark:hover:bg-red-950/50"
                }`}
                aria-label="Streak em risco"
                aria-expanded={popupOpen}
                data-testid="streak-risk-indicator"
              >
                !
              </button>
            )}
          </button>

          <div
            className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-200 ease-out ${
              mobileExpanded ? "max-w-[22rem] opacity-100" : "max-w-0 opacity-0 pointer-events-none"
            }`}
            data-testid="streak-inline-expanded"
            aria-hidden={!mobileExpanded}
          >
            {hasNoActiveStreak ? (
              <span className="shrink-0 text-muted">
                | sem ativa{streakBest > 0 ? ` | recorde: ${streakBest}` : ""}
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <span className="shrink-0">| recorde: {streakBest}</span>
                <span className="shrink-0">| {streak.streak_reviews} revisões</span>
                <span className="shrink-0">| {streak.streak_flashcards_seen} cards</span>
                {showProtection && (
                  <span className="shrink-0 text-blue-600">| sequência protegida</span>
                )}
                {showRisk && (
                  <span className="shrink-0 text-red-600">| risco</span>
                )}
              </span>
            )}
          </div>
        </div>
        {popupOpen && showRisk && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setPopupOpen(false)} />
            <div
              className="fixed z-50 space-y-1 border border-red-300 rounded-xl bg-paper p-3 shadow-sm whitespace-normal"
              style={{
                left: `${popupPosition.left}px`,
                top: `${popupPosition.top}px`,
                width: `${popupPosition.width}px`,
                maxWidth: `calc(100vw - ${POPUP_MARGIN * 2}px)`,
              }}
            >
              <p className="text-xs font-medium text-red-600">Streak em risco</p>
              <p className="text-xs text-ink">
                Sem atividade hoje. Faça um estudo para manter a sequência.
              </p>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="relative min-w-0" data-streak-mode="full">
      <div className="flex items-center justify-center gap-2 text-xs text-muted">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold uppercase text-ink shrink-0">STREAK:</span>
          {hasNoActiveStreak ? (
            <span className="shrink-0">Nenhuma ativa — faça um estudo.</span>
          ) : (
            <>
              <span
                className={`shrink-0 ${showRisk ? "text-red-600 font-medium" : showProtection ? "text-blue-600" : ""}`}
              >
                {streak.streak_days} {streak.streak_days === 1 ? "dia" : "dias"}
              </span>
              {showProtection && (
                <span className="shrink-0 text-blue-600 text-[10px] font-medium">sequência protegida</span>
              )}
              <span className="hidden sm:inline shrink-0">| {streak.streak_reviews} revisões</span>
              <span className="hidden sm:inline shrink-0">| {streak.streak_flashcards_seen} cards</span>
            </>
          )}
          <span className="shrink-0 text-edge">|</span>
          <span className="shrink-0">recorde: {streakBest}</span>
        </div>
        {showRisk && (
          <div className="relative shrink-0">
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setPopupOpen((value) => !value)}
              className={`inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] font-bold leading-none transition-colors ${
                popupOpen
                  ? "border-red-500 bg-red-100 text-red-700 dark:border-red-400 dark:bg-red-950/70 dark:text-red-300"
                  : "border-red-300 text-red-600 hover:bg-red-50 dark:border-red-500 dark:text-red-400 dark:hover:bg-red-950/50"
              }`}
              aria-label="Streak em risco"
              aria-expanded={popupOpen}
            >
              !
            </button>
            {popupOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setPopupOpen(false)} />
                <div
                  className="fixed z-50 space-y-1 border border-red-300 rounded-xl bg-paper p-3 shadow-sm whitespace-normal"
                  style={{
                    left: `${popupPosition.left}px`,
                    top: `${popupPosition.top}px`,
                    width: `${popupPosition.width}px`,
                    maxWidth: `calc(100vw - ${POPUP_MARGIN * 2}px)`,
                  }}
                >
                  <p className="text-xs font-medium text-red-600">Streak em risco</p>
                  <p className="text-xs text-ink">
                    Sem atividade hoje. Faça um estudo para manter a sequência.
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
