"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  House,
} from "lucide-react";

import { TopBarActionLink } from "@/components/TopBarActionLink";
import { Button } from "@/components/ui/Button";
import { useNavbar } from "@/lib/NavbarContext";
import { buildStudyImportRuntimePath, readActiveStudyImportSessionId } from "@/lib/studyImportRuntime";
import { useDesktopNavigationMode } from "@/lib/useDesktopNavigationMode";

import { CronogramaCalendarView } from "./_components/CronogramaCalendarView";
import { IconSearch, IconX } from "./_components/CronogramaIcons";
import { CronogramaStreakCard } from "./_components/CronogramaStreakCard";
import { RescheduleSuggestionDialog } from "./_components/RescheduleSuggestionDialog";
import { WeeklyGoalControl } from "./_components/WeeklyGoalControl";
import { useCronogramaPageState } from "./_hooks/useCronogramaPageState";
import { useCronogramaSearchFilters } from "./_hooks/useCronogramaSearchFilters";
import {
  buildStudiesByDate,
  buildStudyMap,
  SHORT_MONTH_LABELS,
} from "./_lib/cronogramaShared";
import { buildWeeklyOpsMetrics } from "./_lib/weeklyOpsMetrics";
import { writeCronogramaViewModeSession } from "./_lib/viewModeSession";

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

type CalendarCoachStep = "month" | "reschedule";

type CalendarCoachState = {
  month: boolean;
  reschedule: boolean;
};

function readCalendarCoachState(storageKey: string): CalendarCoachState {
  if (typeof window === "undefined") return { month: false, reschedule: false };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) ?? "{}") as Partial<CalendarCoachState>;
    return {
      month: Boolean(parsed.month),
      reschedule: Boolean(parsed.reschedule),
    };
  } catch {
    return { month: false, reschedule: false };
  }
}

function writeCalendarCoachState(storageKey: string, state: CalendarCoachState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // Storage can be unavailable in private contexts.
  }
}

function nextCoachStep(state: CalendarCoachState): CalendarCoachStep | null {
  if (!state.month) return "month";
  if (!state.reschedule) return "reschedule";
  return null;
}

function CalendarCoachmark({
  step,
  onDismiss,
}: {
  step: CalendarCoachStep;
  onDismiss: () => void;
}) {
  const copy =
    step === "month"
      ? "Deslize o calendário ou use as setas para navegar entre os meses."
      : "Toque e segure uma atividade para arrastá-la para outro dia. Você também pode tocar nela e escolher \"Reagendar\".";

  return (
    <div className="flex items-start gap-2 rounded-md border border-edge bg-surfaceMuted px-3 py-2 text-xs text-muted">
      <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <p className="min-w-0 flex-1">{copy}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="-mr-1 shrink-0 px-1 font-semibold text-ink hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="Dispensar dica"
      >
        OK
      </button>
    </div>
  );
}

function MonthControl({
  month,
  year,
  currentRealYear,
  onPrevious,
  onNext,
  onOpenPicker,
  className = "",
}: {
  month: number;
  year: number;
  currentRealYear: number;
  onPrevious: () => void;
  onNext: () => void;
  onOpenPicker: () => void;
  className?: string;
}) {
  const label = `${SHORT_MONTH_LABELS[month]}${year !== currentRealYear ? ` ${year}` : ""}`;

  return (
    <div
      data-month-nav="true"
      className={`grid min-w-0 grid-cols-[44px_minmax(0,1fr)_44px] items-center ${className}`.trim()}
    >
      <button
        type="button"
        onClick={onPrevious}
        className="flex h-11 w-11 items-center justify-center text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="Mês anterior"
      >
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={onOpenPicker}
        className="min-w-0 px-2 text-center font-serif text-[17px] font-bold tracking-normal text-ink transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={`Selecionar mês e ano. Atual: ${label}`}
        data-month-title="true"
      >
        <span className="block truncate">{label}</span>
      </button>
      <button
        type="button"
        onClick={onNext}
        className="flex h-11 w-11 items-center justify-center text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="Próximo mês"
      >
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}

export default function CronogramaPage({
  initialSelectedDay = null,
}: {
  initialSelectedDay?: string | null;
}) {
  const router = useRouter();
  const isDesktopNavigation = useDesktopNavigationMode();
  const { setTitle, setActions } = useNavbar();
  const {
    tasks,
    doneTasks,
    studies,
    turboCardsByDate,
    events,
    streak,
    streakLoading,
    loading,
    error,
    suggesting,
    suggestionActionKey,
    showEventSuggestionModal,
    token,
    weeklyGoal,
    calendarRecommendationsEnabled,
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
  const goToTodayRef = useRef<(() => void) | null>(null);
  const prevMonthRef = useRef<(() => void) | null>(null);
  const nextMonthRef = useRef<(() => void) | null>(null);
  const goToMonthRef = useRef<((year: number, month: number) => void) | null>(null);
  const monthChangeSeenRef = useRef(false);

  const nowRef = new Date();
  const currentRealYear = nowRef.getFullYear();
  const currentRealMonth = nowRef.getMonth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [isMobilePortrait, setIsMobilePortrait] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(currentRealMonth);
  const [calendarYear, setCalendarYear] = useState(currentRealYear);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [monthPickerYear, setMonthPickerYear] = useState(currentRealYear);
  const coachStorageKey = useMemo(() => "cronograma_calendar_coach_v1", []);
  const [coachStep, setCoachStep] = useState<CalendarCoachStep | null>(null);

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

  const completeCoachStep = useCallback(
    (step: CalendarCoachStep) => {
      const state = readCalendarCoachState(coachStorageKey);
      const next = { ...state, [step]: true };
      writeCalendarCoachState(coachStorageKey, next);
      setCoachStep(nextCoachStep(next));
    },
    [coachStorageKey],
  );

  const openMonthPicker = useCallback(() => {
    setMonthPickerYear(calendarYear);
    setMonthPickerOpen(true);
    completeCoachStep("month");
  }, [calendarYear, completeCoachStep]);

  const renderMonthControl = useCallback(
    (className = "") => (
      <MonthControl
        month={calendarMonth}
        year={calendarYear}
        currentRealYear={currentRealYear}
        onPrevious={() => {
          prevMonthRef.current?.();
          completeCoachStep("month");
        }}
        onNext={() => {
          nextMonthRef.current?.();
          completeCoachStep("month");
        }}
        onOpenPicker={openMonthPicker}
        className={className}
      />
    ),
    [calendarMonth, calendarYear, completeCoachStep, currentRealYear, openMonthPicker],
  );

  useEffect(() => {
    if (isDesktopNavigation) return;
    if (searchOpen) {
      setTitle("");
      setActions(null);
      return () => {
        setTitle(null);
        setActions(null);
      };
    }

    setTitle(renderMonthControl("w-full max-w-[17rem]"));
    setActions(
      <>
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="flex h-7 w-7 shrink-0 items-center justify-center text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Buscar tema"
        >
          <IconSearch className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setCoachStep("month")}
          className="flex h-7 w-7 shrink-0 items-center justify-center text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Mostrar dica do calendário"
        >
          <HelpCircle className="h-5 w-5" aria-hidden="true" />
        </button>
        <TopBarActionLink href="/hoje" label="Ir para Hoje" title="Ir para Hoje">
          <House className="h-5 w-5" aria-hidden="true" />
        </TopBarActionLink>
      </>,
    );
    return () => {
      setTitle(null);
      setActions(null);
    };
  }, [isDesktopNavigation, renderMonthControl, searchOpen, setActions, setTitle]);

  function closeSearch() {
    setSearchOpen(false);
    clearSearch();
  }

  function selectMonth(year: number, month: number) {
    goToMonthRef.current?.(year, month);
    setCalendarYear(year);
    setCalendarMonth(month);
    setMonthPickerOpen(false);
    completeCoachStep("month");
  }

  const overdueTasks = tasks.filter((task) => task.is_overdue);

  return (
    <div
      className="flex flex-col gap-4"
      style={{ minHeight: "calc(100svh - max(1.5rem, env(safe-area-inset-top, 0px)) - 4.5rem - env(safe-area-inset-bottom, 0px))" }}
    >
      {isDesktopNavigation && !searchOpen ? (
        <header className="border-b border-edge pb-4">
          <p className="text-xs font-semibold uppercase text-muted">Planejamento</p>
          <h1 className="mt-1 font-serif text-3xl font-semibold text-ink">Ajuste a rotina</h1>
        </header>
      ) : null}

      {searchOpen ? (
        <div className="space-y-1.5" data-crono-search-mode="true">
          <div className="flex items-center gap-2" data-crono-search-row="true">
            <div className="relative flex-1">
              <input
                ref={searchInputRef}
                type="text"
                value={searchInput}
                onChange={(event) => handleSearchInputChange(event.target.value)}
                placeholder="Buscar tema..."
                className="w-full border-b border-ink bg-transparent py-1.5 text-sm outline-none"
                autoFocus
              />
              {searchSuggestions.length > 0 && !searchQuery ? (
                <ul className="absolute left-0 right-0 z-30 max-h-48 overflow-y-auto rounded-b-md border border-t-0 border-edge bg-paper shadow-sm">
                  {searchSuggestions.map((theme) => (
                    <li key={theme}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--amber-tint)]"
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
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => {
                if (searchInput) {
                  clearSearch();
                  return;
                }
                closeSearch();
              }}
              className="shrink-0 p-1.5 text-muted hover:text-ink"
              aria-label={searchInput ? "Limpar busca" : "Fechar busca"}
              data-testid="cronograma-search-action"
              data-search-action={searchInput ? "clear" : "back"}
            >
              {searchInput ? (
                <IconX className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
          <div
            data-crono-search-month-row="true"
            data-crono-mobile-month-row={isMobilePortrait ? "true" : undefined}
          >
            {renderMonthControl(isDesktopNavigation ? "mx-auto w-full max-w-md" : "w-full")}
          </div>
        </div>
      ) : isDesktopNavigation ? (
        <div className="grid grid-cols-[1fr_auto] items-center gap-2">
          {renderMonthControl("w-full max-w-md")}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex h-8 w-8 items-center justify-center text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Buscar tema"
            >
              <IconSearch className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setCoachStep("month")}
              className="flex h-8 w-8 items-center justify-center text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Mostrar dica do calendário"
            >
              <HelpCircle className="h-5 w-5" aria-hidden="true" />
            </button>
            <TopBarActionLink href="/hoje" label="Ir para Hoje" title="Ir para Hoje">
              <House className="h-5 w-5" aria-hidden="true" />
            </TopBarActionLink>
          </div>
        </div>
      ) : null}

      {!searchOpen ? (
        <div className="-mt-1">
          <CronogramaStreakCard streak={streak} loading={streakLoading} />
        </div>
      ) : null}

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {coachStep === "month" ? (
        <CalendarCoachmark step="month" onDismiss={() => completeCoachStep("month")} />
      ) : null}

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
          onTaskRescheduled={() => completeCoachStep("reschedule")}
          searchQuery={searchQuery}
          initialSelectedDay={initialSelectedDay}
          isMobilePortrait={isMobilePortrait}
          onMonthYearChange={(m, y, _rowCount, goToToday, prevMonth, nextMonth, goToMonth) => {
            setCalendarMonth(m);
            setCalendarYear(y);
            goToTodayRef.current = goToToday;
            prevMonthRef.current = prevMonth;
            nextMonthRef.current = nextMonth;
            goToMonthRef.current = goToMonth;
            if (monthChangeSeenRef.current) {
              completeCoachStep("month");
            }
            monthChangeSeenRef.current = true;
          }}
        />
      </div>

      {coachStep === "reschedule" ? (
        <CalendarCoachmark step="reschedule" onDismiss={() => completeCoachStep("reschedule")} />
      ) : null}

      {!loading ? (
        <WeeklyGoalControl
          token={token ?? ""}
          weeklyGoal={weeklyOpsMetrics.weeklyGoal}
          completedQuestions={weeklyOpsMetrics.doneQuestionsWeek}
          progressPct={weeklyOpsMetrics.progressPct}
          remainingQuestions={weeklyOpsMetrics.weeklyGoalRemainingQuestions}
          onSaved={fetchAll}
        />
      ) : null}

      {!loading && calendarRecommendationsEnabled ? (
        <section aria-labelledby="routine-suggestions-title">
          <h2 id="routine-suggestions-title" className="text-sm font-semibold text-ink">
            Sugestões para a rotina
          </h2>
          <div className="mt-2 divide-y divide-edge border-y border-edge">
            <Link href="/kros" className="group flex min-h-14 items-center gap-3 py-3 text-sm">
              <CalendarCheck2 className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <strong className="block font-semibold text-ink">Reserve um Kros de 50 questões</strong>
                <span className="text-xs text-muted">Escolha o melhor dia antes de iniciar.</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <Link href="/banco?tipo=prova" className="group flex min-h-14 items-center gap-3 py-3 text-sm">
              <CalendarCheck2 className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <strong className="block font-semibold text-ink">Planeje uma prova institucional</strong>
                <span className="text-xs text-muted">Defina instituição e ano no Banco.</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </div>
        </section>
      ) : null}

      {new Date().getHours() >= 20 && overdueTasks.length > 0 ? (
        <div className="flex items-center justify-center gap-2 text-xs text-muted">
          <span>
            {overdueTasks.length} tarefa{overdueTasks.length > 1 ? "s" : ""} atrasada{overdueTasks.length > 1 ? "s" : ""}
          </span>
          <Button variant="outline" size="xs" loading={suggesting} onClick={handleAutoReschedule} className="shrink-0">
            Reagendar
          </Button>
        </div>
      ) : null}

      {monthPickerOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-end bg-black/30 md:items-center md:justify-center"
          onClick={() => setMonthPickerOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Selecionar mês e ano"
            className="w-full rounded-t-2xl border border-edge bg-paper p-4 shadow-[var(--soft-shadow)] md:max-w-md md:rounded-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-ink">Selecionar mês</h3>
              <button
                type="button"
                onClick={() => setMonthPickerOpen(false)}
                className="flex h-8 w-8 items-center justify-center text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Fechar seletor"
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>
            <label className="mt-4 block">
              <span className="text-sm font-semibold text-ink">Ano</span>
              <select
                value={monthPickerYear}
                onChange={(event) => setMonthPickerYear(Number(event.target.value))}
                className="mt-2 min-h-11 w-full border border-edge bg-paper px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {Array.from({ length: 11 }, (_, index) => currentRealYear - 5 + index).map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {SHORT_MONTH_LABELS.map((label, index) => {
                const selected = calendarMonth === index && calendarYear === monthPickerYear;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => selectMonth(monthPickerYear, index)}
                    className={`min-h-11 border px-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      selected
                        ? "border-primary bg-primary text-white"
                        : "border-edge bg-paper text-ink hover:bg-surfaceMuted"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => selectMonth(currentRealYear, currentRealMonth)}
              className="mt-4 w-full"
            >
              Mês atual
            </Button>
          </div>
        </div>
      ) : null}

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
