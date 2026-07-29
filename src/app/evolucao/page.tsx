"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, FileText, HelpCircle, History } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  getQuestionBankPerformance,
  listQuestionBankSessions,
  type QuestionBankSession,
} from "@/lib/api";
import { useAuthToken } from "@/lib/useAuthToken";
import { queryKeys } from "@/lib/queryKeys";
import { Alert } from "@/components/ui/Alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Tooltip } from "@/components/ui/Tooltip";
import {
  studyChartTooltipContentStyle,
  studyChartTooltipCursor,
} from "@/components/charts/studyChartTooltip";

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
    <Tooltip label={text}>
      <button type="button" aria-label={text} className="p-1 text-muted hover:text-ink">
        <HelpCircle className="h-4 w-4" aria-hidden="true" />
      </button>
    </Tooltip>
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

  const areaData = useMemo(
    () =>
      (performance?.areas ?? [])
        .filter((area) => area.questions_seen > 0)
        .map((area) => ({
          area: area.label,
          primeiraTentativa: Math.round((area.accuracy ?? 0) * 100),
          questoes: area.questions_seen,
        })),
    [performance],
  );

  const comparisonData = useMemo(
    () => [
      { label: "Primeira tentativa", acerto: Math.round((performance?.first_attempt_accuracy ?? 0) * 100) },
      { label: "Repetições", acerto: Math.round((performance?.repeat_accuracy ?? 0) * 100) },
    ],
    [performance],
  );

  const tabs: Array<{ id: EvolutionTab; label: string; icon: typeof BarChart3 }> = [
    { id: "charts", label: "Gráficos", icon: BarChart3 },
    { id: "reports", label: "Relatórios", icon: FileText },
    { id: "history", label: "Histórico", icon: History },
  ];

  return (
    <div className="mx-auto max-w-5xl pb-12 pt-5">
      <header className="border-b border-edge pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Evolução</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold text-ink sm:text-4xl">
          Analise sua trajetória
        </h1>
      </header>

      <Tabs value={tab} onValueChange={(value) => setTab(value as EvolutionTab)} className="mt-5">
        <TabsList aria-label="Visões de evolução">
          {tabs.map(({ id, label, icon: Icon }) => (
            <TabsTrigger key={id} value={id}>
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

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
            <TabsContent value="charts" className="divide-y divide-edge">
              <section className="grid gap-px bg-edge sm:grid-cols-3">
                <div className="bg-paper py-6 pr-5">
                  <div className="flex items-center gap-1">
                    <p className="text-xs text-muted">Primeira tentativa</p>
                    <MetricHelp text="Usa somente a primeira resposta a cada questão, evitando que repetições inflem o percentual." />
                  </div>
                  <p className="mt-2 text-3xl font-semibold text-ink">{accuracy(performance?.first_attempt_accuracy)}</p>
                  <p className="mt-1 text-xs text-muted">{performance?.first_attempt_correct ?? 0} acertos diagnósticos</p>
                </div>
                <div className="bg-paper px-5 py-6">
                  <div className="flex items-center gap-1">
                    <p className="text-xs text-muted">Repetições</p>
                    <MetricHelp text="Mostra respostas dadas a questões já vistas. Esta taxa não altera a métrica diagnóstica." />
                  </div>
                  <p className="mt-2 text-3xl font-semibold text-ink">{accuracy(performance?.repeat_accuracy)}</p>
                  <p className="mt-1 text-xs text-muted">{performance?.repeat_attempts ?? 0} respostas repetidas</p>
                </div>
                <div className="bg-paper py-6 pl-5">
                  <p className="text-xs text-muted">Estado de prova</p>
                  <p className="mt-2 text-3xl font-semibold text-ink">{accuracy(performance?.exam.accuracy)}</p>
                  <p className="mt-1 text-xs text-muted">{performance?.exam.simulation_count ?? 0} provas concluídas</p>
                </div>
              </section>

              <section className="py-7">
                <div className="flex items-center gap-1">
                  <h2 className="text-base font-semibold text-ink">Diagnóstico e repetição</h2>
                  <MetricHelp text="As barras ficam separadas para que ganho por exposição não seja confundido com domínio inicial." />
                </div>
                <div className="mt-5 h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData} margin={{ left: 0, right: 12 }}>
                      <CartesianGrid vertical={false} stroke="var(--color-edge)" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 100]} tickLine={false} axisLine={false} />
                      <RechartsTooltip
                        formatter={(value) => [`${value}%`, "Acerto"]}
                        cursor={studyChartTooltipCursor}
                        contentStyle={studyChartTooltipContentStyle}
                      />
                      <Bar dataKey="acerto" radius={[4, 4, 0, 0]} maxBarSize={90}>
                        {comparisonData.map((entry) => (
                          <Cell
                            key={entry.label}
                            fill={entry.label === "Primeira tentativa" ? "var(--color-primary)" : "var(--color-accent)"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="py-7">
                <h2 className="text-base font-semibold text-ink">Primeira tentativa por área</h2>
                {areaData.length ? (
                  <div className="mt-5 h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={areaData} layout="vertical" margin={{ left: 24 }}>
                        <CartesianGrid horizontal={false} stroke="var(--color-edge)" />
                        <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="area" width={110} tickLine={false} axisLine={false} />
                        <RechartsTooltip formatter={(value) => [`${value}%`, "Acerto"]} contentStyle={studyChartTooltipContentStyle} />
                        <Bar dataKey="primeiraTentativa" fill="var(--color-primary)" radius={[0, 4, 4, 0]} maxBarSize={24} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted">As áreas aparecem após as primeiras questões concluídas.</p>
                )}
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
