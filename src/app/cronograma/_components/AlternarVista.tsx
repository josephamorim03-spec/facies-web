"use client";

import Link from "next/link";

import { IconMonthGrid, IconWeekRow } from "./CronogramaIcons";

/**
 * A TROCA ENTRE AS DUAS LEITURAS DO CALENDÁRIO — semana e mês.
 *
 * ## Ela existiu, saiu por um bom motivo, e ficou sem substituto
 *
 * Havia três afordâncias para esta troca, cada uma numa largura só: um seletor
 * textual no desktop e um ícone diferente em cada uma das duas telas do
 * telemóvel. Foram removidas de propósito em favor da linha de seções
 * (`IntentSubNav`), que era a mesma nas duas larguras. Decisão certa — enquanto
 * "Semana" e "Mês" fossem seções do Plano.
 *
 * ⚠️ **Elas deixaram de ser.** Quando o calendário virou destino do "Mais",
 * `CHILDREN.mais` ficou vazio, e `getIntentChildren("/cronograma")` passou a
 * devolver lista vazia: `IntentSubNav` não desenha nada nestas duas telas. A
 * troca não migrou — evaporou. Quem abria o mês voltava para a semana pelo
 * menu, três toques adiante, e foi essa a queixa que trouxe este arquivo de
 * volta.
 *
 * ## Por que UM desenho, e não os três de antes
 *
 * A razão que matou as três afordâncias continua de pé: chrome que muda de
 * forma conforme o aparelho é chrome que se aprende duas vezes. Este é o MESMO
 * botão nas quatro posições — semana e mês, telemóvel e desktop —, com o mesmo
 * ícone, o mesmo rótulo assistivo e a mesma marcação de teste.
 *
 * O ícone mostra a leitura de DESTINO, e não a atual: no mês desenha a fileira
 * da semana, na semana desenha a grade do mês. É o par de maquetes que já
 * existia em `CronogramaIcons` e que ficou órfão quando a troca saiu.
 */
export function AlternarVista({
  para,
  dia = null,
  tamanho = "md",
  className = "",
}: {
  /** A leitura de DESTINO — é ela que o ícone desenha. */
  para: "week" | "month";
  /** O dia em foco, para que o destino abra onde o aluno já estava. */
  dia?: string | null;
  /** `sm` acompanha a barra de título do telemóvel; `md`, a fileira do desktop. */
  tamanho?: "sm" | "md";
  className?: string;
}) {
  const paraMes = para === "month";
  const base = paraMes ? "/cronograma/mes" : "/cronograma";
  // `day` é o parâmetro que as duas rotas leem (ver `page.tsx` de cada uma);
  // sem ele o destino abre no dia de hoje, que é o padrão honesto.
  const href = dia ? `${base}?day=${dia}` : base;
  const rotulo = paraMes ? "Ver o mês" : "Ver a semana";
  const caixa = tamanho === "sm" ? "h-7 w-7" : "h-8 w-8";
  return (
    <Link
      href={href}
      data-testid={paraMes ? "schedule-view-month" : "schedule-view-week"}
      aria-label={rotulo}
      // O desktop tem cursor: o nome do destino aparece ao pousar, sem gastar
      // largura numa etiqueta que o telemóvel não teria onde pôr.
      title={rotulo}
      className={`${caixa} flex shrink-0 items-center justify-center text-muted transition-colors hover:bg-surfaceMuted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`}
    >
      {paraMes ? <IconMonthGrid className="h-5 w-5" /> : <IconWeekRow className="h-5 w-5" />}
    </Link>
  );
}
