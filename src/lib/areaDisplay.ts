export type DisplayArea = "GO" | "OB" | "PD" | "MP" | "CG" | "CM" | "OU";

export const DISPLAY_AREA_FULL_LABELS: Record<DisplayArea, string> = {
  GO: "Ginecologia e Obstetrícia",
  OB: "Obstetrícia",
  PD: "Pediatria",
  CG: "Cirurgia Geral",
  CM: "Clínica Médica",
  MP: "Medicina Preventiva",
  OU: "Outras",
};

const VALID_AREAS = new Set<DisplayArea>(["GO", "OB", "PD", "MP", "CG", "CM", "OU"]);

function normalizeText(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeCode(value: string | null | undefined): DisplayArea | null {
  const code = String(value ?? "").trim().toUpperCase();
  return VALID_AREAS.has(code as DisplayArea) ? (code as DisplayArea) : null;
}

export function inferAreaFromText(...values: Array<string | null | undefined>): DisplayArea | null {
  const text = normalizeText(values.filter(Boolean).join(" "));
  if (!text) return null;

  if (/\b(cg|cirurgia|cirurgic|trauma|ortopedia|urologia|anestesiologia|anestesia)\b/.test(text)) return "CG";
  if (/\b(cm|clinica medica|clinico|cardiologia|pneumologia|gastro|nefro|endocrino|reumato|infecto|hematologia|neurologia|dermato)\b/.test(text)) return "CM";
  if (/\b(pd|pediatria|pediatrico|neonato|neonatal|crianca|adolescente|puericultura)\b/.test(text)) return "PD";
  if (/\b(mp|preventiva|saude coletiva|saude publica|epidemiologia|bioestatistica|sus|medicina de familia|mfc)\b/.test(text)) return "MP";
  if (/\b(go|ginecologia|ginecologic)\b/.test(text)) return "GO";
  if (/\b(ob|obstetricia|obstetra|gestante|gravidez|pre[- ]?natal|parto|puerperio)\b/.test(text)) return "OB";

  return null;
}

export function resolveDisplayArea(
  area: string | null | undefined,
  ...labels: Array<string | null | undefined>
): DisplayArea {
  const normalized = normalizeCode(area);
  if (normalized && normalized !== "OU") return normalized;
  return inferAreaFromText(...labels) ?? normalized ?? "OU";
}

export function displayAreaLabel(area: string | null | undefined, ...labels: Array<string | null | undefined>): string {
  const resolved = resolveDisplayArea(area, ...labels);
  return DISPLAY_AREA_FULL_LABELS[resolved] ?? resolved;
}
