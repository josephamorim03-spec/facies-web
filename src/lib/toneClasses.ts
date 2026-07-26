/**
 * Fonte única do vocabulário de "tom" semântico da identidade KrosMed.
 * Cinco tons canônicos; dois presets de forma (pílula tonalizada e bloco de mensagem).
 * StatusBadge, Alert (e futuramente Toast) consomem daqui — um mapa só.
 */
export type Tone = "neutral" | "info" | "positive" | "attention" | "critical";

/** Pílula tonalizada — badge/chip de status. */
export const TONE_BADGE: Record<Tone, string> = {
  neutral: "border-edge bg-paper text-muted",
  info: "border-info/35 bg-info/5 text-info",
  positive: "border-success/35 bg-success/5 text-success",
  attention: "border-warning/35 bg-warning/5 text-warning",
  critical: "border-danger/35 bg-danger/5 text-danger",
};

/** Bloco de mensagem (alert) — borda + texto semântico sobre surface. */
export const TONE_ALERT: Record<Tone, string> = {
  neutral: "border-edge text-ink",
  info: "border-info text-info",
  positive: "border-success text-success",
  attention: "border-warning text-warning",
  critical: "border-danger text-danger",
};
