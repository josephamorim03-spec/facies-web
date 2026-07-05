"use client";

import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import {
  getOperationalTurboOverview,
  recordTrainerRecommendationEvent,
  type OperationalTurboOverview,
} from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import { setReviewSessionActive } from "@/lib/studyImportRuntime";
import { useDesktopNavigationMode } from "@/lib/useDesktopNavigationMode";
import { useNavbar } from "@/lib/NavbarContext";
import { TurboReviewPanel } from "../caderno/_components/TurboReviewPanel";
import { useTurboSession } from "../caderno/_hooks/useTurboSession";
import { AREA_COLORS, Area } from "../caderno/_lib/cadernoShared";
import { Skeleton } from "@/components/Skeleton";
import Link from "next/link";

function TurboLobbySkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {/* area filter row */}
      <div className="grid grid-cols-[1.75rem_1fr_1.75rem] items-center gap-2">
        <span className="block h-7 w-7" />
        <Skeleton className="mx-auto h-4 w-20 rounded-sm" />
        <span className="block h-7 w-7" />
      </div>
      {/* hero card */}
      <div className="rounded-xl border border-edge bg-surface p-6 text-center space-y-3">
        <Skeleton className="mx-auto h-3 w-44 rounded-sm" />
        <Skeleton className="mx-auto h-14 w-20 rounded-sm" />
        <Skeleton className="mx-auto h-3 w-32 rounded-sm" />
      </div>
      {/* 2-col info cards */}
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-edge bg-surface p-3 space-y-2">
          <Skeleton className="h-2.5 w-28 rounded-sm" />
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={`r-sk-${i}`} className="flex items-center justify-between gap-3">
              <Skeleton className="h-3 flex-1 rounded-sm" />
              <Skeleton className="h-3 w-8 shrink-0 rounded-sm" />
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-edge bg-surface p-3 space-y-2">
          <Skeleton className="h-2.5 w-32 rounded-sm" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`a-sk-${i}`} className="flex items-center justify-between gap-3">
              <Skeleton className="h-3 w-10 rounded-sm" />
              <Skeleton className="h-3 w-24 shrink-0 rounded-sm" />
            </div>
          ))}
        </div>
      </div>
      {/* preview cards */}
      <div className="space-y-1.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={`prev-sk-${i}`} className="rounded-lg border border-edge bg-surface px-3 py-2 space-y-1.5">
            <Skeleton className="h-2.5 w-20 rounded-sm" />
            <Skeleton className="h-3 w-4/5 rounded-sm" />
          </div>
        ))}
      </div>
      {/* iniciar button */}
      <Skeleton className="h-11 w-full rounded-lg" />
    </div>
  );
}

const ALL_AREAS = "ALL" as const;
type CardsAreaFilter = typeof ALL_AREAS | Area;

const AREA_FILTER_LABELS: Record<CardsAreaFilter, string> = {
  ALL: "TODOS",
  GO: "GINECOLOGIA E OBSTETRÍCIA",
  PD: "PEDIATRIA",
  MP: "MEDICINA PREVENTIVA",
  CG: "CIRURGIA GERAL",
  CM: "CLÍNICA MÉDICA",
  OU: "OUTRAS",
};

const AREA_FILTER_OPTIONS: CardsAreaFilter[] = [ALL_AREAS, "GO", "PD", "MP", "CG", "CM", "OU"];
const ALL_AREAS_DARK_COLOR = "#F3F0E6";

function IconChevron({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

type CardsAreaHeaderProps = {
  selectedArea: CardsAreaFilter;
  onSelect?: (area: CardsAreaFilter) => void;
  interactive?: boolean;
  showLink?: boolean;
};

type CardsAreaFilterControlProps = {
  selectedArea: CardsAreaFilter;
  onSelect?: (area: CardsAreaFilter) => void;
  interactive?: boolean;
  buttonClassName?: string;
  menuClassName?: string;
};

function CardsAreaFilterControl({
  selectedArea,
  onSelect,
  interactive = true,
  buttonClassName = "inline-flex max-w-[min(78vw,22rem)] items-center justify-center gap-1.5 bg-transparent px-1 py-1.5 text-[10px] font-semibold uppercase leading-none tracking-[0.08em]",
  menuClassName = "absolute left-1/2 top-full z-30 mt-2 flex w-max min-w-full max-w-[min(92vw,24rem)] -translate-x-1/2 flex-col gap-1 rounded-lg border border-edge bg-paper p-2 shadow-sm",
}: CardsAreaFilterControlProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const isAllAreasSelected = selectedArea === ALL_AREAS;
  const accentColor = isAllAreasSelected ? "#111111" : AREA_COLORS[selectedArea];
  const allAreasStyle = { ["--cards-all-areas-dark" as "--cards-all-areas-dark"]: ALL_AREAS_DARK_COLOR } as CSSProperties;

  useEffect(() => {
    if (!open || !interactive) return;
    function handleOutsideClick(event: MouseEvent) {
      if (!menuRef.current) return;
      if (event.target instanceof Node && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [interactive, open]);

  return (
    <div ref={menuRef} className="relative flex justify-center">
      <button
        type="button"
        onClick={() => {
          if (!interactive) return;
          setOpen((value) => !value);
        }}
        aria-haspopup={interactive ? "menu" : undefined}
        aria-expanded={open}
        className={`${buttonClassName} ${isAllAreasSelected ? "text-ink dark:text-[var(--cards-all-areas-dark)]" : ""}`}
        style={isAllAreasSelected ? allAreasStyle : { color: accentColor }}
      >
        <span className="truncate">{AREA_FILTER_LABELS[selectedArea]}</span>
        {interactive && <IconChevron className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />}
      </button>

      {interactive && open && (
        <div className={menuClassName}>
          {AREA_FILTER_OPTIONS.map((option) => {
            const isAllAreasOption = option === ALL_AREAS;
            const optionColor = isAllAreasOption ? "#111111" : AREA_COLORS[option];
            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onSelect?.(option);
                  setOpen(false);
                }}
                className={`w-full rounded-lg border bg-transparent px-3 py-2 text-center text-[10px] font-semibold uppercase leading-tight tracking-[0.08em] transition-colors hover:bg-surfaceMuted ${
                  isAllAreasOption ? "border-ink text-ink dark:border-[var(--cards-all-areas-dark)] dark:text-[var(--cards-all-areas-dark)]" : ""
                }`}
                style={isAllAreasOption ? allAreasStyle : { borderColor: optionColor, color: optionColor }}
              >
                {AREA_FILTER_LABELS[option]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CardsAreaHeader({ selectedArea, onSelect, interactive = true, showLink = true }: CardsAreaHeaderProps) {
  return (
    <div className="grid grid-cols-[1.75rem_1fr_1.75rem] items-center gap-2">
      <div className="flex justify-start">
        <span className="block h-7 w-7" aria-hidden="true" />
      </div>

      <CardsAreaFilterControl
        selectedArea={selectedArea}
        onSelect={onSelect}
        interactive={interactive}
      />

      {showLink && interactive ? (
        <Link
          href="/caderno"
          className="p-1 flex items-center justify-end text-muted hover:text-ink shrink-0"
          aria-label="Caderno"
          title="Caderno"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
            <rect x="4" y="2" width="16" height="20" rx="1" />
            <line x1="8" y1="2" x2="8" y2="22" />
            <line x1="11" y1="7" x2="18" y2="7" />
            <line x1="11" y1="11" x2="18" y2="11" />
            <line x1="11" y1="15" x2="18" y2="15" />
          </svg>
        </Link>
      ) : (
        <span className="block h-7 w-7" aria-hidden="true" />
      )}
    </div>
  );
}

export default function RevisaoTurboClientPage() {
  const isDesktopNavigation = useDesktopNavigationMode();
  const { setTitle, setActions } = useNavbar();
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [availableCount, setAvailableCount] = useState(0);
  const [turboOverview, setTurboOverview] = useState<OperationalTurboOverview | null>(null);
  const [initialTurboOverview, setInitialTurboOverview] = useState<OperationalTurboOverview | null>(null);
  const [finalTurboOverview, setFinalTurboOverview] = useState<OperationalTurboOverview | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [selectedArea, setSelectedArea] = useState<CardsAreaFilter>(ALL_AREAS);
  const [authReady, setAuthReady] = useState(false);
  const trainerStartedRef = useRef<string | null>(null);

  useEffect(() => {
    setToken(getAuthToken());
    setAuthReady(true);
  }, []);

  useEffect(() => {
    if (isDesktopNavigation) return;
    setTitle("Cards");
    setActions(
      <Link
        href="/caderno"
        className="p-1.5 text-muted hover:text-ink"
        aria-label="Caderno"
        title="Caderno"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
          <rect x="4" y="2" width="16" height="20" rx="1" />
          <line x1="8" y1="2" x2="8" y2="22" />
          <line x1="11" y1="7" x2="18" y2="7" />
          <line x1="11" y1="11" x2="18" y2="11" />
          <line x1="11" y1="15" x2="18" y2="15" />
        </svg>
      </Link>,
    );
    return () => { setTitle(null); setActions(null); };
  }, [isDesktopNavigation, setTitle, setActions]);

  useEffect(() => {
    setReviewSessionActive(sessionStarted);
    return () => { setReviewSessionActive(false); };
  }, [sessionStarted]);

  const selectedAreaCode = selectedArea === ALL_AREAS ? undefined : selectedArea;
  const lobbyAccentColor = selectedAreaCode ? AREA_COLORS[selectedAreaCode] : undefined;

  const refreshOverview = useCallback(async (options?: { final?: boolean; loading?: boolean }) => {
    if (!authReady) return;
    if (options?.loading !== false) setFetchLoading(true);
    try {
      const overview = await getOperationalTurboOverview(token, {
        previewLimit: 6,
        ...(selectedAreaCode ? { area: selectedAreaCode } : {}),
      });
      setAvailableCount(overview.due_count);
      if (options?.final) {
        setFinalTurboOverview(overview);
      } else {
        setTurboOverview(overview);
        setInitialTurboOverview(null);
        setFinalTurboOverview(null);
      }
      setError("");
    } catch (e) {
      if (!options?.final) {
        setError((e as Error)?.message ?? "Erro ao carregar notas.");
      }
    } finally {
      if (options?.loading !== false) setFetchLoading(false);
    }
  }, [authReady, selectedAreaCode, token]);

  useEffect(() => {
    void refreshOverview();
  }, [refreshOverview]);

  const {
    note: turboNote,
    turboLoading,
    turboFeedback,
    turboRevealed,
    setTurboRevealed,
    sessionTotal,
    sessionCorrect,
    sessionIncorrect,
    sessionDone,
    canRepeatSession,
    canNavigatePrev,
    canNavigateNext,
    isStandbyRound,
    isActionLocked,
    cardTimings,
    areaStats,
    currentCardContext,
    lastReviewChange,
    reviewChanges,
    startSession,
    submitAction,
    navigateSession,
    startRepeat,
    resetSession,
  } = useTurboSession({ token });

  async function handleStart(count: number) {
    if ((turboOverview?.due_count ?? availableCount) <= 0) return;
    setInitialTurboOverview(turboOverview);
    setFinalTurboOverview(null);
    setSessionStarted(true);
    setError("");
    await startSession(undefined, count, selectedAreaCode);
    recordTrainerStartedFromHandoff();
  }

  // Records the trainer `started` event when this turbo review was launched from
  // a trainer flashcard_review action (handoff via ?rec=&src=). Deduped per rec;
  // a direct visit (no rec) records nothing. Best-effort — never blocks the user.
  function recordTrainerStartedFromHandoff() {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const rec = params.get("rec");
    if (!rec || trainerStartedRef.current === rec) return;
    trainerStartedRef.current = rec;
    const src = params.get("src") ?? "/cards-adaptativos";
    void recordTrainerRecommendationEvent(getAuthToken(), rec, {
      event_type: "started",
      event_id: `started:${rec}:${src}:turbo`,
      payload: { source_page: src, action_kind: "flashcard_review" },
    }).catch(() => null);
  }

  async function handleClose() {
    setSessionStarted(false);
    resetSession();
    await refreshOverview();
  }

  useEffect(() => {
    if (!sessionStarted || !sessionDone) return;
    void refreshOverview({ final: true, loading: false });
  }, [refreshOverview, sessionDone, sessionStarted]);

  return (
    <div className="space-y-4">
      {(isDesktopNavigation || !sessionStarted) && (
        <CardsAreaHeader
          selectedArea={selectedArea}
          onSelect={setSelectedArea}
          interactive={!sessionStarted}
          showLink={isDesktopNavigation}
        />
      )}
      {fetchLoading && availableCount === 0 && !sessionStarted ? (
        <TurboLobbySkeleton />
      ) : error && !sessionStarted ? (
        <p className="py-8 text-center text-sm text-ink">{error}</p>
      ) : error ? (
        <p className="py-8 text-center text-sm text-ink">{error}</p>
      ) : (
        <TurboReviewPanel
          turboLoading={turboLoading}
          turboFeedback={turboFeedback}
          turboNote={turboNote}
          turboRevealed={turboRevealed}
          sessionCorrect={sessionCorrect}
          sessionIncorrect={sessionIncorrect}
          sessionDone={sessionDone}
          canRepeatSession={canRepeatSession}
          isStandbyRound={isStandbyRound}
          isActionLocked={isActionLocked}
          isTurboMode={true}
          availableCount={availableCount}
          turboOverview={sessionStarted ? (initialTurboOverview ?? turboOverview) : turboOverview}
          finalTurboOverview={finalTurboOverview}
          currentCardContext={currentCardContext}
          lastReviewChange={lastReviewChange}
          reviewChanges={reviewChanges}
          deckSize={sessionTotal}
          cardTimings={cardTimings}
          canSwipePrev={canNavigatePrev}
          canSwipeNext={canNavigateNext}
          sessionStarted={sessionStarted}
          onCloseAction={handleClose}
          onRevealAction={() => setTurboRevealed(true)}
          onStartAction={handleStart}
          onStartRepeatAction={startRepeat}
          onNavigatePrevAction={() => void navigateSession("prev")}
          onNavigateNextAction={() => void navigateSession("next")}
          onRateAction={submitAction}
          areaStats={areaStats}
          token={token}
          lobbyAccentColor={lobbyAccentColor}
        />
      )}
    </div>
  );
}
