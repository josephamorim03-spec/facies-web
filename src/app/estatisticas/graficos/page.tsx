"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { GraficosSection } from "./GraficosSection";
import { SEMANAS_PADRAO, rotuloDoPeriodo } from "./_lib/periodo";

export default function GraficosPage() {
  return (
    // ⚠️ SEM CAIXA PRÓPRIA. Aqui havia `max-w-2xl mx-auto px-3` por dentro do
    // `<main>` do `AppShell`, que já é `max-w-lg mx-auto px-4` no telefone e
    // `md:max-w-5xl px-6` no computador — duas medidas a disputar a mesma
    // largura, e no desktop a segunda vencia estreitando os gráficos a 672px
    // dentro de uma coluna de 1024. E o respiro era `space-y-4`, o quinto
    // ritmo de secção do app: `ritmo-secao` é o token que a Evolução usa.
    <div className="ritmo-secao">
      {/* O cabeçalho é o das outras telas de segundo nível (`banco/guardadas`):
          rótulo em mono, título em serifa, e a linha de procedência por baixo.
          O "GRÁFICOS" centrado entre um chevron e uma célula vazia era uma
          barra de aplicação nativa — forma que este app não usa em mais lado
          nenhum, e que gastava a largura toda para dizer uma palavra.

          ⚠️ O VOLTAR APONTAVA PARA A DIREITA E IA PARA UM REDIRECT. O chevron
          desenha "<" e estava na célula da DIREITA, contra a direção que ele
          próprio indica; o destino era `/dados-e-relatorios`, que
          `next.config.js` devolve com 308 para `/evolucao`. Agora ele é o
          próprio rótulo de origem, e leva direto à Evolução — que é de onde o
          aluno chega aqui. */}
      <header>
        <Link
          href="/evolucao"
          aria-label="Voltar para a Evolução"
          className="paper-control group -ml-1 inline-flex min-h-11 items-center gap-1 px-1 text-muted hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
          {/* `group-hover` e não `hover` no pai: `.paper-eyebrow` já traz
              `text-muted`, e as duas classes têm a mesma especificidade — o
              hover do pai não alcançaria a tinta do filho. */}
          <span className="paper-eyebrow group-hover:text-ink">evolução</span>
        </Link>
        <h1 className="mt-1 font-serif font-semibold text-ink">As séries no tempo</h1>
        <p className="mt-1 font-mono text-nota tabular-nums text-muted">
          {rotuloDoPeriodo(SEMANAS_PADRAO)}
        </p>
      </header>

      <GraficosSection />
    </div>
  );
}
