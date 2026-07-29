"use client";

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";

import { updateProfile } from "@/lib/api";
import { useToast } from "@/lib/useToast";
import { Button } from "@/components/ui/Button";

const MIN_GOAL = 0;
const MAX_GOAL = 2000;

type Props = {
  token: string;
  weeklyGoal: number;
  completedQuestions: number;
  progressPct: number;
  remainingQuestions: number;
  onSaved?: () => void;
};

export function WeeklyGoalControl({
  token,
  weeklyGoal,
  completedQuestions,
  progressPct,
  remainingQuestions,
  onSaved,
}: Props) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(String(weeklyGoal));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const safePct = Math.max(0, Math.min(100, Math.round(progressPct)));
  const parsedDraft = Number(draft);
  const invalid =
    !Number.isFinite(parsedDraft) ||
    parsedDraft < MIN_GOAL ||
    parsedDraft > MAX_GOAL ||
    !Number.isInteger(parsedDraft);

  useEffect(() => {
    if (!open) setDraft(String(weeklyGoal));
  }, [open, weeklyGoal]);

  async function save() {
    if (saving || invalid) return;
    setSaving(true);
    setError("");
    try {
      await updateProfile(token, { weekly_goal_questions: parsedDraft });
      setOpen(false);
      showToast("Meta semanal atualizada.", "success");
      onSaved?.();
    } catch {
      setError("Não foi possível salvar a meta. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="border-y border-edge py-4" aria-label="Progresso da meta semanal">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Editar meta semanal"
        >
          <div className="flex items-baseline justify-between gap-4 text-sm">
            <p className="font-semibold text-ink">Meta semanal</p>
            <span className="inline-flex items-center gap-1.5 text-muted group-hover:text-ink">
              <span>
                {completedQuestions} de {weeklyGoal} questões · {safePct}%
              </span>
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden bg-surfaceMuted" aria-hidden="true">
            <div
              className="h-full bg-primary transition-[width]"
              style={{ width: `${safePct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            {remainingQuestions > 0 ? `Faltam ${remainingQuestions} questões nesta semana.` : "Meta batida nesta semana."}
          </p>
        </button>
      </section>

      {open ? (
        <div className="fixed inset-0 z-[75] flex items-end bg-black/30 md:items-center md:justify-center" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Editar meta semanal"
            className="w-full rounded-t-2xl border border-edge bg-paper p-4 shadow-[var(--soft-shadow)] md:max-w-sm md:rounded-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-ink">Meta semanal</h3>
            <p className="mt-1 text-xs text-muted">Atual: {weeklyGoal} questões por semana</p>
            <label className="mt-4 block">
              <span className="text-sm font-semibold text-ink">Questões por semana</span>
              <input
                type="number"
                inputMode="numeric"
                min={MIN_GOAL}
                max={MAX_GOAL}
                step={10}
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                  setError("");
                }}
                className="mt-2 min-h-11 w-full border border-edge bg-paper px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </label>
            {invalid ? (
              <p className="mt-2 text-xs text-danger" role="alert">
                Informe um número inteiro entre {MIN_GOAL} e {MAX_GOAL}.
              </p>
            ) : null}
            {error ? <p className="mt-2 text-xs text-danger" role="alert">{error}</p> : null}
            <div className="mt-4 flex flex-col gap-2">
              <Button type="button" variant="primary" size="md" loading={saving} disabled={invalid} onClick={save}>
                Salvar
              </Button>
              <Button type="button" variant="ghost" size="md" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
