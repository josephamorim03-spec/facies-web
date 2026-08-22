"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Info as HelpCircle } from "lucide-react";
import { Popover } from "radix-ui";

import {
  getQuestionBankPerformance,
} from "@/lib/api";
import { useAuthToken } from "@/lib/useAuthToken";
import {
  PISO_N_CELULA,
  baseDaMedida,
  classificar,
  comparavel,
  valorDaMedida,
} from "@/lib/exibicaoDeMedida";
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


/**
 * §13.3: percentual só sai quando há base.
 *
 * Esta função recebia SÓ a taxa, e por isso não tinha como saber o denominador
 * — "100%" sobre uma questão saía idêntico a "100%" sobre duzentas. O `n` agora
 * é obrigatório, e a decisão mora em `classificar`.
 */
function accuracy(value: number | null | undefined, n: number | null | undefined): string {
  return valorDaMedida(classificar(value, n));
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
          className="paper-overlay z-[100] max-w-72 rounded-control border border-edge bg-ink px-3 py-2 text-xs leading-5 text-paper shadow-overlay"
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
    // `questions_seen > 0` deixava UMA questão eleger a melhor e a pior área. O
    // piso do §13.3 é o mesmo do dataset público, e comparar exige estar acima
    // dele: ordenar por uma taxa sem base é ordenar ruído.
    const areas = (performance?.areas ?? []).filter((area) =>
      comparavel(classificar(area.accuracy, area.questions_seen)),
    );
    if (!areas.length) return { strongest: null, attention: null };
    const sorted = [...areas].sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0));
    // Uma área só não produz "melhor E pior": seria a mesma célula com dois
    // rótulos opostos, o que faz a tela parecer ter medido uma diferença.
    if (sorted.length < 2) return { strongest: sorted[0], attention: null };
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
                value={accuracy(performance?.first_attempt_accuracy, performance?.unique_questions)}
                detail={baseDaMedida(
                  classificar(performance?.first_attempt_accuracy, performance?.unique_questions),
                  "questões únicas",
                )}
                help="Usa somente a primeira resposta a cada questão, evitando que repetições inflem o percentual."
              />
              <SummaryMetric
                label="Após revisões"
                value={accuracy(performance?.repeat_accuracy, performance?.repeat_attempts)}
                detail={baseDaMedida(
                  classificar(performance?.repeat_accuracy, performance?.repeat_attempts),
                  "respostas repetidas",
                )}
                help="Mostra respostas dadas a questões já vistas. Esta taxa não altera a métrica diagnóstica."
                tone="accent"
              />
              <SummaryMetric
                label="Melhor área"
                value={
                  areaSummary.strongest
                    ? accuracy(areaSummary.strongest.accuracy, areaSummary.strongest.questions_seen)
                    : "Não avaliado"
                }
                detail={
                  areaSummary.strongest
                    ? `${areaSummary.strongest.label} · ${areaSummary.strongest.questions_seen} questões`
                    : `Nenhuma área chegou a ${PISO_N_CELULA} questões`
                }
                tone="success"
              />
              <SummaryMetric
                label="Área a observar"
                value={
                  areaSummary.attention
                    ? accuracy(areaSummary.attention.accuracy, areaSummary.attention.questions_seen)
                    : "Não avaliado"
                }
                detail={
                  areaSummary.attention
                    ? `${areaSummary.attention.label} · ${areaSummary.attention.questions_seen} questões`
                    : "Duas áreas com base são o mínimo para comparar"
                }
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
