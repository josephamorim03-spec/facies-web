"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";

const ENTRANCE_MS = 900;

/**
 * Liga a animação do Recharts só durante a montagem do gráfico.
 *
 * Duas razões para não deixar ligada: (1) o Recharts reanima a série a cada
 * mudança que ele considere relevante, e estes gráficos são varridos com o
 * ponteiro — redesenhar a linha a cada semana destacada é pior que não animar;
 * (2) o bloco global de `prefers-reduced-motion` no `globals.css` só alcança
 * CSS, então animação em JS precisa deste gate explícito.
 */
export function useChartEntrance(): boolean {
  const reduceMotion = useReducedMotion();
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(true), ENTRANCE_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return !reduceMotion && !settled;
}
