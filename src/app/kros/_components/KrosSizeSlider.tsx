"use client";

import { RangeSlider } from "@/components/ui/RangeSlider";

/** Espelha `KROS_MINUTES_PER_QUESTION` do backend: 50 → 75 min, 100 → 150 min. */
export function estimatedMinutes(size: number): number {
  return Math.round(size * 1.5);
}

type KrosSizeSliderProps = {
  value: number;
  onChange: (size: number) => void;
  /** Opcional: a página pede a prévia a partir do valor exibido, não do commit. */
  onCommit?: (size: number) => void;
  min: number;
  max: number;
  /** Teto do produto (`preview.max_size`), para distinguir "acabou o banco" de
   *  "chegou no limite do Kros". */
  hardMax: number;
  step: number;
  anchors: number[];
  disabled?: boolean;
};

/**
 * Substitui os botões fixos de 50 e 100. As duas âncoras sobrevivem como marcas
 * no trilho — elas ainda são os tamanhos de referência do produto, só deixaram
 * de ser a única escolha possível.
 *
 * O `max` chega da prévia (`max_available`) e não da constante: travar a barra
 * no pool real é o que impede o aluno de montar um Kros que o servidor
 * recusaria com 409 na hora de começar.
 */
export function KrosSizeSlider({
  value,
  onChange,
  onCommit,
  min,
  max,
  hardMax,
  step,
  anchors,
  disabled = false,
}: KrosSizeSliderProps) {
  const minutes = estimatedMinutes(value);
  // `hardMax` é o teto do produto (`preview.max_size`), não um 120 fixo: com o
  // literal, qualquer teto abaixo de 120 acionava a frase — e como o teto ecoava
  // o tamanho pedido, ela aparecia em QUALQUER posição da barra, dizendo ao
  // aluno que o banco acabou quando não tinha acabado.
  const atCeiling = max < hardMax && value >= max;

  return (
    <div className="mt-4">
      <div className="flex items-baseline gap-3">
        <span className="font-serif text-4xl font-semibold tabular-nums text-ink">{value}</span>
        <span className="text-sm text-muted">
          questões · <span className="tabular-nums">~{minutes} min</span>
        </span>
      </div>

      <RangeSlider
        className="mt-3"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={onChange}
        onCommit={onCommit}
        disabled={disabled}
        ticks={anchors}
        label="Quantidade de questões"
        ariaValueText={`${value} questões, cerca de ${minutes} minutos`}
      />

      {atCeiling ? (
        <p className="mt-3 text-xs text-muted">
          É o máximo disponível para este modo agora. Resolva mais questões no banco para
          liberar provas maiores.
        </p>
      ) : null}
    </div>
  );
}
