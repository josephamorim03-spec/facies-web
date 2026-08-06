"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Skeleton } from "@/components/Skeleton";
import { useNavbar } from "@/lib/NavbarContext";
import { AgendaItemRow } from "@/features/student-agenda/AgendaItemRow";
import { useStudentAgenda } from "@/features/student-agenda/useStudentAgenda";
import {
  formatShortDate,
  formatWeekday,
  localISO,
  shiftISO,
  weekRange,
} from "@/features/student-agenda/dateRange";

export function CronogramaWeekView({ anchor }: { anchor: string }) {
  const { setTitle, setActions } = useNavbar();
  const range = useMemo(() => weekRange(anchor), [anchor]);
  const agendaQuery = useStudentAgenda(range.start, range.end);
  const agenda = agendaQuery.data;
  const todayRef = useRef<HTMLElement>(null);
  const today = agenda?.today ?? localISO();
  const todayRange = weekRange(today);
  const isCurrentWeek = range.start === todayRange.start;

  useEffect(() => {
    setTitle("Cronograma");
    setActions(null);
    return () => {
      setTitle(null);
      setActions(null);
    };
  }, [setActions, setTitle]);

  useEffect(() => {
    if (agenda && isCurrentWeek) todayRef.current?.focus({ preventScroll: true });
  }, [agenda, isCurrentWeek]);

  if (agendaQuery.isPending) {
    return (
      <div className="space-y-4" aria-label="Semana carregando">
        <Skeleton className="h-14 w-full" />
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 w-full" />)}
      </div>
    );
  }
  if (!agenda) {
    return <Alert variant="danger">Não foi possível carregar esta semana.</Alert>;
  }

  return (
    <div className="space-y-5" data-cronograma-week="true">
      {agenda.status !== "complete" ? (
        <Alert variant="warning">A semana está parcial; fontes indisponíveis não foram convertidas em zero.</Alert>
      ) : null}

      <header className="flex items-center justify-between gap-3 border-y border-edge py-2">
        <Link
          href={`/cronograma?view=week&anchor=${shiftISO(range.start, -7)}`}
          aria-label="Semana anterior"
          className="flex h-11 w-11 items-center justify-center text-muted hover:text-ink"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <div className="min-w-0 text-center">
          <p className="font-serif text-lg font-semibold text-ink">
            {formatShortDate(range.start)} – {formatShortDate(range.end)}
          </p>
          <p className="text-xs text-muted">
            {agenda.summary.completed_items}/{agenda.summary.total_items} concluídas · {agenda.summary.weekly_progress_pct === null ? "—" : `${Math.round(agenda.summary.weekly_progress_pct)}%`} da meta
          </p>
        </div>
        <Link
          href={`/cronograma?view=week&anchor=${shiftISO(range.start, 7)}`}
          aria-label="Próxima semana"
          className="flex h-11 w-11 items-center justify-center text-muted hover:text-ink"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </Link>
      </header>

      {!isCurrentWeek ? (
        <div className="text-center">
          <Link href={`/cronograma?view=week&anchor=${today}`} className="text-sm font-semibold text-primary hover:underline">
            Voltar para esta semana
          </Link>
        </div>
      ) : null}

      {agenda.overdue.length > 0 ? (
        <section aria-labelledby="week-overdue-title" className="border-y border-warning/50 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 id="week-overdue-title" className="font-serif text-lg font-semibold text-ink">Atrasadas</h2>
              <p className="text-xs text-muted">Aparecem somente aqui para não duplicar o dia original.</p>
            </div>
            <Link href="/cronograma?view=month" className="text-xs font-semibold text-primary hover:underline">Reorganizar</Link>
          </div>
          <ul className="mt-2 divide-y divide-edge">
            {agenda.overdue.map((item) => <AgendaItemRow key={item.occurrence_id} item={item} />)}
          </ul>
        </section>
      ) : null}

      <div className="space-y-3">
        {agenda.days.map((day) => {
          const current = day.date === today;
          return (
            <section
              key={day.date}
              ref={current ? todayRef : undefined}
              tabIndex={current ? -1 : undefined}
              id={current ? "cronograma-hoje" : undefined}
              aria-label={`${formatWeekday(day.date)} ${formatShortDate(day.date)}${current ? ", hoje" : ""}`}
              className={`border px-3 py-3 sm:px-4 ${current ? "border-primary bg-primary/5" : "border-edge bg-paper"}`}
              data-current-day={current ? "true" : undefined}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-serif text-lg font-semibold text-ink">{formatWeekday(day.date)}</h2>
                    {current ? <span className="border border-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">Hoje</span> : null}
                  </div>
                  <p className="text-xs text-muted">{formatShortDate(day.date)}</p>
                </div>
                <p className="text-right text-xs text-muted">
                  {day.total_items} atividade{day.total_items === 1 ? "" : "s"}
                  {day.planned_minutes > 0 ? <><br />{day.planned_minutes} min</> : null}
                </p>
              </div>
              {day.overloaded ? (
                <p className="mt-2 text-xs font-semibold text-warning">Carga acima da capacidade recomendada.</p>
              ) : null}
              {day.items.length > 0 ? (
                <ul className="mt-2 divide-y divide-edge border-t border-edge">
                  {day.items.map((item) => <AgendaItemRow key={item.occurrence_id} item={item} />)}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted">Dia livre. Nenhuma atividade planejada.</p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
