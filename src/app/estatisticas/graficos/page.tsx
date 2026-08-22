"use client";

import Link from "next/link";
import { GraficosSection } from "./GraficosSection";

export default function GraficosPage() {
  return (
    <div className="max-w-2xl mx-auto px-3 space-y-4">
      <div className="grid grid-cols-[1.75rem_1fr_1.75rem] items-center gap-2">
        <div className="flex justify-start">
          <span className="block h-7 w-7" aria-hidden="true" />
        </div>
        <div className="flex justify-center">
          <h1 className="paper-eyebrow leading-none text-ink">GRÁFICOS</h1>
        </div>
        <div className="flex justify-end">
          <Link
            href="/dados-e-relatorios"
            className="p-1 -mr-1 flex items-center justify-end text-muted hover:text-ink shrink-0"
            aria-label="Voltar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="butt" strokeLinejoin="miter" className="w-5 h-5" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
        </div>
      </div>

      <GraficosSection />
    </div>
  );
}
