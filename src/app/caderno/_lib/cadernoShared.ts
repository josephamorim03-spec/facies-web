import React from "react";

import { AREA_HEX } from "@/lib/areaColors";

export type Area = "GO" | "PD" | "MP" | "CG" | "CM" | "OU";
export type Tab = "registro" | "pesquisar";
export type SortTime = "recent" | "oldest" | "";
export type SortWeight = "desc" | "asc" | "";

export const AREAS: Area[] = ["GO", "PD", "MP", "CG", "CM", "OU"];
// Single source of truth — re-exported from the canonical area palette in lib/areaColors.
export const AREA_COLORS: Record<Area, string> = AREA_HEX;

export const MAX_FILE_MB = 10;
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

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

export function weightBadgeColor(weight: number): string {
  if (weight >= 8) return "#e56464";
  if (weight >= 5) return "#e7c040";
  return "#aab0b8";
}

export function rangeStyle(value: number, min: number, max: number): React.CSSProperties {
  const pct = ((value - min) / (max - min)) * 100;
  return {
    "--track-bg": `linear-gradient(to right, var(--range-fill, #1A1A1A) 0%, var(--range-fill, #1A1A1A) ${pct}%, var(--range-rest, #E2E2DC) ${pct}%, var(--range-rest, #E2E2DC) 100%)`,
  } as React.CSSProperties;
}
