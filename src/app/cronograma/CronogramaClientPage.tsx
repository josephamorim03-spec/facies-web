"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBarActionLink } from "@/components/TopBarActionLink";
import { Button } from "@/components/ui/Button";
import { IconSearch, IconX } from "./_components/CronogramaIcons";
import { useNavbar } from "@/lib/NavbarContext";
import { useCronogramaPageState } from "./_hooks/useCronogramaPageState";
import { useCronogramaSearchFilters } from "./_hooks/useCronogramaSearchFilters";
import {
  type Area,
  buildStudiesByDate,
  buildStudyMap,
  displayDate,
  SHORT_MONTH_LABELS,
} from "./_lib/cronogramaShared";
import {
  buildStudyImportRuntimePath,
  readActiveStudyImportSessionId,
} from "@/lib/studyImportRuntime";
import { writeCronogramaViewModeSession } from "./_lib/viewModeSession";
import { CronogramaCalendarView } from "./_components/CronogramaCalendarView";
import { RescheduleSuggestionDialog } from "./_components/RescheduleSuggestionDialog";
import { CronogramaStreakCard } from "@/app/cronograma/_components/CronogramaStreakCard";
import { CronogramaTodayPanel } from "./_components/CronogramaTodayPanel";
import { WeeklyGoalControl } from "./_components/WeeklyGoalControl";
import { WeeklyOpsCompactSummary, WeeklyOpsCompactSummarySkeleton } from "./_components/WeeklyOpsCards";
import { useDesktopNavigationMode } from "@/lib/useDesktopNavigationMode";
import { buildWeeklyOpsMetrics } from "./_lib/weeklyOpsMetrics";

function detectMobilePortraitMode(isDesktopNavigation: boolean): boolean {
  if (typeof window === "undefined") return false;
  if (isDesktopNavigation) return false;
  const isNarrowViewport = window.matchMedia
    ? window.matchMedia("(max-width: 767px)").matches
    : window.innerWidth < 768;
  const isPortrait = window.matchMedia
    ? window.matchMedia("(orientation: portrait)").matches
    : window.innerHeight >= window.innerWidth;
  return isNarrowViewport && isPortrait;
}

function TodayIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <circle cx="12" cy="16" r="3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function CronogramaPage() {
  const router = useRouter();
  const isDesktopNavigation = useDesktopNavigationMode();
  const { setTitle, setActions } = useNavbar();
  const {
    tasks,
    doneTasks,
    studies,
    turboCardsByDate,
    questionReviewQueue,
    events,
    loading,
    streakLoading,
    error,
    suggesting,
    suggestionActionKey,
    showEventSuggestionModal,
    token,
    streak,
    weeklyGoal,
    eventModalSuggestions,
    fetchAll,
    handleAutoReschedule,
    handleEventMutationRefresh,
    closeEventSuggestionModal,
    handleAcceptSuggestionItem,
    handleAcceptSuggestionAll,
    handleRejectSuggestion,
  } = useCronogramaPageState();

  useEffect(() => {
    writeCronogramaViewModeSession("month");
  }, []);

  useEffect(() => {
    const activeImportSessionId = readActiveStudyImportSessionId();
    if (!activeImportSessionId) return;
    router.replace(buildStudyImportRuntimePath(activeImportSessionId));
  }, [router, token]);

  const studyMap = buildStudyMap(studies);
  const studiesByDate = buildStudiesByDate(studies);

  const todayISO = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  const {
    searchInput,
    searchQuery,
    searchSuggestions,
    filteredTasksForDisplay,
    handleSearchInputChange,
    clearSearch,
    selectSearchSuggestion,
  } = useCronogramaSearchFilters({
    tasks,
    doneTasks,
    studies,
  });

  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isMobilePortrait, setIsMobilePortrait] = useState(false);
  const nowRef = new Date();
  const [calendarMonth, setCalendarMonth] = useState(nowRef.getMonth());
  const [calendarYear, setCalendarYear] = useState(nowRef.getFullYear());
  const [calendarRowCount, setCalendarRowCount] = useState(6);
  const goToTodayRef = useRef<(() => void) | null>(null);
  const prevMonthRef = useRef<(() => void) | null>(null);
  const nextMonthRef = useRef<(() => void) | null>(null);
  const currentRealYear = new Date().getFullYear();
  const todayDayNumber = new Date().getDate();
  const isFiveRowMonth = calendarRowCount === 5;
  const summaryPositionClass = isMobilePortrait
    ? (isFiveRowMonth ? "flex-1 flex items-center justify-center pt-10" : "pt-1")
    : "flex-1 flex items-center justify-center";
  const weeklyOpsMetrics = useMemo(
    () =>
      buildWeeklyOpsMetrics({
        weeklyGoal,
        pendingTasks: tasks,
        doneTasks,
        studies,
        todayIso: todayISO,
      }),
    [doneTasks, studies, tasks, todayISO, weeklyGoal],
  );
  // "Para revisar hoje" = só o que vence hoje. As atrasadas têm o banner próprio
  // (e aparecem nas suas datas passadas no calendário); não devem reaparecer aqui.
  const todayReviewTasks = useMemo(
    () => tasks.filter((task) => task.status !== "done" && task.due_date === todayISO),
    [tasks, todayISO],
  );
  const todayStudies = studiesByDate[todayISO] ?? [];

  useEffect(() => {
    function updateMobilePortraitMode() {
      setIsMobilePortrait(detectMobilePortraitMode(isDesktopNavigation));
    }
    updateMobilePortraitMode();
    window.addEventListener("resize", updateMobilePortraitMode);
    window.addEventListener("orientationchange", updateMobilePortraitMode);
    return () => {
      window.removeEventListener("resize", updateMobilePortraitMode);
      window.removeEventListener("orientationchange", updateMobilePortraitMode);
    };
  }, [isDesktopNavigation]);

  useEffect(() => {
    if (isDesktopNavigation) return;
    if (searchOpen) {
      setTitle("");
      setActions(null);
      return () => { setTitle(null); setActions(null); };
    }
    setTitle(
      <span className="font-serif text-sm font-semibold tracking-wide text-ink">
        {SHORT_MONTH_LABELS[calendarMonth]}{calendarYear !== currentRealYear ? ` ${calendarYear}` : ""}
      </span>,
    );
    setActions(
      <>
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="p-1.5 text-muted hover:text-ink"
          aria-label="Buscar tema"
        >
          <IconSearch className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => goToTodayRef.current?.()}
          className="p-1.5 text-muted hover:text-ink"
          aria-label="Ir para hoje"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-[3px] border border-current text-[10px] font-semibold leading-none" aria-hidden="true">
            {todayDayNumber}
          </span>
        </button>
        <TopBarActionLink href="/hoje" label="Hoje" title="Hoje">
          <TodayIcon className="h-5 w-5" />
        </TopBarActionLink>
      </>,
    );
    return () => { setTitle(null); setActions(null); };
  }, [isDesktopNavigation, searchOpen, calendarMonth, calendarYear, currentRealYear, todayDayNumber, setTitle, setActions]);

  return (
    <div
      className="flex flex-col gap-4"
      style={{ minHeight: "calc(100svh - max(1.5rem, env(safe-area-inset-top, 0px)) - 4.5rem - env(safe-area-inset-bottom, 0px))" }}
    >
      {/* Top bar: Google Calendar style */}
      {searchOpen ? (
        <div className="space-y-1.5" data-crono-search-mode="true">
          <div className="flex items-center gap-2" data-crono-search-row="true">
            <div className="relative flex-1">
              <input
                ref={searchInputRef}
                type="text"
                value={searchInput}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                placeholder="Buscar tema..."
                className="w-full text-sm bg-transparent border-b border-ink outline-none py-1.5"
                autoFocus
              />
              {searchSuggestions.length > 0 && !searchQuery && (
                <ul className="absolute left-0 right-0 z-30 bg-paper border border-edge border-t-0 max-h-48 overflow-y-auto rounded-b-md shadow-sm">
                  {searchSuggestions.map((theme) => (
                    <li key={theme}>
                      <button
                        type="button"
                        className="w-full text-left text-sm px-3 py-2 hover:bg-[var(--amber-tint)] transition-colors"
                        onClick={() => {
                          selectSearchSuggestion(theme);
                          searchInputRef.current?.blur();
                        }}
                      >
                        {theme}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                if (searchInput) {
                  clearSearch();
                  return;
                }
                setSearchOpen(false);
                clearSearch();
              }}
              className="p-1.5 text-muted hover:text-ink shrink-0"
              aria-label={searchInput ? "Limpar busca" : "Fechar busca"}
              data-testid="cronograma-search-action"
              data-search-action={searchInput ? "clear" : "back"}
            >
              {searchInput ? (
                <IconX className="w-5 h-5" />
              ) : (
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
                  <path d="M13 4L5 10l8 6" />
                </svg>
              )}
            </button>
          </div>
          <div
            data-crono-search-month-row="true"
            data-crono-mobile-month-row={isMobilePortrait ? "true" : undefined}
            data-month-nav="true"
            className={
              isMobilePortrait
                ? "flex items-center justify-center"
                : `grid grid-cols-[2rem_1fr_2rem] items-center${isDesktopNavigation ? " mx-auto w-full max-w-md" : ""}`
            }
          >
            {!isMobilePortrait && (
              <button
                type="button"
                onClick={() => prevMonthRef.current?.()}
                className="p-1.5 text-muted hover:text-ink shrink-0"
                aria-label="Mês anterior"
              >
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
                  <path d="M13 4L7 10l6 6" />
                </svg>
              </button>
            )}
            <span data-month-title="true" className="text-center text-[17px] font-serif font-bold tracking-wide">
              {SHORT_MONTH_LABELS[calendarMonth]}{calendarYear !== currentRealYear ? ` ${calendarYear}` : ""}
            </span>
            {!isMobilePortrait && (
              <button
                type="button"
                onClick={() => nextMonthRef.current?.()}
                className="justify-self-end p-1.5 text-muted hover:text-ink shrink-0"
                aria-label="Próximo mês"
              >
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
                  <path d="M7 4l6 6-6 6" />
                </svg>
              </button>
            )}
          </div>
        </div>
      ) : isDesktopNavigation ? (
        <div
          data-month-nav="true"
          data-crono-mobile-top-row={isMobilePortrait ? "true" : undefined}
          className={`flex items-center gap-1${!isDesktopNavigation ? " relative" : ""}`}
        >
          {isDesktopNavigation ? (
            <button
              onClick={() => prevMonthRef.current?.()}
              className="p-1.5 -ml-1.5 text-muted hover:text-ink shrink-0"
              aria-label="Mês anterior"
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
                <path d="M13 4L7 10l6 6" />
              </svg>
            </button>
          ) : null}
          <span
            data-month-title="true"
            className={`${!isDesktopNavigation ? "flex-1 text-center" : "flex-1 text-center"} text-[17px] font-serif font-bold tracking-wide`}
          >
            {SHORT_MONTH_LABELS[calendarMonth]}{calendarYear !== currentRealYear ? ` ${calendarYear}` : ""}
          </span>
          {isDesktopNavigation && (
            <>
              <button
                onClick={() => nextMonthRef.current?.()}
                className="p-1.5 text-muted hover:text-ink shrink-0"
                aria-label="Próximo mês"
              >
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
                  <path d="M7 4l6 6-6 6" />
                </svg>
              </button>
              <button
                onClick={() => setSearchOpen(true)}
                className="p-1.5 ml-auto text-muted hover:text-ink shrink-0"
                aria-label="Buscar tema"
              >
                <IconSearch className="w-5 h-5" />
              </button>
              <button
                onClick={() => goToTodayRef.current?.()}
                className="p-1.5 text-muted hover:text-ink shrink-0 transition-colors"
                aria-label="Ir para hoje"
              >
                <span className="flex items-center justify-center w-5 h-5 border border-current rounded-[3px] text-[10px] font-semibold leading-none" aria-hidden="true">
                  {todayDayNumber}
                </span>
              </button>
              <TopBarActionLink href="/hoje" label="Hoje" title="Hoje" className="-mr-1">
                <TodayIcon className="block h-5 w-5" />
              </TopBarActionLink>
            </>
          )}
        </div>
      ) : null}

      {error && <p className="text-sm text-danger">{error}</p>}

      <div data-calendar-summary-stack="true" aria-label="Calendário mensal" className="-mx-4 md:-mx-6">
        <CronogramaCalendarView
          tasks={filteredTasksForDisplay}
          doneTasks={doneTasks}
          studies={studies}
          turboCardsByDate={turboCardsByDate}
          studiesByDate={studiesByDate}
          studyMap={studyMap}
          events={events}
          token={token ?? ""}
          onRefresh={fetchAll}
          onEventMutated={handleEventMutationRefresh}
          searchQuery={searchQuery}
          isMobilePortrait={isMobilePortrait}
          onMonthYearChange={(m, y, rowCount, gtt, prev, next) => {
            setCalendarMonth(m);
            setCalendarYear(y);
            setCalendarRowCount(rowCount);
            goToTodayRef.current = gtt;
            prevMonthRef.current = prev;
            nextMonthRef.current = next;
          }}
        />
      </div>

      {!loading && (
        <WeeklyGoalControl
          token={token ?? ""}
          weeklyGoal={weeklyOpsMetrics.weeklyGoal}
          progressPct={weeklyOpsMetrics.progressPct}
          remainingQuestions={weeklyOpsMetrics.weeklyGoalRemainingQuestions}
          onSaved={fetchAll}
        />
      )}

      <CronogramaStreakCard streak={streak} loading={streakLoading} />

      {!loading && (
        <CronogramaTodayPanel
          todayTasks={todayReviewTasks}
          todayStudies={todayStudies}
          questionReviewQueue={questionReviewQueue}
        />
      )}

      {/* Revisões atrasadas — discreto, embaixo do calendário */}
      {new Date().getHours() >= 20 && tasks.filter((t) => t.is_overdue).length > 0 && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted">
          <span>
            {tasks.filter((t) => t.is_overdue).length} tarefa{tasks.filter((t) => t.is_overdue).length > 1 ? "s" : ""} atrasada{tasks.filter((t) => t.is_overdue).length > 1 ? "s" : ""}
          </span>
          <Button variant="outline" size="xs" loading={suggesting} onClick={handleAutoReschedule} className="shrink-0">
            Reagendar
          </Button>
        </div>
      )}

      {!error && (
        <div className={summaryPositionClass}>
          {loading
            ? <WeeklyOpsCompactSummarySkeleton />
            : <WeeklyOpsCompactSummary metrics={weeklyOpsMetrics} compact={false} />
          }
        </div>
      )}

      <RescheduleSuggestionDialog
        open={showEventSuggestionModal}
        suggestions={eventModalSuggestions}
        actionKey={suggestionActionKey}
        onClose={closeEventSuggestionModal}
        onAcceptItem={handleAcceptSuggestionItem}
        onAcceptAll={handleAcceptSuggestionAll}
        onReject={handleRejectSuggestion}
      />
    </div>
  );
}

