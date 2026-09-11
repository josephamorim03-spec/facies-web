"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarRange as CalendarCheck2, ChevronLeft, ChevronRight, Info as HelpCircle } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useNavbar } from "@/lib/NavbarContext";
import { buildStudyImportRuntimePath, readActiveStudyImportSessionId } from "@/lib/studyImportRuntime";
import { useDesktopNavigationMode } from "@/lib/useDesktopNavigationMode";

import { AlternarVista } from "./_components/AlternarVista";
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

type CalendarCoachStep = "month" | "manage" | "reschedule";

type CalendarCoachState = {
  month: boolean;
  manage: boolean;
  reschedule: boolean;
};

function readCalendarCoachState(storageKey: string): CalendarCoachState {
  if (typeof window === "undefined") return { month: false, manage: false, reschedule: false };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) ?? "{}") as Partial<CalendarCoachState>;
    return {
      month: Boolean(parsed.month),
      manage: Boolean(parsed.manage),
      reschedule: Boolean(parsed.reschedule),
    };
  } catch {
    return { month: false, manage: false, reschedule: false };
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
  if (!state.manage) return "manage";
  if (!state.reschedule) return "reschedule";
  return null;
}

function calendarCoachCopy(step: CalendarCoachStep): string {
  if (step === "month") {
    return "Use as setas ou toque no mês para navegar. Em celulares e tablets, deslizar o calendário.";
  }
  if (step === "manage") {
    return "Selecione um dia e use Adicionar para criar estudo ou compromisso. Toque em um estudo ou compromisso no calendário para ver opções como Apagar e Reagendar.";
  }
  return "Arrastar e soltar é um atalho para dispositivos touchscreen: toque e segure uma revisão ou compromisso e leve para outro dia. No desktop, use o botão Reagendar.";
}

const COACH_ORDER: CalendarCoachStep[] = ["month", "manage", "reschedule"];

const COACH_TITLES: Record<CalendarCoachStep, string> = {
  month: "Navegar entre os meses",
  manage: "Selecionar um dia e adicionar",
  reschedule: "Reagendar o que já existe",
};

/** Dica ancorada no proprio assunto, com lugar na sequencia.
 *
 * Antes era um passo linear so: `nextCoachStep` devolvia o primeiro pendente e
 * a tela renderizava "month" e "reschedule". "manage" nao tinha JSX e ninguem
 * chamava `completeCoachStep("manage")`, entao a sequencia TRAVAVA nele --
 * invisivel e permanente -- e a terceira dica nunca chegava a aparecer.
 */
function CalendarCoachmark({
  step,
  onNext,
  onBack,
  onSkip,
}: {
  step: CalendarCoachStep;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const index = COACH_ORDER.indexOf(step);
  const isFirst = index === 0;
  const isLast = index === COACH_ORDER.length - 1;

  return (
    <div
      role="note"
      aria-label={`Dica ${index + 1} de ${COACH_ORDER.length}: ${COACH_TITLES[step]}`}
      data-calendar-coach={step}
      className="paper-dashed flex items-start gap-2 border-primary/35 bg-primary/5 px-3 py-2 text-xs text-muted"
    >
      <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">
          {COACH_TITLES[step]}{" "}
          <span className="font-normal text-muted">
            ({index + 1} de {COACH_ORDER.length})
          </span>
        </p>
        <p className="mt-0.5">{calendarCoachCopy(step)}</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          {!isFirst && (
            <button
              type="button"
              onClick={onBack}
              className="font-semibold text-ink hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Voltar
            </button>
          )}
          <button
            type="button"
            onClick={onNext}
            className="font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {isLast ? "Concluir" : "Avançar"}
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Pular dicas
          </button>
        </div>
      </div>
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
        className="min-w-0 px-2 text-center text-lg font-semibold tracking-[-0.012em] text-ink transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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

export default function CronogramaMonthView({
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
    today,
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

  // Mesma fonte que o /hoje usa, para as duas telas nao divergirem no numero.
  // `questionPractice` do hook NAO serve aqui: e' contagem vitalicia de erro na
  // primeira tentativa, nao questoes feitas na semana.
  const weeklyOps = useMemo(
    () =>
      buildWeeklyOpsMetrics({
        weeklyGoal,
        pendingTasks: tasks,
        doneTasks,
        studies,
        todayIso: today,
      }),
    [weeklyGoal, tasks, doneTasks, studies, today],
  );

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
  const coachStorageKey = useMemo(() => "cronograma_calendar_coach_v2", []);
  const [coachState, setCoachState] = useState<CalendarCoachState>(() =>
    readCalendarCoachState("cronograma_calendar_coach_v2"),
  );
  // A dica ativa e' navegavel (avancar/voltar/pular); `coachState` guarda o que
  // ja foi visto, para a sequencia aparecer uma vez por usuario.
  const [coachStep, setCoachStep] = useState<CalendarCoachStep | null>(() =>
    nextCoachStep(readCalendarCoachState("cronograma_calendar_coach_v2")),
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
      const next = { ...coachState, [step]: true };
      writeCalendarCoachState(coachStorageKey, next);
      setCoachState(next);
      setCoachStep((current) => (current === step ? null : current));
    },
    [coachState, coachStorageKey],
  );

  const goToCoachStep = useCallback(
    (delta: 1 | -1) => {
      setCoachStep((current) => {
        if (!current) return null;
        const target = COACH_ORDER[COACH_ORDER.indexOf(current) + delta];
        const seen = { ...coachState, [current]: true };
        writeCalendarCoachState(coachStorageKey, seen);
        setCoachState(seen);
        return target ?? null;
      });
    },
    [coachState, coachStorageKey],
  );

  const skipCalendarCoach = useCallback(() => {
    const seen = { month: true, manage: true, reschedule: true };
    writeCalendarCoachState(coachStorageKey, seen);
    setCoachState(seen);
    setCoachStep(null);
  }, [coachStorageKey]);

  // Reabre pelo link textual, sem apagar o que ja foi visto: quem procura ajuda
  // quer rever, nao recomecar um tutorial.
  const restartCalendarCoach = useCallback(() => {
    setCoachStep("month");
  }, []);

  /**
   * O dia que a SEMANA deve abrir quando o aluno troca de leitura daqui.
   *
   * Não é `today` sempre: quem está a olhar novembro e carrega em "ver a
   * semana" quer a semana de novembro, e não ser atirado de volta para hoje.
   * Só quando o mês visível É o mês corrente é que hoje é a resposta certa.
   */
  const diaParaASemana = useMemo(() => {
    const noMesCorrente = calendarYear === currentRealYear && calendarMonth === currentRealMonth;
    if (noMesCorrente) return today;
    return `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-01`;
  }, [calendarMonth, calendarYear, currentRealMonth, currentRealYear, today]);

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
        {/* ⚠️ O ÍCONE "VER SEMANA" VOLTOU, e o motivo está em `AlternarVista`:
            a linha de seções que o substituiu deixou de existir nesta tela
            quando o calendário virou destino do "Mais". Ele fica à direita da
            lupa, e é o mesmo botão que a semana usa para vir para cá. */}
        <AlternarVista para="week" dia={diaParaASemana} tamanho="sm" />
      </>,
    );
    return () => {
      setTitle(null);
      setActions(null);
    };
  }, [diaParaASemana, isDesktopNavigation, renderMonthControl, restartCalendarCoach, searchOpen, setActions, setTitle]);

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
                <ul className="absolute left-0 right-0 z-30 max-h-48 overflow-y-auto border border-t-0 border-edge bg-paper ">
                  {searchSuggestions.map((theme) => (
                    <li key={theme}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--wash-selecao)]"
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
        <div className="relative flex min-h-11 items-center justify-center">
          {renderMonthControl("w-full max-w-md")}
          <div className="absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-1">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex h-8 w-8 items-center justify-center text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Buscar tema"
            >
              <IconSearch className="h-5 w-5" />
            </button>
            {/* A MESMA troca do telemóvel, no mesmo lugar relativo à lupa: o
                desktop não ganha um segundo desenho para a mesma decisão. */}
            <AlternarVista para="week" dia={diaParaASemana} />
          </div>
        </div>
      ) : null}

      {!searchOpen ? (
        <div className="-mt-1">
          <CronogramaStreakCard streak={streak} loading={streakLoading} />
        </div>
      ) : null}

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {/* Ancorada no controle de mes, logo acima do calendario. */}
      {coachStep === "month" ? (
        <CalendarCoachmark
          step="month"
          onNext={() => goToCoachStep(1)}
          onBack={() => goToCoachStep(-1)}
          onSkip={skipCalendarCoach}
        />
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
              const anchor = `${y}-${String(m + 1).padStart(2, "0")}-01`;
              // A rota do mês é `/cronograma/mes`. Manter `?view=month` aqui
              // faria a própria tela reescrever o endereço para a URL que
              // `next.config.js` encaminha — um 307 por troca de mês.
              router.replace(`/cronograma/mes?anchor=${anchor}`, { scroll: false });
              completeCoachStep("month");
            }
            monthChangeSeenRef.current = true;
          }}
        />
      </div>

      {/* Ancoradas logo abaixo do calendario: "manage" fala de selecionar dia e
          adicionar, "reschedule" de arrastar o que ja existe -- as duas acoes
          acontecem na grade acima. */}
      {coachStep === "manage" ? (
        <CalendarCoachmark
          step="manage"
          onNext={() => goToCoachStep(1)}
          onBack={() => goToCoachStep(-1)}
          onSkip={skipCalendarCoach}
        />
      ) : null}

      {coachStep === "reschedule" ? (
        <CalendarCoachmark
          step="reschedule"
          onNext={() => goToCoachStep(1)}
          onBack={() => goToCoachStep(-1)}
          onSkip={skipCalendarCoach}
        />
      ) : null}

      <button
        type="button"
        onClick={restartCalendarCoach}
        className="self-start text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        Como usar o Cronograma
      </button>

      {!loading && calendarRecommendationsEnabled ? (
        <section aria-labelledby="routine-suggestions-title">
          <h2 id="routine-suggestions-title" className="font-medium text-ink">
            Sugestões para a rotina
          </h2>
          {/* Tracejado + tom `attention`: estas linhas dividiam a mesma
              superficie solida das atividades reais do calendario, entao
              pareciam ja agendadas. O que separa as duas coisas nao pode ser so
              a posicao na tela. */}
          <div className="mt-2 space-y-2">
            {[
              {
                href: "/hoje",
                title: "Reserve uma sessão de 50 questões",
                detail: "Escolha o melhor dia antes de iniciar.",
                cta: "Escolher dia e adicionar",
              },
              {
                href: "/banco?tipo=prova",
                title: "Planeje uma prova institucional",
                detail: "Defina instituição e ano no Banco.",
                cta: "Definir prova e adicionar",
              },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="paper-dashed group flex min-h-14 items-center gap-3 border-warning/35 bg-warning/5 px-3 py-3 text-sm"
              >
                <CalendarCheck2 className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="paper-eyebrow block text-warning">
                    Sugestão — ainda não adicionada
                  </span>
                  <strong className="mt-0.5 block font-semibold text-ink">{item.title}</strong>
                  <span className="text-xs text-muted">{item.detail}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-xs text-primary">
                  {item.cta}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            ))}
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

      {!loading && weeklyGoal > 0 ? (
        <WeeklyGoalControl
          token={token}
          weeklyGoal={weeklyGoal}
          completedQuestions={weeklyOps.doneQuestionsWeek}
          progressPct={weeklyOps.progressPct}
          remainingQuestions={weeklyOps.weeklyGoalRemainingQuestions}
          onSaved={fetchAll}
        />
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
            className="w-full rounded-surface border border-edge bg-paper p-4 md:max-w-md "
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-ink">Selecionar mês</h3>
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
              <span className="text-sm font-medium text-ink">Ano</span>
              <select
                value={monthPickerYear}
                onChange={(event) => setMonthPickerYear(Number(event.target.value))}
                className="mt-2 min-h-11 w-full rounded-control border border-edge bg-paper px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
                    className={`min-h-11 border px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      selected
                        ? "border-primary bg-primary text-primaryInk"
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
