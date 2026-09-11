"use client";

import { type ComponentProps, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Tabs as TabsPrimitive } from "radix-ui";

/**
 * Linguagem única de abas do app: pílula num trilho discreto. Vale para abas de
 * conteúdo (Radix, aqui) e para abas de rota (links) — que reusam as classes
 * exportadas abaixo, para não nascer um segundo estilo.
 *
 * ⚠️ A PÍLULA DEIXOU DE SER PREENCHIDA em 2026-09-06, e o motivo é de sistema.
 * `bg-primary` marcava CINCO coisas ao mesmo tempo: a ação principal do dia, o
 * "continuar", a aba ativa, o interruptor segmentado e o seletor de tema. Um
 * destaque que marca cinco coisas não marca nenhuma — e no `/mapa` isso produzia
 * um botão teal cheio no topo que não fazia nada ao ser premido.
 *
 * Agora o preenchimento é só da AÇÃO. O estado selecionado passa a ser borda
 * `primary` sobre campo `wash-selecao`. A forma de pílula não mudou.
 *
 * Ergonomia embutida: alvo ≥44px no celular, scroll com snap + fade indicando
 * que há mais abas, contagem canônica e foco visível.
 *
 * ⚠️ TRÊS estados acendem a pílula, e não dois: `data-state=active` (Radix),
 * `aria-current=page` (aba que é rota) e `aria-pressed=true` (FILTRO).
 *
 * O terceiro entrou em 2026-09-10 pelo filtro de área dos Cards, que já era
 * este trilho — `TabsScrollArea` e uma cópia literal do `SCROLLER` — mas
 * pintava o escolhido de teal cheio porque nenhum seletor daqui casava com
 * ele. Um filtro não é `aria-current=page`: ele não leva a lado nenhum, e
 * mais de um pode estar ligado. A semântica certa é `aria-pressed`, então
 * quem se ajustou foi o primitivo.
 *
 * ⚠️ NÃO É o mesmo que `SegmentedToggle`, e a escolha entre os dois é por
 * MEDIDA: este trilho é `min-h-11` (44px) com scroll, snap e fade, para
 * conjuntos que não cabem na tela; o segmentado é `min-h-8/9` sem scroll,
 * para dois ou três itens inline ao lado de um rótulo. Mandar o filtro de
 * sete áreas para o segmentado encolheria o alvo de toque para 36px.
 */

const SCROLLER =
  "flex max-w-full items-center gap-1 overflow-x-auto rounded-control border border-edge bg-surface p-1 " +
  "snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

/*
 * ⚠️ ABAIXO DE 13px O DESENHO NUNCA PESA, e isto é medida, não gosto.
 *
 * Lido das 22 artboards por `scripts/spec-do-app.mjs --so-desenho`: 10px, 11px
 * e 12px aparecem 330 vezes e **sempre em 400**. Peso só começa em 13px
 * (13/500 e 13/600). O app pintava 12/600 (41x), 12/500 (24x), 11/600 (7x),
 * 11/500 (11x) e até 9/600 (10x) — cinco degraus que o desenho não tem.
 *
 * A ênfase nesse tamanho vem de outro lugar, e o próprio desenho mostra qual:
 * a `.paper-eyebrow` é 11/400 em CAIXA ALTA com `tracking`, e lê-se como
 * rótulo sem um grama de peso. Onde há estado (aba ativa, chip escolhido), quem
 * o carrega é a BORDA — ver o aviso acima. Peso continua proibido aqui.
 */

/** Base de um gatilho de aba. O estado ativo vem de `data-state` (Radix) ou `aria-current` (link). */
/**
 * ⚠️ A BORDA TRANSPARENTE NA BASE NÃO É ENFEITE.
 *
 * Sem ela a pílula ganha 2px ao ativar, dentro de um trilho que é
 * `overflow-x-auto` — e o salto empurra as irmãs, criando rolagem lateral num
 * toque que não pediu nenhuma.
 *
 * ⚠️ E A BORDA É QUEM CARREGA O ESTADO, não o campo. Medido com a fórmula do
 * `check-contrast-tokens.mjs`: `wash-selecao` contra `surface` (o trilho) dá
 * **1,16:1**. Sozinho, o campo lavado seria invisível e reprovaria a 1.4.11 da
 * WCAG, que pede 3:1 para estado de componente. A borda e o campo entram
 * juntos, sempre.
 */
export const TAB_TRIGGER_CLASS =
  "group paper-control inline-flex min-h-11 shrink-0 snap-start items-center gap-1.5 whitespace-nowrap " +
  "border border-transparent px-3 text-xs text-muted hover:text-ink md:min-h-9 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary " +
  "data-[state=active]:border-primary data-[state=active]:bg-washSelecao data-[state=active]:text-ink " +
  "aria-[current=page]:border-primary aria-[current=page]:bg-washSelecao aria-[current=page]:text-ink " +
  "aria-[pressed=true]:border-primary aria-[pressed=true]:bg-washSelecao aria-[pressed=true]:text-ink";

/** Trilho para barras de aba feitas com links (subnavegação de rota). */
export const TAB_LIST_CLASS = SCROLLER;

/**
 * Contagem ao lado do rótulo.
 *
 * ⚠️ ELA DEIXOU DE INVERTER. A cápsula era `bg-primaryInk/25` sobre o teal
 * cheio; com o campo ativo passando a `wash-selecao`, a mesma cápsula ficaria a
 * 1,02:1 contra o fundo — uma forma que não existe. O número é o conteúdo e tem
 * contraste de sobra; a cápsula é só decoração, e decoração que some não se
 * finge de presente. Muda só a tinta.
 */
export function TabCount({ children }: { children: ReactNode }) {
  return (
    <span
      className={
        "rounded-control bg-surfaceMuted px-1.5 py-0.5 text-micro tabular-nums text-muted " +
        "group-data-[state=active]:text-ink group-aria-[current=page]:text-ink"
      }
    >
      {children}
    </span>
  );
}

/**
 * Envolve um trilho rolável com as bordas em fade, mostrando que há mais abas.
 * Usado pelo `TabsList` e reaproveitável por barras de rota.
 */
export function TabsScrollArea({
  children,
  className = "",
}: {
  children: (props: {
    ref: React.RefObject<HTMLDivElement | null>;
    onScroll: () => void;
  }) => ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const sync = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdges({
      start: el.scrollLeft > 1,
      end: max > 1 && el.scrollLeft < max - 1,
    });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    sync();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, [sync]);

  return (
    <div className={`relative inline-flex max-w-full ${className}`.trim()}>
      {children({ ref, onScroll: sync })}
      {edges.start && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-1 left-1 w-6 bg-gradient-to-r from-surface to-transparent"
        />
      )}
      {edges.end && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-1 right-1 w-6 bg-gradient-to-l from-surface to-transparent"
        />
      )}
    </div>
  );
}

export function Tabs(props: ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root {...props} />;
}

export function TabsList({ className = "", ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsScrollArea>
      {({ ref, onScroll }) => (
        <TabsPrimitive.List
          {...props}
          ref={ref}
          onScroll={onScroll}
          className={`${SCROLLER} ${className}`.trim()}
        />
      )}
    </TabsScrollArea>
  );
}

export function TabsTrigger({
  className = "",
  count,
  children,
  ...props
}: ComponentProps<typeof TabsPrimitive.Trigger> & { count?: number | string | null }) {
  return (
    <TabsPrimitive.Trigger {...props} className={`${TAB_TRIGGER_CLASS} ${className}`.trim()}>
      {children}
      {count !== undefined && count !== null && <TabCount>{count}</TabCount>}
    </TabsPrimitive.Trigger>
  );
}

export function TabsContent({ className = "", ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content {...props} className={`focus-visible:outline-none ${className}`.trim()} />;
}
