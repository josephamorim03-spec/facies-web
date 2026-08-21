"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { InfoBox as HelpCircle } from "pixelarticons/react";
import { Popover } from "radix-ui";

import {
  getQuestionBankPerformance,
} from "@/lib/api";
import { useAuthToken } from "@/lib/useAuthToken";
import { queryKeys } from "@/lib/queryKeys";
import { Alert } from "@/components/ui/Alert";
import { SegmentedToggle } from "@/components/ui/SegmentedToggle";

const GraficosSection = dynamic(
  () => import("@/app/estatisticas/graficos/GraficosSection").then((mod) => mod.GraficosSection),
  {
    loading: () => (
      <div className="grid gap-4 md:grid-cols-2" aria-busy="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-72 paper-skeleton border border-edge" />
        ))}
      </div>
    ),
  },
);

/**
 * Evolução é UMA leitura: acerto ao longo do tempo, por área.
 *
 * Eram três abas. "Contexto" cruzava rotina vivida com desempenho e
 * "Relatórios" reescrevia em prosa o que os cartões de resumo já diziam — as
 * duas cobravam uma segunda visita para entregar menos que a primeira. Com uma
 * leitura só, a faixa de período deixa de ser condicional e a tela abre no
 * conteúdo, sem um seletor que não tem para onde levar.
 */
const RANGE_OPTIONS = [
  { value: "4w", label: "4 semanas", weeks: 4 },
  { value: "12w", label: "12 semanas", weeks: 12 },
  { value: "6m", label: "6 meses", weeks: 26 },
  { value: "1y", label: "1 ano", weeks: 52 },
] as const;

type RangeValue = (typeof RANGE_OPTIONS)[number]["value"];


function accuracy(value: number | null | undefined): string {
  return value == null ? "Sem base" : `${Math.round(value * 100)}%`;
}


function MetricHelp({ text }: { text: string }) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Entenda esta métrica"
          className="p-1 text-muted transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <HelpCircle className="h-4 w-4" aria-hidden="true" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          aria-label="Explicação da métrica"
          side="bottom"
          align="start"
          sideOffset={8}
          className="paper-overlay z-[100] max-w-72 border border-edge bg-ink px-3 py-2 text-xs leading-5 text-paper shadow-overlay"
        >
          {text}
          <Popover.Arrow className="fill-ink" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function SummaryMetric({
  label,
  value,
  detail,
  help,
  tone = "primary",
}: {
  label: string;
  value: string;
  detail: string;
  help?: string;
  tone?: "primary" | "accent" | "success" | "neutral";
}) {
  const toneClass = {
    primary: "border-primary/30 bg-primary/5",
    accent: "border-accent/35 bg-accent/10",
    success: "border-success/30 bg-success/10",
    neutral: "border-edge bg-surface",
  }[tone];

  return (
    <article className={`min-w-0 border p-4 ${toneClass}`}>
      <div className="flex items-center gap-1">
        <p className="text-xs font-medium text-muted">{label}</p>
        {help ? <MetricHelp text={help} /> : null}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-ink sm:text-3xl">{value}</p>
      <p className="mt-1 truncate text-xs text-muted" title={detail}>{detail}</p>
    </article>
  );
}

export default function EvolucaoPage() {
  const [range, setRange] = useState<RangeValue>("12w");
  const rangeWeeks = RANGE_OPTIONS.find((option) => option.value === range)?.weeks ?? 12;
  const { token, tokenResolved } = useAuthToken();
  const performanceQuery = useQuery({
    queryKey: queryKeys.questionBankPerformance,
    queryFn: () => getQuestionBankPerformance(token),
    enabled: tokenResolved,
  });

  const performance = performanceQuery.data ?? null;
  const loading = !tokenResolved || performanceQuery.isPending;
  const loadFailed = performanceQuery.isError;

  const areaSummary = useMemo(() => {
    const areas = (performance?.areas ?? []).filter((area) => area.questions_seen > 0 && area.accuracy !== null);
    if (!areas.length) return { strongest: null, attention: null };
    const sorted = [...areas].sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0));
    return { strongest: sorted[0], attention: sorted[sorted.length - 1] };
  }, [performance]);

  return (
    <div className="mx-auto max-w-6xl pb-12">
      <div className="flex flex-col items-center gap-3">
        <SegmentedToggle
          value={range}
          onChange={setRange}
          options={RANGE_OPTIONS.map(({ value, label }) => ({ value, label }))}
          ariaLabel="Período da leitura"
        />
      </div>

      {loading && (
        <div className="space-y-4 py-8" aria-busy="true">
          <div className="h-24 paper-skeleton" />
          <div className="h-72 paper-skeleton" />
        </div>
      )}

      {!loading && loadFailed && (
        <Alert variant="danger" className="mt-5">
          Não foi possível atualizar toda a sua evolução agora. Tente novamente em instantes.
        </Alert>
      )}

      {!loading && (
        <div className="space-y-6 pt-5">
          <section aria-labelledby="evolution-summary-title">
            <div className="mb-3">
              <h2 id="evolution-summary-title" className="text-sm font-semibold text-ink">Resumo do desempenho</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryMetric
                label="Primeira tentativa"
                value={accuracy(performance?.first_attempt_accuracy)}
                detail={`${performance?.first_attempt_correct ?? 0} acertos em ${performance?.unique_questions ?? 0} questões únicas`}
                help="Usa somente a primeira resposta a cada questão, evitando que repetições inflem o percentual."
              />
              <SummaryMetric
                label="Após revisões"
                value={accuracy(performance?.repeat_accuracy)}
                detail={`${performance?.repeat_correct ?? 0} acertos em ${performance?.repeat_attempts ?? 0} respostas repetidas`}
                help="Mostra respostas dadas a questões já vistas. Esta taxa não altera a métrica diagnóstica."
                tone="accent"
              />
              <SummaryMetric
                label="Melhor área"
                value={areaSummary.strongest ? accuracy(areaSummary.strongest.accuracy) : "Sem base"}
                detail={areaSummary.strongest ? `${areaSummary.strongest.label} · ${areaSummary.strongest.questions_seen} questões` : "Responda questões para formar sua leitura"}
                tone="success"
              />
              <SummaryMetric
                label="Área a observar"
                value={areaSummary.attention ? accuracy(areaSummary.attention.accuracy) : "Sem base"}
                detail={areaSummary.attention ? `${areaSummary.attention.label} · ${areaSummary.attention.questions_seen} questões` : "A amostra ainda não permite comparação"}
                tone="neutral"
              />
            </div>
          </section>

          <section aria-labelledby="evolution-charts-title">
            <div className="mb-3">
              <h2 id="evolution-charts-title" className="text-lg font-semibold text-ink">Leitura ao longo do tempo</h2>
              <p className="mt-1 text-sm text-muted">Toque, clique ou use o teclado nas séries para comparar períodos e áreas.</p>
            </div>
            <GraficosSection performance={performance} weeks={rangeWeeks} />
          </section>
        </div>
      )}
    </div>
  );
}
