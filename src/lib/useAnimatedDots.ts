"use client";

import { useEffect, useState } from "react";

const DOT_STATES = [".", "..", "..."] as const;

export function useAnimatedDots(active: boolean, intervalMs: number = 400): string {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) return;

    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % DOT_STATES.length);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [active, intervalMs]);

  return active ? DOT_STATES[index] : "";
}
