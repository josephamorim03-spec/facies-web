"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { SeletorDeTema } from "@/components/SeletorDeTema";
import { UserAvatar } from "@/components/UserAvatar";
import { SuaEspecialidade } from "./SuaEspecialidade";
import { LoadBar } from "@/components/ui/LoadBar";
import { AlvoEContagem } from "@/components/AlvoEContagem";
import { alvoDaProvaAlvo, alvoDoObjetivoV2, objetivoPrincipal, provaAlvoPrincipal } from "@/components/alvoDaTela";
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
 * O HUB DE DESTINOS — a tela do "Mais", e a mesma que `/voce` sempre serviu.
 *
 * ## Duas rotas, um componente
 *
 * `/mais` é o quinto destino da barra desde 2026-09-10; `/voce` é o caminho
 * legado dele. As duas renderizam ISTO. Não é conveniência: `/voce` está em
 * links, no avatar da sidebar e no histórico de quem já usa o app, e uma tela
 * que muda de nome sem manter a porta antiga transforma link guardado em 404.
 *
 * ## O que ele é
 *
 * A lista de tudo o que se visita poucas vezes — a Conta (com o rosto, no
 * topo), a rotina, o plano, a evolução, o tema, as preferências. O operador
 * pediu a forma do app de xadrez, e a forma tem um nome: o menu que absorve o
 * que não merece peso permanente na barra.
 *
 * Esta tela já era isso antes de se chamar assim. Ela nasceu quando a barra
 * tinha SEIS destinos e dois deles eram ajuste (Rotina e Conta) — peso
 * permanente para tarefa rara, num lugar que a 320px já não cabia. Mudou o
 * nome, herdou Evolução e Plano, e ganhou o rosto no topo.
 *
 * ## O que ele NÃO é
 *
 * ⚠️ **Não há número novo.** Os três são os MESMOS da Evolução, das mesmas
 * consultas -- "um assunto nao pode ter 2 respostas numa tela e 34 na outra"
 * (`12b`). Uma tela de perfil que recalcula o próprio total é como duas
 * verdades nascem.
 *
 * ⚠️ **Não há sequência AQUI, e agora há no Início.** O desenho proibia-a em
 * texto (`Webapp - telas.dc.html:714`): "o que existe aqui so acumula, nunca
 * zera. Sem sequencia que quebra, sem dia vermelho [...] um app que castiga
 * isso e' abandonado na terceira semana".
 *
 * O operador reverteu essa regra em 2026-09-10, com uma condição: a sequência
 * quebra, **mas o dia de plantão fica protegido e a proteção tem de estar
 * visível ao aluno**. A reversão vive no `/inicio`, que é a tela de "o que
 * importa agora"; esta continua sendo a dos três números que só sobem, porque
 * a razão original — não castigar quem abre o perfil — continua valendo para
 * uma tela de ajustes. Ver `app/services/streaks.py`, que já tem o motor com
 * dias protegidos.
 */

/** Piso e meta do mosaico da Evolucao, para os "dias com estudo" baterem. */
const PISO_DE_MINUTOS = 10;
const META_DIARIA_MINUTOS = 30;

function Registro({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <div>
      <p className="font-mono text-dado-menor tabular-nums text-ink">{valor}</p>
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

export function HubDeDestinos() {
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
      {/* ⚠️ O CABEÇALHO VIROU A LINHA "CONTA", e é onde a foto mora agora.

          O operador pediu a lista do app de xadrez, "que dentro terá Conta
          (aqui sim com sua foto)" — o "aqui sim" é a instrução: o rosto sai da
          barra inferior e vem para esta linha. Na barra, o rosto prometia que a
          aba abre o perfil; a aba abre um menu de nove destinos.

          É `<Link>`, e não só um bloco decorativo: um cabeçalho com o seu rosto
          e o seu nome parece tocável, e não sê-lo é a forma mais barata de
          ensinar que a tela não responde. Leva à Conta, que é o que o rosto
          significa. */}
      <Link
        href="/conta"
        className="paper-control flex items-center gap-3 border-b border-rule pb-4 text-left hover:text-primary"
      >
        <UserAvatar photoUrl={perfil.data?.photo_url} displayName={nome} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-serif font-semibold text-ink">
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
        <span aria-hidden="true" className="shrink-0 text-muted">
          ›
        </span>
      </Link>

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

      <div className="ritmo-secao">
        <Grupo titulo="o que você quer">
          {/* ⚠️ "A sua prova" e "Minha semana" apontavam AMBAS para
              `/preferencias`, uma delas com âncora. Duas entradas para a mesma
              tela, com nomes que não se parecem, é como um menu ensina o
              caminho errado.
              Hoje elas estão em PÁGINAS diferentes: a prova alvo saiu para
              `/conta/preferencias` quando as preferências deixaram a rotina, e
              a semana ficou. O link aponta ao destino final — `/preferencias`
              ainda encaminha `#prova-alvo`, mas mandar para lá seria gastar um
              salto de propósito. */}
          <Entrada href="/conta/preferencias#prova-alvo" nota="Onde você quer entrar">
            A sua prova
          </Entrada>
          <SuaEspecialidade atual={perfil.data?.intended_specialty ?? null} />
        </Grupo>

        <Grupo titulo="o seu estudo">
          {/* ⚠️ A EVOLUÇÃO ENTROU AQUI porque saiu da barra (2026-09-10).
              Ela era uma das cinco abas permanentes; a barra passou a privilegiar
              o que se usa todo dia, e olhar a própria curva é semanal. Sair da
              barra não pode virar sumir: sem esta linha, a tela ficava
              alcançável só por `/estatisticas`, que é o alias antigo. */}
          <Entrada href="/evolucao" nota="Como você vem indo, e onde mais escapa">
            Evolução
          </Entrada>
          <Entrada href="/banco/guardadas" nota="As questões que você guardou">
            Guardadas
          </Entrada>
          <Entrada href="/banco/historico" nota="As sessões que você já fechou">
            Histórico
          </Entrada>
        </Grupo>

        {/* ⚠️ ESTE GRUPO PASSOU A SER A CASA DA ROTINA, e não uma cópia dela.
            "Minha semana" era seção da primeira aba e uma entrada aqui — duas
            portas com pesos diferentes. Com a rotina a viver na aba Você (a
            pedido do operador, 2026-09-08), esta lista é o caminho, e a seção
            "Semana" no topo desta tela é o atalho para o mesmo lugar. */}
        {/* ⚠️ ERA "a sua rotina", e o grupo passou a repetir o nome do seu primeiro
            item quando "Minha semana" virou "Rotina". Os três destinos daqui —
            Rotina, o plano até a prova e o Calendário — são a mesma coisa vista
            em três distâncias: quanto tempo cabe no dia, quanto falta até a
            prova, e como o mês se distribui. "o seu tempo" nomeia isso. */}
        <Grupo titulo="o seu tempo">
          <Entrada href="/preferencias" nota="Quanto dá para estudar em cada tipo de dia">
            Rotina
          </Entrada>
          <Entrada href="/plano" nota="O que vem pela frente, e o que não coube">
            O plano até a prova
          </Entrada>
          {/* ⚠️ O DESTINO ESTAVA ERRADO: a nota prometia o mês inteiro e o link
              abria `/cronograma`, que é a SEMANA. O mês tem rota própria. */}
          <Entrada href="/cronograma/mes" nota="Para quem quer ver o mês inteiro">
            Calendário
          </Entrada>
        </Grupo>

        <Grupo titulo="o aplicativo">
          <SeletorDeTema />
          {/* Sem esta entrada, alertas, correção e cards ficavam sem porta no
              CELULAR: a linha de seções saiu do rodapé, e só a barra de seções
              do desktop levava a `/conta/preferencias`. */}
          <Entrada href="/conta/preferencias" nota="Alertas, correção e cards">
            Preferências
          </Entrada>
          <Entrada href="/conta" nota="Acesso, senha, seus dados">
            Conta e privacidade
          </Entrada>
        </Grupo>
      </div>
    </div>
  );
}
