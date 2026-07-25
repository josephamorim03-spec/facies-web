import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTextHighlightAnchor,
  resolveHighlightRanges,
} from "../../src/app/banco-de-questoes/sessao/[sessionId]/_components/questionTextHighlights.ts";

function highlight(overrides) {
  return {
    highlight_id: overrides.highlight_id ?? "h1",
    question_id: "q1",
    session_id: null,
    target: "stem",
    option: null,
    kind: "ponto_chave",
    selected_text: "beta",
    prefix: "",
    suffix: "",
    occurrence_index: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

test("highlight anchor resolves the requested text occurrence", () => {
  const text = "beta alfa beta gama beta";
  const ranges = resolveHighlightRanges(text, [
    highlight({ highlight_id: "h2", occurrence_index: 1 }),
  ]);

  assert.equal(ranges.length, 1);
  assert.equal(text.slice(ranges[0].start, ranges[0].end), "beta");
  assert.equal(ranges[0].start, 10);
});

test("invalid or overlapping highlights do not break rendering ranges", () => {
  const text = "sangramento no terceiro trimestre";
  const ranges = resolveHighlightRanges(text, [
    highlight({ highlight_id: "missing", selected_text: "ausente" }),
    highlight({ highlight_id: "wide", selected_text: "sangramento no terceiro" }),
    highlight({ highlight_id: "overlap", selected_text: "terceiro" }),
  ]);

  assert.deepEqual(ranges.map((range) => range.highlight.highlight_id), ["wide"]);
});

test("buildTextHighlightAnchor stores enough local context", () => {
  const anchor = buildTextHighlightAnchor(
    "Gestante com sangramento no terceiro trimestre",
    "sangramento",
  );

  assert.equal(anchor.selected_text, "sangramento");
  assert.equal(anchor.occurrence_index, 0);
  assert.match(anchor.prefix, /Gestante com/);
  assert.match(anchor.suffix, /terceiro/);
});

test("buildTextHighlightAnchor uses the real selection occurrence when provided", () => {
  const text = "dor forte sem febre; dor forte com rigidez";
  const selectionStart = text.lastIndexOf("dor forte");
  const anchor = buildTextHighlightAnchor(text, "dor forte", selectionStart);

  assert.equal(anchor.selected_text, "dor forte");
  assert.equal(anchor.occurrence_index, 1);
  assert.match(anchor.suffix, /com rigidez/);
});

test("highlight resolver falls back to prefix and suffix context", () => {
  const text = "beta com febre. beta com rigidez.";
  const ranges = resolveHighlightRanges(text, [
    highlight({
      occurrence_index: 9,
      prefix: "beta com febre. ",
      suffix: " com rigidez.",
    }),
  ]);

  assert.equal(ranges.length, 1);
  assert.equal(ranges[0].start, 16);
});
