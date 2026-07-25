"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import type { StudentToday } from "@/lib/api";

function formatPct(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "-";
  return `${Math.round(value)}%`;
}

export function TodayDetails({
  today,
  children,
}: {
  today: StudentToday;
  children?: ReactNode;
}) {
  return (
    <details className="group rounded-lg border border-edge bg-surface">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-ink sm:px-5">
        <span>Detalhes e metricas</span>
        <span className="text-muted transition group-open:rotate-90" aria-hidden="true">
          &gt;
        </span>
      </summary>
      <div className="space-y-5 border-t border-edge p-4 sm:p-5">
        {today.status !== "complete" ? (
          <p className="rounded-lg border border-edge bg-paper px-3 py-2 text-xs leading-5 text-muted">
            Alguns dados foram carregados parcialmente: {today.missing_sources.join(", ") || "fonte indisponivel"}.
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-edge bg-paper p-3">
            <p className="text-xs text-muted">Semana</p>
            <p className="mt-1 text-lg font-semibold text-ink">
              {today.progress_snapshot.questions_done_week}/{today.progress_snapshot.weekly_goal_questions}
            </p>
            <p className="text-xs text-muted">{formatPct(today.progress_snapshot.weekly_progress_pct)} da meta</p>
          </div>
          <div className="rounded-lg border border-edge bg-paper p-3">
            <p className="text-xs text-muted">Precisao</p>
            <p className="mt-1 text-lg font-semibold text-ink">
              {formatPct(today.progress_snapshot.accuracy_pct)}
            </p>
            <Link href="/dados-e-relatorios" className="text-xs font-semibold text-muted hover:text-ink">
              Ver relatorio
            </Link>
          </div>
          <div className="rounded-lg border border-edge bg-paper p-3">
            <p className="text-xs text-muted">Revisoes</p>
            <p className="mt-1 text-lg font-semibold text-ink">
              {today.review_snapshot.pending_reviews + today.review_snapshot.cards_due}
            </p>
            <p className="text-xs text-muted">{today.review_snapshot.estimated_minutes} min estimados</p>
          </div>
        </div>

        {today.details.active_session ? (
          <Link
            href={today.details.active_session.href}
            className="block rounded-lg border border-edge bg-paper p-3 hover:border-ink"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Sessao aberta</p>
            <p className="mt-1 truncate font-semibold text-ink">{today.details.active_session.title}</p>
            <p className="text-xs text-muted">
              {today.details.active_session.answered_count}/{today.details.active_session.total_questions} respondidas
            </p>
          </Link>
        ) : null}

        {today.details.schedule_suggestions_count > 0 ? (
          <p className="rounded-lg border border-edge bg-paper px-3 py-2 text-xs text-muted">
            Ha {today.details.schedule_suggestions_count} sugestao
            {today.details.schedule_suggestions_count === 1 ? "" : "oes"} de agenda pendente
            {today.details.schedule_suggestions_count === 1 ? "" : "s"}.
          </p>
        ) : null}

        {children}
      </div>
    </details>
  );
}
