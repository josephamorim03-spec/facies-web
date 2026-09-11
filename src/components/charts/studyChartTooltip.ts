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
  // A caixa inteira em mono: o que ela mostra sao contagens e percentuais, e
  // numero neste sistema e mono. Herdava a sans do documento.
  fontFamily: "var(--font-mono)",
};

export const studyChartTooltipLabelStyle = {
  color: "var(--color-ink)",
  // 400, e nao 600: 12/600 nao existe em nenhuma das 22 artboards, e no desenho
  // a mono nunca pesa. O que separa o rotulo dos itens aqui e a tinta — eles
  // vem em `muted`, ele em `ink`.
  fontWeight: 400,
};

export const studyChartTooltipCursor = { fill: "var(--color-surface-muted)" };
