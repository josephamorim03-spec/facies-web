/**
 * Extracts a human-readable message from an unknown thrown value.
 * Covers Error instances, APIError-shaped objects, and plain strings.
 */
export function getErrorMessage(e: unknown, fallback = "Erro desconhecido"): string {
  if (e instanceof Error) return e.message || fallback;
  if (typeof e === "string") return e || fallback;
  if (e && typeof e === "object") {
    const msg = (e as Record<string, unknown>).message;
    if (typeof msg === "string") return msg || fallback;
  }
  return fallback;
}
