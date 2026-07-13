"use client";

import { useTrainerPrescription } from "@/lib/trainer/useTrainerPrescription";
import { TrainerActionCTA } from "./TrainerActionCTA";

/**
 * A thin, discreet ribbon that ties any secondary page back to the trainer's
 * single action of the day: "sua ação de hoje: X" + CTA. Deliberately NOT a
 * second hero and NOT a dashboard — it renders nothing while loading or on
 * failure (no layout shift, no skeleton), and must never be placed on `/hoje`
 * or inside immersive session routes.
 */
export function TrainerContextStrip({
  sourcePage,
  className = "",
}: {
  sourcePage: string;
  className?: string;
}) {
  const { prescription, loading } = useTrainerPrescription();

  if (loading || !prescription) return null;
  const action = prescription.primary_action;

  return (
    <aside
      aria-label="Ação do treinador para hoje"
      className={`flex flex-col gap-2 rounded-xl border border-edge bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          Sua ação de hoje
        </p>
        <p className="truncate text-sm font-medium text-ink">{action.title}</p>
        <p className="mt-0.5 text-xs text-muted">
          {action.estimated_minutes} min
          {action.pedagogical_confidence?.label
            ? ` · ${action.pedagogical_confidence.label}`
            : ""}
        </p>
      </div>
      <TrainerActionCTA
        action={action}
        recommendationId={prescription.recommendation_id}
        sourcePage={sourcePage}
        label="Fazer agora"
        className="shrink-0"
      />
    </aside>
  );
}
