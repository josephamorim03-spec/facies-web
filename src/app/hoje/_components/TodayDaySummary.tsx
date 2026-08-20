"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, Clock3 } from "lucide-react";

import AreaDot from "@/components/AreaDot";
import { Skeleton } from "@/components/Skeleton";
import type { DayActivitySummary, DayActivitySummaryItem } from "@/app/cronograma/_lib/dayActivitySummary";
import { displayAreaLabel, resolveDisplayArea } from "@/lib/areaDisplay";

function formatDate(value: string): string {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function statusLabel(item: DayActivitySummaryItem): string {
  if (item.isNext) return "Proxima";
  if (item.status === "done") return "Concluida";
  if (item.status === "overdue") return "Atrasada";
  if (item.status === "in_progress") return "Em andamento";
  if (item.status === "scheduled") return "Prevista";
  return "Pendente";
}

function SummaryItem({ item }: { item: DayActivitySummaryItem }) {
  const area = item.area ? resolveDisplayArea(item.area, item.title, null) : null;
  const content = (
    <div className="flex min-w-0 items-center gap-3 py-2.5">
      {area ? <AreaDot area={area} size="md" /> : <span className="h-2.5 w-2.5 shrink-0 rounded-control bg-muted" aria-hidden="true" />}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-semibold text-ink">{item.title}</p>
          {item.isNext ? (
            <span className="shrink-0 rounded-control border border-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              Proxima
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted">
          {item.label}
          {area ? ` / ${displayAreaLabel(area)}` : ""}
          {item.progress ? ` / ${item.progress}` : ""}
        </p>
      </div>
      <span
        className={[
          "shrink-0 text-xs font-semibold",
          item.status === "overdue" ? "text-warning" : item.status === "done" ? "text-success" : "text-muted",
        ].join(" ")}
      >
        {statusLabel(item)}
      </span>
    </div>
  );

  if (!item.href) return <li>{content}</li>;

  return (
    <li>
      <Link href={item.href} className="block rounded-control transition hover:bg-surfaceMuted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        {content}
      </Link>
    </li>
  );
}

export function TodayDaySummarySkeleton() {
  return (
    <section className="border-y border-edge py-4" aria-label="Atividades de hoje carregando">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-36 rounded-control" />
          <Skeleton className="h-3 w-24 rounded-control" />
        </div>
        <Skeleton className="h-7 w-24 rounded-control" />
      </div>
      <div className="mt-4 space-y-3">
        <Skeleton className="h-2 w-full rounded-control" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20 rounded-control" />
          <Skeleton className="h-6 w-24 rounded-control" />
          <Skeleton className="h-6 w-16 rounded-control" />
        </div>
        <div className="divide-y divide-edge border-y border-edge">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 py-3">
              <Skeleton className="h-2.5 w-2.5 rounded-control" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3 w-3/5 rounded-control" />
                <Skeleton className="h-2.5 w-32 rounded-control" />
              </div>
              <Skeleton className="h-3 w-16 rounded-control" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TodayDaySummarySection({
  summary,
  loading,
  error,
  planningHref,
}: {
  summary: DayActivitySummary | null;
  loading: boolean;
  error: string | null;
  planningHref: string;
}) {
  if (loading && !summary) return <TodayDaySummarySkeleton />;

  if (error && !summary) {
    return (
      <section className="border-y border-edge py-4" aria-label="Atividades de hoje">
        <div className="flex items-start gap-3 rounded-control border border-edge bg-paper px-3 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h2 className="font-serif text-lg font-semibold text-ink">Atividades de hoje</h2>
            <p className="mt-1 text-sm text-muted">Não foi possível carregar o resumo do dia.</p>
          </div>
          <Link href={planningHref} className="shrink-0 text-xs font-semibold text-primary hover:underline">
            Planejamento
          </Link>
        </div>
      </section>
    );
  }

  if (!summary || summary.total === 0) {
    return (
      <section className="border-y border-edge py-4" aria-label="Atividades de hoje">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-xl font-semibold text-ink">Atividades de hoje</h2>
            <p className="mt-1 text-sm text-muted">Nenhuma atividade planejada para hoje.</p>
          </div>
          <Link href={planningHref} className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary hover:underline">
            Abrir planejamento
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    );
  }

  const progressPct = summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0;
  const visibleItems = summary.items.slice(0, 4);
  const hiddenCount = Math.max(0, summary.items.length - visibleItems.length);
  const allDone = summary.completed === summary.total;

  return (
    <section className="border-y border-edge py-4" aria-label="Atividades de hoje" aria-busy={loading ? "true" : undefined}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-serif text-xl font-semibold text-ink">Atividades de hoje</h2>
          <p className="mt-1 text-sm text-muted">
            {formatDate(summary.dateIso)} / {summary.completed} de {summary.total} concluida{summary.total === 1 ? "" : "s"}
          </p>
        </div>
        <Link href={planningHref} className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary hover:underline">
          Planejamento
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-4">
        <div className="h-2 overflow-hidden rounded-control bg-surfaceMuted" role="progressbar" aria-label="Progresso das atividades de hoje" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPct}>
          <div className="h-full rounded-control bg-primary" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {allDone ? (
            <span className="inline-flex items-center gap-1.5 rounded-control border border-success/40 px-2 py-1 text-xs font-semibold text-success">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Tudo concluido
            </span>
          ) : null}
          {summary.inProgress > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-control border border-primary/50 px-2 py-1 text-xs font-semibold text-primary">
              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
              {summary.inProgress} em andamento
            </span>
          ) : null}
          {summary.overdue > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-control border border-warning/50 px-2 py-1 text-xs font-semibold text-warning">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              {summary.overdue} atrasada{summary.overdue === 1 ? "" : "s"}
            </span>
          ) : null}
          {summary.categories.filter((category) => category.key !== "session" || summary.inProgress === 0).map((category) => (
            <span key={category.key} className="rounded-control border border-edge px-2 py-1 text-xs font-semibold text-muted">
              {category.label}: {category.count}
            </span>
          ))}
        </div>
      </div>

      <ul className="mt-3 divide-y divide-edge border-y border-edge">
        {visibleItems.map((item) => (
          <SummaryItem key={item.key} item={item} />
        ))}
      </ul>
      {hiddenCount > 0 ? (
        <p className="mt-3 text-xs text-muted">
          Mais {hiddenCount} item{hiddenCount === 1 ? "" : "s"} ficam no planejamento.
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 text-xs text-warning">Resumo mantido enquanto a atualizacao falhou.</p>
      ) : null}
      {/* Sem aviso de "atualizando": o `aria-busy` acima ja anuncia o estado, e
          um terceiro sinal de carregamento sobre um bloco que tem skeleton era
          parte do que fazia a tela parecer ter duas origens de loading. */}
    </section>
  );
}
