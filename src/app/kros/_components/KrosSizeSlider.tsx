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
  /**
   * Quantas questões o banco consegue entregar agora. É **informação, não
   * limite**: se for menor que o valor escolhido, a prova sai com este número e
   * a frase abaixo da barra avisa. `null` enquanto a prévia não chegou.
   */
  available: number | null;
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
  available,
  step,
  anchors,
  disabled = false,
}: KrosSizeSliderProps) {
  // O aluno escolhe `value`; a prova sai com `delivered`. Quando o banco não
  // alcança o pedido, a diferença é dita em texto — antes ela era imposta
  // encolhendo o `max` da barra, e o controle se mexia sozinho.
  const short = available != null && available < value;
  const delivered = short ? available : value;
  const minutes = estimatedMinutes(delivered);

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

      {short ? (
        // Diz o número real antes de começar, em vez de mexer na barra. O aluno
        // continua livre para pedir o que quiser; quem ajusta é o servidor.
        <p className="mt-3 text-xs text-muted">
          O banco tem <span className="font-semibold tabular-nums text-ink">{available}</span>{" "}
          questões para este modo agora, então a prova sai com esse tamanho. Resolva mais
          questões no banco para liberar provas maiores.
        </p>
      ) : null}
    </div>
  );
}
