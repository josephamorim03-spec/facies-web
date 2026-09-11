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
 * Controle segmentado canônico (alterna visões).
 *
 * ⚠️ O ATIVO DEIXOU DE SER O TEAL CHEIO em 2026-09-06. Ele partilhava o
 * preenchimento com a ação principal do dia, e o resultado media-se em
 * `/voce`: o elemento visualmente mais forte da tela inteira era o seletor de
 * tema — o ajuste menos consequente do app.
 *
 * Agora o selecionado é borda `primary` sobre campo `wash-selecao`. Sem peso:
 * este controle é `text-micro` (11px), e abaixo de 13px o desenho nunca pesa
 * (a medida está em `ui/Tabs.tsx`).
 */
export function SegmentedToggle<T extends string>({ value, onChange, options, ariaLabel, size = "sm" }: Props<T>) {
  const pad = size === "md" ? "min-h-9 px-3 py-1.5 text-xs" : "min-h-8 px-2.5 py-1 text-micro";
  return (
    <div role="group" aria-label={ariaLabel} className="inline-flex items-center gap-0.5 rounded-control border border-edge bg-paper p-0.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            // A borda transparente na base reserva o espaço: sem ela o segmento
            // ativo cresce 2px e empurra os irmãos a cada troca.
            className={`border border-transparent transition ${pad} ${FOCUS} ${
              active ? "border-primary bg-washSelecao text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
