"use client";

export type CronogramaViewMode = "month" | "week";

const CRONOGRAMA_VIEW_MODE_SESSION_KEY = "cronograma_view_mode";

function isCronogramaViewMode(value: string | null): value is CronogramaViewMode {
  return value === "month" || value === "week";
}

export function readCronogramaViewModeSession(): CronogramaViewMode | null {
  try {
    const value = sessionStorage.getItem(CRONOGRAMA_VIEW_MODE_SESSION_KEY);
    if (isCronogramaViewMode(value)) return value;
    if (value !== null) sessionStorage.removeItem(CRONOGRAMA_VIEW_MODE_SESSION_KEY);
  } catch {
    // Ignore storage read errors.
  }
  return null;
}

export function writeCronogramaViewModeSession(viewMode: CronogramaViewMode): void {
  try {
    sessionStorage.setItem(CRONOGRAMA_VIEW_MODE_SESSION_KEY, viewMode);
  } catch {
    // Ignore storage write errors.
  }
}

export function getCronogramaAgendaHref(): "/agenda-operacional" | "/semana" {
  return readCronogramaViewModeSession() === "week" ? "/semana" : "/agenda-operacional";
}
