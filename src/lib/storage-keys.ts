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

// ── sessionStorage ────────────────────────────────────────────────────────────

/**
 * O POST de boot já rodou nesta aba.
 *
 * `sessionStorage` e não `localStorage` de propósito: a sequência deve voltar
 * quando o aluno abre o app de novo, e não sumir para sempre depois da primeira
 * vez. Uma aba = uma vez.
 */
export const BOOT_SEQUENCE_SEEN_KEY = "kros:boot-seen";

/**
 * Digitação das perguntas do Kros — uma vez por aba, mesma trava do boot.
 *
 * O aluno abre o Kros várias vezes por dia; cobrar a animação toda vez
 * transforma assinatura em pedágio.
 */
export const KROS_TYPED_SEEN_KEY = "kros:prompt-typed";

// ── sessionStorage (token-scoped) ─────────────────────────────────────────────
export function getBlockedRedirectSessionKey(authToken: string): string {
  return `kros:initial-goal-blocked-session:${authToken.slice(0, 24)}`;
}

export function getWelcomeToastSessionKey(authToken: string): string {
  return `kros:initial-goal-welcome-session:${authToken.slice(0, 24)}`;
}
