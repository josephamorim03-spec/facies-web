"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Calendar as CalendarDays } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Skeleton } from "@/components/Skeleton";
import { useNavbar } from "@/lib/NavbarContext";
import { getMyObjectivesV2, getMyTargetExam, getStudentToday } from "@/lib/api";
import type { StudentTodayAction } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { useAuthToken } from "@/lib/useAuthToken";
import { useStudentAgenda } from "@/features/student-agenda/useStudentAgenda";
import { useRecordRecommendationShown } from "@/lib/trainer/useRecordRecommendationShown";
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
    <div className="ritmo-secao" aria-label="Hoje carregando">
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

  // O laço: registra que ESTA recomendação chegou à tela. Sem isto,
  // `acceptance_rate = started / shown` fica em `None` e o motor nunca descobre
  // se acertou. Fica ACIMA dos early returns porque hook não pode ser
  // condicional; o `null` cobre o intervalo em que `today` ainda não resolveu.
  useRecordRecommendationShown(today?.primary_action.execution?.recommendation_id ?? null, "/hoje");

  /**
   * ⚠️ O ÍCONE DE CALENDÁRIO SAIU DA BARRA DE TÍTULO.
   *
   * Ele levava à semana, e só existia no desktop. Desde que "Semana" virou
   * seção do Plano, ela está a um toque no topo do conteúdo, nas duas
   * larguras, com o nome escrito — um ícone mudo ao lado do título passou a
   * ser um segundo caminho para o mesmo lugar.
   */
  useEffect(() => {
    setTitle("Hoje");
    setActions(null);
    return () => {
      setTitle(null);
      setActions(null);
    };
  }, [setActions, setTitle]);

  if (todayQuery.isPending || (localDate && agendaQuery.isPending)) {
    return <TodayDashboardSkeleton />;
  }
  if (!today) {
    return (
      // ⚠️ O `error.tsx` DESTA ROTA NAO COBRE ESTE CAMINHO. Ele so dispara
      // quando o render lanca, e aqui nada lanca: a consulta falhou e devolveu
      // `undefined`. Entao a tela mais importante do produto dizia "tente
      // novamente" sem oferecer como.
      <Alert variant="danger" onRetry={() => void todayQuery.refetch()}>
        Não foi possível carregar seu dia.
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

  /**
   * ⚠️ SEM PLANO, A PRIMARIA LEVAVA PARA FORA DE RESPONDER.
   *
   * `student_experience` emite `kind: "plan_routine"` com
   * `cta_label: "Ajustar rotina"` e `href: "/rotina-e-metas"` (que e 308 para
   * `/preferencias`) quando ainda nao ha plano. Ou seja: na tela cujo trabalho
   * inteiro e "responda hoje", a acao mais destacada mandava preencher um
   * formulario -- e o aluno que abriu o app para estudar saia dele sem ter
   * respondido nada.
   *
   * A rotina nao some: ela desce para "Se nao couber agora", que e o lugar de
   * quem tem razao mas nao tem pressa. Responder sobe, porque responder e o
   * unico ato que move o objetivo.
   */
  const semPlano = today.primary_action.kind === "plan_routine";
  const responderAgora: StudentTodayAction = {
    kind: "question_bank_block",
    title: "Comece por onde quiser",
    rationale:
      "Seu plano ainda não existe, e ele nasce do que você responde. Um bloco curto agora já ensina ao Fácies por onde começar.",
    estimated_minutes: null,
    href: "/banco",
    cta_label: "Começar 10 questões",
    source: "question_bank",
    priority_reason: "Responder é o que faz o plano existir.",
    confidence: "medium",
    area: null,
    execution: null,
    agenda_occurrence_id: null,
  };
  const acaoPrimaria = semPlano ? responderAgora : today.primary_action;

  const backupActions = [
    // A rotina vira recurso, e entra na FRENTE: ela continua sendo a coisa
    // certa a fazer, so nao e a primeira.
    ...(semPlano ? [today.primary_action] : []),
    ...today.backup_actions,
  ].filter(
    (action) =>
      !action.agenda_occurrence_id ||
      action.agenda_occurrence_id !== primaryOccurrenceId,
  );
  const partial =
    today.status !== "complete" ||
    agendaQuery.isError ||
    (agenda && agenda.status !== "complete");

  return (
    <div className="ritmo-secao">
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
            contra os 25px medidos no artboard `8b`.

            ⚠️ O `?? "Hoje"` NAO e' enfeite: sem ele esta tag renderizava VAZIA.
            `manchetteDoDia` devolve `null` de proposito quando nao ha numero
            nenhum -- "degradar em vez de mentir", diz o docstring dela, e a
            regra esta certa. So que o JSX renderizava a tag na mesma, e um
            `<h1>` vazio e' pior que os dois: o leitor de tela anuncia um
            titulo sem conteudo, e o `mt-2` mais a entrelinha reservam a altura
            de uma linha que ninguem ve.

            "Hoje" e' o nome da tela: nunca e' falso, nunca inventa numero, e
            deixa a acao principal logo abaixo dizer o que ha' para fazer. */}
        <h1 className="mt-2 font-serif font-semibold text-ink">{tamanhoDoDia ?? "Hoje"}</h1>
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

      {isRest ? (
        <TodayEmptyState />
      ) : (
        <TodayPrimaryAction action={acaoPrimaria} cede={sessaoAberta !== null} />
      )}

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
            <h2 id="today-after-title" className="font-serif font-semibold text-ink">Depois</h2>
            <p className="mt-1 text-sm text-muted">
              {uniqueRemaining.length > 0
                ? `${uniqueRemaining.length} atividade${uniqueRemaining.length === 1 ? "" : "s"} restante${uniqueRemaining.length === 1 ? "" : "s"}.`
                : "Nenhuma outra atividade planejada para hoje."}
            </p>
          </div>
          {/* ⚠️ ESTE LINK DEIXOU DE APONTAR PARA A SEMANA, e a razão é que a
              semana passou a ser SEÇÃO: ela está no topo desta mesma tela, com
              o nome escrito. Repeti-la aqui seria o terceiro caminho para o
              mesmo lugar.

              Quem perdeu porta foi "O plano até a prova" — a leitura das fases,
              do que não coube e de quanto a rotina comporta. Ela era a terceira
              seção da aba e saiu da fileira quando esta virou Hoje · Semana ·
              Mês. É daqui que ela passa a ser alcançada, que é onde a pergunta
              "e depois de hoje?" acontece. */}
          <Link
            href="/plano"
            className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            O plano até a prova
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
