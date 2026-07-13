"use client";

import React from "react";
import {
  type OperationalTurboOverview,
  type OperationalTurboReviewChange,
} from "@/lib/api";
import { AREA_BG_CLASS, AREA_TEXT_CLASS } from "@/lib/areaColors";
import { Area } from "../../_lib/cadernoShared";

function fmtTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function formatReviewDate(value: string | null | undefined): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export type TurboPerformanceReportProps = {
  totalCards: number;
  sessionCorrect: number;
  sessionIncorrect: number;
  cardTimings: number[];
  finalElapsed: number;
  isTurboMode: boolean;
  reviewChanges: OperationalTurboReviewChange[];
  finalTurboOverview?: OperationalTurboOverview | null;
  areaStats?: Record<string, { correct: number; total: number }>;
  canRepeatSession: boolean;
  turboLoading: boolean;
  isActionLocked: boolean;
  onStartRepeatAction: () => void | Promise<void>;
  handleCloseClick: () => void;
  onContinueReviewAction?: () => void;
};

export function TurboPerformanceReport({
  totalCards,
  sessionCorrect,
  sessionIncorrect,
  cardTimings,
  finalElapsed,
  isTurboMode,
  reviewChanges,
  finalTurboOverview,
  areaStats = {},
  canRepeatSession,
  turboLoading,
  isActionLocked,
  onStartRepeatAction,
  handleCloseClick,
  onContinueReviewAction,
}: TurboPerformanceReportProps) {
  const avgTime = cardTimings.length > 0 ? cardTimings.reduce((a, b) => a + b, 0) / cardTimings.length : 0;
  const fastestTime = cardTimings.length > 0 ? Math.min(...cardTimings) : 0;
  const slowestTime = cardTimings.length > 0 ? Math.max(...cardTimings) : 0;

  const movedOutNow = reviewChanges.filter((change) => change.next_due_in_days > 0.25).length;
  const backSoon = reviewChanges.filter((change) => change.next_due_in_days <= 2).length;
  const nextReviewChange = reviewChanges.reduce<OperationalTurboReviewChange | null>((closest, change) => {
    if (!closest) return change;
    return new Date(change.next_due_at).getTime() < new Date(closest.next_due_at).getTime()
      ? change
      : closest;
  }, null);
  const reviewChangesByArea = reviewChanges.reduce<Record<string, number>>((acc, change) => {
    const key = change.area ?? "OU";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  if (totalCards === 0) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: "calc(100svh - 3rem)" }}>
        <p className="rounded-lg border border-edge bg-surface p-4 text-center text-sm text-muted shadow-sm">Nenhum card disponível para revisão turbo neste momento</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="turbo-performance-report">
      <div className="space-y-3 rounded-lg border border-edge bg-surface p-4 shadow-sm">
        <p className="text-xs text-muted uppercase tracking-widest">Desempenho</p>
        <div className="flex items-end gap-8">
          <div>
            <p className="font-serif text-4xl leading-none text-ink tabular-nums">{totalCards}</p>
            <p className="text-xs text-muted mt-1">cards revisados</p>
          </div>
          {totalCards > 0 && (
            <div>
              <p className="font-serif text-4xl leading-none text-ink tabular-nums">
                {Math.round((sessionCorrect / totalCards) * 100)}%
              </p>
              <p className="text-xs text-muted mt-1">de acerto</p>
            </div>
          )}
        </div>
        {cardTimings.length > 0 && (
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 border-t border-edge pt-2 text-sm">
            <span className="text-muted">Tempo total</span>
            <span>{fmtTime(finalElapsed)}</span>
            <span className="text-muted">Tempo médio</span>
            <span>{(avgTime / 1000).toFixed(1)}s</span>
            {isTurboMode && (
              <>
                <span className="text-muted">Mais rápido</span>
                <span>{(fastestTime / 1000).toFixed(1)}s</span>
                <span className="text-muted">Mais devagar</span>
                <span>{(slowestTime / 1000).toFixed(1)}s</span>
              </>
            )}
          </div>
        )}
      </div>

      {reviewChanges.length > 0 && (
        <div className="space-y-3 rounded-lg border border-edge bg-surface p-4 shadow-sm">
          <p className="text-xs text-muted uppercase tracking-widest">O que mudou</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            <span className="text-muted">Sairam da fila de agora</span>
            <span className="text-emerald-700 font-semibold">{movedOutNow} cards</span>
            <span className="text-muted">Voltam em breve</span>
            <span className={backSoon > 0 ? "text-amber-600" : "text-muted"}>{backSoon} cards</span>
            <span className="text-muted">Próxima revisão</span>
            <span>
              {formatReviewDate(nextReviewChange?.next_due_at) || "em breve"}
            </span>
            {finalTurboOverview ? (
              <>
                <span className="text-muted">Fila restante</span>
                <span>{finalTurboOverview.due_count} cards agora</span>
              </>
            ) : null}
          </div>
          {Object.keys(reviewChangesByArea).length > 0 && (
            <div className="space-y-1">
              {Object.entries(reviewChangesByArea).map(([area, count]) => (
                <div key={area} className="flex items-center justify-between text-xs">
                  <span className={`font-semibold ${AREA_TEXT_CLASS[area as Area] ?? "text-muted"}`}>{area}</span>
                  <span className="text-muted">{count} ajustados</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {Object.keys(areaStats).length > 0 && (
        <div className="space-y-2 rounded-lg border border-edge bg-surface p-4 shadow-sm">
          <p className="text-xs text-muted uppercase tracking-widest">Por área</p>
          {Object.entries(areaStats).map(([area, stat]) => {
            const pct = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
            return (
              <div key={area} className="flex items-center gap-2">
                <span className={`text-xs font-semibold w-6 shrink-0 ${AREA_TEXT_CLASS[area as Area] ?? "text-muted"}`}>{area}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-edge">
                  <div className={`h-full rounded-full ${AREA_BG_CLASS[area as Area] ?? "bg-edge"}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-muted tabular-nums w-16 text-right shrink-0">
                  {stat.correct}/{stat.total} ({pct}%)
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {onContinueReviewAction && (
          <button
            type="button"
            onClick={onContinueReviewAction}
            className="rounded-xl border border-primary bg-primary px-3 py-2 text-xs font-semibold text-primaryInk hover:brightness-105"
          >
            Continuar minha revisão
          </button>
        )}
        {canRepeatSession && (
          <button
            type="button"
            onClick={onStartRepeatAction}
            disabled={turboLoading || isActionLocked}
            className="rounded-xl border border-edge bg-surface px-3 py-2 text-xs hover:border-primary hover:text-ink disabled:opacity-50"
          >
            Repetir sessão
          </button>
        )}
        <button
          type="button"
          onClick={handleCloseClick}
          className="rounded-xl border border-ink bg-ink px-3 py-2 text-xs text-paper hover:opacity-90"
        >
          {onContinueReviewAction ? "Voltar aos cards" : "Voltar ao caderno"}
        </button>
      </div>
    </div>
  );
}
