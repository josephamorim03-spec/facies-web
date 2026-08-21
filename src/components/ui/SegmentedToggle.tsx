"use client";

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: Option<T>[];
  ariaLabel: string;
  size?: "sm" | "md";
};

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/**
 * Controle segmentado canônico (alterna visões). Ativo = primário (teal),
 * o mesmo estado "selecionado" do resto da identidade.
 */
export function SegmentedToggle<T extends string>({ value, onChange, options, ariaLabel, size = "sm" }: Props<T>) {
  const pad = size === "md" ? "min-h-9 px-3 py-1.5 text-xs" : "min-h-8 px-2.5 py-1 text-micro";
  return (
    <div role="group" aria-label={ariaLabel} className="inline-flex items-center gap-0.5 border border-edge bg-paper p-0.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={`font-semibold transition ${pad} ${FOCUS} ${
              active ? "bg-primary text-primaryInk" : "text-muted hover:text-ink"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
