"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import AreaDot from "@/components/AreaDot";
import { Button } from "@/components/ui/Button";
import { IconMenu, IconSearch, IconX } from "./_components/CronogramaIcons";
import { NAV_OPEN_EVENT } from "@/components/Nav";
import { useCronogramaPageState } from "./_hooks/useCronogramaPageState";
import { useCronogramaSearchFilters } from "./_hooks/useCronogramaSearchFilters";
import {
  Area,
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
import { CronogramaStreakCard } from "@/app/cronograma/_components/CronogramaStreakCard";
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

const WEEK_BUTTON_STABLE_STYLE: CSSProperties = {
  transform: "translateZ(0)",
  WebkitTransform: "translateZ(0)",
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden",
};

export default function CronogramaPage() {
  const router = useRouter();
  const isDesktopNavigation = useDesktopNavigationMode();
  const {
    tasks,
    doneTasks,
    studies,
    turboCardsByDate,
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
  const [isDayDetailOpen, setIsDayDetailOpen] = useState(false);
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
      ) : (
        <div
          data-month-nav="true"
          data-crono-mobile-top-row={isMobilePortrait ? "true" : undefined}
          className={`flex items-center gap-1${!isDesktopNavigation ? " relative" : ""}`}
        >
          {!isDesktopNavigation ? (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent(NAV_OPEN_EVENT))}
              className="p-1 -ml-1 text-ink shrink-0"
              aria-label="Menu"
            >
              <IconMenu className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => prevMonthRef.current?.()}
              className="p-1.5 -ml-1.5 text-muted hover:text-ink shrink-0"
              aria-label="Mês anterior"
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
                <path d="M13 4L7 10l6 6" />
              </svg>
            </button>
          )}
          <span
            data-month-title="true"
            className={`${!isDesktopNavigation ? "absolute inset-x-0 text-center pointer-events-none select-none" : "flex-1 text-center"} text-[17px] font-serif font-bold tracking-wide`}
          >
            {SHORT_MONTH_LABELS[calendarMonth]}{calendarYear !== currentRealYear ? ` ${calendarYear}` : ""}
          </span>
          {isDesktopNavigation && (
            <button
              onClick={() => nextMonthRef.current?.()}
              className="p-1.5 text-muted hover:text-ink shrink-0"
              aria-label="Próximo mês"
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
                <path d="M7 4l6 6-6 6" />
              </svg>
            </button>
          )}
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
          <button
            onClick={() => router.push("/semana")}
            className="p-1.5 -mr-1 text-muted hover:text-ink shrink-0"
            aria-label="Visão semanal"
            style={WEEK_BUTTON_STABLE_STYLE}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="block w-5 h-5" aria-hidden="true">
              <rect x="1.5" y="1" width="3.5" height="18" rx="0.5"/>
              <rect x="6" y="1" width="3.5" height="18" rx="0.5"/>
              <rect x="10.5" y="1" width="3.5" height="18" rx="0.5"/>
              <rect x="15" y="1" width="3.5" height="18" rx="0.5"/>
            </svg>
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Banner: revisões atrasadas */}
      {new Date().getHours() >= 20 && tasks.filter((t) => t.is_overdue).length > 0 && (
        <div className="border border-edge px-3 py-2 flex items-center justify-between gap-2">
          <span className="text-xs text-muted">
            {tasks.filter((t) => t.is_overdue).length} tarefa{tasks.filter((t) => t.is_overdue).length > 1 ? "s" : ""} atrasada{tasks.filter((t) => t.is_overdue).length > 1 ? "s" : ""}
          </span>
          <Button variant="outline" size="xs" loading={suggesting} onClick={handleAutoReschedule} className="shrink-0">
            Reagendar atrasadas
          </Button>
        </div>
      )}

      <CronogramaStreakCard streak={streak} loading={streakLoading} />

      <div data-calendar-summary-stack="true" className="-mx-4 md:-mx-6">
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
          onDayDetailChange={setIsDayDetailOpen}
          isMobilePortrait={isMobilePortrait}
          onMonthYearChange={(m, y, rowCount, gtt, prev, next) => {
            setCalendarMonth(m);
            setCalendarYear(y);
            setCalendarRowCount(rowCount);
            goToTodayRef.current = gtt;
            prevMonthRef.current = prev;
            nextMonthRef.current = next;
          }}
          summarySlot={
            isDayDetailOpen && !error
              ? loading
                ? <WeeklyOpsCompactSummarySkeleton />
                : <WeeklyOpsCompactSummary metrics={weeklyOpsMetrics} compact={true} />
              : null
          }
        />
      </div>

      {!isDayDetailOpen && !error && (
        <div className={summaryPositionClass}>
          {loading
            ? <WeeklyOpsCompactSummarySkeleton />
            : <WeeklyOpsCompactSummary metrics={weeklyOpsMetrics} compact={false} />
          }
        </div>
      )}

      {showEventSuggestionModal && (
        <div className="fixed inset-0 bg-black/40 z-50 overflow-y-auto flex p-4 modal-backdrop" onClick={closeEventSuggestionModal}>
          <div className="bg-paper border border-edge w-full max-w-xl m-auto p-4 space-y-3 rounded-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-base">Reagendamento sugerido</h3>
            </div>
            {eventModalSuggestions.length === 0 ? (
              <p className="text-sm text-muted">Nenhuma sugestão pendente.</p>
            ) : (
              <div className="space-y-3">
                {eventModalSuggestions.map((sg) => (
                  <div key={`modal:${sg.suggestion_id}`} className="space-y-2">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="xs"
                        loading={suggestionActionKey === `all:${sg.suggestion_id}`}
                        disabled={suggestionActionKey !== null}
                        onClick={() => handleAcceptSuggestionAll(sg.suggestion_id)}
                      >
                        Aceitar todas
                      </Button>
                      <Button
                        variant="secondary"
                        size="xs"
                        loading={suggestionActionKey === `reject:${sg.suggestion_id}`}
                        disabled={suggestionActionKey !== null}
                        onClick={() => handleRejectSuggestion(sg.suggestion_id)}
                      >
                        Ignorar
                      </Button>
                    </div>
                    <ul className="space-y-1">
                      {sg.items.map((item) => (
                        <li key={`modal:${sg.suggestion_id}:${item.task_id}`} className="border border-edge px-3 py-2">
                          <div className="flex items-center gap-2">
                            <AreaDot area={item.area as Area} size="sm" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm leading-tight truncate">{item.theme}</p>
                              <p className="text-xs text-muted">
                                {displayDate(item.current_due_date)} {"->"} {displayDate(item.suggested_due_date)}
                              </p>
                            </div>
                            <Button
                              variant="secondary"
                              size="xs"
                              loading={suggestionActionKey === `item:${sg.suggestion_id}:${item.task_id}`}
                              disabled={suggestionActionKey !== null || item.applied}
                              onClick={() => handleAcceptSuggestionItem(sg.suggestion_id, item.task_id)}
                              className="shrink-0"
                            >
                              {item.applied ? "Aceito" : "Aceitar"}
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

