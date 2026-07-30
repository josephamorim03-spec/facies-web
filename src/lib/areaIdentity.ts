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

export const AREA_HEX: Record<DisplayArea, string> = {
  GO: "#8F3F7D",
  OB: "#6F5797",
  PD: "#1F6388",
  MP: "#7A560E",
  CG: "#963B40",
  CM: "#1F6B4C",
  OU: "#5F6762",
};

/**
 * Mesma paleta de área na forma de CSS var. Prefira isto ao AREA_HEX em
 * qualquer coisa desenhada na tela (Recharts aceita `var()` em stroke/fill):
 * o hex é fixo nos dois temas, enquanto a var tem override no `.dark` e
 * continua legível sobre o papel escuro.
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

export const AREA_BG_CLASS: Record<DisplayArea, string> = {
  GO: "bg-area-go", OB: "bg-area-go", PD: "bg-area-ped", MP: "bg-area-mp",
  CG: "bg-area-cg", CM: "bg-area-cm", OU: "bg-area-ou",
};

export const AREA_TEXT_CLASS: Record<DisplayArea, string> = {
  GO: "text-area-go", OB: "text-area-go", PD: "text-area-ped", MP: "text-area-mp",
  CG: "text-area-cg", CM: "text-area-cm", OU: "text-area-ou",
};

export const AREA_BORDER_CLASS: Record<DisplayArea, string> = {
  GO: "border-area-go", OB: "border-area-go", PD: "border-area-ped", MP: "border-area-mp",
  CG: "border-area-cg", CM: "border-area-cm", OU: "border-area-ou",
};

export const AREA_FULL_EXAM_HEX = "#0F4C5C";
