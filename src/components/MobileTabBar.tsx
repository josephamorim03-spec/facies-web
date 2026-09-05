"use client";

import { usePathname } from "next/navigation";
import { useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { useEffect, useState } from "react";
import { FastNavLink } from "@/components/FastNavLink";
import { ICON_MAP } from "@/components/navIcons";
import {
  NAV_ITEMS,
  getIntentChildren,
  isNavChildActive,
  isNavItemActive,
} from "@/lib/navConfig";

/** Distancia acumulada antes de esconder/mostrar. Abaixo disto o scroll de
 *  ajuste fino (o dedo assentando) faria a barra tremer. */
const SCROLL_THRESHOLD_PX = 56;

/**
 * A linha de filhos aparece? O `AppShell` precisa da MESMA resposta para
 * reservar a altura certa no `<main>` — com ela visivel a barra tem ~106px, sem
 * ela ~62px, e reservar so 62px fazia a linha cobrir o fim do conteudo.
 */
export function hasChildRow(pathname: string): boolean {
  const children = getIntentChildren(pathname);
  return children.length >= 2 && children.some((item) => isNavChildActive(pathname, item));
}

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

  const children = getIntentChildren(pathname);
  const showChildren = hasChildRow(pathname);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 md:hidden"
      style={{
        transform: hidden ? "translateY(110%)" : "translateY(0)",
        transition: reduceMotion ? "none" : "transform var(--motion-base) var(--ease-paper)",
      }}
    >
      {showChildren && (
        <nav
          aria-label="Seções desta área"
          className="flex items-center gap-1 border-t border-edge bg-paper px-3 pb-1 pt-1"
        >
          {children.map((item) => {
            const active = isNavChildActive(pathname, item);
            return (
              <FastNavLink
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                // Superficie propria: distingue o filho da aba-pai em qualquer
                // seletor, sem depender de aninhamento no DOM.
                data-nav-surface="subrow-item"
                data-nav-item-href={item.href}
                data-nav-active={active ? "true" : "false"}
                className={[
                  "flex min-h-10 flex-1 items-center justify-center border px-3 text-xs font-medium",
                  active
                    ? "border-primary bg-primary text-primaryInk"
                    : "border-edge bg-surface text-muted",
                ].join(" ")}
              >
                {item.label}
              </FastNavLink>
            );
          })}
        </nav>
      )}

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
                "flex min-h-[3.875rem] flex-1 flex-col items-center justify-center gap-1 border-t-2",
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
              <span className="paper-eyebrow leading-tight text-current">
                {item.shortLabel}
              </span>
            </FastNavLink>
          );
        })}
      </nav>
    </div>
  );
}
