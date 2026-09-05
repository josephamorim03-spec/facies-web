"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { SeletorDeTema } from "@/components/SeletorDeTema";
import { UserAvatar } from "@/components/UserAvatar";
import { SuaEspecialidade } from "./_components/SuaEspecialidade";
import { LoadBar } from "@/components/ui/LoadBar";
import {
  AlvoEContagem,
  alvoDaProvaAlvo,
  alvoDoObjetivoV2,
  objetivoPrincipal,
  provaAlvoPrincipal,
} from "@/components/AlvoEContagem";
import { mosaicoDeDias } from "@/app/evolucao/_lib/leitura";
import {
  getMyObjectivesV2,
  getMyTargetExam,
  getProfile,
  getQuestionBankPerformance,
  getStudentEvolution,
} from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { useAuthToken } from "@/lib/useAuthToken";

/**
 * "Você" — o quinto destino, e o unico que nao e' conteudo.
 *
 * ## Por que ele existe
 *
 * A barra tinha SEIS destinos, e dois deles eram ajuste: Rotina (a semana
 * padrao, que se declara uma vez) e Conta (senha, dados, acesso). Peso de
 * destino permanente para tarefa rara, num lugar que a 320px ja nao cabia --
 * ver a medida no comentario de `you` em `lib/navConfig.ts`.
 *
 * Toda rede social que este publico usa resolve isso do mesmo jeito: quatro
 * destinos de conteudo e um de pessoa, com o ajuste por dentro. Esta tela e'
 * essa quinta porta.
 *
 * ## O que ela NAO e'
 *
 * ⚠️ **Nao ha sequencia que quebra.** O desenho e' explicito
 * (`Webapp - telas.dc.html:714`): "o que existe aqui so acumula, nunca zera.
 * Sem sequencia que quebra, sem dia vermelho [...] um app que castiga isso e'
 * abandonado na terceira semana". Existe um motor de streak completo no backend
 * (`app/services/streaks.py`), com dias de plantao protegidos, e ele continua
 * fora daqui de proposito.
 *
 * ⚠️ **Nao ha numero novo.** Os tres sao os MESMOS da Evolucao, das mesmas
 * consultas -- "um assunto nao pode ter 2 respostas numa tela e 34 na outra"
 * (`12b`). Uma tela de perfil que recalcula o proprio total e' como duas
 * verdades nascem.
 */

/** Piso e meta do mosaico da Evolucao, para os "dias com estudo" baterem. */
const PISO_DE_MINUTOS = 10;
const META_DIARIA_MINUTOS = 30;

function Registro({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <div>
      <p className="font-mono text-2xl tabular-nums leading-none text-ink">{valor}</p>
      <p className="paper-eyebrow mt-1">{rotulo}</p>
    </div>
  );
}

function Entrada({
  href,
  children,
  nota,
}: {
  href: string;
  children: string;
  nota?: string;
}) {
  return (
    <Link
      href={href}
      className="paper-control flex min-h-12 items-center justify-between gap-3 border-b border-rule py-3 text-sm text-ink hover:text-primary"
    >
      <span className="min-w-0">
        {children}
        {nota ? <span className="mt-0.5 block text-nota text-muted">{nota}</span> : null}
      </span>
      <span aria-hidden="true" className="shrink-0 text-muted">
        ›
      </span>
    </Link>
  );
}

/**
 * ⚠️ AS SETE ENTRADAS ERAM UMA LISTA SÓ, e o operador chamou isso de "gaveta".
 *
 * Estavam no mesmo nível: o objetivo da vida ("a sua prova"), uma preferência
 * de aparelho, uma lista de questões guardadas e a senha. Sete linhas iguais
 * não dizem onde procurar — quem quer o modo escuro lê as sete.
 *
 * Agora são quatro gavetas com nome, na ordem em que se pensa nelas: o que
 * você quer, o que você já fez, como é a sua semana, e o aplicativo. É a mesma
 * divisão que o perfil de qualquer rede social faz — conteúdo seu primeiro,
 * ajuste do app por último.
 */
function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="paper-eyebrow mb-1">{titulo}</h2>
      {children}
    </section>
  );
}

export default function VocePage() {
  const { token, tokenResolved } = useAuthToken();
  const ativo = { enabled: tokenResolved, staleTime: 60_000 };

  const perfil = useQuery({
    queryKey: queryKeys.perfil,
    queryFn: () => getProfile(token),
    enabled: tokenResolved,
    staleTime: 300_000,
  });
  const desempenho = useQuery({
    queryKey: queryKeys.questionBankPerformance,
    queryFn: () => getQuestionBankPerformance(token),
    ...ativo,
  });
  const dias = useQuery({
    queryKey: ["student", "evolution", "4w"],
    queryFn: () => getStudentEvolution(token, "4w"),
    ...ativo,
  });
  const objetivos = useQuery({
    queryKey: queryKeys.studentObjectives,
    queryFn: () => getMyObjectivesV2(token),
    enabled: tokenResolved,
    staleTime: 300_000,
    // A rota e' 404 enquanto `ENABLE_STUDENT_OBJECTIVES_V2` estiver desligada,
    // e ela esta desligada em producao. A prova-alvo logo abaixo responde.
    retry: false,
  });
  const provaAlvo = useQuery({
    queryKey: queryKeys.studentTargetExam,
    queryFn: () => getMyTargetExam(token),
    enabled: tokenResolved,
    staleTime: 300_000,
  });

  // A MESMA precedencia do Hoje e do Plano: o v2 primeiro, porque so ele
  // carrega data de EDITAL e pode dizer "63 dias" sem a ressalva de estimativa.
  const alvo =
    alvoDoObjetivoV2(objetivoPrincipal(objetivos.data?.items)) ??
    alvoDaProvaAlvo(provaAlvoPrincipal(provaAlvo.data?.items));

  const mosaico = useMemo(
    () => mosaicoDeDias(dias.data?.points ?? [], PISO_DE_MINUTOS, META_DIARIA_MINUTOS),
    [dias.data],
  );
  const diasComEstudo = mosaico.filter((dia) => dia.estado !== "vazio").length;
  const respondidas = desempenho.data?.unique_questions ?? 0;
  const acerto = desempenho.data?.first_attempt_accuracy;

  if (!tokenResolved || perfil.isPending) {
    return <LoadBar label="Carregando o seu perfil" />;
  }

  const nome = perfil.data?.display_name ?? null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="flex items-center gap-3">
        <UserAvatar photoUrl={perfil.data?.photo_url} displayName={nome} size="lg" />
        <div className="min-w-0">
          <h1 className="truncate font-serif text-2xl font-semibold text-ink">
            {nome ?? "Você"}
          </h1>
          {/* O objetivo se cala sozinho sem prova declarada — a entrada abaixo
              e' o caminho para declara-la. */}
          <AlvoEContagem alvo={alvo} className="mt-0.5" />
          {/* A especialidade fica no cabecalho, junto da prova: as duas
              respondem à mesma pergunta — o que você está a tentar — e
              separa-las faria o perfil dizer metade dela. */}
          {perfil.data?.intended_specialty ? (
            <p className="paper-eyebrow mt-0.5">{perfil.data.intended_specialty}</p>
          ) : null}
        </div>
      </header>

      {/* ⚠️ TRES NUMEROS QUE SO SOBEM. Ver o docstring: sem sequencia, sem dia
          vermelho, sem nada que zere. */}
      <section aria-label="Os seus registros" className="flex gap-8 border-y border-rule py-4">
        <Registro valor={respondidas.toLocaleString("pt-BR")} rotulo="questões" />
        <Registro
          valor={acerto === null || acerto === undefined ? "—" : `${Math.round(acerto * 100)}%`}
          rotulo="acerto"
        />
        <Registro valor={String(diasComEstudo)} rotulo="dias com estudo" />
      </section>

      <div className="space-y-6">
        <Grupo titulo="o que você quer">
          {/* ⚠️ "A sua prova" e "Minha semana" apontavam AMBAS para
              `/preferencias`, uma delas com âncora. Duas entradas para a mesma
              tela, com nomes que não se parecem, é como um menu ensina o
              caminho errado. Continuam separadas porque respondem a perguntas
              diferentes, mas agora estão em gavetas diferentes — e a âncora
              leva à secção certa. */}
          <Entrada href="/preferencias#prova-alvo" nota="Onde você quer entrar">
            A sua prova
          </Entrada>
          <SuaEspecialidade atual={perfil.data?.intended_specialty ?? null} />
        </Grupo>

        <Grupo titulo="o seu estudo">
          <Entrada href="/banco/guardadas" nota="As questões que você guardou">
            Guardadas
          </Entrada>
          <Entrada href="/banco/historico" nota="As sessões que você já fechou">
            Histórico
          </Entrada>
        </Grupo>

        <Grupo titulo="a sua rotina">
          <Entrada href="/preferencias" nota="Quanto dá para estudar em cada tipo de dia">
            Minha semana
          </Entrada>
          <Entrada href="/plano" nota="O que vem pela frente, e o que não coube">
            O plano até a prova
          </Entrada>
          <Entrada href="/cronograma" nota="Para quem quer ver o mês inteiro">
            Calendário
          </Entrada>
        </Grupo>

        <Grupo titulo="o aplicativo">
          <SeletorDeTema />
          <Entrada href="/conta" nota="Acesso, senha, seus dados">
            Conta e privacidade
          </Entrada>
        </Grupo>
      </div>
    </div>
  );
}
