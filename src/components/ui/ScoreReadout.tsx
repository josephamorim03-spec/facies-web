import type { CSSProperties } from "react";

type ScoreReadoutProps = {
  /** 0–100; clamped. */
  pct: number;
  label?: string;
  /** Cor do medidor. Passe uma var de tema para acompanhar claro/escuro. */
  color?: string;
  className?: string;
};

/**
 * Leitura de percentual — mostrador com medidor segmentado.
 *
 * Substitui o `ProgressRing`. O anel tinha dois problemas somados: um arco e a
 * forma mais dificil de comparar que existe (ninguem le 68% num arco sem o
 * numero do lado, e o numero ja estava la fazendo todo o trabalho), e um circulo
 * de 132px era o maior objeto redondo da interface inteira.
 *
 * O que fica: o numero grande, que era quem informava, e o medidor segmentado —
 * a mesma linguagem da `LoadBar`, entao progresso e resultado passam a se
 * desenhar igual.
 */
export function ScoreReadout({
  pct,
  label,
  color = "var(--color-success)",
  className = "",
}: ScoreReadoutProps) {
  const safePct = Math.max(0, Math.min(100, Math.round(pct)));

  return (
    <div
      role="img"
      aria-label={label ? `${safePct}% — ${label}` : `${safePct}%`}
      className={`shrink-0 border border-edge bg-surface px-5 py-4 text-center ${className}`}
    >
      <p className="text-4xl font-bold leading-none tabular-nums" style={{ color }}>
        {safePct}
        <span className="text-xl">%</span>
      </p>

      <div className="chrome-meter mt-3 h-2.5 w-32" aria-hidden="true">
        <div style={{ width: `${safePct}%`, ["--meter-color"]: color } as CSSProperties} />
      </div>

      {label ? (
        <p className="mt-2 text-micro font-semibold uppercase tracking-[0.12em] leading-tight text-muted [overflow-wrap:anywhere]">
          {label}
        </p>
      ) : null}
    </div>
  );
}
