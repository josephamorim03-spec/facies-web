// TS puro, sem imports de runtime: também é consumido pelos unit tests via
// `node --experimental-strip-types` (aliases `@/` não resolvem lá).

/** Relógio de prova a partir de segundos: "MM:SS", ou "H:MM:SS" acima de 1h. */
export function formatClock(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Duração legível a partir de ms: null se vazio/≤0, "M:SS", ou "H:MM:SS" acima de 1h. */
export function formatDurationMs(timeMs: number | null | undefined): string | null {
  if (timeMs == null || timeMs <= 0 || !Number.isFinite(timeMs)) return null;
  const totalSeconds = Math.round(timeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
