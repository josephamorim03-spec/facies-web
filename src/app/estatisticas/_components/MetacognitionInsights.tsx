import Link from "next/link";
import { useMemo } from "react";
import type { QuestionBankLongitudinalDiagnosis, StudyPerformanceSummary } from "@/lib/api";

// Sinais de metacognição do banco (pegadinha, confiança, impulsividade, domínio
// por tópico). Antes viviam no Histórico; a análise pertence ao Desempenho.

function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  const normalized = Math.abs(Number(value)) <= 1 ? Number(value) * 100 : Number(value);
  return `${Math.round(normalized)}%`;
}

function pctNumber(value: number | null | undefined): number {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 0;
  const normalized = Math.abs(Number(value)) <= 1 ? Number(value) * 100 : Number(value);
  return Math.max(0, Math.min(100, Math.round(normalized)));
}

function IconArrowRight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M4 10h12" />
      <path d="m11 5 5 5-5 5" />
    </svg>
  );
}

export function MetacognitionInsights({
  longitudinal,
  performanceSummary,
}: {
  longitudinal: QuestionBankLongitudinalDiagnosis | null;
  performanceSummary: StudyPerformanceSummary | null;
}) {
  const weakThemes = performanceSummary?.diagnosis?.weaknesses ?? [];
  const masteryNodes = useMemo(
    () =>
      (longitudinal?.nodes ?? [])
        .filter((node) => node.exposure_count >= 2)
        .sort((a, b) => a.mastery_score - b.mastery_score)
        .slice(0, 12),
    [longitudinal],
  );

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-lg border border-edge bg-surface p-5 shadow-sm">
        <h2 className="font-serif text-2xl font-semibold">Metacognição geral</h2>
        <p className="mt-1 text-sm text-muted">Sinais agregados das respostas no banco.</p>
        <div className="mt-4 space-y-4">
          {[
            { label: "Sensibilidade a pegadinhas", value: longitudinal?.trap_sensitivity, tone: "text-warning" },
            { label: "Excesso de confiança", value: longitudinal?.overconfidence_score, tone: "text-danger" },
            { label: "Impulsividade", value: longitudinal?.impulsive_rate, tone: "text-primary" },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-ink">{item.label}</span>
                <span className={`font-semibold tabular-nums ${item.tone}`}>{formatPct(item.value ?? 0)}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-surfaceMuted">
                <div className="h-full rounded-full bg-primary" style={{ width: formatPct(item.value ?? 0) }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-edge bg-surface p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-serif text-2xl font-semibold">Temas para revisar</h2>
          <Link href="/dados-e-relatorios/relatorio" className="text-xs font-semibold text-primary hover:underline">Ver todos</Link>
        </div>
        <div className="mt-4 space-y-3">
          {weakThemes.slice(0, 5).length > 0 ? weakThemes.slice(0, 5).map((theme) => (
            <Link
              key={theme.key}
              href={`/banco-de-questoes?area=${encodeURIComponent(theme.area)}&theme=${encodeURIComponent(theme.theme)}&answer_status=unanswered_or_wrong`}
              className="block rounded-lg border border-edge bg-paper p-3 hover:border-primary"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-sm font-semibold text-ink">{theme.theme}</p>
                <span className="text-sm font-semibold text-danger">{formatPct(theme.accuracy_pct)}</span>
              </div>
              <p className="mt-1 text-xs text-muted">{theme.total_questions} questões · {theme.action_hint ?? "Revisar erros e refazer questões."}</p>
            </Link>
          )) : (
            <p className="text-sm text-muted">O diagnóstico aparece quando houver amostra suficiente.</p>
          )}
        </div>
      </section>

      {masteryNodes.length > 0 && (
        <section className="rounded-lg border border-edge bg-surface p-5 shadow-sm lg:col-span-2">
          <div>
            <h2 className="font-serif text-2xl font-semibold">Estimativa por tópico</h2>
            <p className="mt-1 text-sm text-muted">Banco de questões · estimativa longitudinal com base no histórico</p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {masteryNodes.map((node) => {
              const mastery = pctNumber(node.mastery_score);
              const retention = pctNumber(node.retention_score);
              const isWeak = longitudinal?.weak_node_ids.includes(node.knowledge_node_id);
              const isAtRisk = longitudinal?.at_risk_node_ids.includes(node.knowledge_node_id);
              const total = node.correct_count + node.error_count;
              const theme = node.node_name ?? node.knowledge_node_id;
              const barClassName = mastery < 50 ? "bg-danger" : mastery < 75 ? "bg-warning" : "bg-success";
              const textClassName = mastery < 50 ? "font-semibold text-danger" : mastery < 75 ? "font-medium text-warning" : "text-success";

              return (
                <Link
                  key={node.knowledge_node_id}
                  href={`/banco-de-questoes?theme=${encodeURIComponent(theme)}`}
                  className="block rounded-lg border border-edge bg-paper p-3 hover:border-primary"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-semibold text-ink">{theme}</p>
                    <div className="flex shrink-0 items-center gap-2 text-xs">
                      {isAtRisk && <span className="font-semibold text-warning" title="Retenção em risco">!</span>}
                      {isWeak && <span className="text-danger">frágil</span>}
                      <span className={textClassName}>{mastery}% dom.</span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surfaceMuted">
                      <div
                        className={`h-full rounded-full transition-all ${barClassName}`}
                        style={{ width: `${mastery}%` }}
                      />
                    </div>
                    <span className="w-28 shrink-0 text-right text-xs text-muted">
                      {node.correct_count}/{total} · ret. {retention}%
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="rounded-lg border border-edge bg-surface p-5 shadow-sm lg:col-span-2">
        <h2 className="font-serif text-2xl font-semibold">Ações recomendadas</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Link href="/banco-de-questoes?answer_status=wrong" className="flex items-center justify-between gap-3 rounded-lg border border-edge bg-paper p-4 hover:border-primary">
            <div>
              <p className="text-sm font-semibold text-primary">Revisar só erros</p>
              <p className="mt-1 text-xs text-muted">Foque nas questões erradas no banco.</p>
            </div>
            <IconArrowRight className="h-4 w-4 text-muted" />
          </Link>
          <Link href="/hoje" className="flex items-center justify-between gap-3 rounded-lg border border-edge bg-paper p-4 hover:border-primary">
            <div>
              <p className="text-sm font-semibold text-primary">Executar pendências</p>
              <p className="mt-1 text-xs text-muted">Voltar ao plano do dia.</p>
            </div>
            <IconArrowRight className="h-4 w-4 text-muted" />
          </Link>
          <Link href="/cards-adaptativos" className="flex items-center justify-between gap-3 rounded-lg border border-edge bg-paper p-4 hover:border-primary">
            <div>
              <p className="text-sm font-semibold text-primary">Reforçar flashcards</p>
              <p className="mt-1 text-xs text-muted">Feche lacunas com repetição espaçada.</p>
            </div>
            <IconArrowRight className="h-4 w-4 text-muted" />
          </Link>
        </div>
      </section>
    </div>
  );
}
