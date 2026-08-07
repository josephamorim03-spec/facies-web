"use client";

import React, { useId } from "react";

/**
 * Preenchimento do trilho. O CSS global das ranges (globals.css) lê `--track-bg`
 * e já cobre track/thumb/focus nos dois temas — aqui só calculamos a parada do
 * gradiente. Vive neste componente por ser a única cópia do app; `cadernoShared`
 * reexporta daqui para os cards continuarem funcionando sem alteração.
 */
export function rangeStyle(value: number, min: number, max: number): React.CSSProperties {
  const span = max - min;
  const pct = span <= 0 ? 0 : ((value - min) / span) * 100;
  const clamped = Math.max(0, Math.min(100, pct));
  return {
    "--track-bg": `linear-gradient(to right, var(--range-fill, #1A1A1A) 0%, var(--range-fill, #1A1A1A) ${clamped}%, var(--range-rest, #E2E2DC) ${clamped}%, var(--range-rest, #E2E2DC) 100%)`,
  } as React.CSSProperties;
}

type RangeSliderProps = {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  /**
   * Disparado quando o usuário *solta* a barra (ponteiro ou teclado). Serve para
   * pendurar trabalho caro — uma busca no servidor, por exemplo — sem refazê-lo
   * a cada pixel arrastado.
   */
  onCommit?: (value: number) => void;
  disabled?: boolean;
  /** Marcas de referência abaixo do trilho. Fora da faixa são ignoradas. */
  ticks?: number[];
  label: string;
  /** Leitura do leitor de tela: "50 questões, cerca de 75 minutos". */
  ariaValueText?: string;
  className?: string;
};

/**
 * Barra de intervalo do sistema. O app tinha sete `<input type="range">` soltos
 * repetindo o mesmo gradiente inline; este componente centraliza o cálculo, a
 * semântica de acessibilidade e as marcas de referência.
 */
export function RangeSlider({
  value,
  min,
  max,
  step = 1,
  onChange,
  onCommit,
  disabled = false,
  ticks,
  label,
  ariaValueText,
  className = "",
}: RangeSliderProps) {
  const id = useId();
  const visibleTicks = (ticks ?? []).filter((tick) => tick > min && tick < max);
  const span = max - min;

  return (
    <div className={className}>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={label}
        aria-valuetext={ariaValueText}
        onChange={(event) => onChange(Number(event.target.value))}
        // Ponteiro e teclado terminam o gesto de formas diferentes; sem os dois
        // o commit nunca dispara para quem navega só pelo teclado.
        onPointerUp={(event) => onCommit?.(Number(event.currentTarget.value))}
        onKeyUp={(event) => onCommit?.(Number(event.currentTarget.value))}
        onBlur={(event) => onCommit?.(Number(event.currentTarget.value))}
        style={rangeStyle(value, min, max)}
        className="w-full disabled:opacity-50"
      />
      {visibleTicks.length > 0 && span > 0 ? (
        // `aria-hidden`: são pistas visuais de referência; o valor real já vai
        // no `aria-valuetext` do input.
        <div className="relative mt-1 h-4 select-none" aria-hidden="true">
          {visibleTicks.map((tick) => (
            <span
              key={tick}
              className="absolute -translate-x-1/2 text-[10px] tabular-nums text-muted"
              style={{ left: `${((tick - min) / span) * 100}%` }}
            >
              {tick}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
