"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays as CalendarPlus2, ChevronLeft, ChevronRight, SlidersHorizontal as SlidersHorizontal } from "lucide-react";

import { classesDeBotao } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Skeleton } from "@/components/Skeleton";
import { useNavbar } from "@/lib/NavbarContext";
import { AREA_BG_CLASS } from "@/lib/areaIdentity";
import { resolveDisplayArea } from "@/lib/areaDisplay";
import { getOperationalStreak, invalidateStudentExperienceCache } from "@/lib/api";
import type { StudentAgendaItem } from "@/lib/api";
import { useAuthToken } from "@/lib/useAuthToken";

import { AgendaItemRow } from "@/features/student-agenda/AgendaItemRow";
import { uniqueAgendaItems } from "@/features/student-agenda/agendaSelectors";
import { useStudentAgenda } from "@/features/student-agenda/useStudentAgenda";
import {
  formatShortDate,
  formatWeekday,
  localISO,
  shiftISO,
  weekRange,
} from "@/features/student-agenda/dateRange";

import { CronogramaStreakCard } from "./CronogramaStreakCard";
import { WeeklyGoalControl } from "./WeeklyGoalControl";

import { writeCronogramaViewModeSession } from "../_lib/viewModeSession";

function isInsideRange(date: string | null | undefined, start: string, end: string): date is string {
  return Boolean(date && date >= start && date <= end);
}

function selectedDateForRange({
  requested,
  anchor,
  today,
  start,
  end,
}: {
  requested?: string | null;
  anchor: string;
  today: string;
  start: string;
  end: string;
}): string {
  if (isInsideRange(requested, start, end)) return requested;
  if (isInsideRange(anchor, start, end)) return anchor;
  if (isInsideRange(today, start, end)) return today;
  return start;
}

function shortWeekday(iso: string): string {
  return new Date(`${iso}T12:00:00`)
    .toLocaleDateString("pt-BR", { weekday: "short" })
    .replace(".", "")
    .slice(0, 3);
}

function dayNumber(iso: string): number {
  return new Date(`${iso}T12:00:00`).getDate();
}

function itemDotArea(item: Pick<StudentAgendaItem, "area" | "title" | "rationale">) {
  const area = resolveDisplayArea(item.area, item.title, item.rationale);
  return { area, className: AREA_BG_CLASS[area] };
}

export function CronogramaWeekView({
  anchor,
  initialSelectedDay = null,
}: {
  anchor: string;
  initialSelectedDay?: string | null;
}) {
  const router = useRouter();
  const { setTitle } = useNavbar();
  const { token, tokenResolved } = useAuthToken();
  const range = useMemo(() => weekRange(anchor), [anchor]);
  const agendaQuery = useStudentAgenda(range.start, range.end);
  const agenda = agendaQuery.data;
  const today = agenda?.today ?? localISO();
  const todayRange = weekRange(today);
  const isCurrentWeek = range.start === todayRange.start;
  const [userSelectedDate, setUserSelectedDate] = useState<string | null>(null);
  const defaultSelectedDate = selectedDateForRange({
      requested: initialSelectedDay,
      anchor,
      today,
      start: range.start,
      end: range.end,
  });
  const selectedDate = isInsideRange(userSelectedDate, range.start, range.end)
    ? userSelectedDate
    : defaultSelectedDate;
  const streakQuery = useQuery({
    queryKey: ["operational", "streak"],
    queryFn: () => getOperationalStreak(token),
    enabled: tokenResolved,
    staleTime: 60_000,
    retry: 1,
  });

  /**
   * ⚠️ O ÍCONE "VER MÊS" SAIU DA BARRA DE TÍTULO.
   *
   * Ele existia só no telemóvel, porque no desktop a troca vinha de um seletor
   * textual dentro do conteúdo. Com "Semana" e "Mês" como seções do Plano, a
   * troca passou a ser a MESMA nas duas larguras, no topo do conteúdo
   * (`IntentSubNav`) — e um segundo caminho para ela, com outro desenho e outro
   * lugar, é chrome que o aluno tem de aprender duas vezes.
   *
   * O título passa a ser "Semana", que é o nome da seção. "Cronograma" era o
   * nome do arquivo, e dizia respeito ao mês e à semana ao mesmo tempo.
   */
  useEffect(() => {
    setTitle("Semana");
    return () => {
      setTitle(null);
    };
  }, [setTitle]);

  useEffect(() => {
    writeCronogramaViewModeSession("week");
  }, []);

  if (agendaQuery.isPending) {
    return (
      <div className="space-y-4" aria-label="Semana carregando">
        <Skeleton className="mx-auto h-6 w-40 " />
        <Skeleton className="h-24 w-full " />
        <Skeleton className="h-52 w-full " />
      </div>
    );
  }
  // O guard olha os CAMPOS, e não só o objeto. `if (!agenda)` já estava aqui e
  // parecia suficiente, mas um payload truncado passa por ele — `{}` é truthy — e
  // o `agenda.days.find` logo abaixo derruba a página inteira com "Cannot read
  // properties of undefined (reading 'find')". O aluno perde o cronograma
  // inteiro, não o pedaço que faltou.
  //
  // Isto não é hipótese: é o que acontecia sob o mock do e2e, e derrubava 14
  // testes de uma vez com um erro que não menciona a agenda em lugar nenhum.
  // Nada garante que só um mock produza payload incompleto — proxy que trunca,
  // deploy com contrato antigo e resposta parcial fazem o mesmo.
  if (!agenda || !Array.isArray(agenda.days) || !agenda.summary) {
    return (
      <Alert variant="danger" onRetry={() => void agendaQuery.refetch()}>
        Não foi possível carregar esta semana.
      </Alert>
    );
  }

  const selectedDay = agenda.days.find((day) => day.date === selectedDate) ?? agenda.days[0];
  const selectedItems = uniqueAgendaItems(selectedDay?.items ?? []);
  const weeklyGoal = agenda.summary.weekly_goal_questions;
  const questionsDone = agenda.summary.questions_done_week;
  const progressPct = agenda.summary.weekly_progress_pct ?? 0;
  const remainingQuestions = Math.max(0, weeklyGoal - questionsDone);

  function selectDay(date: string) {
    setUserSelectedDate(date);
    router.replace(`/cronograma?view=week&anchor=${range.start}&day=${date}`, { scroll: false });
  }

  return (
    <div className="space-y-5" data-cronograma-week="true">
      {agenda.status !== "complete" ? (
        <Alert variant="warning">A semana está parcial; fontes indisponíveis não foram convertidas em zero.</Alert>
      ) : null}

      <header className="flex items-center justify-between gap-3 border-y border-edge py-2">
        <Link
          href={`/cronograma?view=week&anchor=${shiftISO(range.start, -7)}&day=${shiftISO(selectedDate, -7)}`}
          aria-label="Semana anterior"
          className="flex h-11 w-11 items-center justify-center text-muted transition-colors hover:bg-surfaceMuted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
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
          href={`/cronograma?view=week&anchor=${shiftISO(range.start, 7)}&day=${shiftISO(selectedDate, 7)}`}
          aria-label="Próxima semana"
          className="flex h-11 w-11 items-center justify-center text-muted transition-colors hover:bg-surfaceMuted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </Link>
      </header>

      <div className="-mt-1">
        <CronogramaStreakCard
          streak={streakQuery.data ?? null}
          loading={streakQuery.isPending && tokenResolved}
        />
      </div>

      {!isCurrentWeek ? (
        <div className="text-center">
          <Link href={`/cronograma?view=week&anchor=${today}&day=${today}`} className="text-sm font-medium text-primary hover:underline">
            Voltar para esta semana
          </Link>
        </div>
      ) : null}

      <section aria-label="Dias da semana" data-week-strip="true">
        {/* Colunas presas ao numero REAL de dias, nao fixas em 7: o `bg-edge`
            do container e a cor do vao de 1px entre celulas, e com `grid-cols-7`
            uma agenda mais curta deixava as colunas restantes pintadas de
            chumbo — um paredao escuro que le como area quebrada. */}
        <ol className="grid auto-cols-fr grid-flow-col overflow-hidden rounded-surface border border-edge bg-edge">
          {agenda.days.map((day) => {
            const current = day.date === today;
            const selected = day.date === selectedDay?.date;
            const items = uniqueAgendaItems(day.items);
            const activityCount = items.length;
            const hasOverflow = activityCount > 5;
            const visibleItems = hasOverflow ? items.slice(0, 4) : items.slice(0, 5);
            return (
              <li key={day.date} className="min-w-0 border-r border-edge bg-paper last:border-r-0">
                <button
                  type="button"
                  onClick={() => selectDay(day.date)}
                  aria-label={`${formatWeekday(day.date)} ${formatShortDate(day.date)}${current ? ", hoje" : ""}, ${activityCount} atividade${activityCount === 1 ? "" : "s"}`}
                  aria-pressed={selected}
                  data-week-day={day.date}
                  data-activity-count={activityCount}
                  data-current-day={current ? "true" : undefined}
                  data-selected-day={selected ? "true" : undefined}
                  className="flex min-h-[5.5rem] w-full min-w-0 flex-col items-center justify-start gap-1 px-0.5 py-2 text-center transition-colors hover:bg-surfaceMuted focus-visible:relative focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  style={
                    selected
                      ? { backgroundColor: "var(--wash-selecao)", boxShadow: "inset 0 0 0 2px var(--color-primary)" }
                      : current
                        ? { boxShadow: "inset 0 0 0 2px var(--color-ink)" }
                        : undefined
                  }
                >
                  <span className="paper-eyebrow">
                    {shortWeekday(day.date)}
                  </span>
                  <span className={`flex h-6 w-6 items-center justify-center text-xs ${current ? "bg-ink text-paper" : "text-ink"}`}>
                    {dayNumber(day.date)}
                  </span>
                  <span className="flex min-h-2 items-center justify-center gap-0.5" aria-hidden="true">
                    {visibleItems.map((item) => {
                      const dot = itemDotArea(item);
                      return (
                        <span
                          key={item.occurrence_id}
                          data-week-day-dot="true"
                          data-area={dot.area}
                          className={`h-1.5 w-1.5 ${dot.className}`}
                        />
                      );
                    })}
                    {hasOverflow ? (
                      <span data-week-day-overflow="true" className="text-micro leading-none text-muted">...</span>
                    ) : null}
                  </span>
                  <span className="min-h-3 truncate text-micro text-muted sm:text-micro">
                    {activityCount === 0 ? "livre" : hasOverflow ? `${activityCount} ativ.` : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      {selectedDay ? (
        <section
          aria-labelledby="selected-day-title"
          data-week-detail="true"
          data-detail-date={selectedDay.date}
          className="rounded-surface border border-edge bg-paper px-3 py-4 sm:px-4"
        >
          {/* ⚠️ EMPILHA ABAIXO DE `sm`, e a ação passa a largura total.

              Era `flex-wrap justify-between` nas duas larguras: a 390px o
              `Organizar dia` ficava encostado à DIREITA, a +106px do centro
              da tela — medido. O operador pediu ação centrada no telemóvel, e
              num cabeçalho de cartão a forma de o fazer é deixar o título e a
              ação em linhas próprias, não espremê-los na mesma. */}
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 id="selected-day-title" className="font-serif font-semibold text-ink">
                  {formatWeekday(selectedDay.date)}
                </h2>
                {selectedDay.is_today ? (
                  <span className="paper-eyebrow border border-primary bg-primary/5 px-2 py-0.5 text-primary">
                    Hoje
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-xs text-muted">{formatShortDate(selectedDay.date)} · detalhes do dia</p>
            </div>
            {/* A receita do primitivo, e não seis classes à mão: isto era
                `min-h-9` (36px, abaixo do piso de 44px) com um `hover` só
                dele. `<Link>` não é `<button>`, então recebe as classes. */}
            <Link
              href={`/cronograma/mes?anchor=${selectedDay.date}&day=${selectedDay.date}`}
              className={classesDeBotao({
                variant: "secondary",
                size: "md",
                bloco: true,
              })}
            >
              <CalendarPlus2 className="h-4 w-4" aria-hidden="true" />
              Organizar dia
            </Link>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-surface border border-edge bg-edge sm:grid-cols-4">
            {[
              ["Atividades", `${selectedDay.completed_items}/${selectedDay.total_items}`],
              ["Tempo", selectedDay.planned_minutes > 0 ? `${selectedDay.planned_minutes} min` : "—"],
              ["Questões", selectedDay.planned_questions > 0 ? String(selectedDay.planned_questions) : "—"],
              // `== null` e nao `=== null`: o contrato declara `number | null`,
              // mas o campo chega AUSENTE quando a projecao do dia nao calcula
              // recomendacao — e `String(undefined)` pintava o texto "undefined"
              // na tela, ao lado de vizinhos que mostravam "—" corretamente.
              ["Recomendação", selectedDay.recommended_questions == null ? "—" : String(selectedDay.recommended_questions)],
            ].map(([label, value]) => (
              <div key={label} className="bg-paper px-3 py-2.5">
                <dt className="paper-eyebrow">{label}</dt>
                <dd className="mt-0.5 text-sm font-medium tabular-nums text-ink">{value}</dd>
              </div>
            ))}
          </dl>

          {selectedDay.overloaded ? (
            <p className="mt-3 text-xs text-warning">Carga acima da capacidade recomendada.</p>
          ) : null}
          {selectedItems.length > 0 ? (
            <ul className="mt-3 divide-y divide-edge border-t border-edge">
              {selectedItems.map((item) => <AgendaItemRow key={item.occurrence_id} item={item} />)}
            </ul>
          ) : (
            <div className="mt-4 bg-surfaceMuted px-3 py-4 text-sm text-muted">
              <p>Dia livre. Nenhuma atividade planejada.</p>
              <Link href={`/cronograma/mes?anchor=${selectedDay.date}&day=${selectedDay.date}`} className="mt-2 inline-block font-medium text-primary hover:underline">
                Adicionar atividade
              </Link>
            </div>
          )}
        </section>
      ) : null}

      {agenda.overdue.length > 0 ? (
        <section aria-labelledby="week-overdue-title" className="border-y border-warning/50 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 id="week-overdue-title" className="font-serif font-semibold text-ink">Atrasadas</h2>
              <p className="text-xs text-muted">Aparecem somente aqui para não duplicar o dia original.</p>
            </div>
            <Link href="/cronograma/mes" className="text-xs text-primary hover:underline">Reorganizar</Link>
          </div>
          <ul className="mt-2 divide-y divide-edge">
            {uniqueAgendaItems(agenda.overdue).map((item) => <AgendaItemRow key={item.occurrence_id} item={item} />)}
          </ul>
        </section>
      ) : null}

      {weeklyGoal > 0 ? (
        <WeeklyGoalControl
          token={token}
          weeklyGoal={weeklyGoal}
          completedQuestions={questionsDone}
          progressPct={progressPct}
          remainingQuestions={remainingQuestions}
          onSaved={() => {
            invalidateStudentExperienceCache();
            void agendaQuery.refetch();
          }}
        />
      ) : null}

      <section aria-labelledby="week-settings-title" data-week-context="true" className="rounded-surface border border-edge bg-surface px-3 py-3 sm:px-4">
        {/* Mesma correção do cabeçalho acima: a 390px este `Abrir minha
            semana` ficava a −87px do centro, encostado à esquerda. */}
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            {/* ⚠️ SEM CLASSE DE TAMANHO AQUI, de propósito (conserto vindo da
                `main`). `.paper-page h2` vence o `text-sm` por especificidade e
                renderiza isto a 22px — mas `font-medium` é utilitário e VENCE o
                peso do CSS. O resultado era 22/500, um degrau que o desenho não
                tem (ele tem 22/600). Deixar o peso ao CSS devolve o par certo.

                A PALAVRA, essa, é "Minha semana" — o mesmo rótulo que a
                `navConfig` dá a esta seção. O conserto de CSS e a troca de copy
                vinham no mesmo hunk e são coisas separadas: o conserto entra, a
                troca não, senão o título da página divergiria do menu que leva
                até ela. */}
            <h2 id="week-settings-title" className="font-semibold text-ink">Minha semana</h2>
            <p className="mt-0.5 text-xs text-muted">Ajuste meta, dias disponíveis, capacidade e lembretes.</p>
          </div>
          {/* `outline` porque a ação é secundária mas convida — era
              `border-primary` com texto primary e inversão no hover, que é
              exatamente o que a variante já faz. */}
          <Link
            href="/preferencias"
            className={classesDeBotao({
              variant: "outline",
              size: "md",
              bloco: true,
            })}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Abrir minha semana
          </Link>
        </div>
      </section>
    </div>
  );
}
