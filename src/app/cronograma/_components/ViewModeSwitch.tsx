"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Skeleton } from "@/components/Skeleton";
import { writeCronogramaViewModeSession } from "../_lib/viewModeSession";

type ViewMode = "month" | "week";

function IconToday({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" strokeLinejoin="miter"
      className={`shrink-0 ${className ?? ""}`} aria-hidden="true">
      <rect x="2.5" y="2.5" width="15" height="15" rx="2" />
      <line x1="2.5" y1="6" x2="17.5" y2="6" />
      <circle cx="10" cy="12" r="2.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconMonth({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" strokeLinejoin="miter"
      className={`shrink-0 ${className ?? ""}`} aria-hidden="true">
      <rect x="2.5" y="2.5" width="15" height="15" rx="2" />
      <line x1="2.5" y1="6" x2="17.5" y2="6" />
      <line x1="7" y1="6" x2="7" y2="15" />
      <line x1="13" y1="6" x2="13" y2="15" />
      <line x1="3.5" y1="11" x2="16.5" y2="11" />
    </svg>
  );
}

function persistViewFromHref(href: string) {
  // Compara so o caminho: os alvos passaram a carregar `?view=month`, e a
  // comparacao exata deixaria de casar em silencio — a preferencia de visao
  // simplesmente nao seria gravada.
  const path = href.split("?")[0];
  if (path === "/hoje") writeCronogramaViewModeSession("week");
  else if (path === "/agenda-operacional" || path === "/cronograma") {
    writeCronogramaViewModeSession("month");
  }
}

export function ViewModeSwitch({ activeView, hideOnMobile }: { activeView: ViewMode; hideOnMobile?: boolean }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const targetView: ViewMode = activeView === "month" ? "week" : "month";
  const href = targetView === "week" ? "/hoje" : "/agenda-operacional";
  const label = targetView === "week" ? "Hoje" : "Mês";
  const Icon = targetView === "week" ? IconToday : IconMonth;

  // Mede o texto real no DOM para calcular a largura exata do botão expandido.
  // Evita dead space sem precisar chutar medidas de fonte.
  const labelMeasureRef = useRef<HTMLSpanElement>(null);
  const [expandedWidth, setExpandedWidth] = useState("120px"); // fallback pré-medição

  useLayoutEffect(() => {
    if (!labelMeasureRef.current) return;
    const textW = Math.ceil(labelMeasureRef.current.getBoundingClientRect().width);
    // w-11(44px ícone) + texto + 4px gap visual + pr-4(16px) + 2px safety
    setExpandedWidth(`${48 + textW + 22}px`);
  }, [label]);

  function handleFabClick() {
    if (!open) {
      // First tap: expand the button
      setOpen(true);
      if (closeTimer.current) clearTimeout(closeTimer.current);
      closeTimer.current = setTimeout(() => setOpen(false), 2500);
    } else {
      // Second tap: navigate
      if (closeTimer.current) clearTimeout(closeTimer.current);
      setOpen(false);
      persistViewFromHref(href);
      router.push(href);
    }
  }

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  return (
    <>
      {/* Mobile: morphing FAB — bottom-left to avoid conflict with calendar (+) button */}
      <div className={`md:hidden${hideOnMobile ? " hidden" : ""}`}>
        {/* Span fora da tela — mede o texto real na fonte correta antes de animar */}
        <span
          ref={labelMeasureRef}
          className="fixed top-0 left-[-9999px] font-serif text-sm whitespace-nowrap pointer-events-none select-none"
          aria-hidden="true"
        >
          {label}
        </span>
        <button
          type="button"
          onClick={handleFabClick}
          aria-label={open ? `Navegar para ${label}` : `Ir para ${label}`}
          aria-expanded={open}
          style={{
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
            width: open ? expandedWidth : "48px",
          }}
          className="fixed left-4 z-40 h-12 flex items-center overflow-hidden rounded-control bg-ink text-paper shadow-lg transition-[width] duration-300 ease-in-out"
        >
          {/* Wrapper w-12 fixo: texto começa exatamente em 48px, zero sangramento */}
          <span className="w-12 h-12 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5" />
          </span>
          <span className="font-serif text-sm whitespace-nowrap pr-4 select-none">
            {label}
          </span>
        </button>
      </div>

      {/* Desktop: slim tab strip rendered at its position in the document flow */}
      <div className="hidden md:flex items-center gap-5 border-t border-edge pt-3">
        <Link
          href="/hoje"
          onClick={() => persistViewFromHref("/hoje")}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            activeView === "week" ? "text-ink font-medium" : "text-muted hover:text-ink"
          }`}
          aria-current={activeView === "week" ? "page" : undefined}
        >
          <IconToday className="w-4 h-4" />
          <span className="font-serif">Hoje</span>
        </Link>
        {/* Direto para a visao de mes: `/agenda-operacional` so redirecionava
            de volta para ca, uma ida e volta por um alias legado para trocar um
            parametro de query. */}
        <Link
          href="/cronograma?view=month"
          onClick={() => persistViewFromHref("/cronograma?view=month")}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            activeView === "month" ? "text-ink font-medium" : "text-muted hover:text-ink"
          }`}
          aria-current={activeView === "month" ? "page" : undefined}
        >
          <IconMonth className="w-4 h-4" />
          <span className="font-serif">Mês</span>
        </Link>
      </div>
    </>
  );
}

export function ViewModeFabInline({ activeView }: { activeView: ViewMode }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const targetView: ViewMode = activeView === "month" ? "week" : "month";
  const href = targetView === "week" ? "/hoje" : "/agenda-operacional";
  const label = targetView === "week" ? "Hoje" : "Mês";
  const Icon = targetView === "week" ? IconToday : IconMonth;

  const labelMeasureRef = useRef<HTMLSpanElement>(null);
  const [expandedWidth, setExpandedWidth] = useState("120px");

  useLayoutEffect(() => {
    if (!labelMeasureRef.current) return;
    const textW = Math.ceil(labelMeasureRef.current.getBoundingClientRect().width);
    setExpandedWidth(`${48 + textW + 22}px`);
  }, [label]);

  function handleFabClick() {
    if (!open) {
      setOpen(true);
      if (closeTimer.current) clearTimeout(closeTimer.current);
      closeTimer.current = setTimeout(() => setOpen(false), 2500);
    } else {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      setOpen(false);
      persistViewFromHref(href);
      router.push(href);
    }
  }

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  return (
    <>
      <span
        ref={labelMeasureRef}
        className="fixed top-0 left-[-9999px] font-serif text-sm whitespace-nowrap pointer-events-none select-none"
        aria-hidden="true"
      >
        {label}
      </span>
      <button
        type="button"
        onClick={handleFabClick}
        aria-label={open ? `Navegar para ${label}` : `Ir para ${label}`}
        aria-expanded={open}
        style={{ width: open ? expandedWidth : "48px" }}
        className="h-12 flex items-center overflow-hidden rounded-control bg-ink text-paper shadow-lg transition-[width] duration-300 ease-in-out"
      >
        <span className="w-12 h-12 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5" />
        </span>
        <span className="font-serif text-sm whitespace-nowrap pr-4 select-none">
          {label}
        </span>
      </button>
    </>
  );
}

export function ViewModeSwitchSkeleton({ className: _ }: { className?: string }) {
  return (
    <div className="hidden md:flex items-center gap-5 border-t border-edge pt-3" aria-hidden="true">
      <div className="flex items-center gap-1.5">
        <Skeleton className="w-4 h-4 rounded-control" />
        <Skeleton className="h-4 w-14 rounded-control" />
      </div>
      <div className="flex items-center gap-1.5">
        <Skeleton className="w-4 h-4 rounded-control" />
        <Skeleton className="h-4 w-10 rounded-control" />
      </div>
    </div>
  );
}
