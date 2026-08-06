"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Skeleton } from "@/components/Skeleton";
import { useNavbar } from "@/lib/NavbarContext";
import { getStudentToday } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { useAuthToken } from "@/lib/useAuthToken";
import { useStudentAgenda } from "@/features/student-agenda/useStudentAgenda";
import { AgendaItemRow } from "@/features/student-agenda/AgendaItemRow";
import { uniqueAgendaItems } from "@/features/student-agenda/agendaSelectors";
import { TodayBackupActions } from "./TodayBackupActions";
import { TodayEmptyState } from "./TodayEmptyState";
import { TodayPrimaryAction } from "./TodayPrimaryAction";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia!";
  if (hour < 18) return "Boa tarde!";
  return "Boa noite!";
}

function pct(value: number | null): string {
  return value === null || Number.isNaN(value) ? "—" : `${Math.round(value)}%`;
}

function TodayDashboardSkeleton() {
  return (
    <div className="space-y-5" aria-label="Hoje carregando">
      <Skeleton className="h-9 w-44" />
      <Skeleton className="h-44 w-full rounded-surface" />
      <div className="grid grid-cols-3 gap-2">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export function CanonicalTodayDashboard() {
  const { setTitle, setActions } = useNavbar();
  const { token, tokenResolved } = useAuthToken();
  const todayQuery = useQuery({
    queryKey: queryKeys.studentToday,
    queryFn: () => getStudentToday(token),
    enabled: tokenResolved,
    staleTime: 10_000,
  });
  const today = todayQuery.data;
  // The compatibility field still owns the learner-local date until the Today
  // contract itself gains a timezone-aware date. Its item list is never read.
  const localDate = today?.schedule_preview.date ?? "";
  const agendaQuery = useStudentAgenda(localDate, localDate);
  const agenda = agendaQuery.data;
  const day = agenda?.days[0] ?? null;

  useEffect(() => {
    setTitle("Hoje");
    setActions(
      localDate ? (
        <Link
          href={`/cronograma?view=week&anchor=${localDate}`}
          aria-label="Abrir cronograma da semana"
          className="inline-flex h-9 w-9 items-center justify-center text-muted hover:text-ink"
        >
          <CalendarDays className="h-5 w-5" aria-hidden="true" />
        </Link>
      ) : null,
    );
    return () => {
      setTitle(null);
      setActions(null);
    };
  }, [localDate, setActions, setTitle]);

  if (todayQuery.isPending || (localDate && agendaQuery.isPending)) {
    return <TodayDashboardSkeleton />;
  }
  if (!today) {
    return (
      <Alert variant="danger">
        Não foi possível carregar seu dia. Tente novamente em alguns instantes.
      </Alert>
    );
  }

  const isRest = ["rest", "rest_or_short_block"].includes(today.primary_action.kind);
  const primaryOccurrenceId = today.primary_action.agenda_occurrence_id ?? null;
  const uniqueRemaining = uniqueAgendaItems(
    [...(agenda?.overdue ?? []), ...(day?.items ?? [])],
    primaryOccurrenceId,
  );
  const backupActions = today.backup_actions.filter(
    (action) =>
      !action.agenda_occurrence_id ||
      action.agenda_occurrence_id !== primaryOccurrenceId,
  );
  const partial =
    today.status !== "complete" ||
    agendaQuery.isError ||
    (agenda && agenda.status !== "complete");

  return (
    <div className="space-y-5 md:space-y-6">
      <header>
        <h1 className="font-serif text-3xl font-semibold leading-tight text-ink md:text-4xl">
          {greeting()}
        </h1>
      </header>

      {partial ? (
        <Alert variant="warning">
          {agendaQuery.isError
            ? "A agenda do dia não foi carregada. A ação principal continua disponível, mas a lista restante pode estar incompleta."
            : "Alguns dados estão temporariamente incompletos. As ações exibidas continuam identificadas pela fonte disponível."}
        </Alert>
      ) : null}

      {isRest ? <TodayEmptyState /> : <TodayPrimaryAction action={today.primary_action} />}

      <section aria-label="Resumo de hoje" className="grid grid-cols-3 divide-x divide-edge border-y border-edge py-3">
        <div className="px-2 text-center sm:px-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Dia</p>
          <p className="mt-1 font-serif text-xl font-semibold text-ink">
            {day ? `${day.completed_items}/${day.total_items}` : "—"}
          </p>
          <p className="text-xs text-muted">atividades</p>
        </div>
        <div className="px-2 text-center sm:px-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Semana</p>
          <p className="mt-1 font-serif text-xl font-semibold text-ink">
            {pct(agenda?.summary.weekly_progress_pct ?? today.progress_snapshot.weekly_progress_pct)}
          </p>
          <p className="text-xs text-muted">da meta</p>
        </div>
        <div className="px-2 text-center sm:px-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Carga</p>
          <p className="mt-1 font-serif text-xl font-semibold capitalize text-ink">{today.today_load.label}</p>
          <p className="text-xs text-muted">{today.today_load.estimated_minutes} min</p>
        </div>
      </section>

      <section aria-labelledby="today-after-title">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="today-after-title" className="font-serif text-xl font-semibold text-ink">Depois</h2>
            <p className="mt-1 text-sm text-muted">
              {uniqueRemaining.length > 0
                ? `${uniqueRemaining.length} atividade${uniqueRemaining.length === 1 ? "" : "s"} restante${uniqueRemaining.length === 1 ? "" : "s"}.`
                : "Nenhuma outra atividade planejada para hoje."}
            </p>
          </div>
          <Link
            href={`/cronograma?view=week&anchor=${localDate}`}
            className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            Semana
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        {uniqueRemaining.length > 0 ? (
          <ul className="mt-3 divide-y divide-edge border-y border-edge">
            {uniqueRemaining.map((item) => <AgendaItemRow key={item.occurrence_id} item={item} />)}
          </ul>
        ) : null}
      </section>

      <details className="group border-y border-edge">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-semibold text-ink">
          <span>Alternativas e métricas</span>
          <span className="text-muted transition group-open:rotate-90" aria-hidden="true">›</span>
        </summary>
        <div className="space-y-4 border-t border-edge py-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted">Precisão observada</p>
              <p className="mt-1 font-semibold text-ink">{pct(today.progress_snapshot.accuracy_pct)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Revisões estimadas</p>
              <p className="mt-1 font-semibold text-ink">{today.review_snapshot.estimated_minutes} min</p>
            </div>
          </div>
          <TodayBackupActions actions={backupActions} />
        </div>
      </details>
    </div>
  );
}
