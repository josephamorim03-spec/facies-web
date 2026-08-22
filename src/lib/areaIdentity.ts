export type DisplayArea = "GO" | "OB" | "PD" | "MP" | "CG" | "CM" | "OU";

export const AREA_FULL_LABELS: Record<DisplayArea, string> = {
  GO: "Ginecologia e Obstetrícia",
  OB: "Obstetrícia",
  PD: "Pediatria",
  CG: "Cirurgia Geral",
  CM: "Clínica Médica",
  MP: "Medicina Preventiva",
  OU: "Outras",
};

export const AREA_SHORT_LABELS: Record<DisplayArea, string> = {
  GO: "GO", OB: "OB", PD: "PD", CG: "CG", CM: "CM", MP: "MP", OU: "OU",
};

/**
 * Cor de área — FONTE ÚNICA.
 *
 * Havia um `AREA_HEX` paralelo com hexes fixos. Os 8 divergiam destes, e 14 dos
 * 20 arquivos que importam "AREA_COLORS" recebiam aquela paleta: GO saía
 * `#7B0F6B` no gráfico da Evolução e `#8F3F7D` na pílula do calendário, na
 * mesma sessão. No tema escuro a divergência explodia — o hex fixo não tinha
 * override, então a cor clara continuava sendo desenhada sobre papel preto.
 *
 * A var resolve os dois problemas: tem override no `.dark` e existe uma vez só.
 * Recharts aceita `var()` em `stroke`/`fill`, então não há motivo para hex.
 */
export const AREA_VAR: Record<DisplayArea, string> = {
  GO: "var(--area-go)",
  OB: "var(--area-ob)",
  PD: "var(--area-ped)",
  MP: "var(--area-mp)",
  CG: "var(--area-cg)",
  CM: "var(--area-cm)",
  OU: "var(--area-ou)",
};

export const AREA_FULL_EXAM_VAR = "var(--area-full-exam)";

// OB apontava para a cor do GO aqui e para `--area-ob` no `AREA_VAR` — a mesma
// área com duas cores dependendo de quem perguntasse. OB é código próprio em
// `VALID_AREAS`, e quem filtra por OB precisa ver OB.
export const AREA_BG_CLASS: Record<DisplayArea, string> = {
  GO: "bg-area-go", OB: "bg-area-ob", PD: "bg-area-ped", MP: "bg-area-mp",
  CG: "bg-area-cg", CM: "bg-area-cm", OU: "bg-area-ou",
};

/*
 * NAO existe AREA_TEXT_CLASS, e a ausencia e' deliberada.
 *
 * Cor de area e' MARCA, nunca texto: ponto, barra, faixa, celula — sempre ao
 * lado de um rotulo em tinta. O rotulo carrega a informacao; a cor e' o atalho
 * de leitura.
 *
 * O motivo e' medido. Texto exige 4.5:1, e nenhuma paleta segura para
 * daltonismo entrega isso em sete tons sobre papel claro: a Okabe-Ito reprovou
 * 29 dos 152 pares quando a sigla era escrita na cor da area. Como MARCA o
 * minimo e' 3:1 (WCAG 1.4.11), e ai ela passa — com tres tons escurecidos, o que
 * esta registrado em globals.css.
 *
 * Se voce precisa da sigla colorida, o que voce quer e' a barra colorida com a
 * sigla em `text-ink` ao lado. E o padrao `.area-nome` do sistema.
 */

export const AREA_BORDER_CLASS: Record<DisplayArea, string> = {
  GO: "border-area-go", OB: "border-area-ob", PD: "border-area-ped", MP: "border-area-mp",
  CG: "border-area-cg", CM: "border-area-cm", OU: "border-area-ou",
};
