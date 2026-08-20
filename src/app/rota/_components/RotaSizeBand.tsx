"use client";

type Props = {
  /** Posições que o servidor calculou a partir do tempo declarado. */
  band: number[];
  value: number;
  /** Tamanho real do pool. Posição acima disso aparece desabilitada. */
  maxAvailable: number | null;
  estimatedMinutesFor: (size: number) => number;
  declaredMinutes: number;
  disabled?: boolean;
  onChange: (size: number) => void;
};

/**
 * Ajuste fino do tamanho da sessão — em faixa, não em barra livre.
 *
 * A barra de 20 a 120 pedia um número que o aluno não tem como saber: ele sabe
 * quanto tempo tem, não quantas questões cabem nele. Agora o servidor calcula o
 * tamanho a partir do tempo e oferece duas posições para cada lado.
 *
 * A faixa vem do servidor de propósito (`size_band` em `KrosPreviewOut`):
 * `KROS_MINUTES_PER_QUESTION` já está espelhado à mão no front uma vez, e
 * duplicar a regra de novo garantiria divergência.
 */
export function RotaSizeBand({
  band,
  value,
  maxAvailable,
  estimatedMinutesFor,
  declaredMinutes,
  disabled = false,
  onChange,
}: Props) {
  if (band.length === 0) return null;

  const overflows = estimatedMinutesFor(value) > declaredMinutes;

  return (
    <section aria-labelledby="rota-band-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="rota-band-title" className="paper-eyebrow">
          Ajuste fino
        </h2>
        <p className="paper-eyebrow">Faixa presa ao seu tempo e ao acervo</p>
      </div>

      <div className="mt-2 flex gap-1" role="group" aria-label="Tamanho da sessão">
        {band.map((size) => {
          const unavailable = maxAvailable != null && size > maxAvailable;
          const selected = size === value;
          return (
            <button
              key={size}
              type="button"
              aria-pressed={selected}
              disabled={disabled || unavailable}
              onClick={() => onChange(size)}
              className={[
                "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 border transition-colors",
                selected
                  ? "border-2 border-primary bg-primary text-primaryInk"
                  : "border-edge bg-surface text-muted enabled:hover:bg-surfaceMuted",
                unavailable ? "opacity-35" : "",
              ].join(" ")}
            >
              <span className="text-base font-semibold tabular-nums">{size}</span>
              <span className="text-[9px] font-semibold uppercase tracking-[0.1em]">
                {unavailable ? "Sem acervo" : `${estimatedMinutesFor(size)} min`}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-3 max-w-[68ch] font-serif text-sm leading-6 text-muted">
        Cinco posições em torno do tamanho calculado. Fora dessa faixa a sessão deixa de caber no
        tempo que você declarou, ou o acervo filtrado não tem itens suficientes.
      </p>

      {overflows ? (
        // Honestidade obrigatoria: `KROS_MIN_SIZE` e piso do motor de composicao,
        // entao quem declara pouco tempo NAO recebe uma sessao menor. Recebe uma
        // que estoura — e a tela precisa dizer, nao fingir que cabe.
        <p className="mt-2 text-sm font-semibold text-warning">
          Menor sessão possível: excede seu tempo em {estimatedMinutesFor(value) - declaredMinutes}{" "}
          min.
        </p>
      ) : null}
    </section>
  );
}
