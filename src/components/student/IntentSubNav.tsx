"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { TAB_LIST_CLASS, TAB_TRIGGER_CLASS, TabsScrollArea } from "@/components/ui/Tabs";
import { getIntentChildren, isNavChildActive } from "@/lib/navConfig";

/**
 * Abas de rota da intenção atual (Praticar, Revisar, Acompanhar, Planejar).
 *
 * O menu lateral expõe só os 5 verbos; sem esta camada, destinos reais como
 * Sessões, Cards, Caderno, Gráficos, Relatórios e Metas ficam inalcançáveis.
 * Reusa as classes do primitivo de abas para manter uma linguagem só — o
 * estado ativo vem de `aria-current="page"`, que o `TAB_TRIGGER_CLASS` estiliza
 * igual à aba de conteúdo.
 */
export function IntentSubNav() {
  const pathname = usePathname() ?? "";
  const children = getIntentChildren(pathname);

  if (children.length < 2) return null;
  // Páginas que pertencem à intenção mas não são uma das seções (ex.: /perfil)
  // não devem exibir uma barra sem nenhuma aba ativa.
  if (!children.some((item) => isNavChildActive(pathname, item))) return null;

  return (
    <TabsScrollArea className="mb-4">
      {({ ref, onScroll }) => (
        <nav ref={ref} onScroll={onScroll} className={TAB_LIST_CLASS} aria-label="Seções desta área">
          {children.map((item) => {
            const active = isNavChildActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={TAB_TRIGGER_CLASS}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </TabsScrollArea>
  );
}
