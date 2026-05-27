import { DirectedStudyEditImpactPreview, getAPIErrorCode, getAPIErrorDetail } from "@/lib/api";

export const FSRS_RATINGS = [
  { value: "again", label: "Errei" },
  { value: "hard", label: "Dificil" },
  { value: "good", label: "Bom" },
  { value: "easy", label: "Facil" },
] as const;

export const PDF_QUESTIONS_NOT_FOUND_MESSAGE = "Não foi possível extrair questões válidas do PDF.";

export function isPdfQuestionsNotFoundMessage(message: string | null | undefined): boolean {
  if (!message) return false;
  const normalized = message
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return normalized.includes("não foi possível extrair questões válidas do pdf.");
}

export function resolvePerformedAtISO(logDateISO?: string | null): string {
  if (!logDateISO) return new Date().toISOString();
  const trimmed = logDateISO.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T12:00:00`).toISOString();
  }
  return new Date().toISOString();
}

export function parseStudyEditImpactPreview(err: unknown): DirectedStudyEditImpactPreview | null {
  if (getAPIErrorCode(err) !== "study_edit_confirmation_required") return null;
  const detail = getAPIErrorDetail(err) as { preview?: DirectedStudyEditImpactPreview } | null;
  const preview = detail?.preview;
  if (!preview || typeof preview !== "object") return null;
  return preview;
}

export function resolveImportSessionErrorMessage(err: unknown): string {
  const fallback = "Nao foi possivel iniciar o simulado agora. Tente novamente em alguns segundos.";
  const code = getAPIErrorCode(err);
  if (code === "rate_limited") {
    return "Muitas tentativas em pouco tempo. Aguarde alguns segundos e tente novamente.";
  }
  if (code === "import_overloaded") {
    return "Importacao em alta demanda. Tente novamente em instantes.";
  }
  if (code === "parser_unavailable" || code === "upstream_unavailable") {
    return "Servico de importacao temporariamente indisponivel. Tente novamente em instantes.";
  }
  if (code === "upstream_timeout") {
    return "A importacao demorou mais do que o esperado. Tente novamente em instantes.";
  }
  if (err instanceof Error) {
    const message = String(err.message ?? "").trim();
    if (!message) return fallback;
    const normalized = message.toLowerCase();
    if (normalized === "request failed" || normalized.includes("failed to fetch")) {
      return fallback;
    }
    return message;
  }
  if (typeof err === "string") {
    const message = err.trim();
    if (!message) return fallback;
    const normalized = message.toLowerCase();
    if (normalized === "request failed" || normalized.includes("failed to fetch")) {
      return fallback;
    }
    return message;
  }
  return fallback;
}
