import type { QuestionTextHighlight } from "@/lib/api";

export type HighlightRange = {
  highlight: QuestionTextHighlight;
  start: number;
  end: number;
};

export type TextHighlightAnchorInput = Pick<
  QuestionTextHighlight,
  "selected_text" | "prefix" | "suffix" | "occurrence_index"
>;

export function findOccurrenceIndex(text: string, selectedText: string, selectionStart: number): number {
  const needle = selectedText.trim();
  if (!needle) return 0;
  let index = 0;
  let count = 0;
  while (index >= 0) {
    index = text.indexOf(needle, index);
    if (index < 0 || index >= selectionStart) break;
    count += 1;
    index += Math.max(1, needle.length);
  }
  return Math.max(0, count);
}

function resolveSelectionStart(text: string, needle: string, selectionStart?: number): number {
  if (!needle) return -1;
  if (typeof selectionStart === "number" && selectionStart >= 0) {
    const exact = text.indexOf(needle, selectionStart);
    if (exact === selectionStart) return exact;
    const nearby = text.lastIndexOf(needle, selectionStart);
    if (nearby >= 0 && nearby <= selectionStart && selectionStart <= nearby + needle.length) return nearby;
  }
  return text.indexOf(needle);
}

export function buildTextHighlightAnchor(
  text: string,
  selectedText: string,
  selectionStart?: number,
): TextHighlightAnchorInput {
  const needle = selectedText.trim();
  const start = resolveSelectionStart(text, needle, selectionStart);
  if (start < 0) {
    return { selected_text: needle, prefix: "", suffix: "", occurrence_index: 0 };
  }
  return {
    selected_text: needle,
    prefix: text.slice(Math.max(0, start - 48), start),
    suffix: text.slice(start + needle.length, start + needle.length + 48),
    occurrence_index: findOccurrenceIndex(text, needle, start),
  };
}

function contextScore(text: string, start: number, needleLength: number, highlight: QuestionTextHighlight): number {
  let score = 0;
  const prefix = highlight.prefix.trim();
  const suffix = highlight.suffix.trim();
  if (prefix) {
    const before = text.slice(Math.max(0, start - highlight.prefix.length - 16), start);
    if (before.endsWith(highlight.prefix)) score += 4;
    else if (before.includes(prefix.slice(Math.max(0, prefix.length - 16)))) score += 2;
  }
  if (suffix) {
    const after = text.slice(start + needleLength, start + needleLength + highlight.suffix.length + 16);
    if (after.startsWith(highlight.suffix)) score += 4;
    else if (after.includes(suffix.slice(0, 16))) score += 2;
  }
  return score;
}

function resolveByContext(text: string, needle: string, highlight: QuestionTextHighlight): HighlightRange | null {
  if (!highlight.prefix && !highlight.suffix) return null;
  let index = 0;
  let best: HighlightRange | null = null;
  let bestScore = 0;
  while (index >= 0) {
    index = text.indexOf(needle, index);
    if (index < 0) break;
    const score = contextScore(text, index, needle.length, highlight);
    if (score > bestScore) {
      bestScore = score;
      best = { highlight, start: index, end: index + needle.length };
    }
    index += Math.max(1, needle.length);
  }
  return bestScore > 0 ? best : null;
}

export function resolveHighlightRange(text: string, highlight: QuestionTextHighlight): HighlightRange | null {
  const needle = highlight.selected_text.trim();
  if (!needle) return null;

  let index = 0;
  let occurrence = 0;
  const requested = Math.max(0, Number(highlight.occurrence_index) || 0);
  while (index >= 0) {
    index = text.indexOf(needle, index);
    if (index < 0) break;
    if (occurrence === requested) {
      return { highlight, start: index, end: index + needle.length };
    }
    occurrence += 1;
    index += Math.max(1, needle.length);
  }

  const contextFallback = resolveByContext(text, needle, highlight);
  if (contextFallback) return contextFallback;

  const fallback = text.indexOf(needle);
  if (fallback < 0) return null;
  return { highlight, start: fallback, end: fallback + needle.length };
}

export function resolveHighlightRanges(
  text: string,
  highlights: QuestionTextHighlight[],
): HighlightRange[] {
  const ranges = highlights
    .map((highlight) => resolveHighlightRange(text, highlight))
    .filter((range): range is HighlightRange => range !== null)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const accepted: HighlightRange[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start < cursor) continue;
    accepted.push(range);
    cursor = range.end;
  }
  return accepted;
}
