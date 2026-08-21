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

export const AREA_TEXT_CLASS: Record<DisplayArea, string> = {
  GO: "text-area-go", OB: "text-area-ob", PD: "text-area-ped", MP: "text-area-mp",
  CG: "text-area-cg", CM: "text-area-cm", OU: "text-area-ou",
};

export const AREA_BORDER_CLASS: Record<DisplayArea, string> = {
  GO: "border-area-go", OB: "border-area-ob", PD: "border-area-ped", MP: "border-area-mp",
  CG: "border-area-cg", CM: "border-area-cm", OU: "border-area-ou",
};
