"use client";

import { type ComponentProps, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Tabs as TabsPrimitive } from "radix-ui";

/**
 * Linguagem única de abas do app: pílula teal (o mesmo "selecionado" do resto
 * da identidade) num trilho discreto. Vale para abas de conteúdo (Radix, aqui)
 * e para abas de rota (links) — que reusam as classes exportadas abaixo, para
 * não nascer um segundo estilo.
 *
 * Ergonomia embutida: alvo ≥44px no celular, scroll com snap + fade indicando
 * que há mais abas, contagem canônica e foco visível.
 */

const SCROLLER =
  "flex max-w-full items-center gap-1 overflow-x-auto border border-edge bg-surface p-1 " +
  "snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

/** Base de um gatilho de aba. O estado ativo vem de `data-state` (Radix) ou `aria-current` (link). */
export const TAB_TRIGGER_CLASS =
  "group paper-control inline-flex min-h-11 shrink-0 snap-start items-center gap-1.5 whitespace-nowrap " +
  "px-3 text-xs font-semibold text-muted hover:text-ink md:min-h-9 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary " +
  "data-[state=active]:bg-primary data-[state=active]:text-primaryInk " +
  "aria-[current=page]:bg-primary aria-[current=page]:text-primaryInk";

/** Trilho para barras de aba feitas com links (subnavegação de rota). */
export const TAB_LIST_CLASS = SCROLLER;

/** Contagem ao lado do rótulo. Inverte sozinha quando a aba está ativa. */
export function TabCount({ children }: { children: ReactNode }) {
  return (
    <span
      className={
        "bg-surfaceMuted px-1.5 py-0.5 text-nano font-semibold tabular-nums text-muted " +
        "group-data-[state=active]:bg-primaryInk/25 group-data-[state=active]:text-primaryInk " +
        "group-aria-[current=page]:bg-primaryInk/25 group-aria-[current=page]:text-primaryInk"
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
