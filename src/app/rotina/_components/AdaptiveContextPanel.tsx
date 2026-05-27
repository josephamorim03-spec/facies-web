"use client";

import { AdaptiveScheduleGenerate, AdaptiveSubjectRank, AdaptiveRebalanceOut, WorkloadDay } from "@/lib/api";
import { RestContext } from "../_hooks/useRotinaData";
import { WorkloadChart } from "./WorkloadChart";

type Props = {
  weeklyGoal: number;
  weeklyGoalInput: string;
  savedMsg: string;
  profileError: string;
  contextState: RestContext;
  adaptiveWeek: AdaptiveScheduleGenerate[];
  adaptiveRank: AdaptiveSubjectRank[];
  adaptiveError: string;
  adaptiveBusy: boolean;
  contextSavedMsg: string;
  rebalanceResult: AdaptiveRebalanceOut | null;
  rebalanceDays: number;
  workload: WorkloadDay[];
  todayISO: string;
  onWeeklyGoalInputChange: (v: string) => void;
  onWeeklyGoalInputBlur: () => void;
  onContextStateChange: (v: RestContext | ((prev: RestContext) => RestContext)) => void;
  onRebalanceDaysChange: (v: number) => void;
  onSaveAdaptiveContext: () => void;
  onRefreshAdaptive: () => void;
  onRunRebalance: () => void;
  onSaveProfile: () => void;
};

export function AdaptiveContextPanel({
  weeklyGoal,
  weeklyGoalInput,
  savedMsg,
  profileError,
  contextState,
  adaptiveWeek,
  adaptiveRank,
  adaptiveError,
  adaptiveBusy,
  contextSavedMsg,
  rebalanceResult,
  rebalanceDays,
  workload,
  todayISO,
  onWeeklyGoalInputChange,
  onWeeklyGoalInputBlur,
  onContextStateChange,
  onRebalanceDaysChange,
  onSaveAdaptiveContext,
  onRefreshAdaptive,
  onRunRebalance,
  onSaveProfile,
}: Props) {
  const adaptiveByDate = new Map(adaptiveWeek.map((plan) => [plan.date, plan]));
  const adaptiveQuestionsByDate = new Map(
    adaptiveWeek.map((plan) => [plan.date, Math.max(0, Math.round(plan.focus_minutes / 2))])
  );
  const maxAdaptiveLoad = Math.max(
    1,
    ...workload.map((d) => Math.max(d.load, adaptiveQuestionsByDate.get(d.date) ?? 0))
  );
  const todayPlan = adaptiveByDate.get(todayISO) ?? null;

  return (
    <section className="space-y-5">
      <h2 className="text-lg font-serif">Meta semanal</h2>
      <label className="text-sm text-muted flex flex-col gap-1 w-fit">
        Questões por semana
        <input
          type="number"
          min={1}
          value={weeklyGoalInput}
          onChange={(e) => onWeeklyGoalInputChange(e.target.value)}
          onBlur={onWeeklyGoalInputBlur}
          className="w-28 border border-edge bg-paper px-2 py-1 text-sm"
        />
      </label>

      <div className="border border-edge p-3 space-y-3">
        <div>
          <h3 className="text-base font-serif">Contexto operacional</h3>
          <p className="text-xs text-muted">
            Esses dados guiam a distribuicao diaria e o modo de recuperacao.
          </p>
        </div>

        <p className="text-xs text-muted">
          Plantao e pos-plantao sao inferidos automaticamente pelos eventos com bloqueio {'>='} 10h.
        </p>

        <div className="flex flex-wrap gap-3">
          <label className="text-xs text-muted flex flex-col gap-1">
            Energia (1-5)
            <input
              type="number"
              min={1}
              max={5}
              value={contextState.energy_level}
              onChange={(e) =>
                onContextStateChange((prev) => ({
                  ...prev,
                  energy_level: Math.max(1, Math.min(5, Number(e.target.value) || 1)),
                }))
              }
              className="w-20 border border-edge bg-paper px-2 py-1 text-sm"
            />
          </label>
          <label className="text-xs text-muted flex flex-col gap-1">
            Sono (horas)
            <input
              type="number"
              min={0}
              max={24}
              step={0.5}
              value={contextState.sleep_hours}
              onChange={(e) =>
                onContextStateChange((prev) => ({
                  ...prev,
                  sleep_hours: Math.max(0, Math.min(24, Number(e.target.value) || 0)),
                }))
              }
              className="w-24 border border-edge bg-paper px-2 py-1 text-sm"
            />
          </label>
          <label className="text-xs text-muted flex flex-col gap-1">
            Rebalance (dias)
            <input
              type="number"
              min={1}
              max={60}
              value={rebalanceDays}
              onChange={(e) =>
                onRebalanceDaysChange(Math.max(1, Math.min(60, Number(e.target.value) || 14)))
              }
              className="w-24 border border-edge bg-paper px-2 py-1 text-sm"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onSaveAdaptiveContext}
            disabled={adaptiveBusy}
            className="text-xs border border-ink px-3 py-1 disabled:opacity-50"
          >
            {adaptiveBusy ? "Salvando..." : "Salvar contexto"}
          </button>
          <button
            onClick={onRefreshAdaptive}
            disabled={adaptiveBusy}
            className="text-xs border border-edge px-3 py-1 disabled:opacity-50"
          >
            Atualizar plano
          </button>
          <button
            onClick={onRunRebalance}
            disabled={adaptiveBusy}
            className="text-xs border border-edge px-3 py-1 disabled:opacity-50"
          >
            Rebalancear pendências
          </button>
          {contextSavedMsg && <span className="text-xs text-muted">{contextSavedMsg}</span>}
        </div>

        {adaptiveError && <p className="text-xs text-red-600">{adaptiveError}</p>}

        {todayPlan && (
          <div className="text-xs text-muted border border-edge p-2 space-y-0.5">
            <p>
              Hoje: modo <strong>{todayPlan.mode}</strong> - foco {todayPlan.focus_minutes} min + buffer{" "}
              {todayPlan.buffer_minutes} min.
            </p>
            {todayPlan.reason && <p>Motivo: {todayPlan.reason}</p>}
          </div>
        )}

        {rebalanceResult && (
          <div className="text-xs text-muted border border-edge p-2 space-y-0.5">
            <p>
              Rebalance: {rebalanceResult.redistributed} revisões movidas em{" "}
              {rebalanceResult.horizon_days} dias.
            </p>
            {rebalanceResult.reason && <p>Motivo: {rebalanceResult.reason}</p>}
          </div>
        )}
      </div>

      <WorkloadChart
        workload={workload}
        adaptiveWeek={adaptiveWeek}
        adaptiveByDate={adaptiveByDate}
        adaptiveQuestionsByDate={adaptiveQuestionsByDate}
        maxAdaptiveLoad={maxAdaptiveLoad}
      />

      {adaptiveRank.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted uppercase tracking-wide">Prioridades dinamicas</p>
          <ul className="space-y-1">
            {adaptiveRank.slice(0, 5).map((subject) => (
              <li
                key={`${subject.area}-${subject.theme}`}
                className="flex items-center justify-between text-xs border-b border-edge pb-1"
              >
                <span>{subject.area} - {subject.theme}</span>
                <span className="text-muted">score {subject.score.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button onClick={onSaveProfile} className="text-sm border border-ink px-4 py-1">Salvar meta</button>
        {savedMsg && <span className="text-sm text-muted">{savedMsg}</span>}
        {profileError && <span className="text-sm text-red-600">{profileError}</span>}
      </div>
    </section>
  );
}
