"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Calendar as CalendarDays } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Skeleton } from "@/components/Skeleton";
import { useNavbar } from "@/lib/NavbarContext";
import { useDesktopNavigationMode } from "@/lib/useDesktopNavigationMode";
import { getMyObjectivesV2, getMyTargetExam, getStudentToday } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { useAuthToken } from "@/lib/useAuthToken";
import { useStudentAgenda } from "@/features/student-agenda/useStudentAgenda";
import { firstName, useProfileDisplayName } from "@/lib/ProfileContext";
import { AgendaItemRow } from "@/features/student-agenda/AgendaItemRow";
import { ContinuarDeOndeParou } from "./ContinuarDeOndeParou";
import { manchetteDoDia } from "../_lib/manchete";
import { uniqueAgendaItems } from "@/features/student-agenda/agendaSelectors";
// A pergunta de tempo e energia morreu com a aba Rota. O que ela produzia — o
// tamanho do dia — agora é INFERIDO e exibido como contexto da próxima ação, não
// como um formulário antes dela. `TodayDimensioning` é uma linha, e a conta por
// trás dela abre a um toque.
import { AlvoEContagem } from "@/components/AlvoEContagem";
import {
  alvoDaProvaAlvo,
  alvoDoObjetivoV2,
  objetivoPrincipal,
  provaAlvoPrincipal,
} from "@/components/alvoDaTela";
import { FaixaDaProva } from "./FaixaDaProva";
import { TodayBackupActions } from "./TodayBackupActions";
import { TodayDimensioning } from "./TodayDimensioning";
import { TodayEmptyState } from "./TodayEmptyState";
import { TodayPrimaryAction } from "./TodayPrimaryAction";

function greeting(name: string | null): string {
  const hour = new Date().getHours();
  const period = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  // Sem nome, o cumprimento fecha em exclamacao; com nome, em virgula. "Bom
  // dia!, Joseph" seria o resultado de concatenar sem olhar.
  return name ? `${period}, ${name}` : `${period}!`;
}

function pct(value: number | null): string {
  return value === null || Number.isNaN(value) ? "—" : `${Math.round(value)}%`;
}

function TodayDashboardSkeleton() {
  return (
    <div className="space-y-5" aria-label="Hoje carregando">
      <Skeleton className="h-9 w-44" />
      <Skeleton className="h-44 w-full " />
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
  const studentFirstName = firstName(useProfileDisplayName());
  const { setTitle, setActions } = useNavbar();
  const isDesktopNavigation = useDesktopNavigationMode();
  const { token, tokenResolved } = useAuthToken();
  const todayQuery = useQuery({
    queryKey: queryKeys.studentToday,
    queryFn: () => getStudentToday(token),
    enabled: tokenResolved,
    staleTime: 10_000,
  });
  const today = todayQuery.data;
  // A prova-alvo do topo (artboard 8b). `staleTime` longo de propósito: um
  // objetivo muda quando o aluno o troca, não durante a sessão de estudo — e
  // esta consulta não pode competir com a do dia, que é a que segura a tela.
  const objetivosQuery = useQuery({
    queryKey: queryKeys.studentObjectives,
    queryFn: () => getMyObjectivesV2(token),
    enabled: tokenResolved,
    staleTime: 300_000,
    // A rota é 404 enquanto `ENABLE_STUDENT_OBJECTIVES_V2` estiver desligada, e
    // ela está desligada em produção. Repetir uma indisponibilidade DE CONFIGURAÇÃO
    // três vezes por visita só gasta rede: a linha tem outra fonte logo abaixo.
    retry: false,
  });
  // ⚠️ DUAS FONTES, e a segunda é a que existe hoje. A declaração por banca
  // (`student-target-exam-v1`) é o caminho ligado por padrão — é o que o
  // `TargetExamSelector` grava e o que `/mapa` e a `FaixaDaProva` já leem. Sem
  // ela aqui, a primeira linha do Hoje ficava vazia para todo aluno, porque o
  // contrato v2 depende de edital publicado E de uma flag que ninguém ligou.
  //
  // Mesma `queryKey` da `FaixaDaProva`, então as duas dividem uma requisição só.
  const provaAlvoQuery = useQuery({
    queryKey: queryKeys.studentTargetExam,
    queryFn: () => getMyTargetExam(token),
    enabled: tokenResolved,
    staleTime: 300_000,
  });
  // O v2 tem precedência quando resolve: só ele carrega data de EDITAL, e é a
  // única origem que pode dizer "63 dias" sem a ressalva de estimativa.
  const alvo =
    alvoDoObjetivoV2(objetivoPrincipal(objetivosQuery.data?.items)) ??
    alvoDaProvaAlvo(provaAlvoPrincipal(provaAlvoQuery.data?.items));
  // The compatibility field still owns the learner-local date until the Today
  // contract itself gains a timezone-aware date. Its item list is never read.
  const localDate = today?.schedule_preview.date ?? "";
  const agendaQuery = useStudentAgenda(localDate, localDate);
  const agenda = agendaQuery.data;
  // `agenda?.days[0]` protegia so o `agenda`: uma resposta sem `days` estourava
  // "Cannot read properties of undefined (reading '0')" e derrubava a tela
  // inicial inteira para o error boundary.
  const day = agenda?.days?.[0] ?? null;

  useEffect(() => {
    setTitle("Hoje");
    setActions(
      isDesktopNavigation && localDate ? (
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
  }, [isDesktopNavigation, localDate, setActions, setTitle]);

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
  /**
   * A manchete do `8b`: "Hoje sao 24 questoes, cerca de 35 minutos".
   *
   * Os dois numeros sao os que a tela ja tinha e nao mostrava juntos: as
   * questoes somam o `expected_questions` da acao principal com o dos blocos
   * restantes, e os minutos vem de `today_load.estimated_minutes`.
   *
   * ⚠️ "cerca de" nao e enfeite. `estimated_minutes` e estimativa, e o proprio
   * `TodayDimensioning` existe para abrir a conta por tras dela — anunciar "35
   * minutos" seco seria decreto com cara de dado.
   *
   * ⚠️ E a frase DEGRADA em vez de mentir. Sem questoes contadas ela fala so de
   * tempo; sem tempo, so de questoes; sem os dois, some e a tela abre na acao
   * principal, que e o que ela tem a dizer. Numero inventado para completar a
   * frase seria pior que frase curta.
   */
  // ⚠️ Sobre a lista COMPLETA, e nao `uniqueRemaining`. Aquela exclui a acao
  // principal de proposito (ela ja tem lugar proprio na tela), e somar so o
  // resto daria um dia menor do que ele e — justamente na frase que diz o
  // tamanho do dia. `StudentTodayAction` nao expoe `expected_questions`, mas o
  // bloco dela esta na agenda: e de la que o numero sai.
  const questoesDoDia = uniqueAgendaItems(
    [...(agenda?.overdue ?? []), ...(day?.items ?? [])],
    null,
  ).reduce((soma, item) => soma + (item.expected_questions ?? 0), 0);
  const minutosDoDia = today.today_load.estimated_minutes ?? 0;

  /**
   * O DIA COMECADO, do artboard `13e`.
   *
   * O `8b` desenha o dia intocado e era o unico estado que esta tela tinha. O
   * `13e` desenha o outro — e e' o que o plantonista mais encontra, porque ele
   * abre o app varias vezes no mesmo dia.
   *
   * A manchete inverte: conta o que FALTA, nao o que ja' foi feito. "Faltam 16
   * das 24" e' a frase que decide se da' tempo agora; "voce fez 8" e' consolo,
   * e vai para a linha de apoio.
   */
  const respondidasHoje = uniqueAgendaItems(
    [...(agenda?.overdue ?? []), ...(day?.items ?? [])],
    null,
  ).reduce((soma, item) => soma + (item.completed_questions ?? 0), 0);
  const sessaoAberta = today.details.active_session ?? null;
  const diaComecado = respondidasHoje > 0 || sessaoAberta !== null;

  const tamanhoDoDia = manchetteDoDia({
    questoesDoDia,
    respondidasHoje,
    minutosDoDia,
    temSessaoAberta: sessaoAberta !== null,
  });

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
      {/* A PRIMEIRA LINHA E A PROVA E O PRAZO, e a manchete e o TAMANHO DO DIA.

          O cumprimento ("Bom dia, Joseph") saiu a pedido do usuario em
          2026-08-30. O argumento que estava aqui — "o artboard nao desenha
          nenhuma tela com nome de aluno, entao ele nao representa o caso" —
          nao se sustentou: nenhum dos 22 artboards tem cumprimento, e o `8b`
          usa a linha mais valiosa da tela para dizer o tamanho do dia.

          Um cumprimento nao ajuda a decidir nada. "Hoje sao 24 questoes, cerca
          de 35 minutos" e a unica frase que responde a pergunta com que o aluno
          abre o app. */}
      <header>
        <AlvoEContagem alvo={alvo} />
        {/* A faixa do `8b`: a cara da prova, em sigla, todo dia. Ela se cala
            sozinha quando nao ha prova declarada ou facies publicada — ver o
            componente. */}
        <FaixaDaProva />
        {/* Sem classe de tamanho: a escala vive em `.tela-app h1`, com font-size
            e line-height no mesmo bloco. Era `text-3xl md:text-4xl` (30 e 36px)
            contra os 25px medidos no artboard `8b`. */}
        <h1 className="mt-2 font-serif font-semibold text-ink">{tamanhoDoDia}</h1>
        {/* A linha de apoio do `13e`: o que ja' foi feito hoje. Ela so' existe
            com o dia comecado — no dia intocado nao ha' o que contar, e uma
            linha "Você fez 0 hoje" seria cobranca disfarcada de informacao. */}
        {diaComecado && respondidasHoje > 0 ? (
          <p className="mt-1 text-nota text-muted">
            Você fez {respondidasHoje}{" "}
            {respondidasHoje === 1 ? "questão" : "questões"} hoje.
          </p>
        ) : null}
      </header>

      {partial ? (
        <Alert variant="warning">
          {agendaQuery.isError
            ? "A agenda do dia não foi carregada. A ação principal continua disponível, mas a lista restante pode estar incompleta."
            : "Alguns dados estão temporariamente incompletos. As ações exibidas continuam identificadas pela fonte disponível."}
        </Alert>
      ) : null}

      {/* Retomar vem ANTES de propor comecar: o produto nao deve abrir frente
          nova enquanto ha' uma aberta. A proxima acao continua logo abaixo,
          porque a sessao pendente pode ser justamente a que o aluno largou. */}
      {sessaoAberta ? <ContinuarDeOndeParou sessao={sessaoAberta} /> : null}

      {isRest ? <TodayEmptyState /> : <TodayPrimaryAction action={today.primary_action} />}

      {/* Depois da ação, não antes: o dimensionamento explica o TAMANHO do que
          foi proposto, e explicação que precede a proposta vira formulário. */}
      <TodayDimensioning />

      {/* ⚠️ A FAIXA "DIA · SEMANA · CARGA" SAIU.
          Ela nao existe no artboard `8b`, e o que ela media ja aparece: o
          tamanho do dia esta na manchete, o que falta na linha de apoio, e o
          dimensionamento logo acima. Tres numeros a mais competindo com a UNICA
          decisao desta tela -- o que fazer agora -- e ela tinha ate uma celula
          com fundo proprio para declarar qual dos tres importava, o que e a
          confissao de que os outros dois nao importavam. */}

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
            className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-primary hover:underline"
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

      {/* As alternativas ficam; a GAVETA saiu.
          O `8b` poe "Só tenho 10 minutos hoje" a um toque, na propria tela --
          e ela e a saida de quem tem pouco tempo, exatamente quem nao vai abrir
          um acordeao chamado "Alternativas e métricas" para procura-la. As duas
          metricas que moravam ali (precisao observada, revisoes estimadas) sao
          leitura de consulta e vivem na Evolucao. */}
      <TodayBackupActions actions={backupActions} />
    </div>
  );
}
