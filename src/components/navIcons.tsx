"use client";

import type { ComponentType, SVGProps } from "react";

import type { StudentNavIcon } from "@/lib/navConfig";

/**
 * Os cinco ícones da navegação — desenhados para ESTE produto.
 *
 * ## Por que não vêm do lucide
 *
 * O do Mapa não poderia: ele é a grade do próprio `MapaDaProva`, células
 * desiguais com uma marcada. Um símbolo genérico de mapa — o mapa dobrado, o
 * pino, a bússola — descreve a CATEGORIA; a grade descreve esta tela, e quem a
 * viu uma vez não precisa mais do rótulo.
 *
 * E os outros quatro precisavam do mesmo peso de traço para lerem como
 * conjunto. Misturar ícone de biblioteca (traço 2) com um desenhado (traço 1,5)
 * na mesma barra é o defeito que este arquivo já corrigiu uma vez, quando havia
 * DOIS mapas de ícone e o mesmo destino saía com símbolos diferentes conforme a
 * largura da tela.
 *
 * ## As medidas
 *
 * 24×24, `stroke-width` 1,5, pontas e junções redondas, `fill="none"` — a única
 * exceção é a célula marcada do Mapa, que é sólida de propósito.
 *
 * ⚠️ 1,5 E NÃO 1. A referência de desenho é apresentada em ~64px, onde 1,5 lê
 * como fio; a barra desenha em 21px, onde o mesmo fio proporcional sumiria — em
 * especial no tema escuro. Medido no par de tokens que a barra usa:
 * `--color-muted` sobre `--color-surface-muted` dá 5,2:1 no claro e 6,0:1 no
 * escuro, acima dos 3:1 que a WCAG 1.4.11 exige de marca gráfica.
 *
 * O tipo é `StudentNavIcon`, então destino novo sem ícone é erro de compilação
 * em vez de fallback silencioso.
 */

type Props = SVGProps<SVGSVGElement>;

function Base({ children, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

/**
 * CARIMBO — o bulbo com cintura, a base larga e o mata-borrão.
 *
 * "Conduta" é o que se decide e se assina. É também a pergunta que toda questão
 * clínica faz, virada para o estudante: o que fazer agora, e por quê.
 */
function IconeConduta(props: Props) {
  return (
    <Base {...props}>
      <path d="M12 3.4c1.7 0 2.8 1.1 2.8 2.5 0 1.6-1.4 2.1-1.4 3.4v.9h-2.8v-.9C10.6 8 9.2 7.5 9.2 5.9c0-1.4 1.1-2.5 2.8-2.5Z" />
      <path d="M7.1 10.5h9.8a.9.9 0 0 1 .9.9v2.4a1.1 1.1 0 0 1-1.1 1.1H7.3a1.1 1.1 0 0 1-1.1-1.1v-2.4a.9.9 0 0 1 .9-.9Z" />
      <path d="M5.4 17.6h13.2" />
    </Base>
  );
}

/**
 * FICHAS EMPILHADAS — a de trás é a que espera, a da frente tem as linhas do
 * enunciado. Questão e flashcard, o mesmo gesto.
 *
 * ⚠️ A da frente é OPACA de propósito. Sem o `fill`, a de trás atravessa e o
 * par deixa de ler como pilha: vira uma grade, que é justamente o ícone do
 * Mapa, duas abas adiante na mesma barra.
 */
function IconePratica(props: Props) {
  return (
    <Base {...props}>
      <rect x="8.6" y="4.9" width="11.2" height="9.2" rx="1.5" />
      <rect
        x="4.2"
        y="8.5"
        width="11.2"
        height="10.6"
        rx="1.5"
        fill="var(--color-surface)"
      />
      <path d="M6.7 11.6h6.2" />
      <path d="M6.7 13.9h6.2" />
      <path d="M6.7 16.2h4" />
    </Base>
  );
}

/**
 * O MOSAICO — a grade de células desiguais do `MapaDaProva`, com uma marcada.
 *
 * Não é o símbolo de "mapa": é ESTA tela. A desigualdade das células não é
 * enfeite — ela encoda a regra que o mapa inteiro encoda, "tamanho é
 * incidência".
 */
function IconeMapa(props: Props) {
  return (
    <Base {...props}>
      <rect x="3.6" y="5.4" width="16.8" height="13.2" rx="1.3" />
      <path d="M12 5.4v13.2" />
      <path d="M3.6 12h8.4" />
      <path d="M7.8 12v6.6" />
      <path d="M12 14.8h8.4" />
      <circle cx="16.2" cy="9.7" r="1.45" fill="currentColor" stroke="none" />
    </Base>
  );
}

/**
 * COLUNAS SOBRE A LINHA DE BASE — medidas comparáveis lado a lado.
 *
 * A tela não é série temporal: são leituras que se comparam (a estimativa da
 * prova, onde escapa mais, o que vence esta semana). Barra é a forma que
 * compara; linha prometeria a série que a tela não entrega.
 */
function IconeEvolucao(props: Props) {
  return (
    <Base {...props}>
      <path d="M3.4 18.6h17.2" />
      <rect x="5.4" y="13.2" width="3.4" height="3.9" rx="0.5" />
      <rect x="10.3" y="10.1" width="3.4" height="7" rx="0.5" />
      <rect x="15.2" y="6.8" width="3.4" height="10.3" rx="0.5" />
    </Base>
  );
}

/** A PESSOA — cabeça e o arco dos ombros, aberto embaixo. */
function IconeVoce(props: Props) {
  return (
    <Base {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.6 19.2a6.4 6.4 0 0 1 12.8 0" />
    </Base>
  );
}

export const ICON_MAP: Record<StudentNavIcon, ComponentType<SVGProps<SVGSVGElement>>> = {
  conduta: IconeConduta,
  pratica: IconePratica,
  mapa: IconeMapa,
  evolucao: IconeEvolucao,
  voce: IconeVoce,
};

export function NavIcon({
  icon,
  className,
}: {
  icon: StudentNavIcon;
  className?: string;
}) {
  const Icon = ICON_MAP[icon];
  return <Icon className={className} />;
}
