import type { TrainerAction, TrainerClosedLoop, TrainerOutcomeTarget } from "@/lib/api";

const OUTCOME_LABEL: Record<TrainerOutcomeTarget, string> = {
  retention: "retenção",
  transfer: "transferência",
  speed: "velocidade",
  calibration: "calibração",
};

const FACTOR_LABEL: Record<string, string> = {
  deficit: "lacuna",
  forgetting: "esquecimento",
  urgency: "urgência",
  transfer_gap: "transferência",
  uncertainty: "incerteza",
  exam_weight: "peso na prova",
};

function factorLabel(factor: string): string {
  return FACTOR_LABEL[factor] ?? factor;
}

/**
 * Progressive-disclosure "por que recebi isso" for a trainer action. Uses the
 * fields already in the prescription contract (why_factors / outcome_targets /
 * closed_loop). Native <details> keeps it keyboard-accessible with no extra JS.
 */
export function TrainerWhyPanel({
  action,
  closedLoop,
  className = "",
}: {
  action: TrainerAction;
  closedLoop?: TrainerClosedLoop | null;
  className?: string;
}) {
  const hasWhy = action.why_factors.length > 0;
  const hasTargets = action.outcome_targets.length > 0;
  if (!hasWhy && !hasTargets) return null;

  return (
    <details className={`group rounded-xl border border-edge bg-surface ${className}`}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 text-sm font-medium text-ink">
        <span>Por que recebi isso</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-4 w-4 text-muted transition-transform group-open:rotate-90"
          aria-hidden
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </summary>
      <div className="space-y-3 px-4 pb-4 pt-1 text-sm text-muted">
        {hasWhy && (
          <ul className="space-y-1.5">
            {action.why_factors.map((wf, i) => (
              <li key={`${wf.factor}-${i}`} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" aria-hidden />
                <span>
                  <span className="font-semibold text-ink">{factorLabel(wf.factor)}:</span> {wf.detail}
                </span>
              </li>
            ))}
          </ul>
        )}
        {hasTargets && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs uppercase tracking-wide text-muted">Ganho esperado:</span>
            {action.outcome_targets.map((t) => (
              <span
                key={t}
                className="rounded-full border border-edge px-2 py-0.5 text-xs font-medium text-ink"
              >
                {OUTCOME_LABEL[t] ?? t}
              </span>
            ))}
          </div>
        )}
        {closedLoop && closedLoop.next_check.length > 0 && (
          <p className="text-xs text-muted">
            Depois disso, o treinador acompanha:{" "}
            {closedLoop.next_check.join(", ").replace(/_/g, " ")}.
          </p>
        )}
      </div>
    </details>
  );
}
