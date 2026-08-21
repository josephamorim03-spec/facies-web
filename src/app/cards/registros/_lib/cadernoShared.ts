import React from "react";

import { AREA_VAR } from "@/lib/areaColors";

export type Area = "GO" | "PD" | "MP" | "CG" | "CM" | "OU";
export type Tab = "registro" | "pesquisar";
export type SortTime = "recent" | "oldest" | "";
export type SortWeight = "desc" | "asc" | "";

export const AREAS: Area[] = ["GO", "PD", "MP", "CG", "CM", "OU"];
// Single source of truth — re-exported from the canonical area palette in lib/areaColors.
export const AREA_COLORS: Record<Area, string> = AREA_VAR;

export const MAX_FILE_MB = 10;
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
export const MANUAL_TURBO_MIN_CARDS = 10;

export function normalizeThemeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function displayDateTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Tom do peso do card — token de tema, nunca hex.
 *
 * Eram `#e56464`, `#e7c040` e `#aab0b8`: sobras da identidade anterior, que
 * seguiam claras no tema escuro. O amarelo era o pior: os selos pintavam esse
 * fundo e escreviam `text-white` por cima, ~1,9:1 — o numero sumia.
 *
 * Agora o retorno e' a cor do TRACO. Quem consome desenha selo de fundo neutro
 * com borda e digito nesta cor, que e' o padrao de contraste do resto do
 * sistema (ver `AreaIcon`) e passa nos dois temas.
 */
export function weightBadgeColor(weight: number): string {
  if (weight >= 8) return "var(--color-danger)";
  if (weight >= 5) return "var(--color-warning)";
  return "var(--color-muted)";
}

// Passou a morar junto do `RangeSlider`, o componente de barra do sistema.
// Reexportado aqui para os cards seguirem importando do mesmo lugar.
export { rangeStyle } from "@/components/ui/RangeSlider";
