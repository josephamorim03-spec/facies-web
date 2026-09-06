import type { HTMLAttributes, ReactNode } from "react";

import type { StudentMetric } from "@/lib/api";
import type { TrainerReviewLoad } from "@/lib/api/domains/trainer";
import { Surface } from "@/components/ui/Surface";

export function StudentPage({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`student-page space-y-6 ${className}`.trim()} />;
}

export function StudentPageHeader({
  eyebrow,
  title,
  description,
  breadcrumb,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  breadcrumb?: string[];
  actions?: ReactNode;
}) {
  return (
    <header className="student-page-header flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {breadcrumb && breadcrumb.length > 1 ? (
          <p className="mb-1 text-xs text-muted" aria-label="Localização">
            {breadcrumb.join(" / ")}
          </p>
        ) : null}
        {eyebrow ? <p className="paper-eyebrow">{eyebrow}</p> : null}
        <h1 className="mt-1 text-3xl font-semibold leading-tight text-ink md:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  );
}

function metricValue(metric: StudentMetric): string {
  if (metric.value === null) return "—";
  if (typeof metric.value === "number") {
    return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(metric.value);
  }
  return metric.value;
}

export function MetricCard({ metric, compact = false }: { metric: StudentMetric; compact?: boolean }) {
  const unavailable = metric.source_status !== "complete";
  return (
    <Surface as="article" variant="outlined" className={compact ? "p-3" : "p-4"} title={`${metric.definition} Universo: ${metric.scope}`}>
      <p className="text-xs text-muted">{metric.label}</p>
      <p className={`mt-1 font-semibold tabular-nums text-ink ${compact ? "text-xl" : "text-2xl"}`}>
        {unavailable ? "—" : metricValue(metric)}
        {!unavailable && metric.unit === "%" ? <span className="text-base">%</span> : null}
      </p>
      <p className="mt-1 text-micro leading-snug text-muted">{unavailable ? "Dado indisponível" : metric.scope}</p>
    </Surface>
  );
}

export function MetricStrip({ metrics, className = "" }: { metrics: StudentMetric[]; className?: string }) {
  return (
    <div className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-4 ${className}`.trim()}>
      {metrics.map((metric) => <MetricCard key={metric.key} metric={metric} />)}
    </div>
  );
}

export function ContextNotice({
  title,
  children,
  tone = "neutral",
}: {
  title: string;
  children: ReactNode;
  tone?: "neutral" | "info" | "attention";
}) {
  const toneClass = tone === "attention" ? "border-warning/40" : tone === "info" ? "border-info/40" : "border-edge";
  return (
    <aside className={`border bg-surface px-4 py-3 ${toneClass}`}>
      <p className="text-sm font-medium text-ink">{title}</p>
      <div className="mt-1 text-xs leading-relaxed text-muted">{children}</div>
    </aside>
  );
}

export function ModuleSection({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`space-y-4 ${className}`.trim()}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-ink">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function LearningStatus({ load }: { load: TrainerReviewLoad }) {
  const items = [
    ["Tarefas temáticas", load.topic_tasks_due],
    ["Prática direcionada", load.question_practice],
    ["Cards no ponto", load.cards_due],
  ] as const;
  return (
    <Surface as="section" className="p-4" aria-label="Carga de revisão">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="paper-eyebrow">Revisão</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">Carga atual</h2>
        </div>
        <span className="text-sm font-medium tabular-nums text-muted">≈ {load.estimated_minutes} min</span>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-3">
        {items.map(([label, value]) => (
          <div key={label}>
            <dt className="text-micro leading-tight text-muted">{label}</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </Surface>
  );
}

export function DataFreshness({
  status,
  generatedAt,
  missingSources = [],
}: {
  status: "complete" | "partial" | "stale";
  generatedAt: string;
  missingSources: string[];
}) {
  const label = status === "complete" ? "Dados atualizados" : status === "stale" ? "Último retrato disponível" : "Retrato parcial";
  return (
    <p className="text-micro text-muted" title={missingSources.length ? `Fontes indisponíveis: ${missingSources.join(", ")}` : undefined}>
      {label} · {new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(generatedAt))}
    </p>
  );
}
