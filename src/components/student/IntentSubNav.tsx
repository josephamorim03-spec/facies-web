"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { TAB_LIST_CLASS, TAB_TRIGGER_CLASS, TabsScrollArea } from "@/components/ui/Tabs";
import { getIntentChildren, isNavChildActive } from "@/lib/navConfig";

/**
 * Linha de filhos da aba atual, no desktop.
 *
 * O menu expõe só as cinco abas; sem esta camada, destinos reais como
 * Cronograma, Histórico, Pesquisar e Evolução ficam inalcançáveis. É a mesma
 * taxonomia da barra inferior do mobile (`MobileTabBar`), com a mesma marcação
 * de dados — `data-nav-surface="subrow-item"` — para que um contrato de
 * navegação valha nas duas superfícies em vez de existir duplicado.
 *
 * Reusa as classes do primitivo de abas para manter uma linguagem só; o estado
 * ativo vem de `aria-current="page"`, que o `TAB_TRIGGER_CLASS` estiliza igual
 * à aba de conteúdo.
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
                data-nav-surface="subrow-item"
                data-nav-item-href={item.href}
                data-nav-active={active ? "true" : "false"}
                className={TAB_TRIGGER_CLASS}
              >
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </TabsScrollArea>
  );
}
