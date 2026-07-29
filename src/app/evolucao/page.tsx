"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, FileText, HelpCircle, History } from "lucide-react";
import { Popover } from "radix-ui";

import {
  getQuestionBankPerformance,
  listQuestionBankSessions,
  type QuestionBankSession,
} from "@/lib/api";
import { useAuthToken } from "@/lib/useAuthToken";
import { queryKeys } from "@/lib/queryKeys";
import { Alert } from "@/components/ui/Alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";

const GraficosSection = dynamic(
  () => import("@/app/estatisticas/graficos/GraficosSection").then((mod) => mod.GraficosSection),
  {
    loading: () => (
      <div className="grid gap-4 md:grid-cols-2" aria-busy="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-72 animate-pulse rounded-xl border border-edge bg-surface" />
        ))}
      </div>
    ),
  },
);

type EvolutionTab = "charts" | "reports" | "history";

const SESSION_LABELS: Record<QuestionBankSession["session_kind"], string> = {
  kros: "Kros",
  bank_topic: "Banco",
  bank_combined: "Sessão combinada",
  institutional_exam: "Prova",
};

function accuracy(value: number | null | undefined): string {
  return value == null ? "Sem base" : `${Math.round(value * 100)}%`;
}

function sessionScore(session: QuestionBankSession): {
  correct: number;
  total: number;
  pct: number | null;
} {
  const scorable = session.items.filter((item) => !item.excluded_from_scoring);
  const correct = scorable.filter((item) => item.is_correct === true).length;
  return {
    correct,
    total: scorable.length,
    pct: scorable.length ? Math.round((correct / scorable.length) * 100) : null,
  };
}

function MetricHelp({ text }: { text: string }) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Entenda esta métrica"
          className="rounded-md p-1 text-muted transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
          className="paper-overlay z-[100] max-w-72 rounded-lg border border-edge bg-ink px-3 py-2 text-xs leading-5 text-paper shadow-lg"
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
    <article className={`min-w-0 rounded-xl border p-4 ${toneClass}`}>
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
  const [tab, setTab] = useState<EvolutionTab>("charts");
  const { token, tokenResolved } = useAuthToken();
  const performanceQuery = useQuery({
    queryKey: queryKeys.questionBankPerformance,
    queryFn: () => getQuestionBankPerformance(token),
    enabled: tokenResolved,
  });
  const sessionsQuery = useQuery({
    queryKey: queryKeys.questionBankSessions("finalized"),
    queryFn: () => listQuestionBankSessions(token, { status: "finalized", limit: 100 }),
    enabled: tokenResolved,
  });

  const performance = performanceQuery.data ?? null;
  const sessions = sessionsQuery.data ?? [];
  const loading = !tokenResolved || performanceQuery.isPending || sessionsQuery.isPending;
  const loadFailed = performanceQuery.isError || sessionsQuery.isError;

  const areaSummary = useMemo(() => {
    const areas = (performance?.areas ?? []).filter((area) => area.questions_seen > 0 && area.accuracy !== null);
    if (!areas.length) return { strongest: null, attention: null };
    const sorted = [...areas].sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0));
    return { strongest: sorted[0], attention: sorted[sorted.length - 1] };
  }, [performance]);

  const tabs: Array<{ id: EvolutionTab; label: string; icon: typeof BarChart3 }> = [
    { id: "charts", label: "Gráficos", icon: BarChart3 },
    { id: "reports", label: "Relatórios", icon: FileText },
    { id: "history", label: "Histórico", icon: History },
  ];

  return (
    <div className="mx-auto max-w-6xl pb-12">
      <Tabs value={tab} onValueChange={(value) => setTab(value as EvolutionTab)}>
        <div className="flex justify-center">
          <TabsList aria-label="Visões de evolução">
            {tabs.map(({ id, label, icon: Icon }) => (
              <TabsTrigger key={id} value={id}>
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {loading && (
          <div className="space-y-4 py-8" aria-busy="true">
            <div className="h-24 animate-pulse bg-surface" />
            <div className="h-72 animate-pulse bg-surface" />
          </div>
        )}

        {!loading && loadFailed && (
          <Alert variant="danger" className="mt-5">
            Não foi possível atualizar toda a sua evolução agora. Tente novamente em instantes.
          </Alert>
        )}

        {!loading && (
          <>
            <TabsContent value="charts" className="space-y-6 pt-5">
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
                <GraficosSection performance={performance} />
              </section>
            </TabsContent>

            <TabsContent value="reports" className="divide-y divide-edge">
              <section className="py-7">
                <h2 className="text-lg font-semibold text-ink">Leitura atual</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
                  {performance?.first_attempt_accuracy == null
                    ? "Ainda não há base diagnóstica suficiente. Complete uma sessão para estabelecer sua primeira medida."
                    : `Na primeira tentativa, seu acerto é de ${accuracy(performance.first_attempt_accuracy)}. ${
                        performance.repeat_accuracy != null
                          ? `Em questões repetidas, a taxa é ${accuracy(performance.repeat_accuracy)}; ela é mostrada separadamente e não eleva o diagnóstico.`
                          : "Ainda não há volume relevante de repetições."
                      }`}
                </p>
              </section>
              <section className="py-7">
                <h2 className="text-lg font-semibold text-ink">Áreas para observar</h2>
                <div className="mt-4 divide-y divide-edge">
                  {(performance?.areas ?? []).filter((area) => area.level !== "consolidando").slice(0, 5).map((area) => (
                    <div key={area.area} className="grid gap-2 py-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
                      <p className="text-sm font-semibold text-ink">{area.label}</p>
                      <p className="text-sm leading-6 text-muted">{area.next_action}</p>
                    </div>
                  ))}
                </div>
              </section>
            </TabsContent>

            <TabsContent value="history" className="py-2">
              {sessions.length ? (
                <ol className="divide-y divide-edge">
                  {sessions.map((session) => {
                    const score = sessionScore(session);
                    return (
                      <li key={session.session_id} className="grid gap-3 py-5 sm:grid-cols-[8rem_minmax(0,1fr)_8rem] sm:items-center">
                        <div>
                          <p className="text-sm font-semibold text-ink">{SESSION_LABELS[session.session_kind]}</p>
                          <p className="mt-1 text-xs text-muted">
                            {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(session.finalized_at ?? session.updated_at))}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm text-ink">
                            {session.full_exam_name ?? session.theme ?? (session.session_kind === "bank_combined" ? "Conteúdos combinados" : "Sessão concluída")}
                          </p>
                          <p className="mt-1 text-xs text-muted">{score.correct}/{score.total} questões</p>
                        </div>
                        <div className="flex items-center justify-between gap-3 sm:justify-end">
                          <span className="text-xl font-semibold text-ink">{score.pct == null ? "-" : `${score.pct}%`}</span>
                          <Link href={`/banco/sessao/${session.session_id}`} className="text-xs font-semibold text-primary hover:underline">Resultado</Link>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="py-8 text-sm text-muted">Sessões finalizadas aparecerão aqui.</p>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
