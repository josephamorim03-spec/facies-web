"use client";

import type { KrosMode } from "@/lib/api";

type KrosModeOption = {
  value: KrosMode;
  label: string;
  help: string;
};

/**
 * Vocabulário do seletor. O comportamento de cada modo vive em
 * `app/domain/kros_modes.py`; aqui só mora a cópia que o aluno lê — por isso as
 * descrições falam de resultado ("questões que você já errou"), não de quota.
 */
export const KROS_MODE_OPTIONS: KrosModeOption[] = [
  {
    value: "equilibrado",
    label: "Equilibrado",
    help: "A mistura padrão entre lacunas, alta incidência e conteúdo novo.",
  },
  {
    value: "prioridade_erros",
    label: "Prioridade nos erros",
    help: "Foca nas microcompetências onde você mais erra. Até 40% podem ser questões que você já errou.",
  },
  {
    value: "terreno_novo",
    label: "Terreno novo",
    help: "Prioriza temas de alta incidência que você quase não viu.",
  },
  {
    value: "foco_banca",
    label: "Foco na banca",
    help: "Distribui a prova conforme as suas instituições prioritárias.",
  },
];

type KrosModeChooserProps = {
  value: KrosMode;
  onChange: (mode: KrosMode) => void;
  disabled?: boolean;
};

/**
 * Cartões de modo, no mesmo idioma do seletor de modo do /banco. Não usa a
 * pílula deslizante do antigo seletor de tamanho: com quatro opções em grade
 * 2×2 o deslize atravessaria a diagonal e viraria ruído — borda e fundo dizem
 * a mesma coisa sem movimento.
 */
export function KrosModeChooser({ value, onChange, disabled = false }: KrosModeChooserProps) {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Modo do Kros">
      {KROS_MODE_OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`rounded-control border px-4 py-3 text-left transition-colors disabled:opacity-60 ${
              active
                ? "border-primary bg-surfaceMuted"
                : "border-edge bg-paper hover:bg-surfaceMuted"
            }`}
          >
            <span
              className={`block text-sm font-semibold ${active ? "text-ink" : "text-muted"}`}
            >
              {option.label}
            </span>
            <span className="mt-1 block text-xs leading-5 text-muted">{option.help}</span>
          </button>
        );
      })}
    </div>
  );
}
