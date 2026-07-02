// TS puro, sem imports de runtime: também é consumido pelos unit tests via
// `node --experimental-strip-types` (aliases `@/` não resolvem lá).

export type QuestionSourceLike = {
  institution?: unknown;
  board_name?: unknown;
  board_code?: unknown;
  year?: unknown;
};

/**
 * Rótulo de fonte legível e deduplicado: "Instituição · Banca · Ano".
 *
 * O dado bruto (upstream, kbank) às vezes vem com `institution == board_code`
 * (gera "REVALIDA REVALIDA") ou com a instituição vazia. Aqui: preferimos
 * `board_name` sobre `board_code`, removemos vazios e deduplicamos sem diferenciar
 * maiúsc./minúsc., sem placeholders. Se só sobrar o ano, mostramos o ano;
 * se não sobrar nada, "Fonte não informada".
 */
export function formatSourceLabel(source: QuestionSourceLike | null | undefined): string {
  const institution = String(source?.institution ?? "").trim();
  const board = String(source?.board_name ?? source?.board_code ?? "").trim();
  const year = String(source?.year ?? "").trim();

  const parts: string[] = [];
  const seen = new Set<string>();
  for (const part of [institution, board, year]) {
    if (!part) continue;
    const key = part.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    parts.push(part);
  }

  return parts.length > 0 ? parts.join(" · ") : "Fonte não informada";
}
