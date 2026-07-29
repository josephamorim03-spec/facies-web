"use client";

import { useCallback, useSyncExternalStore } from "react";
import { QUESTION_FONT_SIZE_KEY } from "@/lib/storage-keys";

// Níveis discretos mapeados para classes Tailwind (tema claro/escuro seguro,
// sem style inline). Índice 1 = tamanho padrão anterior (text-base).
const STEM_CLASSES = [
  "text-sm leading-7",
  "text-base leading-8",
  "text-lg leading-9",
  "text-xl leading-9",
  "text-2xl leading-10",
] as const;

const ALTERNATIVE_CLASSES = [
  "text-xs leading-6",
  "text-sm leading-7",
  "text-base leading-7",
  "text-lg leading-8",
  "text-xl leading-9",
] as const;

const DEFAULT_LEVEL = 1;
const MAX_LEVEL = STEM_CLASSES.length - 1;
const CHANGE_EVENT = "krosmed:question-font-size";

// Fallback quando o localStorage está indisponível (ex.: modo privado).
let memoryLevel = DEFAULT_LEVEL;

function clampLevel(value: number): number {
  return Math.min(Math.max(value, 0), MAX_LEVEL);
}

function readStoredLevel(): number {
  try {
    const raw = window.localStorage.getItem(QUESTION_FONT_SIZE_KEY);
    const parsed = raw === null ? Number.NaN : Number.parseInt(raw, 10);
    return Number.isNaN(parsed) ? memoryLevel : clampLevel(parsed);
  } catch {
    return memoryLevel;
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export type QuestionFontScale = {
  stemClass: string;
  alternativeClass: string;
  increase: () => void;
  decrease: () => void;
  canIncrease: boolean;
  canDecrease: boolean;
};

export function useQuestionFontScale(): QuestionFontScale {
  // Fonte externa (localStorage): sem setState em effect e sem divergência de
  // hidratação — o servidor renderiza o nível padrão e o cliente corrige após montar.
  const level = useSyncExternalStore(subscribe, readStoredLevel, () => DEFAULT_LEVEL);

  const setAndStore = useCallback((next: number) => {
    const clamped = clampLevel(next);
    memoryLevel = clamped;
    try {
      window.localStorage.setItem(QUESTION_FONT_SIZE_KEY, String(clamped));
    } catch {
      // storage indisponível — preferência vale só para a sessão atual
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const increase = useCallback(() => setAndStore(level + 1), [level, setAndStore]);
  const decrease = useCallback(() => setAndStore(level - 1), [level, setAndStore]);

  return {
    stemClass: STEM_CLASSES[level],
    alternativeClass: ALTERNATIVE_CLASSES[level],
    increase,
    decrease,
    canIncrease: level < MAX_LEVEL,
    canDecrease: level > 0,
  };
}
