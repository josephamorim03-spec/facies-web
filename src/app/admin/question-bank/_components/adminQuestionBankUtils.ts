export const DEFAULT_METADATA = {
  years: [],
  board_code: "",
  grande_area: "",
  tema: "",
  subtema: "",
  microcompetencia: "",
  institution: "",
  exam_name: "",
  access_type: "",
  classification_preset_policy: "lock_filled_fields",
};

export const SOURCE_METADATA_FIELDS = [
  ["years", "Anos"],
  ["board_code", "Banca"],
  ["institution", "Instituicao"],
  ["exam_name", "Nome"],
  ["access_type", "Acesso"],
] as const;

export const CONTENT_METADATA_FIELDS = [
  ["grande_area", "Area"],
  ["tema", "Tema"],
  ["subtema", "Subtema"],
  ["microcompetencia", "Micro"],
] as const;

export const GRANDE_AREA_OPTIONS = ["CG", "CM", "PD", "MP", "GO", "OU"] as const;
const GRANDE_AREA_SET = new Set<string>(GRANDE_AREA_OPTIONS);

export const QUESTION_OVERRIDE_FIELDS = [
  ["year", "Ano"],
  ["grande_area", "Area"],
  ["tema", "Tema"],
  ["subtema", "Subtema"],
  ["microcompetencia", "Micro"],
] as const;

export const JOB_TYPES = [
  "dedup_question",
  "heuristic_classify_question",
  "cheap_ai_classify_question",
  "route_question_analysis",
  "strong_ai_classify_question",
  "publish_question",
] as const;

export function safeMetadataObject(text: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(text || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

export function fieldText(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined) return "";
  return String(value);
}

export function compactCodes(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value.map((item) => String(item || "").trim()).filter(Boolean).join(", ");
}

export function parseYearsText(value: string): number[] {
  return [...new Set(
    value
      .split(/[,\s]+/)
      .map((part) => Number.parseInt(part.trim(), 10))
      .filter((year) => Number.isFinite(year)),
  )].sort((a, b) => a - b);
}

export function normalizeGrandeArea(value: unknown): string {
  if (value === null || value === undefined) return "";
  const code = String(value).trim().toUpperCase();
  if (!code) return "";
  if (!GRANDE_AREA_SET.has(code)) {
    throw new Error(`Grande area deve ser uma destas opcoes: ${GRANDE_AREA_OPTIONS.join(", ")}.`);
  }
  return code;
}

export function compactQuestionOverrides(
  overrides: Record<string, Record<string, unknown>>,
): Record<string, Record<string, unknown>> {
  return Object.fromEntries(
    Object.entries(overrides).filter(([, value]) => Object.keys(value).length > 0),
  );
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `ha ${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `ha ${diffMin} min`;
  return `as ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

export function truncateText(value: string | null | undefined, maxLength: number): string {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}
