const PDF_LIGATURE_REPLACEMENTS: Record<string, string> = {
  "\ufb00": "ff",
  "\ufb01": "fi",
  "\ufb02": "fl",
  "\ufb03": "ffi",
  "\ufb04": "ffl",
  "\ufb05": "ft",
  "\ufb06": "st",
};

const PDF_PRIVATE_LIGATURE_REPLACEMENTS: Record<string, string> = {
  "\uf001": "fi",
  "\uf002": "fl",
};

const LETTER_RE = /\p{L}/u;
const NUMBER_RE = /\p{N}/u;
const WHITESPACE_RE = /\s/u;
const SAFE_WORD_PUNCTUATION = new Set(["-", "–", "—", "'", "’", ".", ",", ";", ":", "!", "?", "/", "\\", "(", ")", "[", "]", "{", "}"]);

function isLetter(char: string): boolean {
  return !!char && LETTER_RE.test(char);
}

function isNumber(char: string): boolean {
  return !!char && NUMBER_RE.test(char);
}

function isWhitespace(char: string): boolean {
  return !!char && WHITESPACE_RE.test(char);
}

function shouldTreatAsLigaturePlaceholder(char: string): boolean {
  if (!char) return false;
  if (isLetter(char) || isNumber(char) || isWhitespace(char)) return false;
  if (SAFE_WORD_PUNCTUATION.has(char)) return false;
  return true;
}

function replacementForPlaceholder(chars: string[], index: number): string {
  const prev = (chars[index - 1] ?? "").toLowerCase();
  const next = (chars[index + 1] ?? "").toLowerCase();
  if (next === "l") return "fi";
  if (prev === "n" && next === "u") return "fl";
  if ((!prev || !isLetter(prev)) && (next === "a" || next === "e" || next === "o" || next === "u")) return "fl";
  return "fi";
}

function repairLegacyPlaceholderLigatures(value: string): string {
  const chars = Array.from(value);
  let changed = false;

  for (let index = 0; index < chars.length; index += 1) {
    const current = chars[index] ?? "";
    if (!shouldTreatAsLigaturePlaceholder(current)) continue;

    const prev = chars[index - 1] ?? "";
    const next = chars[index + 1] ?? "";
    const next2 = chars[index + 2] ?? "";
    const inWord = isLetter(prev) && isLetter(next);
    const atWordStart = (!prev || isWhitespace(prev)) && isLetter(next) && isLetter(next2);
    if (!inWord && !atWordStart) continue;

    chars[index] = replacementForPlaceholder(chars, index);
    changed = true;
  }

  if (!changed) return value;
  return chars.join("");
}

export function repairStudyImportTextArtifacts(value: string | null | undefined): string {
  const raw = String(value ?? "");
  if (!raw) return "";

  let text = raw.normalize("NFKC");
  for (const [from, to] of Object.entries(PDF_PRIVATE_LIGATURE_REPLACEMENTS)) {
    if (text.includes(from)) {
      text = text.replaceAll(from, to);
    }
  }
  for (const [from, to] of Object.entries(PDF_LIGATURE_REPLACEMENTS)) {
    if (text.includes(from)) {
      text = text.replaceAll(from, to);
    }
  }
  text = repairLegacyPlaceholderLigatures(text);

  return text;
}
