"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { Alert } from "@/components/ui/Alert";
import { Skeleton } from "@/components/Skeleton";
// ⚠️ O componente deixou de receber o objetivo cru.
//
// Producao trocou a prop `objetivo` por `alvo: AlvoDaTela`, um valor JA'
// resolvido -- porque a contagem de dias depende de qual origem respondeu: so
// o objetivo v2 carrega data de EDITAL e pode dizer "63 dias" sem a ressalva
// de estimativa. A precedencia mora nos construtores, e nao em cada tela.
import { AlvoEContagem } from "@/components/AlvoEContagem";
import {
  alvoDaProvaAlvo,
  alvoDoObjetivoV2,
  objetivoPrincipal,
  provaAlvoPrincipal,
} from "@/components/alvoDaTela";
import {
  getCurrentPlan,
  getMyObjectivesV2,
  getMyTargetExam,
  getOnboarding,
} from "@/lib/api/domains/study-plan";
import { listEvents } from "@/lib/api/domains/calendar";
import { getStudentToday } from "@/lib/api/domains/student-experience";
import { queryKeys } from "@/lib/queryKeys";
import { useAuthToken } from "@/lib/useAuthToken";
import { horasPorExtenso, minutosPorExtenso, resumoDaSemana, semanaPadrao } from "@/lib/rotina";
import { fasesDoPlano, naoCoube } from "./_lib/fases";

/**
 * "O plano até a prova" — artboard `9c`, a segunda aba da Rotina.
 *
 * ## Ela não é o calendário
 *
 * `/cronograma` continua existindo e continua sendo onde se arrasta atividade
 * entre dias. Esta tela responde outra pergunta, e é a que o aluno faz mais
 * vezes: *o que vem pela frente, e cabe na minha semana?*
 *
 * ## O plano é consequência da rotina, e diz isso
 *
 * O cartão do topo mostra quanto a rotina declarada comporta e leva de volta a
 * "Minha semana". É a única relação de causa que o produto tem entre duas telas,
 * e escondê-la faria o plano parecer decreto.
 *
 * ⚠️ **A copy do desenho ("Refeito toda segunda") é falsa para este código.** O
 * plano regenera quando a rotina muda (`_regenerate_existing_plan`) e a cada
 * Hoje aberto com `STUDY_PLAN_TODAY_MODE=plan` (`trainer_policy_service`).
 * Prometer segunda-feira seria descrever um agendador que não existe.
 */

function hojeISO(): string {
  const agora = new Date();
  const local = new Date(agora.getTime() - agora.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function PlanoClientPage() {
  const { token, tokenResolved } = useAuthToken();
  const hoje = useMemo(() => hojeISO(), []);

  const plano = useQuery({
    queryKey: queryKeys.studyPlanCurrent,
    queryFn: () => getCurrentPlan(token),
    enabled: tokenResolved,
    staleTime: 60_000,
  });

  const objetivos = useQuery({
    queryKey: queryKeys.studentObjectives,
    queryFn: () => getMyObjectivesV2(token),
    enabled: tokenResolved,
    staleTime: 300_000,
  });

  // O fallback da contagem: quando o objetivo v2 nao resolve, a prova-alvo
  // responde -- com a ressalva de estimativa que `alvoDaProvaAlvo` embute.
  const provaAlvo = useQuery({
    queryKey: queryKeys.studentTargetExam,
    queryFn: () => getMyTargetExam(token),
    enabled: tokenResolved,
    staleTime: 300_000,
  });

  // As tres consultas do CARTAO DA ROTINA. Todas com `.catch` para `null`: o
  // cartao e' contexto, e um plano que some porque a rotina nao carregou seria
  // perder o principal por causa do acessorio.
  const rotina = useQuery({
    queryKey: queryKeys.rotinaDoPlano,
    queryFn: async () => {
      const [onboarding, eventos, hojeDoAluno] = await Promise.all([
        getOnboarding(token).catch(() => null),
        listEvents(token).catch(() => []),
        getStudentToday(token).catch(() => null),
      ]);
      return { onboarding, eventos, hojeDoAluno };
    },
    enabled: tokenResolved,
    staleTime: 60_000,
  });

  if (plano.isPending) {
    return <Skeleton className="h-64 w-full" aria-label="Plano carregando" />;
  }

  if (plano.isError || !plano.data) {
    return (
      <div className="space-y-4">
        <Alert variant="warning">
          Seu plano ainda não existe. Ele nasce da sua semana: diga quanto dá para estudar
          em cada tipo de dia e o resto vem daí.
        </Alert>
        <Link
          href="/preferencias"
          className="inline-flex min-h-11 items-center rounded-control border border-primary bg-primary px-4 text-sm font-medium text-primaryInk"
        >
          Abrir Minha semana
        </Link>
      </div>
    );
  }

  // A MESMA precedencia do Hoje: v2 primeiro, prova-alvo como fallback. Duas
  // telas que contam dias de forma diferente e' como a contagem regressiva
  // passa a discordar de si mesma.
  const alvoDaTela =
    alvoDoObjetivoV2(objetivoPrincipal(objetivos.data?.items)) ??
    alvoDaProvaAlvo(provaAlvoPrincipal(provaAlvo.data?.items));

  const atividades = plano.data.activities ?? [];
  const fases = fasesDoPlano(atividades, hoje, plano.data.horizon_end);
  const sobraram = naoCoube(atividades);

  const eventos = rotina.data?.eventos ?? [];
  const disponibilidade = rotina.data?.onboarding?.study_availability ?? null;
  const orcamento = rotina.data?.hojeDoAluno?.effort_budget ?? null;
  const minutosPorQuestao = orcamento?.minutes_per_question ?? 2;
  const ritmoEhDoAluno = orcamento?.pace_source === "observed";
  const semana = resumoDaSemana(semanaPadrao(eventos, disponibilidade, hoje), minutosPorQuestao);
  const linhas = semanaPadrao(eventos, disponibilidade, hoje);
  const plantao = linhas.find((linha) => linha.tipo === "plantao");
  const livre = linhas.find((linha) => linha.tipo === "livre");

  return (
    <div className="space-y-6">
      <header>
        <AlvoEContagem alvo={alvoDaTela} />
        <h1 className="mt-2 font-serif font-semibold text-ink">O plano até a prova</h1>
        <p className="mt-1 text-nota text-muted">
          Refeito quando a sua rotina muda, e a cada dia que você abre o app.
        </p>
      </header>

      {/* O cartao da rotina: a causa, com o caminho de volta para ela. */}
      <section className="rounded-surface border border-edge bg-surface p-4 sm:p-5">
        <p className="paper-eyebrow">a sua rotina</p>
        {semana.vazia ? (
          <p className="mt-2 text-sm leading-6 text-ink">
            Você ainda não disse quanto dá para estudar em cada dia — e é disso que este
            plano tira o tamanho de cada bloco.
          </p>
        ) : (
          <p className="mt-2 text-sm leading-6 text-ink">
            Este plano usa a sua rotina:{" "}
            <strong className="font-medium">{horasPorExtenso(semana.minutosTotais)}</strong> por
            semana, cerca de {semana.questoes} questões
            {ritmoEhDoAluno ? " no seu ritmo" : `, supondo ${minutosPorQuestao} min por questão`}.
            {plantao ? ` ${minutosPorExtenso(plantao.minutos)} em dia de plantão` : ""}
            {plantao && livre ? `, ${minutosPorExtenso(livre.minutos)} nos livres.` : plantao ? "." : ""}
          </p>
        )}
        <Link
          href="/preferencias"
          className="mt-3 inline-flex min-h-11 items-center text-sm text-marca underline underline-offset-4"
        >
          Mudar a minha semana
        </Link>
      </section>

      {/* ⚠️ O QUE NAO COUBE VEM ANTES DAS FASES.
          Plano que esconde o excedente promete um estudo que a semana do aluno
          nao comporta — a queixa exata que a Rotina existe para resolver. */}
      {sobraram.length > 0 ? (
        <Alert variant="warning">
          {sobraram.length === 1
            ? "Uma atividade não coube na sua rotina."
            : `${sobraram.length} atividades não couberam na sua rotina.`}{" "}
          Dá para ampliar um dia em Minha semana, ou deixar como está — elas voltam quando
          houver espaço.
        </Alert>
      ) : null}

      <section>
        <p className="paper-eyebrow">o caminho</p>
        {fases.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            Não há nada agendado no horizonte deste plano.
          </p>
        ) : (
          <ul className="mt-2 rounded-surface border border-edge bg-surface">
            {fases.map((fase) => (
              <li
                key={fase.chave}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-rule px-4 py-3 last:border-b-0"
              >
                <span className="text-sm font-medium text-ink">{fase.rotulo}</span>
                <span className="font-mono text-nota text-muted">
                  {fase.dias} {fase.dias === 1 ? "dia" : "dias"} · {fase.questoes} questões
                </span>
                <span className="w-full text-nota text-muted">{fase.resumo}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/hoje"
          className="inline-flex min-h-11 items-center rounded-control border border-primary bg-primary px-4 text-sm font-medium text-primaryInk"
        >
          Começar o dia de hoje
        </Link>
        <Link
          href="/cronograma"
          className="inline-flex min-h-11 items-center rounded-control border border-edge bg-surface px-4 text-sm text-ink"
        >
          Ver no calendário
        </Link>
      </div>
    </div>
  );
}
