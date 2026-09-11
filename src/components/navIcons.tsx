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
 * A FOLHA DE AGENDA COM O DIA MARCADO — as duas argolas, a faixa do cabeçalho
 * e uma célula sólida.
 *
 * ## Por que trocou o carimbo
 *
 * A aba chamava-se "Conduta" e o ícone era um CARIMBO — o bulbo com cintura, a
 * base larga e o mata-borrão: o que se decide e se assina. Ele descrevia bem um
 * ato pontual, e o ato pontual deixou de ser o assunto da aba: ela passou a ser
 * hoje, a semana e o mês. Um carimbo não tem como significar "mês".
 *
 * ## Por que isto não vira o Mapa
 *
 * O ícone do Mapa é uma grade de células DESIGUAIS separadas por linhas longas,
 * com uma marcada. Este não tem nenhuma linha divisória: só a faixa do
 * cabeçalho, que é a convenção de folha de agenda, e uma única célula sólida
 * flutuando no campo. É a diferença entre "o território repartido" e "a folha
 * do dia" — e a 21px a faixa no topo é o que separa as duas leituras.
 *
 * A célula sólida repete de propósito o device do Mapa: nesta família, cheio
 * quer dizer "este aqui".
 */
function IconePlano(props: Props) {
  return (
    <Base {...props}>
      <rect x="3.6" y="5.2" width="16.8" height="13.4" rx="1.3" />
      <path d="M3.6 9.4h16.8" />
      <path d="M8.4 3.4v3.4" />
      <path d="M15.6 3.4v3.4" />
      <rect
        x="6.6"
        y="12"
        width="3.6"
        height="3.4"
        rx="0.5"
        fill="currentColor"
        stroke="none"
      />
    </Base>
  );
}

/**
 * FICHAS EMPILHADAS — o cartão. A de trás é a que espera, a da frente está em
 * cima.
 *
 * ## Por que este ícone se dividiu em dois
 *
 * Ele chamava-se `IconePratica` e a sua própria descrição dizia: *"questão e
 * flashcard, o mesmo gesto"*. Era verdade enquanto os dois viviam na mesma aba.
 * Com Cards e Banco lado a lado na barra, um ícone que significa os dois não
 * distingue nenhum — e foi exatamente a divergência que o operador apontou ao
 * pedir "mudando o ícone e nome atuais de Prática".
 *
 * A pilha ficou com o Cards, porque a pilha sempre foi o gesto do flashcard: a
 * carta que sai de cima e vai para trás. As LINHAS DO ENUNCIADO saíram daqui —
 * enunciado é questão, e foram para o `IconeBanco`. Sem elas o par de fichas
 * lê como baralho, que é o que se quer.
 *
 * ⚠️ A da frente é OPACA de propósito. Sem o `fill`, a de trás atravessa e o
 * par deixa de ler como pilha: vira uma grade, que é justamente o ícone do
 * Mapa, duas abas adiante na mesma barra.
 */
function IconeCards(props: Props) {
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
    </Base>
  );
}

/**
 * A FICHA COM ALTERNATIVAS — uma folha só, e três linhas cada uma precedida de
 * um marcador.
 *
 * O que separa uma questão de qualquer outro texto é a LISTA DE ALTERNATIVAS.
 * O marcador à esquerda de cada linha é o A/B/C da própria tela; sem ele, três
 * linhas dentro de um retângulo são um documento genérico.
 *
 * ⚠️ FOLHA ÚNICA, e não pilha: a pilha agora é o Cards, uma aba antes na mesma
 * barra. Duas fichas empilhadas aqui repetiriam o vizinho a 21px.
 *
 * ⚠️ E sem a faixa do cabeçalho, que é o device do `IconePlano` (folha de
 * agenda). A diferença entre as duas folhas tem de ler a 21px: uma tem uma
 * linha horizontal atravessada no topo, esta tem marcadores à esquerda.
 */
function IconeBanco(props: Props) {
  return (
    <Base {...props}>
      <rect x="4.6" y="3.8" width="14.8" height="16.4" rx="1.5" />
      <circle cx="8.4" cy="9" r="0.95" fill="currentColor" stroke="none" />
      <path d="M11 9h5.2" />
      <circle cx="8.4" cy="12.6" r="0.95" fill="currentColor" stroke="none" />
      <path d="M11 12.6h5.2" />
      <circle cx="8.4" cy="16.2" r="0.95" fill="currentColor" stroke="none" />
      <path d="M11 16.2h3.4" />
    </Base>
  );
}

/**
 * A CASA — o Início.
 *
 * ⚠️ É o único símbolo genérico do conjunto, e é de propósito. Os outros
 * nomeiam um OBJETO deste produto (a folha de agenda, o baralho, a ficha com
 * alternativas, o mosaico do mapa); "Início" não é um objeto, é uma POSIÇÃO —
 * onde se aterra. Posição tem um sinal universal, e inventar outro seria
 * inventar símbolo para uma convenção: o aluno teria de aprender o nosso
 * desenho para descobrir o que já saberia à primeira vista.
 *
 * Um "painel" de blocos foi a alternativa considerada e descartada: a 21px
 * blocos soltos dentro de um campo lêem como o mosaico do Mapa, três abas
 * adiante.
 */
function IconeInicio(props: Props) {
  return (
    <Base {...props}>
      <path d="M3.8 10.4 12 4l8.2 6.4" />
      <path d="M5.6 9.1v10.3h12.8V9.1" />
      <path d="M9.9 19.4v-5.2h4.2v5.2" />
    </Base>
  );
}

/**
 * A LISTA — três linhas, cada uma com o seu marcador. O "Mais".
 *
 * ⚠️ Não é o hambúrguer (três linhas nuas) nem o "•••". O hambúrguer promete
 * uma GAVETA que sai por cima do conteúdo; o "•••" promete um menu de ações
 * sobre o que está na tela. Esta aba abre uma PÁGINA que é uma lista de
 * destinos, e o marcador à esquerda é o que diz "cada linha leva a um sítio".
 *
 * ⚠️ Os marcadores são maiores que os do `IconeBanco` e as linhas não têm
 * moldura. É o que separa "uma lista de lugares" de "as alternativas de uma
 * questão" — sem a moldura não há ficha, e sem ficha não há questão.
 */
function IconeMais(props: Props) {
  return (
    <Base {...props}>
      <circle cx="5.1" cy="6.6" r="1.35" fill="currentColor" stroke="none" />
      <path d="M9 6.6h9.9" />
      <circle cx="5.1" cy="12" r="1.35" fill="currentColor" stroke="none" />
      <path d="M9 12h9.9" />
      <circle cx="5.1" cy="17.4" r="1.35" fill="currentColor" stroke="none" />
      <path d="M9 17.4h9.9" />
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

/**
 * ⚠️ OITO ENTRADAS, e não cinco — as cinco da barra mais três de tela.
 *
 * Plano, Evolução e Conta saíram da barra em 2026-09-10 e passaram a ser
 * destinos da lista do "Mais". Continuam a precisar de ícone: a lista mostra um
 * por linha, e sem eles ou a lista fica sem símbolo ou inventa um fora do
 * conjunto — que é como este produto já teve DOIS mapas de ícone, com o mesmo
 * destino a sair com desenhos diferentes conforme a largura.
 *
 * `IconeVoce` (a pessoa) passou a servir a Conta, que é o que ela sempre
 * desenhou.
 */
/**
 * O MÊS — a folha com a grelha cheia, e não uma célula só.
 *
 * ⚠️ A distinção com o `IconePlano` é o NÚMERO de células marcadas, e é
 * deliberada: o Plano é a folha do DIA (uma célula sólida a flutuar no campo),
 * o Calendário é o MÊS (a grelha inteira). Os dois partilham a faixa do
 * cabeçalho e as argolas porque são a mesma família — folha de agenda.
 *
 * ⚠️ E não é o `IconeMapa`: aquele é uma grelha de células DESIGUAIS separadas
 * por linhas longas, onde o tamanho encoda incidência. Aqui as células são
 * todas iguais, que é o que um mês é.
 */
function IconeCalendario(props: Props) {
  return (
    <Base {...props}>
      <rect x="3.6" y="5.2" width="16.8" height="13.4" rx="1.3" />
      <path d="M3.6 9.4h16.8" />
      <path d="M8.4 3.4v3.4" />
      <path d="M15.6 3.4v3.4" />
      <path d="M7.6 12.4h.01" />
      <path d="M12 12.4h.01" />
      <path d="M16.4 12.4h.01" />
      <path d="M7.6 15.6h.01" />
      <path d="M12 15.6h.01" />
    </Base>
  );
}

/**
 * O RELÓGIO — a rotina é quanto TEMPO cabe em cada tipo de dia.
 *
 * ⚠️ Nem grelha nem barras, de propósito. A grelha é o Mapa e o Calendário; as
 * barras sobre a linha de base são a Evolução, e usá-las aqui faria duas
 * entradas do mesmo menu dizerem a mesma coisa. O relógio é a única forma do
 * conjunto que significa duração.
 *
 * Os ponteiros marcam um intervalo (não uma hora exata): é o que a tela
 * declara — "quanto dá para estudar", não "a que horas".
 */
function IconeRotina(props: Props) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 7.2v5.1l3.4 2" />
    </Base>
  );
}

export const ICON_MAP: Record<StudentNavIcon, ComponentType<SVGProps<SVGSVGElement>>> = {
  inicio: IconeInicio,
  cards: IconeCards,
  banco: IconeBanco,
  mapa: IconeMapa,
  mais: IconeMais,
  plano: IconePlano,
  evolucao: IconeEvolucao,
  conta: IconeVoce,
  // Só o desktop os desenha na navegação (`NAV_ITEMS_DESKTOP`); no telemóvel
  // continuam a ser linhas da lista do "Mais".
  calendario: IconeCalendario,
  rotina: IconeRotina,
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
