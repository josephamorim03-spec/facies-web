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

/**
 * O modo "foco na banca" só tem o que priorizar se o aluno declarou uma prova
 * alvo. Sem objetivo, a lista de bancas volta vazia e o modo não faz nada — que
 * é exatamente o defeito que este trabalho corrige. Oferecê-lo assim seria
 * repetir a promessa vazia numa camada acima; aqui ele se desabilita e diz por
 * quê. Com objetivo, o cartão nomeia a banca em vez de prometer no genérico.
 */
function bancaCopy(
  targetBoards: string[],
  unsatisfied: string[],
): { help: string; unavailable: boolean } {
  if (targetBoards.length === 0) {
    return {
      help: "Defina sua prova alvo no perfil para liberar este modo.",
      unavailable: true,
    };
  }
  // O aluno declarou, e o banco não tem nada daquela banca. Antes esse caso era
  // indistinguível de sucesso: a prova saía igual à de quem não declarou nada e
  // o motivo ficava só no log do servidor. Dizer isso é melhor do que entregar
  // uma cota que não se formou.
  const covered = targetBoards.filter((board) => !unsatisfied.includes(board));
  if (covered.length === 0) {
    return {
      help: `Ainda não há questões de ${targetBoards.join(", ")} no banco.`,
      unavailable: true,
    };
  }
  const [first, ...rest] = covered;
  const others = rest.length > 0 ? ` (depois ${rest.join(", ")})` : "";
  const gap =
    unsatisfied.length > 0 ? ` Sem questões de ${unsatisfied.join(", ")} por enquanto.` : "";
  return { help: `Prioriza questões de ${first}${others}.${gap}`, unavailable: false };
}

type KrosModeChooserProps = {
  value: KrosMode;
  onChange: (mode: KrosMode) => void;
  disabled?: boolean;
  /** Bancas alvo do aluno, na ordem de prioridade. Vem da prévia. */
  targetBoards?: string[];
  /** As declaradas que o pool não cobre. Vem da prévia. */
  unsatisfiedTargetBoards?: string[];
};

/**
 * Cartões de modo, no mesmo idioma do seletor de modo do /banco. Não usa a
 * pílula deslizante do antigo seletor de tamanho: com quatro opções em grade
 * 2×2 o deslize atravessaria a diagonal e viraria ruído — borda e fundo dizem
 * a mesma coisa sem movimento.
 */
export function KrosModeChooser({
  value,
  onChange,
  disabled = false,
  targetBoards = [],
  unsatisfiedTargetBoards = [],
}: KrosModeChooserProps) {
  const banca = bancaCopy(targetBoards, unsatisfiedTargetBoards);

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Modo do Kros">
      {KROS_MODE_OPTIONS.map((option) => {
        const isBanca = option.value === "foco_banca";
        const unavailable = isBanca && banca.unavailable;
        const active = option.value === value;
        const help = isBanca ? banca.help : option.help;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled || unavailable}
            onClick={() => onChange(option.value)}
            className={`rounded-control border px-4 py-3 text-left transition-colors disabled:opacity-60 ${
              active
                ? "border-primary bg-surfaceMuted"
                : "border-edge bg-paper enabled:hover:bg-surfaceMuted"
            }`}
          >
            <span
              className={`block text-sm font-semibold ${active ? "text-ink" : "text-muted"}`}
            >
              {option.label}
            </span>
            <span className="mt-1 block text-xs leading-5 text-muted">{help}</span>
          </button>
        );
      })}
    </div>
  );
}
