"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  getOperationalTurboOverview,
  recordTrainerRecommendationEvent,
  type OperationalTurboOverview,
} from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import { REVIEW_ROUTES } from "@/lib/reviewRoutes";
import { setReviewSessionActive } from "@/lib/studyImportRuntime";
import { useDesktopNavigationMode } from "@/lib/useDesktopNavigationMode";
import { useNavbar } from "@/lib/NavbarContext";
import { TurboReviewPanel } from "./registros/_components/TurboReviewPanel";
import { useTurboSession } from "./registros/_hooks/useTurboSession";
import { AREA_COLORS, Area } from "./registros/_lib/cadernoShared";
import { Skeleton } from "@/components/Skeleton";
import { CardsSectionTabs } from "./CardsSectionTabs";
import { queryKeys } from "@/lib/queryKeys";
import { TabsScrollArea } from "@/components/ui/Tabs";

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

type CardsAreaHeaderProps = {
  selectedArea: CardsAreaFilter;
  onSelect?: (area: CardsAreaFilter) => void;
  interactive?: boolean;
};

type CardsAreaFilterControlProps = {
  selectedArea: CardsAreaFilter;
  onSelect?: (area: CardsAreaFilter) => void;
  interactive?: boolean;
};

function CardsAreaFilterControl({
  selectedArea,
  onSelect,
  interactive = true,
}: CardsAreaFilterControlProps) {
  return (
    <TabsScrollArea className="w-full justify-center">
      {({ ref, onScroll }) => (
        <div
          ref={ref}
          onScroll={onScroll}
          role="group"
          aria-label="Filtrar cards por área"
          className="mx-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-control border border-edge bg-surface p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {AREA_FILTER_OPTIONS.map((option) => {
            const active = selectedArea === option;
            const color = option === ALL_AREAS ? "var(--color-primary)" : AREA_COLORS[option];
            return (
              <button
                key={option}
                type="button"
                disabled={!interactive}
                aria-pressed={active}
                onClick={() => onSelect?.(option)}
                className={[
                  "paper-control inline-flex min-h-10 shrink-0 items-center justify-center px-3 text-xs font-semibold",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  active ? "bg-primary text-primaryInk" : "text-muted hover:text-ink",
                  !interactive ? "opacity-70" : "",
                ].join(" ")}
                style={!active && option !== ALL_AREAS ? { color } : undefined}
                title={AREA_FILTER_LABELS[option]}
              >
                {option === ALL_AREAS ? "Todos" : option}
              </button>
            );
          })}
        </div>
      )}
    </TabsScrollArea>
  );
}

function CardsAreaHeader({ selectedArea, onSelect, interactive = true }: CardsAreaHeaderProps) {
  return (
    <div className="space-y-2 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Filtrar por área</p>
      <CardsAreaFilterControl
        selectedArea={selectedArea}
        onSelect={onSelect}
        interactive={interactive}
      />
    </div>
  );
}

export default function CardsAdaptativosClientPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
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
    setActions(null);
    return () => { setTitle(null); setActions(null); };
  }, [isDesktopNavigation, setTitle, setActions]);

  useEffect(() => {
    setReviewSessionActive(sessionStarted);
    return () => { setReviewSessionActive(false); };
  }, [sessionStarted]);

  const selectedAreaCode = selectedArea === ALL_AREAS ? undefined : selectedArea;
  const lobbyAccentColor = selectedAreaCode ? AREA_COLORS[selectedAreaCode] : undefined;
  const overviewQuery = useQuery({
    queryKey: queryKeys.cardsOverview(selectedAreaCode),
    queryFn: () => getOperationalTurboOverview(token, {
      previewLimit: 6,
      ...(selectedAreaCode ? { area: selectedAreaCode } : {}),
    }),
    enabled: authReady && !sessionStarted,
  });

  useEffect(() => {
    if (!overviewQuery.data) return;
    setAvailableCount(overviewQuery.data.due_count);
    setTurboOverview(overviewQuery.data);
    setInitialTurboOverview(null);
    setFinalTurboOverview(null);
    setError("");
  }, [overviewQuery.data]);

  useEffect(() => {
    if (!overviewQuery.isError) return;
    setError((overviewQuery.error as Error)?.message ?? "Erro ao carregar notas.");
  }, [overviewQuery.error, overviewQuery.isError]);

  const refreshOverview = useCallback(async (options?: { final?: boolean; loading?: boolean }) => {
    if (!authReady) return;
    if (options?.loading !== false) setFetchLoading(true);
    try {
      const overview = await queryClient.fetchQuery({
        queryKey: queryKeys.cardsOverview(selectedAreaCode),
        queryFn: () => getOperationalTurboOverview(token, {
          previewLimit: 6,
          ...(selectedAreaCode ? { area: selectedAreaCode } : {}),
        }),
        staleTime: 0,
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
  }, [authReady, queryClient, selectedAreaCode, token]);

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
    const params = new URLSearchParams(window.location.search);
    const recommendationId = params.get("rec");
    const actionId = params.get("act");
    await startSession(
      undefined,
      count,
      selectedAreaCode,
      recommendationId && actionId ? { recommendationId, actionId } : undefined,
    );
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
    const src = params.get("src") ?? REVIEW_ROUTES.adaptiveCards;
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
      {!sessionStarted ? (
        <>
          <CardsSectionTabs active="review" />
        </>
      ) : null}
      {(isDesktopNavigation || !sessionStarted) && (
        <CardsAreaHeader
          selectedArea={selectedArea}
          onSelect={setSelectedArea}
          interactive={!sessionStarted}
        />
      )}
      {(fetchLoading || overviewQuery.isPending) && availableCount === 0 && !sessionStarted ? (
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
          onContinueReviewAction={() => router.push("/cards")}
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
