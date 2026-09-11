"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { TAB_LIST_CLASS, TAB_TRIGGER_CLASS, TabsScrollArea } from "@/components/ui/Tabs";
import { getIntentChildren, isNavChildActive, navChildShortLabel } from "@/lib/navConfig";

/**
 * Linha de filhos da aba atual, no desktop.
 *
 * O menu expõe só as cinco abas; sem esta camada, destinos reais como
 * Cronograma, Histórico, Guardadas e Minha semana ficam inalcançáveis. É a mesma
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
      /* ⚠️ CENTRADO ABAIXO DE `md`, e isto é o pedido do operador: as abas
          de secção ("Praticar/Registros", "Questões/Guardadas/Histórico")
          nasciam encostadas à esquerda no telemóvel.

          A CAUSA está no primitivo: `TabsScrollArea` é `relative inline-flex`,
          logo encolhe ao conteúdo e assenta no início do bloco pai. Sem uma
          largura e um alinhamento, um trilho de duas abas ocupava um terço da
          tela e ficava colado à margem esquerda.

          Não é regra nova. `.fileira-de-controles` já a aplica
          (`> * { justify-content: center }`) e é ela que centra o trilho do
          `/mapa`; o filtro de área dos Cards já fazia `w-full justify-center`.
          Faltava aqui, e era o sítio mais visível de todos.

          ⚠️ `md:justify-start` DE PROPÓSITO: no desktop a subnavegação alinha
          com o conteúdo à esquerda, como sempre alinhou. O pedido era do
          telemóvel, e alargá-lo ao desktop mexeria no que ninguém reclamou.

          ⚠️ Centrar um trilho ROLÁVEL só é seguro porque o `TAB_LIST_CLASS`
          tem `max-w-full`: o trilho nunca excede o contentor, então nunca há
          conteúdo a transbordar para fora do início — o caso em que
          o alinhamento centrado tornaria o comeco inalcancavel. */
    <TabsScrollArea className="mb-4 w-full justify-center md:justify-start">
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
                <span>{navChildShortLabel(item)}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </TabsScrollArea>
  );
}
