import { AREA_FULL_LABELS, type DisplayArea } from "./areaIdentity.ts";
export type { DisplayArea } from "@/lib/areaIdentity";

export const DISPLAY_AREA_FULL_LABELS = AREA_FULL_LABELS;

const VALID_AREAS = new Set<DisplayArea>(["GO", "OB", "PD", "MP", "CG", "CM", "OU"]);

const AREA_TEXT_PATTERNS: Array<[DisplayArea, RegExp[]]> = [
  [
    "CG",
    [
      /\b(cg|cirurgia|cirurgic|trauma|ortopedia|urologia|anestesiologia|anestesia)\b/,
      /\b(pre|pos|intra|peri)[- ]?operatori[ao]s?\b/,
      /\boperatori[ao]s?\b/,
      /\bavaliacao pre[- ]?operatoria\b/,
      /\b(laparotomia|laparoscopia|abdome agudo|apendicite|colecistite|hernia|obstrucao intestinal)\b/,
    ],
  ],
  [
    "CM",
    [
      /\b(cm|clinica medica|medicina interna|clinico)\b/,
      /\b(cardiologia|pneumologia|gastro|nefro|endocrino|reumato|infecto|hematologia|neurologia|dermato)\b/,
      /\b(hipertensao|diabetes|insuficiencia cardiaca|pneumonia|sepse|fibrilacao atrial|infarto)\b/,
    ],
  ],
  [
    "PD",
    [
      /\b(pd|pediatria|pediatrico|lactente|neonato|neonatal|recem[- ]?nascido|crianca|adolescente|puericultura)\b/,
      /\b(imunizacao infantil|crescimento e desenvolvimento)\b/,
    ],
  ],
  [
    "MP",
    [
      /\b(mp|preventiva|saude coletiva|saude publica|epidemiologia|bioestatistica|sus|medicina de familia|mfc)\b/,
      /\b(vigilancia sanitaria|vigilancia epidemiologica|notificacao compulsoria|inquerito epidemiologico)\b/,
    ],
  ],
  [
    "GO",
    [
      /\b(go|ginecologia|ginecologic|ciclo menstrual|amenorreia|endometriose|sangramento uterino)\b/,
    ],
  ],
  [
    "OB",
    [
      /\b(ob|obstetricia|obstetra|gestante|gestacao|gravidez|pre[- ]?natal|parto|puerperio|puerpera)\b/,
      /\b(eclampsia|pre[- ]?eclampsia|placenta)\b/,
    ],
  ],
];

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

  const matches = AREA_TEXT_PATTERNS
    .filter(([, patterns]) => patterns.some((pattern) => pattern.test(text)))
    .map(([area]) => area);
  if (matches.length === 1) return matches[0] ?? null;
  if (matches.includes("GO") && matches.includes("OB") && matches.every((area) => area === "GO" || area === "OB")) {
    return "GO";
  }

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
