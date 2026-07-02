// Canonical storage key constants and key-generators for the whole app.
// localStorage keys use plain strings; sessionStorage keys are prefixed with "kros:".

// ── localStorage ──────────────────────────────────────────────────────────────
export const THEME_KEY = "theme";
export const LOG_LAST_AREA_KEY = "log_last_area";
export const ROUTINE_COMMITMENTS_KEY = "routine_commitments";
/** Nível (índice) do tamanho de fonte da questão no banco de questões. */
export const QUESTION_FONT_SIZE_KEY = "question_font_size";

/** Dynamic key family — one entry per subject area. */
export function logThemesKey(area: string): string {
  return `themes_${area}`;
}

// ── sessionStorage (token-scoped) ─────────────────────────────────────────────
export function getBlockedRedirectSessionKey(authToken: string): string {
  return `kros:initial-goal-blocked-session:${authToken.slice(0, 24)}`;
}

export function getWelcomeToastSessionKey(authToken: string): string {
  return `kros:initial-goal-welcome-session:${authToken.slice(0, 24)}`;
}
