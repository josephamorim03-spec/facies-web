/**
 * Estilo único de tooltip para todos os gráficos do app. Antes cada gráfico
 * inlinava o seu, com raio e sombra ligeiramente diferentes.
 */
export const studyChartTooltipContentStyle = {
  background: "var(--color-paper)",
  border: "1px solid var(--color-edge)",
  borderRadius: "var(--radius-surface)",
  boxShadow: "var(--overlay-shadow)",
  color: "var(--color-ink)",
  fontSize: 12,
};

export const studyChartTooltipLabelStyle = {
  color: "var(--color-ink)",
  fontWeight: 600,
};

export const studyChartTooltipCursor = { fill: "var(--color-surface-muted)" };
