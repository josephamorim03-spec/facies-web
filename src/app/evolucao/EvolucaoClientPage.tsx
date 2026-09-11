"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { Alert } from "@/components/ui/Alert";
import { Skeleton } from "@/components/Skeleton";
import {
  getMyCompetencyMastery,
  getMyTargetExam,
  getQuestionBankPerformance,
  getStudentEvolution,
  getStudentToday,
  getWeeklyTimeline,
  listReviewTasks,
  type CompetencyMasteryItem,
} from "@/lib/api";
import { getFaciesDaBanca } from "@/lib/api/domains/study-plan";
import { provaAlvoPrincipal } from "@/components/alvoDaTela";
import { queryKeys } from "@/lib/queryKeys";
import { useAuthToken } from "@/lib/useAuthToken";
// ⚠️ O casamento entre "Clínica Médica" (rótulo da banca) e "CM" (código do
// desempenho) usa o resolvedor CANONICO, e nao um mapa proprio. Eu tinha escrito
// um: ele nao cobria "Ginecologia e Obstetricia" sem acento e a projecao caia no
// estado vazio sem dizer por que. Este resolvedor ja e' o que o mapa da prova
// usa, e normaliza acento, caixa e sinonimo.
import { resolveDisplayArea } from "@/lib/areaDisplay";
import { Cartao, Numero, SemBase } from "./_components/Cartao";
import { PortaDosGraficos } from "./_components/PortaDosGraficos";
import {
  acertoPorSemana,
  mosaicoDeDias,
  ondeMaisEscapa,
  projetarNota,
  ritmoPorExtenso,
} from "./_lib/leitura";

/**
 * Evolução — os sete cartões dos artboards `9b` (celular) e `12a` (desktop).
 *
 * ## Por que sete cartões e não um painel
 *
 * A tela anterior era um dashboard: quatro medidas de resumo e oito gráficos
 * (acerto no tempo, acerto por área, volume, comparativo, análise de cards).
 * Ela respondia perguntas que ninguém tinha feito, e não respondia as que o
 * médico faz — *estou melhorando? vou dar conta do tempo? o que eu vou
 * esquecer?*. Cada cartão aqui É uma dessas perguntas, na ordem do desenho.
 *
 * ## O que acumula, nunca zera
 *
 * Sem sequência que quebra, sem dia vermelho, sem "você perdeu o seu progresso".
 * Quem trabalha em escala vai falhar dias; um app que castiga isso é abandonado
 * na terceira semana.
 *
 * ## Nenhuma consulta derruba a tela
 *
 * Cada cartão lê a sua fonte e degrada sozinho. Um painel que some inteiro
 * porque uma agregação falhou é pior que seis cartões e um aviso.
 */


export function EvolucaoClientPage() {
  const { token, tokenResolved } = useAuthToken();
  const ativo = { enabled: tokenResolved, staleTime: 60_000 };

  const desempenho = useQuery({
    queryKey: queryKeys.questionBankPerformance,
    queryFn: () => getQuestionBankPerformance(token),
    ...ativo,
  });
  const semanas = useQuery({
    queryKey: ["studies", "weekly-timeline", 12],
    queryFn: () => getWeeklyTimeline(token, 12),
    ...ativo,
  });
  const proficiencia = useQuery({
    queryKey: queryKeys.competencyMastery,
    queryFn: () => getMyCompetencyMastery(token),
    ...ativo,
  });
  const alvo = useQuery({
    queryKey: queryKeys.studentTargetExam,
    queryFn: () => getMyTargetExam(token),
    ...ativo,
  });
  // ⚠️ `provaAlvoPrincipal`, e NAO `items[0]`.
  //
  // Esta linha lia a POSICAO do array; a regra do produto e' o campo
  // `priority`, e `alvoDaTela.ts` di-lo com todas as letras: "ordem de array e'
  // acidente de serializacao; prioridade e' o campo que carrega a decisao do
  // aluno". O `/mapa` ja ordenava por prioridade, entao as duas telas podiam
  // discordar sobre qual e' "a sua banca" — o aluno via a estimativa de nota de
  // uma prova e o mapa de outra, sem nada a explicar a diferenca.
  const chaveDaBanca = provaAlvoPrincipal(alvo.data?.items)?.institution_key ?? null;
  const banca = useQuery({
    queryKey: queryKeys.faciesDaBanca(chaveDaBanca ?? "sem-prova"),
    queryFn: () => getFaciesDaBanca(chaveDaBanca as string),
    enabled: tokenResolved && Boolean(chaveDaBanca),
    staleTime: 3_600_000,
  });
  const hoje = useQuery({
    queryKey: queryKeys.studentToday,
    queryFn: () => getStudentToday(token),
    ...ativo,
  });
  const revisoes = useQuery({
    queryKey: ["reviews", "tasks", "pending"],
    queryFn: () => listReviewTasks(token, { status: "pending" }),
    ...ativo,
  });
  const dias = useQuery({
    queryKey: ["student", "evolution", "4w"],
    queryFn: () => getStudentEvolution(token, "4w"),
    ...ativo,
  });

  // ── 1. Se a prova fosse hoje ────────────────────────────────────────────
  const projecao = useMemo(() => {
    const pesos = (banca.data?.areas?.linhas ?? []).map((linha) => ({
      area: resolveDisplayArea(null, linha.rotulo),
      pct: linha.pct,
    }));
    const acertos = (desempenho.data?.areas ?? [])
      .filter((a) => a.questions_seen > 0 && a.accuracy !== null)
      .map((a) => ({
        area: resolveDisplayArea(a.area, a.label),
        acertos: Math.round((a.accuracy ?? 0) * a.questions_seen),
        total: a.questions_seen,
      }));
    if (!pesos.length || !acertos.length) return null;
    return projetarNota(pesos, acertos);
  }, [banca.data, desempenho.data]);

  // ── 3. Onde mais escapa ─────────────────────────────────────────────────
  const dominio = useMemo(() => {
    const mapa = new Map<string, { mastery: number; attempts: number }>();
    for (const item of (proficiencia.data?.items ?? []) as CompetencyMasteryItem[]) {
      if (!item.primary_subtheme) continue;
      const anterior = mapa.get(item.primary_subtheme);
      if (!anterior || item.attempts > anterior.attempts) {
        mapa.set(item.primary_subtheme, { mastery: item.mastery, attempts: item.attempts });
      }
    }
    return mapa;
  }, [proficiencia.data]);

  const escapes = useMemo(
    () => ondeMaisEscapa(banca.data?.mais_cai?.linhas ?? [], dominio),
    [banca.data, dominio],
  );

  // ── 5. O que eu vou esquecer ────────────────────────────────────────────
  const proximosSete = useMemo(() => {
    const hojeISO = new Date().toISOString().slice(0, 10);
    const dias7: Array<{ dia: string; rotulo: string; quantas: number }> = [];
    const base = new Date(`${hojeISO}T00:00:00`);
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      dias7.push({
        dia: iso,
        rotulo: i === 0 ? "hoje" : d.toLocaleDateString("pt-BR", { weekday: "short" }).slice(0, 3),
        quantas: (revisoes.data ?? []).filter((t) => t.due_date === iso).length,
      });
    }
    return dias7;
  }, [revisoes.data]);

  const mosaico = useMemo(
    () => mosaicoDeDias(dias.data?.points ?? [], 10, 30),
    [dias.data],
  );

  const orcamento = hoje.data?.effort_budget ?? null;
  const carregando = desempenho.isPending && semanas.isPending && banca.isPending;

  if (carregando) {
    return <Skeleton className="h-96 w-full" rotulo="Evolução carregando" />;
  }

  const seisSemanas = acertoPorSemana(semanas.data?.weeks ?? []);
  const maiorSemana = Math.max(100, ...seisSemanas.map((s) => s.acerto ?? 0));
  const respondidas = desempenho.data?.unique_questions ?? 0;
  const assuntosVistos = [...dominio.values()].filter((d) => d.attempts > 0).length;
  const diasEstudados = mosaico.filter((d) => d.estado !== "vazio").length;

  return (
    <div className="ritmo-secao md:grid md:grid-cols-2 md:gap-4 md:[&>*+*]:mt-0">
      {/* 1 ─────────────────────────────────────────────────────────────── */}
      <Cartao
        pergunta="Se a prova fosse hoje"
        medida={projecao ? `${projecao.base} questões respondidas` : undefined}
        nota={
          projecao
            ? `A faixa é o que ${projecao.base} questões permitem afirmar. Ela aperta conforme você responde mais, e nunca vira promessa de nota.`
            : undefined
        }
      >
        {projecao ? (
          <>
            <Numero valor={projecao.nota} unidade="de 100" />
            <p className="mt-2 font-mono text-nota tabular-nums text-muted">
              entre {projecao.faixaMin} e {projecao.faixaMax}
            </p>
          </>
        ) : (
          <SemBase>
            Ainda não dá para projetar: falta responder questões nas áreas que esta prova
            cobra, ou declarar a sua prova.
          </SemBase>
        )}
      </Cartao>

      {/* 2 ─────────────────────────────────────────────────────────────── */}
      <Cartao
        pergunta="Estou melhorando?"
        medida="acerto por semana"
        nota="Semana ruim é normal, e fica à mostra: assunto novo entra derrubando a média."
      >
        {seisSemanas.some((s) => s.acerto !== null) ? (
          <ul className="flex items-end gap-2" aria-label="Acerto por semana">
            {seisSemanas.map((semana) => (
              <li key={semana.rotulo} className="flex flex-1 flex-col items-center gap-1">
                <span className="font-mono text-nota tabular-nums text-ink">
                  {semana.acerto === null ? "—" : `${Math.round(semana.acerto)}%`}
                </span>
                <span
                  className="w-full bg-primary"
                  style={{
                    height: `${Math.max(2, ((semana.acerto ?? 0) / maiorSemana) * 72)}px`,
                    opacity: semana.acerto === null ? 0.18 : 1,
                  }}
                  aria-hidden="true"
                />
                <span className="paper-eyebrow">{semana.rotulo}</span>
              </li>
            ))}
          </ul>
        ) : (
          <SemBase>Nenhuma questão respondida nas últimas semanas.</SemBase>
        )}
      </Cartao>

      {/* 3 ─────────────────────────────────────────────────────────────── */}
      <Cartao
        pergunta="Onde mais escapa?"
        medida="questões perdidas · peso × seu erro"
        nota="Não é porcentagem: é quantas questões da prova você perderia por esse assunto."
      >
        {escapes.length ? (
          <ul>
            {escapes.map((linha) => (
              /* ⚠️ A LINHA PASSOU A PRATICAR O ASSUNTO QUE ELA NOMEIA.

                 A Evolução tinha SETE cartões de leitura e UM elemento
                 interativo em 2,6 telas de altura. Ela dizia ao médico onde ele
                 mais perde questões e não oferecia nada — para agir, era
                 preciso decorar o nome, atravessar para o Banco e digitá-lo.

                 ⚠️ SEM PREENCHIMENTO, de propósito. O contrato desta tela é que
                 ela não dispute a ação do dia com o Hoje, e ele continua de pé:
                 quem decide o que fazer agora é o Hoje. Aqui a ação é a própria
                 linha, do peso que ela já tinha — nada ganhou destaque.

                 `answer_status=unanswered_or_wrong` é o recorte honesto para
                 "onde escapa": o que ainda não viu, mais o que já errou. O
                 Banco passou a ler os dois parâmetros na PR #37. */
              <li key={linha.assunto} className="border-b border-rule last:border-b-0">
                <Link
                  href={`/banco?theme=${encodeURIComponent(linha.assunto)}&answer_status=unanswered_or_wrong`}
                  className="paper-control flex min-h-11 items-baseline gap-3 py-2 hover:text-primary"
                >
                  <span className="flex-1 text-sm text-ink">
                    {linha.assunto}
                    {linha.abaixoDoPiso ? (
                      <span
                        className="ml-1 text-muted"
                        title="menos de 80 respostas suas: o número existe, a conclusão não"
                      >
                        ◐
                      </span>
                    ) : null}
                  </span>
                  <span className="font-mono text-nota tabular-nums text-ink">
                    {linha.perdidas.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}
                  </span>
                  <span aria-hidden="true" className="shrink-0 text-muted">›</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <SemBase>
            Este mapa acende conforme você responde os assuntos que esta prova cobra.
          </SemBase>
        )}
      </Cartao>

      {/* 4 ─────────────────────────────────────────────────────────────── */}
      <Cartao
        pergunta="Vou dar conta do tempo?"
        medida={orcamento?.pace_source === "observed" ? "o seu ritmo medido" : "sem ritmo medido"}
        nota={
          orcamento?.pace_source === "observed"
            ? "Medido nas suas respostas. Não comparamos com o tempo da prova porque essa medida ainda não é publicada por banca."
            : undefined
        }
      >
        {orcamento?.pace_source === "observed" ? (
          <Numero valor={ritmoPorExtenso(orcamento.minutes_per_question)} unidade="por questão" />
        ) : (
          <SemBase>
            Ainda não medimos o seu ritmo — ele nasce depois de algumas sessões cronometradas.
            Até lá o plano supõe 2 minutos por questão.
          </SemBase>
        )}
      </Cartao>

      {/* 5 ─────────────────────────────────────────────────────────────── */}
      <Cartao pergunta="O que eu vou esquecer?" medida="revisões que vencem em 7 dias">
        <ul className="flex items-end gap-1" aria-label="Revisões por dia">
          {proximosSete.map((dia) => (
            <li key={dia.dia} className="flex flex-1 flex-col items-center gap-1">
              <span className="font-mono text-nota tabular-nums text-ink">{dia.quantas}</span>
              <span className="paper-eyebrow">{dia.rotulo}</span>
            </li>
          ))}
        </ul>
      </Cartao>

      {/* 6 ─────────────────────────────────────────────────────────────── */}
      <Cartao pergunta="Seus registros" medida="acumulam, nunca zeram">
        <dl className="divide-y divide-rule">
          {[
            ["Questões respondidas", respondidas],
            ["Assuntos que você viu", assuntosVistos],
            ["Erros que não repetiu", desempenho.data?.repeat_correct ?? 0],
            ["Dias estudados", diasEstudados],
          ].map(([rotulo, valor]) => (
            <div key={String(rotulo)} className="flex items-baseline justify-between py-2">
              <dt className="text-sm text-ink">{rotulo}</dt>
              <dd className="font-mono text-nota tabular-nums text-ink">{valor}</dd>
            </div>
          ))}
        </dl>
      </Cartao>

      {/* 7 ─────────────────────────────────────────────────────────────── */}
      <Cartao
        pergunta="Seus dias"
        medida={`${diasEstudados} dos últimos ${mosaico.length || 28}`}
        nota="Nenhum dia é vermelho e nenhum quebra sequência: o mosaico existe para mostrar que dá para estudar em escala, não para cobrar os dias que a escala tomou."
      >
        {mosaico.length ? (
          <ul className="flex flex-wrap gap-1" aria-label="Dias com estudo">
            {mosaico.map((dia) => (
              <li
                key={dia.data}
                title={`${dia.data} · ${dia.minutos} min`}
                className={`h-4 w-4 rounded-control border border-edge ${
                  dia.estado === "cheio"
                    ? "bg-primary"
                    : dia.estado === "parcial"
                      ? "bg-washSelecao"
                      : "bg-surface"
                }`}
              />
            ))}
          </ul>
        ) : (
          <SemBase>Os seus dias aparecem aqui conforme você estuda.</SemBase>
        )}
      </Cartao>

      {/* A porta dos graficos. Vem DEPOIS dos sete cartoes porque a ordem e o
          argumento: a tela responde a pergunta primeiro, e so entao oferece o
          grafico que sustenta a resposta.

          ⚠️ Era uma GAVETA VAZIA, e o link real vivia no rodape — duas coisas
          a disputar o mesmo papel, e a que tinha o nome certo era a que nao
          levava a lado nenhum. O porque esta em PortaDosGraficos. */}
      <PortaDosGraficos />

      {!chaveDaBanca ? (
        <div className="md:col-span-2">
          <Alert variant="warning">
            Duas destas leituras dependem da sua prova: sem ela, não dá para pesar as áreas.{" "}
            <Link href="/conta/preferencias#prova-alvo" className="underline underline-offset-4">
              Escolher a prova
            </Link>
          </Alert>
        </div>
      ) : null}
    </div>
  );
}
