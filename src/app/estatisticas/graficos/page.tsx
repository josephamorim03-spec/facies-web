"use client";

import Link from "next/link";
import { NAV_OPEN_EVENT } from "@/components/Nav";
import { useDesktopNavigationMode } from "@/lib/useDesktopNavigationMode";
import { GraficosSection } from "./GraficosSection";

export default function GraficosPage() {
  const isDesktopNavigation = useDesktopNavigationMode();

  return (
    <div className="max-w-2xl mx-auto px-3 space-y-4">
      <div className="grid grid-cols-[1.75rem_1fr_1.75rem] items-center gap-2">
        <div className="flex justify-start">
          {!isDesktopNavigation ? (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent(NAV_OPEN_EVENT))}
              className="p-1 -ml-1 text-ink shrink-0"
              aria-label="Menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          ) : (
            <span className="block h-7 w-7" aria-hidden="true" />
          )}
        </div>
        <div className="flex justify-center">
          <h1 className="text-[10px] font-semibold uppercase leading-none tracking-[0.08em] text-ink">GRÁFICOS</h1>
        </div>
        <div className="flex justify-end">
          <Link
            href="/dados-e-relatorios"
            className="p-1 -mr-1 flex items-center justify-end text-muted hover:text-ink shrink-0"
            aria-label="Voltar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
        </div>
      </div>

      <GraficosSection />
    </div>
  );
}
