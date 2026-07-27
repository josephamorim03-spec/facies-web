"use client";

import { useEffect, useRef, useState } from "react";
import { WeeklyOpsMetrics, WeeklyOpsRiskLevel } from "../_lib/weeklyOpsMetrics";
import { Skeleton } from "@/components/Skeleton";

type Props = {
  metrics: WeeklyOpsMetrics;
  className?: string;
};

type CompactProps = {
  metrics: WeeklyOpsMetrics;
  className?: string;
  compact?: boolean;
};

const RISK_LABELS: Record<WeeklyOpsRiskLevel, string> = {
  low: "Baixo",
  medium: "Moderado",
  high: "Alto",
};

const RISK_TEXT: Record<WeeklyOpsRiskLevel, string> = {
  low: "text-success",
  medium: "text-warning",
  high: "text-danger",
};

type PopupPosition = {
  left: number;
  top: number;
  width: number;
};

const POPUP_MARGIN = 8;
const POPUP_GAP = 8;
const POPUP_MAX_WIDTH = 280;
const POPUP_ESTIMATED_HEIGHT = 210;

type GoalWarningTone = "none" | "yellow" | "orange" | "red";

function formatDayMonth(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
}

const FULL_R = 36;
const FULL_CIRC = 2 * Math.PI * FULL_R;

function ArcGaugeFull({
  pct,
  progressStrokeColor = "var(--color-ink)",
}: {
  pct: number;
  progressStrokeColor?: string;
}) {
  const safeP = Math.min(100, Math.max(0, pct));
  const offset = FULL_CIRC * (1 - safeP / 100);
  return (
    <div className="relative inline-flex items-center justify-center w-[88px] h-[88px] shrink-0">
      <svg width="88" height="88" viewBox="0 0 88 88" className="-rotate-90" aria-hidden="true">
        <circle cx="44" cy="44" r={FULL_R} fill="none" stroke="var(--color-edge)" strokeWidth="5" />
        <circle
          cx="44"
          cy="44"
          r={FULL_R}
          fill="none"
          stroke={progressStrokeColor}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={FULL_CIRC}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.35s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-xl font-serif leading-none">{pct}%</span>
      </div>
    </div>
  );
}

const MINI_R = 10;
const MINI_CIRC = 2 * Math.PI * MINI_R;

function ArcGaugeMini({
  pct,
  progressStrokeColor = "var(--color-ink)",
}: {
  pct: number;
  progressStrokeColor?: string;
}) {
  const safeP = Math.min(100, Math.max(0, pct));
  const offset = MINI_CIRC * (1 - safeP / 100);
  return (
    <svg width="25" height="25" viewBox="0 0 28 28" className="-rotate-90 shrink-0" aria-hidden="true">
      <circle cx="14" cy="14" r={MINI_R} fill="none" stroke="var(--color-edge)" strokeWidth="3" />
      <circle
        cx="14"
        cy="14"
        r={MINI_R}
        fill="none"
        stroke={progressStrokeColor}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={MINI_CIRC}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.35s ease" }}
      />
    </svg>
  );
}

function cc(base: string, extra?: string): string {
  return extra ? `${base} ${extra}` : base;
}

function getGoalWarningTone(metrics: WeeklyOpsMetrics): GoalWarningTone {
  const showSevereGoalDelayWarning = metrics.showSevereWeeklyGoalDelay;
  const showPaceGoalWarning = !showSevereGoalDelayWarning && metrics.showPaceWeeklyGoalWarning;
  const progressLagPct = Math.max(0, metrics.expectedProgressPctThisWeek - metrics.progressPct);

  if (showSevereGoalDelayWarning) return "red";
  if (showPaceGoalWarning && progressLagPct >= 30) return "orange";
  if (showPaceGoalWarning) return "yellow";
  return "none";
}

function getGoalToneStrokeColor(tone: GoalWarningTone): string {
  if (tone === "red") return "#dc2626";
  if (tone === "orange") return "#ea580c";
  if (tone === "yellow") return "#ca8a04";
  return "var(--color-ink)";
}

function getGoalToneTextClass(tone: GoalWarningTone): string {
  if (tone === "red") return "text-red-700 dark:text-red-300";
  if (tone === "orange") return "text-orange-700 dark:text-orange-300";
  if (tone === "yellow") return "text-amber-700 dark:text-amber-300";
  return "text-ink";
}

function getGoalHoverAuraClass(tone: GoalWarningTone): string {
  if (tone === "red") return "hover:shadow-[0_0_0_3px_rgba(220,38,38,0.30)]";
  if (tone === "orange") return "hover:shadow-[0_0_0_3px_rgba(234,88,12,0.28)]";
  if (tone === "yellow") return "hover:shadow-[0_0_0_3px_rgba(202,138,4,0.25)]";
  return "";
}

export function WeeklyOpsFullCards({ metrics, className }: Props) {
  const riskText = RISK_TEXT[metrics.riskLevel];
  const showSevereGoalDelayWarning = metrics.showSevereWeeklyGoalDelay;
  const showPaceGoalWarning = !showSevereGoalDelayWarning && metrics.showPaceWeeklyGoalWarning;
  const showGoalDelayWarning = showSevereGoalDelayWarning || showPaceGoalWarning;
  const warningTone = getGoalWarningTone(metrics);
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupPosition, setPopupPosition] = useState<PopupPosition>({
    left: POPUP_MARGIN,
    top: POPUP_MARGIN,
    width: POPUP_MAX_WIDTH,
  });
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!popupOpen) {
      return;
    }

    function updatePopupPosition() {
      const trigger = triggerRef.current;
      if (!trigger) {
        return;
      }

      const rect = trigger.getBoundingClientRect();
      const width = Math.min(POPUP_MAX_WIDTH, window.innerWidth - POPUP_MARGIN * 2);
      const centeredLeft = rect.left + rect.width / 2 - width / 2;
      const left = Math.min(Math.max(POPUP_MARGIN, centeredLeft), window.innerWidth - width - POPUP_MARGIN);

      const fitsBelow = rect.bottom + POPUP_GAP + POPUP_ESTIMATED_HEIGHT <= window.innerHeight - POPUP_MARGIN;
      const top = fitsBelow
        ? rect.bottom + POPUP_GAP
        : Math.max(POPUP_MARGIN, rect.top - POPUP_ESTIMATED_HEIGHT - POPUP_GAP);

      setPopupPosition({ left, top, width });
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPopupOpen(false);
      }
    }

    updatePopupPosition();
    window.addEventListener("resize", updatePopupPosition);
    window.addEventListener("scroll", updatePopupPosition, true);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", updatePopupPosition);
      window.removeEventListener("scroll", updatePopupPosition, true);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [popupOpen]);

  const goalPanelBaseClass = "flex w-[118px] shrink-0 self-stretch flex-col items-center justify-between rounded-sm px-2 py-1 text-center";
  const goalPanelClass = goalPanelBaseClass;
  const progressStrokeColor = getGoalToneStrokeColor(warningTone);
  const warningTextClass = getGoalToneTextClass(warningTone);
  const goalHoverAuraClass = getGoalHoverAuraClass(warningTone);

  return (
    <section className={cc("space-y-3", className)}>
      <div data-weekly-header="true" className="flex flex-col items-center text-center">
        <span className="text-sm font-semibold text-ink">
          {formatDayMonth(metrics.weekStart)} - {formatDayMonth(metrics.weekEnd)}
        </span>
      </div>

      <div className="relative flex items-stretch gap-4">
        {showGoalDelayWarning ? (
          <button
            ref={triggerRef}
            type="button"
            data-warning-tone={warningTone}
            className={`${goalPanelClass} transition-shadow ${goalHoverAuraClass}`}
            onClick={() => setPopupOpen((value) => !value)}
            aria-label="Detalhes da meta semanal"
            aria-expanded={popupOpen}
          >
            <p className="text-[10px] uppercase tracking-wide text-muted">Meta semanal</p>
            <ArcGaugeFull
              pct={metrics.progressPct}
              progressStrokeColor={progressStrokeColor}
            />
            <p data-weekly-goal-status="true" className={`text-[10px] leading-none font-medium ${warningTextClass}`}>
              {showSevereGoalDelayWarning ? "Atraso alto" : "Abaixo do ritmo"}
            </p>
          </button>
        ) : (
          <div className={goalPanelClass} data-warning-tone={warningTone}>
            <p className="text-[10px] uppercase tracking-wide text-muted">Meta semanal</p>
            <ArcGaugeFull
              pct={metrics.progressPct}
            />
          </div>
        )}

        <div data-weekly-meta-divider="true" className="w-px shrink-0 self-stretch bg-edge" aria-hidden="true" />

        <div className="flex-1 self-stretch py-1 flex flex-col items-start">
          <p className="text-[10px] uppercase tracking-wide text-muted self-center">Atividades da semana</p>
          <div className="mt-2 flex-1 space-y-2 w-full">
            {metrics.doneTaskCount > 0 && (
              <div className="flex items-center justify-between w-full">
                <span className="text-xs text-muted">Concluídas</span>
                <span className="text-xs font-medium text-emerald-600">
                  {metrics.doneTaskCount} - {metrics.burnDownDoneQuestions}q
                </span>
              </div>
            )}
            {metrics.overdueCount > 0 && (
              <div className="flex items-center justify-between w-full">
                <span className="text-xs text-muted">Atrasadas</span>
                <span className="text-xs font-medium text-red-600">
                  {metrics.overdueCount} - {metrics.overdueQuestions}q
                </span>
              </div>
            )}
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-muted">A fazer</span>
              <span className="text-xs">{metrics.pendingWeekCount} - {metrics.pendingWeekQuestions}q</span>
            </div>
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-muted">Total pendente</span>
              <span className="text-xs font-medium">{metrics.operationalDebtQuestions}q</span>
            </div>
            <div className="h-px bg-edge w-full" />
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-muted">Ritmo necessário</span>
              <span className="text-xs font-medium">
                {metrics.dailyRequiredQuestions > 0 ? `${metrics.dailyRequiredQuestions}q/dia` : "Em dia"}
              </span>
            </div>
            {metrics.burnDownTotalQuestions > 0 && (
              <div className="space-y-1 w-full">
                <div className="flex items-center justify-between w-full text-[10px] text-muted">
                  <span>Progresso</span>
                  <span>{metrics.burnDownPct}%</span>
                </div>
                <div className="h-1 bg-edge rounded-full overflow-hidden">
                  <div
                    className="h-full bg-ink transition-all duration-500"
                    style={{ width: `${metrics.burnDownPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          <p data-weekly-risk-inline="true" className={`mt-2 text-[10px] leading-none font-medium ${riskText}`}>
            Risco {RISK_LABELS[metrics.riskLevel]}
          </p>
        </div>

        {popupOpen && showGoalDelayWarning && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setPopupOpen(false)} />
            <div
              role="dialog"
              aria-label="Status da meta semanal"
              className="fixed z-50 space-y-2 border border-amber-300 bg-paper p-3 shadow-md rounded-md dark:border-amber-700 whitespace-normal"
              style={{
                left: `${popupPosition.left}px`,
                top: `${popupPosition.top}px`,
                width: `${popupPosition.width}px`,
                maxWidth: `calc(100vw - ${POPUP_MARGIN * 2}px)`,
              }}
            >
              <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                {showSevereGoalDelayWarning ? "Meta semanal em atraso" : "Meta semanal abaixo do ritmo"}
              </p>
              <p className="text-xs text-ink">
                Progresso atual: {metrics.progressPct}% · esperado: ~{metrics.expectedProgressPctThisWeek}%.
              </p>
              <p className="text-xs text-ink">Faltam {metrics.weeklyGoalRemainingQuestions}q para atingir a meta semanal.</p>
              <p className="text-xs text-ink">
                Média necessária até {formatDayMonth(metrics.weekEnd)}: <span className="font-medium">{metrics.dailyRequiredToHitWeeklyGoal}q/dia</span>.
              </p>
              <p className="text-xs text-muted">Atrasadas: {metrics.overdueCount} tarefas ({metrics.overdueQuestions}q).</p>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export function WeeklyOpsFullCardsSkeleton({ className }: { className?: string }) {
  return (
    <section className={cc("space-y-3", className)} aria-hidden="true">
      <div className="flex items-center justify-between">
        <Skeleton className="h-2.5 w-24 rounded-sm" />
        <Skeleton className="h-2.5 w-16 rounded-sm" />
      </div>
      <div className="flex items-stretch gap-5">
        <Skeleton className="w-[88px] h-[88px] rounded-full shrink-0" />
        <div className="w-px self-stretch bg-edge shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-2.5 w-20 rounded-sm" />
              <Skeleton className="h-2.5 w-12 rounded-sm" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function WeeklyOpsCompactSummary({ metrics, className, compact = false }: CompactProps) {
  const riskText = RISK_TEXT[metrics.riskLevel];
  const warningTone = getGoalWarningTone(metrics);
  const progressStrokeColor = getGoalToneStrokeColor(warningTone);
  const metaTextClass = getGoalToneTextClass(warningTone);

  return (
    <section
      className={cc("flex w-full items-center justify-center gap-6 py-1 text-center", className)}
      data-weekly-compact-summary="true"
      data-compact-layout="centered"
    >
      <div
        data-compact-meta="true"
        className="flex min-w-[92px] items-center justify-center gap-1.5"
        data-warning-tone={warningTone}
      >
        <ArcGaugeMini pct={metrics.progressPct} progressStrokeColor={progressStrokeColor} />
        <div className="leading-tight">
          <p className={compact ? "text-[10px] text-muted" : "text-xs text-muted"}>Meta</p>
          <p className={`${compact ? "text-xs" : "text-sm"} font-medium ${metaTextClass}`}>{metrics.progressPct}%</p>
        </div>
      </div>
      <div data-compact-divider="true" className={cc("w-px bg-edge shrink-0", compact ? "h-7" : "h-10")} />
      <div data-compact-rhythm="true" className="min-w-[92px] leading-tight">
        <p className={compact ? "text-[10px] text-muted" : "text-xs text-muted"}>Ritmo</p>
        <p data-risk-level={metrics.riskLevel} className={`${compact ? "text-xs" : "text-sm"} font-medium ${riskText}`}>
          {metrics.dailyRequiredQuestions > 0 ? `${metrics.dailyRequiredQuestions}q/dia` : "Em dia"}
        </p>
      </div>
    </section>
  );
}

export function WeeklyOpsCompactSummarySkeleton({ className }: { className?: string }) {
  return (
    <section className={cc("flex w-full items-center justify-center gap-4 py-1", className)} aria-hidden="true">
      <div className="flex items-center gap-1.5">
        <Skeleton className="w-7 h-7 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="h-2 w-7 rounded-sm" />
          <Skeleton className="h-3 w-8 rounded-sm" />
        </div>
      </div>
      <div className="w-px h-7 bg-edge shrink-0" />
      <div className="space-y-1">
        <Skeleton className="h-2 w-9 rounded-sm" />
        <Skeleton className="h-3 w-12 rounded-sm" />
      </div>
    </section>
  );
}
