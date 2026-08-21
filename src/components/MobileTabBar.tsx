"use client";

import { usePathname } from "next/navigation";
import { useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { useState } from "react";
import { Calendar as CalendarDays, AvatarSquare as CircleUserRound, Home as House, Notes as Layers3, Library as LibraryBig, Gps as Navigation } from "pixelarticons/react";
import type { ComponentType, SVGProps } from "react";

import { FastNavLink } from "@/components/FastNavLink";
import {
  NAV_ITEMS,
  getIntentChildren,
  isNavChildActive,
  isNavItemActive,
  type StudentNavIcon,
} from "@/lib/navConfig";

const ICON_MAP: Record<StudentNavIcon, ComponentType<SVGProps<SVGSVGElement>>> = {
  today: House,
  bank: LibraryBig,
  rota: Navigation,
  cards: Layers3,
  profile: CircleUserRound,
};

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
                  "flex min-h-10 flex-1 items-center justify-center border px-3 text-nano font-semibold uppercase tracking-[0.1em]",
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
          const Icon = ICON_MAP[item.icon] ?? LibraryBig;
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
              <span className="text-pico font-semibold uppercase tracking-[0.08em]">{item.shortLabel}</span>
            </FastNavLink>
          );
        })}
      </nav>
    </div>
  );
}
