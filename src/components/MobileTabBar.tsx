"use client";

import { usePathname } from "next/navigation";
import { useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { useEffect, useState } from "react";
import { FastNavLink } from "@/components/FastNavLink";
import { ICON_MAP } from "@/components/navIcons";
import { NAV_ITEMS, isNavItemActive } from "@/lib/navConfig";

/** Distancia acumulada antes de esconder/mostrar. Abaixo disto o scroll de
 *  ajuste fino (o dedo assentando) faria a barra tremer. */
const SCROLL_THRESHOLD_PX = 56;

/**
 * ⚠️ `hasChildRow` SAIU, e com ela a linha de secoes do rodape.
 *
 * A barra inferior desenhava uma SEGUNDA fileira logo acima das abas, com as
 * secoes da area atual. O operador apontou o que ela custava: duas faixas de
 * chrome empilhadas no rodape, ~106px de tela, e uma delas com rotulos longos
 * ("O plano até a prova") truncados no meio.
 *
 * As secoes nao sumiram -- mudaram para o TOPO do conteudo, onde o `/mapa` ja
 * as punha ("A prova · A prova e você · Comparar") e onde o operador nao
 * reclamou delas. E' o mesmo componente nas duas larguras (`IntentSubNav`), com
 * as mesmas classes do primitivo de abas, entao a linguagem passou a ser uma so.
 *
 * Consequencia boa: `--nav-stack-height` deixou de ter dois valores possiveis.
 */

/**
 * Barra inferior de cinco abas — substitui o menu hamburguer no mobile.
 *
 * A linha de filhos fica LOGO ACIMA da barra e persiste enquanto o aluno esta na
 * secao: um toque chega ao destino principal e o segundo filho continua visivel.
 * Nao e sheet — sheet cobraria dois toques para a acao mais comum.
 *
 * Some e volta pela direcao do scroll (padrao YouTube). `useReducedMotion` manda:
 * quem pediu menos movimento ao sistema fica com a barra sempre visivel, porque
 * uma barra que aparece e some E movimento.
 */
/**
 * ⚠️ A BARRA DEIXOU DE MOSTRAR O ROSTO DO ALUNO (2026-09-10).
 *
 * Ela recebia `displayName`/`photoUrl` para trocar o ícone da aba "Você" por um
 * `UserAvatar` — a única convenção de rede social que este produto copiava ao pé
 * da letra, e valia a pena porque o rosto é o marcador mais rápido de "isto sou
 * eu" numa fileira de ícones iguais.
 *
 * Deixou de valer porque a aba "Você" deixou de existir. No lugar dela está
 * "Mais", que não é o aluno: é uma lista de nove destinos, dos quais a Conta é
 * UM. Pôr o rosto na aba prometeria que ela abre o perfil.
 *
 * O rosto foi para onde o operador pediu — a linha "Conta", dentro de `/mais`.
 */
export function MobileTabBar() {
  const pathname = usePathname() ?? "";
  const { scrollY } = useScroll();
  const reduceMotion = useReducedMotion();
  const [hidden, setHidden] = useState(false);
  const [anchor, setAnchor] = useState(0);

  useMotionValueEvent(scrollY, "change", (current) => {
    if (reduceMotion) return;
    const previous = scrollY.getPrevious() ?? 0;
    const goingDown = current > previous;

    // Perto do topo a barra sempre reaparece: e onde o aluno espera o menu.
    if (current < SCROLL_THRESHOLD_PX) {
      setHidden(false);
      setAnchor(current);
      return;
    }
    if (goingDown === hidden) {
      setAnchor(current);
      return;
    }
    if (Math.abs(current - anchor) < SCROLL_THRESHOLD_PX) return;
    setHidden(goingDown);
    setAnchor(current);
  });

  /**
   * O estado de escondida vira DADO, e nao so' animacao.
   *
   * A barra sai por `transform`, entao o elemento continua no layout e
   * `--nav-stack-height` -- que mede quanto a navegacao ocupa NESTA ROTA --
   * segue valendo o mesmo. Quem flutua por cima do rodape (o `BottomActionBar`)
   * ficava ancorado a 106px do nada.
   *
   * ⚠️ Escreve em `documentElement` de proposito: o consumidor nao e' descendente
   * desta barra, e subir o estado ate' o `AppShell` so' para descer de novo por
   * contexto re-renderizaria a arvore inteira a cada scroll.
   *
   * ⚠️ A limpeza devolve `1`, e nao remove a propriedade: rota imersiva desmonta
   * esta barra, e deixar `0` para tras faria a proxima tela calcular com a
   * navegacao escondida enquanto ela esta' na tela.
   */
  useEffect(() => {
    const raiz = document.documentElement;
    raiz.style.setProperty("--nav-stack-shown", hidden ? "0" : "1");
    return () => {
      raiz.style.setProperty("--nav-stack-shown", "1");
    };
  }, [hidden]);

  return (
    <div
      // 🚨 `lg:hidden`, E NÃO `md:hidden` — em tablet táctil não havia
      // navegação NENHUMA.
      //
      // Havia dois portões a medir coisas diferentes. O de JS
      // (`useDesktopNavigationMode`) exige 1024px OU ponteiro fino sem toque; o
      // de CSS escondia isto a partir de 768px. Num tablet táctil de 768–1023px
      // o JS dizia "mobile" (a sidebar devolve `null`) e o CSS dizia "desktop"
      // (esconde a barra) — e o aluno ficava sem barra e sem rail.
      //
      // ⚠️ O CSS NÃO CONSEGUE exprimir `navigator.maxTouchPoints`, então
      // replicar a condição do JS numa media query não fecha: um aparelho com
      // toque E rato casa `(hover: hover) and (pointer: fine)` e mesmo assim o
      // JS o trata como mobile. O portão de CSS passa a cobrir só o caso em que
      // há CERTEZA (≥1024px), que é o que evita o piscar antes da hidratação; da
      // hidratação em diante quem manda é a montagem em JS, que já estava certa.
      className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
      style={{
        transform: hidden ? "translateY(110%)" : "translateY(0)",
        transition: reduceMotion ? "none" : "transform var(--motion-base) var(--ease-paper)",
      }}
    >
      <nav
        aria-label="Navegação principal"
        data-nav-surface="tabbar"
        className="flex items-stretch border-t border-edge bg-surfaceMuted"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {NAV_ITEMS.map((item) => {
          const active = isNavItemActive(pathname, item);
          const Icon = ICON_MAP[item.icon];
          return (
            <FastNavLink
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              // A superficie fica no ITEM, e nao so no `<nav>` que os envolve:
              // um seletor de "aba ativa" precisa casar superficie e estado no
              // mesmo elemento. Com a marca so no container,
              // `[data-nav-surface='tabbar'][data-nav-active='true']` nunca
              // casava — e o teste que existe para provar que uma rota filha
              // acende a aba do pai passava a medir zero.
              data-nav-surface="tabbar-item"
              data-nav-item-href={item.href}
              data-nav-active={active ? "true" : "false"}
              className={[
                // 62px + safe-area: o piso de 44px de alvo com folga para o rotulo.
                //
                // ⚠️ `min-w-0` NAO E' ENFEITE. Sem ele, `flex-1` herda
                // `min-width: auto` = a largura de min-content do rotulo, que e'
                // indivisivel. Medido: a 320px com seis abas, "EVOLUÇÃO" em mono
                // de 11px pedia ~60px contra 53px disponiveis, e a barra INTEIRA
                // estourava ~40px na horizontal. O e2e so' media a 390px, entao
                // o caso nunca apareceu. A barra tem cinco abas agora, mas a
                // causa era esta -- e ela voltaria com qualquer rotulo longo.
                "flex min-h-[3.875rem] min-w-0 flex-1 flex-col items-center justify-center gap-1 border-t-2",
                active ? "border-t-primary text-primary" : "border-t-transparent text-muted",
              ].join(" ")}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {/* ⚠️ 11px, e o DESENHO PEDE 10 — desvio aprovado em 2026-08-30.

                  O piso de 11px (`text-micro`) e do sistema e existe por
                  medida, nao por gosto: abaixo dele a leitura em tela de
                  celular comeca a falhar para quem tem baixa visao. Rotulo de
                  aba e texto permanente de navegacao — o pior lugar do produto
                  para economizar um pixel de legibilidade.

                  Um pixel nao muda a composicao; a decisao esta registrada aqui
                  para que a proxima leitura do artboard nao a trate como erro a
                  consertar. */}
              {/* ⚠️ MAIUSCULA, MONO, PESO 400 — e a linha anterior dizia o
                  contrario, por ter lido o desenho no DADO em vez do render.

                  O comentario que estava aqui afirmava "o desenho pede
                  minuscula na barra e so nela". Medido no artboard `14a`
                  (y=805, as seis abas, repetido em 5 artboards — 30
                  ocorrencias):

                      hoje mapa banco evolução rotina conta
                      10px / peso 400 / DM Mono / caixa alta por text-transform

                  O texto-FONTE e minusculo; o RENDER e maiusculo. Quem leu o
                  artboard leu a string e concluiu "minuscula" — a armadilha que
                  este repositorio ja nomeou: a spec vem do desenho renderizado,
                  nao da leitura dele.

                  O tratamento resultante ja existe como token: `.paper-eyebrow`
                  e' exatamente mono + caixa alta + 11px + peso 400. A barra deixa de
                  ser a excecao e passa a usar o mesmo vocabulario do resto.

                  A TRANSFORMACAO CONTINUA EM CSS, nunca no dado: o mesmo
                  `shortLabel` vira titulo de pagina e breadcrumb, onde "você
                  está em HOJE" nao se escreve assim — e o checker de copy
                  pt-BR le o DOM, que segue acentuado.

                  Os 11px seguem sendo desvio aprovado (ver a nota acima); o que
                  mudou foram peso, familia e caixa. */}
              {/* ⚠️ `text-current` NAO e' redundante: `.paper-eyebrow` embute
                  `text-muted`, e sem isto a aba ATIVA perderia o `text-primary`
                  que o link define acima — a barra ficaria sem indicar onde
                  voce esta. A cor continua vindo do estado, no elemento pai;
                  o token entra so pela forma. */}
              <span className="paper-eyebrow max-w-full truncate leading-tight text-current">
                {item.shortLabel}
              </span>
            </FastNavLink>
          );
        })}
      </nav>
    </div>
  );
}
