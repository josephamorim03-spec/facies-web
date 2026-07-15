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
  GO: "#B65AA0",
  OB: "#8B6FB6",
  PD: "#2E79A8",
  MP: "#A97816",
  CG: "#B44A4F",
  CM: "#2D8B62",
  OU: "#8C928E",
};

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

