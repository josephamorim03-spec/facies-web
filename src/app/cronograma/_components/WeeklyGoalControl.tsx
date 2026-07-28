"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { updateProfile } from "@/lib/api";
import { useToast } from "@/lib/useToast";

const STEP = 10;
const MIN_GOAL = 0;
const MAX_GOAL = 2000;
const SAVE_DEBOUNCE_MS = 800;

type Props = {
  token: string;
  weeklyGoal: number;
  progressPct: number;
  remainingQuestions: number;
  onSaved?: () => void;
};

/**
 * Meta semanal ajustável sem sair do calendário.
 *
 * Planejar é a intenção desta tela: mudar a meta era a ação mais frequente e
 * exigia navegar até outra rota. Aqui ela é otimista (o valor muda na hora) e
 * persiste com debounce; se o servidor recusar, volta ao valor anterior.
 */
export function WeeklyGoalControl({ token, weeklyGoal, progressPct, remainingQuestions, onSaved }: Props) {
  const { showToast } = useToast();
  const [goal, setGoal] = useState(weeklyGoal);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const committedRef = useRef(weeklyGoal);

  // Acompanha o valor vindo do servidor enquanto não há edição pendente.
  useEffect(() => {
    if (timerRef.current) return;
    committedRef.current = weeklyGoal;
    setGoal(weeklyGoal);
  }, [weeklyGoal]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const persist = useCallback(
    async (next: number) => {
      const previous = committedRef.current;
      setSaving(true);
      try {
        await updateProfile(token, { weekly_goal_questions: next });
        committedRef.current = next;
        onSaved?.();
      } catch {
        setGoal(previous);
        showToast("Não foi possível salvar a meta. Tente de novo.", "error");
      } finally {
        setSaving(false);
        timerRef.current = null;
      }
    },
    [onSaved, showToast, token],
  );

  const nudge = useCallback(
    (delta: number) => {
      setGoal((current) => {
        const next = Math.min(MAX_GOAL, Math.max(MIN_GOAL, current + delta));
        if (next === current) return current;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => persist(next), SAVE_DEBOUNCE_MS);
        return next;
      });
    },
    [persist],
  );

  const safePct = Math.max(0, Math.min(100, Math.round(progressPct)));

  return (
    <section
      aria-label="Meta semanal"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-surface border border-edge bg-surface px-4 py-3"
    >
      <span className="text-xs text-muted">Meta semanal</span>

      <span className="inline-flex items-center overflow-hidden rounded-control border border-edge bg-paper">
        <button
          type="button"
          onClick={() => nudge(-STEP)}
          disabled={goal <= MIN_GOAL}
          aria-label={`Diminuir meta em ${STEP} questões`}
          className="min-h-10 w-10 text-base text-ink transition-colors hover:bg-surfaceMuted disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
        >
          −
        </button>
        <span
          data-weekly-goal-value={goal}
          aria-live="polite"
          className="min-w-14 border-x border-edge px-2 text-center text-sm font-semibold tabular-nums text-ink"
        >
          {goal}
        </span>
        <button
          type="button"
          onClick={() => nudge(STEP)}
          disabled={goal >= MAX_GOAL}
          aria-label={`Aumentar meta em ${STEP} questões`}
          className="min-h-10 w-10 text-base text-ink transition-colors hover:bg-surfaceMuted disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
        >
          +
        </button>
      </span>

      <span className="h-1.5 min-w-32 flex-1 overflow-hidden rounded-full bg-surfaceMuted" aria-hidden="true">
        <span className="block h-full rounded-full bg-primary transition-[width]" style={{ width: `${safePct}%` }} />
      </span>

      <span className="text-xs tabular-nums text-muted">
        {safePct}%
        {remainingQuestions > 0 ? ` · faltam ${remainingQuestions}q` : " · meta batida"}
        {saving ? " · salvando" : ""}
      </span>
    </section>
  );
}
