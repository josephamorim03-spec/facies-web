"use client";

import Link from "next/link";
import { FLASHCARDS_LIGADOS } from "@/lib/flags";
import type { ReactNode } from "react";
import { useGraficosData } from "./_hooks/useGraficosData";
import { AccuracyChart } from "./_components/AccuracyChart";
import { AreaAccuracySnapshot } from "./_components/AreaAccuracySnapshot";
import { AreaLinesChart } from "./_components/AreaLinesChart";
import { VolumeChart } from "./_components/VolumeChart";
import { SlopeComparison } from "./_components/SlopeComparison";
import { CardsAnalysis } from "./_components/CardsAnalysis";
import { SEMANAS_PADRAO, rotuloDoPeriodo } from "./_lib/periodo";
import type { QuestionBankPerformance } from "@/lib/api";

/**
 * O cartão de gráfico — a mesma superfície dos sete cartões da Evolução.
 *
 * `paper-surface` já É `border border-edge bg-surface` com o raio do sistema;
 * o `p-4 sm:p-5` é o do `Cartao`. Ver `globals.css`.
 */
function ChartCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={`paper-surface p-4 sm:p-5 ${className}`}>
      {children}
    </article>
  );
}

export function GraficosSection({
  performance = null,
  weeks = SEMANAS_PADRAO,
}: { performance?: QuestionBankPerformance | null; weeks?: number } = {}) {
  const [state, refs, actions] = useGraficosData({ weeks });

  if (state.loading) {
    return (
      // O esqueleto usa a MESMA superfície do conteúdo que vai substituir.
      // Eram três molduras `border border-edge p-3`, sem raio e com outro
      // respiro: a tela mudava de forma ao acabar de carregar.
      <div className="ritmo-secao">
        {[180, 180, 220].map((altura, indice) => (
          <div key={indice} className="paper-surface space-y-3 p-4 sm:p-5">
            <div className="h-3 w-32 paper-skeleton" />
            <div className="paper-skeleton" style={{ height: altura }} />
          </div>
        ))}
      </div>
    );
  }

  if (state.error) {
    return (
      <ChartCard>
        <p className="text-sm leading-6 text-muted">
          Não foi possível carregar os gráficos agora. {state.error}
        </p>
        <button
          type="button"
          onClick={actions.retryCharts}
          className="paper-control mt-3 inline-flex min-h-11 items-center border border-edge bg-paper px-3 text-sm font-medium text-ink hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Tentar novamente
        </button>
      </ChartCard>
    );
  }

  if (!state.hasData) {
    return (
      <ChartCard>
        <p className="paper-eyebrow">{rotuloDoPeriodo(weeks)}</p>
        <p className="mt-2 text-sm leading-6 text-muted">
          Ainda não há questões suficientes neste período para gerar os gráficos. Conclua uma sessão para começar sua leitura de evolução.
        </p>
        {/* Mandava "conclua uma sessão" e não dizia por onde. */}
        <Link
          href="/banco"
          className="paper-control mt-3 inline-flex min-h-11 items-center rounded-control border border-edge bg-surface px-3 text-sm text-ink hover:border-primary hover:text-primary"
        >
          Montar uma sessão
        </Link>
      </ChartCard>
    );
  }

  return (
    // `md`, e não `lg`: é em `md` que o `AppShell` abre de `max-w-lg` para
    // `max-w-5xl`, e é o ponto em que a Evolução também passa a duas colunas.
    // Em `lg` os cartões ficavam numa coluna só dentro de uma casca larga.
    <div className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <ChartCard>
          <AccuracyChart state={state} refs={refs} actions={actions} />
        </ChartCard>
      </div>
      {performance ? (
        <ChartCard>
          <AreaAccuracySnapshot performance={performance} />
        </ChartCard>
      ) : null}
      {state.activeAreaLines.length > 0 ? (
        <ChartCard>
          <AreaLinesChart state={state} refs={refs} actions={actions} />
        </ChartCard>
      ) : null}
      <ChartCard>
        <VolumeChart state={state} refs={refs} actions={actions} />
      </ChartCard>
      {state.slopeData.length > 0 ? (
        <ChartCard>
          <SlopeComparison state={state} actions={actions} />
        </ChartCard>
      ) : null}
      {/* Um cartao inteiro de "Análise de cards" para quem nao tem cards. */}
      {FLASHCARDS_LIGADOS ? (
        <ChartCard>
          <CardsAnalysis state={state} />
        </ChartCard>
      ) : null}
    </div>
  );
}
