"use client";

import { motion, useReducedMotion } from "motion/react";

export const KROS_SIZES = [50, 100] as const;
export type KrosSize = (typeof KROS_SIZES)[number];

export function estimatedMinutes(size: KrosSize): number {
  return size === 50 ? 75 : 150;
}

type KrosSizeChooserProps = {
  value: KrosSize;
  onChange: (size: KrosSize) => void;
  disabled?: boolean;
};

/**
 * Escolha do tamanho da prova. A pílula ativa desliza entre as opções em vez de
 * piscar — é a microinteração mais visível da tela. `layoutId` só entra quando
 * o usuário não pediu movimento reduzido; sem ele, a pílula simplesmente troca
 * de lugar, e a semântica de radiogroup segue idêntica nos dois casos.
 */
export function KrosSizeChooser({ value, onChange, disabled = false }: KrosSizeChooserProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="mt-4 grid grid-cols-2 gap-1 rounded-control border border-edge bg-paper p-1"
      role="radiogroup"
      aria-label="Quantidade de questões"
    >
      {KROS_SIZES.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(option)}
            className={`paper-control relative min-h-24 px-4 py-3 text-left disabled:opacity-60 ${
              active ? "text-primaryInk" : "text-muted hover:bg-surfaceMuted hover:text-ink"
            }`}
          >
            {active && (
              <motion.span
                layoutId={reduceMotion ? undefined : "kros-size-pill"}
                aria-hidden="true"
                className="absolute inset-0 -z-10 rounded-control bg-primary"
                transition={{ type: "tween", duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
              />
            )}
            <span className="block text-3xl font-semibold">{option}</span>
            <span className="mt-1 block text-xs">questões inéditas</span>
          </button>
        );
      })}
    </div>
  );
}
