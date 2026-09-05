"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { GraficosSection } from "./GraficosSection";

export default function GraficosPage() {
  return (
    <div className="max-w-2xl mx-auto px-3 space-y-4">
      {/* ⚠️ O VOLTAR APONTAVA PARA A DIREITA E IA PARA UM REDIRECT.
          O chevron desenha "<" -- e estava na celula da DIREITA, contra a
          direcao que ele proprio indica. E o destino era `/dados-e-relatorios`,
          que `next.config.js` devolve com 308 para `/evolucao`: um salto a
          mais para chegar ao mesmo sitio, e um href que o navegador nunca
          consegue renderizar (a regra que `navConfig` ja fixa para `matches`).

          Agora ele fica a esquerda e vai direto para a Evolucao, que e' de onde
          o aluno chega aqui. */}
      <div className="grid grid-cols-[1.75rem_1fr_1.75rem] items-center gap-2">
        <div className="flex justify-start">
          <Link
            href="/evolucao"
            className="-ml-1 flex min-h-11 items-center p-1 text-muted hover:text-ink"
            aria-label="Voltar para a Evolução"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
        <div className="flex justify-center">
          <h1 className="paper-eyebrow leading-none text-ink">GRÁFICOS</h1>
        </div>
        <span aria-hidden="true" />
      </div>

      <GraficosSection />
    </div>
  );
}
