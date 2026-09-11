"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { Skeleton } from "@/components/Skeleton";
import { AlvoEContagem } from "@/components/AlvoEContagem";
import {
  alvoDaProvaAlvo,
  alvoDoObjetivoV2,
  objetivoPrincipal,
  provaAlvoPrincipal,
} from "@/components/alvoDaTela";
import {
  getMyObjectivesV2,
  getMyTargetExam,
  getOperationalStreak,
  getQuestionBankLongitudinalDiagnosis,
  getQuestionBankPerformance,
  getStudentToday,
} from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { useAuthToken } from "@/lib/useAuthToken";
import { firstName, useProfileDisplayName } from "@/lib/ProfileContext";
import { useRecordRecommendationShown } from "@/lib/trainer/useRecordRecommendationShown";
import { ContinuarDeOndeParou } from "@/app/hoje/_components/ContinuarDeOndeParou";
import { TodayPrimaryAction } from "@/app/hoje/_components/TodayPrimaryAction";
import { ordenarBlocos, type BlocoDoInicio } from "../_lib/ordem";
import { BlocoEvolucao } from "./BlocoEvolucao";
import { BlocoQuentes } from "./BlocoQuentes";
import { BlocoSequencia } from "./BlocoSequencia";

/**
 * O INÍCIO — o resumo do que importa agora.
 *
 * ## O que esta tela é, e o que a separa do `/hoje`
 *
 * O operador pediu a jornada do app de xadrez: *"a home é um resumo de tudo e
 * do que é mais importante [...] com resumo dos hot topics, da evolução, das
 * atividades do dia, sequência (streak)"*, e que a ordem pudesse mudar *"tanto
 * em hierarquia, quanto até decidir se deve aparecer ou não"*.
 *
 * ⚠️ **`/hoje` continua a existir, e não é isto.** Ele é a agenda do dia
 * inteira — o dimensionamento, as ações de reserva, a faixa da prova, o "por
 * que isto". O Início mostra a PRÓXIMA AÇÃO como um bloco entre outros. Duas
 * telas, não duas vistas: quem quer o dia todo abre o dia.
 *
 * ## Quem decide a ordem
 *
 * `_lib/ordem.ts`, que é uma função pura e tem provas. O operador escolheu "o
 * sistema decide sozinho" — não há tela de configuração, e é justamente por
 * isso que a regra não pode viver espalhada por condicionais dentro deste JSX:
 * numa tela que o aluno não consegue corrigir, a regra precisa de estar num
 * sítio que reprova quando alguém a muda sem querer.
 *
 * Este ficheiro só sabe DESENHAR o que a ordem mandou.
 *
 * ## Consultas que falham não derrubam a tela
 *
 * ⚠️ Cada bloco tem a sua consulta, e todas são opcionais por construção: sem
 * dado, o bloco não entra na ordem. Uma home que mostra erro porque o
 * diagnóstico longitudinal caiu seria a tela mais frágil do produto — e ela é a
 * primeira que o aluno abre.
 */
export function InicioDashboard() {
  const { token, tokenResolved } = useAuthToken();
  const nome = firstName(useProfileDisplayName());
  const ativo = { enabled: tokenResolved, staleTime: 60_000, retry: false };

  const hoje = useQuery({
    queryKey: queryKeys.studentToday,
    queryFn: () => getStudentToday(token),
    enabled: tokenResolved,
    staleTime: 10_000,
  });
  const sequencia = useQuery({
    queryKey: ["operational", "streak"],
    queryFn: () => getOperationalStreak(token),
    ...ativo,
  });
  const diagnostico = useQuery({
    queryKey: ["question-bank", "longitudinal"],
    queryFn: () => getQuestionBankLongitudinalDiagnosis(token),
    ...ativo,
  });
  const desempenho = useQuery({
    queryKey: queryKeys.questionBankPerformance,
    queryFn: () => getQuestionBankPerformance(token),
    ...ativo,
  });
  const objetivos = useQuery({
    queryKey: queryKeys.studentObjectives,
    queryFn: () => getMyObjectivesV2(token),
    enabled: tokenResolved,
    staleTime: 300_000,
    // 404 enquanto `ENABLE_STUDENT_OBJECTIVES_V2` estiver desligada, e ela está
    // desligada em produção. A prova-alvo abaixo responde.
    retry: false,
  });
  const provaAlvo = useQuery({
    queryKey: queryKeys.studentTargetExam,
    queryFn: () => getMyTargetExam(token),
    enabled: tokenResolved,
    staleTime: 300_000,
  });

  /**
   * 🚨 O `shown` DO TREINADOR TEM DE SAIR DAQUI TAMBÉM, e não só do `/hoje`.
   *
   * A regra antiga era "exclusivo do `/hoje`", pela contagem repetida. Ela
   * envelheceu: o `event_id` é determinístico (`shown:<recommendation_id>`) e a
   * idempotência é do servidor — duas rotas com a mesma recomendação produzem o
   * mesmo evento, e o servidor guarda um.
   *
   * O que mudou é qual tela o aluno abre. Com o Início como home, a maioria vê
   * a recomendação AQUI e pode nunca abrir o `/hoje`: manter a emissão só lá
   * faria `acceptance_rate = started / shown` voltar a dividir por quase zero.
   *
   * ⚠️ E esse instrumento JÁ MORREU UMA VEZ exatamente assim — num commit de
   * "convergencia visual", sem nenhum teste vermelho, com o último `shown` em
   * produção datado de 2026-08-02. Ele não pode morrer de novo por uma
   * mudança de navegação.
   */
  useRecordRecommendationShown(
    hoje.data?.primary_action?.execution?.recommendation_id ?? null,
    "/inicio",
  );

  // A MESMA precedência do Hoje, do Plano e do hub: o v2 primeiro, porque só
  // ele carrega data de EDITAL e pode dizer "63 dias" sem a ressalva.
  const alvo =
    alvoDoObjetivoV2(objetivoPrincipal(objetivos.data?.items)) ??
    alvoDaProvaAlvo(provaAlvoPrincipal(provaAlvo.data?.items));

  if (!tokenResolved || hoje.isPending) {
    return (
      <div className="ritmo-secao" aria-label="Início carregando">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const sessaoAberta = hoje.data?.details?.active_session ?? null;
  const acaoDoDia = hoje.data?.primary_action ?? null;
  const streak = sequencia.data ?? null;
  const diag = diagnostico.data ?? null;
  const perf = desempenho.data ?? null;

  const ordem = ordenarBlocos({
    sessaoAberta: Boolean(sessaoAberta?.href),
    temAcaoDoDia: Boolean(acaoDoDia),
    sequenciaDias: streak?.streak_days ?? 0,
    sequenciaEmRisco: streak?.streak_at_risk ?? false,
    diaProtegido: streak?.active_protection ?? false,
    assuntosQuentes: diag?.recommended_blocks?.length ?? 0,
    questoesRespondidas: perf?.unique_questions ?? 0,
  });

  function desenhar(bloco: BlocoDoInicio) {
    switch (bloco) {
      case "continuar":
        return sessaoAberta ? <ContinuarDeOndeParou sessao={sessaoAberta} /> : null;
      case "sequencia":
        return streak ? <BlocoSequencia streak={streak} /> : null;
      case "acaoDoDia":
        // `cede` quando há sessão aberta: duas teals cheias empilhadas era o
        // defeito que este parâmetro existe para impedir, e a regra vale aqui
        // igual — um preenchimento por tela.
        return acaoDoDia ? (
          <TodayPrimaryAction action={acaoDoDia} cede={Boolean(sessaoAberta?.href)} />
        ) : null;
      case "quentes":
        return diag ? <BlocoQuentes diagnostico={diag} /> : null;
      case "evolucao":
        return perf ? <BlocoEvolucao desempenho={perf} /> : null;
      default:
        return null;
    }
  }

  return (
    <div className="ritmo-secao">
      <header>
        <h1 className="font-serif text-titulo font-semibold text-ink">
          {nome ? `Olá, ${nome}` : "Início"}
        </h1>
        <AlvoEContagem alvo={alvo} className="mt-1" />
      </header>

      {ordem.length === 0 ? (
        // ⚠️ O VAZIO É UMA PORTA, e não um aviso. Aluno novo não tem sequência,
        // nem diagnóstico, nem base para medir — e uma home que lhe diz três
        // vezes "ainda não dá para dizer nada" é pior que uma home vazia.
        <section className="rounded-surface border border-edge bg-surface p-5">
          <p className="text-sm leading-6 text-ink">
            Ainda não há o que resumir. Responda um bloco de questões e esta tela
            começa a dizer onde você está.
          </p>
          <Link
            href="/banco"
            className="paper-control mt-3 inline-flex min-h-11 items-center rounded-control border border-primary bg-washSelecao px-4 text-sm text-ink hover:border-primary"
          >
            Começar pelo banco
          </Link>
        </section>
      ) : (
        ordem.map((bloco) => <div key={bloco}>{desenhar(bloco)}</div>)
      )}
    </div>
  );
}
