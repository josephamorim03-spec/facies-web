"use client";

export const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const;

type Props = {
  selected: number[];
  onToggle: (weekday: number) => void;
  disabled?: boolean;
  ariaLabel: string;
};

/**
 * Seleção de dias da semana. O índice segue `date.weekday()` — 0=segunda —
 * a mesma convenção do backend (`calendar_events.weekday` e
 * `study_availability_json`), para não existirem duas numerações no produto.
 */
export function WeekdayPicker({ selected, onToggle, disabled = false, ariaLabel }: Props) {
  return (
    <div className="grid grid-cols-7 gap-1" role="group" aria-label={ariaLabel}>
      {WEEKDAY_LABELS.map((label, weekday) => {
        const active = selected.includes(weekday);
        return (
          <button
            key={label}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onToggle(weekday)}
            className={`paper-control min-h-11 border px-1 py-2 text-xs disabled:opacity-60 ${
              active
                ? "border-primary bg-washSelecao text-ink"
                : "border-edge bg-surface text-muted hover:bg-surfaceMuted hover:text-ink"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
