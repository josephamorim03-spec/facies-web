"use client";

import Link from "next/link";

import { Cartao } from "@/app/evolucao/_components/Cartao";
import { IconMonthGrid, IconWeekRow } from "@/app/cronograma/_components/CronogramaIcons";

/**
 * A PORTA DO CALENDÁRIO — o rodapé do Início, sempre.
 *
 * ## Por que ela é incondicional
 *
 * Todos os outros blocos desta tela dependem de dado: sem sequência, sem
 * diagnóstico longitudinal e sem base para medir, `ordenarBlocos` devolve lista
 * vazia e a home mostra só o convite para o banco. O calendário não depende de
 * nada — ele existe no primeiro dia do aluno — e é a única tela do produto que
 * responde "quando".
 *
 * Desde que o calendário deixou de ser seção do Plano e virou destino do
 * "Mais", ele ficou a três toques de qualquer lugar: abrir o menu, achar a
 * lista, escolher a leitura. Esta porta é o caminho curto, e ela é o FIM da
 * tela de propósito — o resumo do dia vem primeiro, o horizonte depois.
 *
 * ⚠️ Ela é desenhada FORA de `ordenarBlocos`, e não como mais um
 * `BlocoDoInicio`. A ordem decide o que aparece e em que sequência, a partir do
 * que o aluno tem; esta porta não participa dessa decisão porque não há estado
 * em que ela deva sumir. Pô-la na ordem seria dar-lhe uma condição que ela não
 * tem.
 *
 * ## As duas leituras, escolhidas antes de entrar
 *
 * Semana e mês são a mesma agenda vista de distâncias diferentes. É o mesmo par
 * que `AlternarVista` oferece lá dentro — a diferença é que ali o botão troca a
 * leitura, e aqui ele abre a tela.
 */
export function PortaDoCalendario() {
  return (
    <Cartao pergunta="O calendário" medida="a mesma agenda, de duas distâncias">
      {/* `grid-cols-1` na pista do telemóvel, e duas colunas só a partir de
          640px: pista implícita é `auto`, e o mínimo dela é o min-content —
          ver a nota em `BlocoQuentes` e o guard `check-pista-de-grelha.mjs`. */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Link
          href="/cronograma"
          data-testid="inicio-porta-semana"
          className="paper-control flex min-w-0 items-center gap-3 rounded-control border border-edge bg-paper px-4 py-3 text-left hover:border-primary"
        >
          <IconWeekRow className="h-5 w-5 shrink-0 text-muted" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-ink">Semana</span>
            <span className="paper-eyebrow mt-1 block">os sete dias, um a um</span>
          </span>
          <span aria-hidden="true" className="shrink-0 text-muted">
            ›
          </span>
        </Link>
        <Link
          href="/cronograma/mes"
          data-testid="inicio-porta-mes"
          className="paper-control flex min-w-0 items-center gap-3 rounded-control border border-edge bg-paper px-4 py-3 text-left hover:border-primary"
        >
          <IconMonthGrid className="h-5 w-5 shrink-0 text-muted" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-ink">Mês</span>
            <span className="paper-eyebrow mt-1 block">o horizonte até a prova</span>
          </span>
          <span aria-hidden="true" className="shrink-0 text-muted">
            ›
          </span>
        </Link>
      </div>
    </Cartao>
  );
}
