// Conservative list marker detection: only markers at the beginning of a line.
// This avoids false positives in inline clinical/citation text such as
// "(IFG 10)", "135 X 90", "Volume 2. Capitulo 35".
const LINE_START_ENUMERATION_ITEM_RE =
  /^\s*(?:\(?\d{1,2}\)?|\(?(?:X{0,4})(?:IX|IV|VIII|VII|VI|V|III|II|I)\)?)\s*(?:[-–—.:)])\s+\S/;

// Directive text glued to the end of a numbered item line.
const DIRECTIVE_AFTER_ITEM_RE =
  /^((?:\(?\d{1,2}\)?|\(?(?:X{0,4})(?:IX|IV|VIII|VII|VI|V|III|II|I)\)?)\s*(?:[-–—.:)])[^\n]*?[^\n\s])\s+((?:Assinale|Marque|Julgue|Indique|Com\s+base\b|Diante\s+d[oa]\b|Diante\s+disso\b|Considerando\b|A\s+partir\s+de\b|De\s+acordo\b|Tendo\s+em\s+vista\b))/gim;

const EXTRA_PARAGRAPH_BREAK_RE = /\n{3,}/g;

export function formatStudyImportDisplayText(value: string | null | undefined): string {
  const raw = String(value ?? "");
  if (!raw) return "";

  let text = raw.replace(/\r\n?/g, "\n");
  // Remove U+FFFD (replacement char) before processing.
  text = text.replace(/\ufffd/g, "");

  // Insert list paragraph breaks only when we clearly have a list-like block
  // with 2+ item markers at line start.
  const lines = text.split("\n");
  const listStartCount = lines.reduce((count, line) => {
    return LINE_START_ENUMERATION_ITEM_RE.test(line) ? count + 1 : count;
  }, 0);

  if (listStartCount >= 2) {
    const rebuilt: string[] = [];
    for (const line of lines) {
      const isListItem = LINE_START_ENUMERATION_ITEM_RE.test(line);
      if (isListItem && rebuilt.length > 0 && rebuilt[rebuilt.length - 1].trim() !== "") {
        rebuilt.push("");
      }
      rebuilt.push(line);
    }
    text = rebuilt.join("\n");

    // Split directives ("Assinale...", etc.) that were glued to the same line.
    text = text.replace(DIRECTIVE_AFTER_ITEM_RE, "$1\n\n$2");
  }

  text = text.replace(EXTRA_PARAGRAPH_BREAK_RE, "\n\n");

  return text.trim();
}
