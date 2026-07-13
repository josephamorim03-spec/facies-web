import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const css = readFileSync(new URL("../../src/app/globals.css", import.meta.url), "utf8");

test("Paper exposes the reading and motion contracts", () => {
  for (const token of [
    "--reading-measure: 68ch",
    "--motion-fast: 120ms",
    "--motion-base: 180ms",
    "--motion-slow: 240ms",
    "--radius-control: 0.5rem",
    "--radius-surface: 0.75rem",
  ]) {
    assert.match(css, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test("clinical reading is left aligned and capped at the Paper measure", () => {
  const readingRule = css.match(/\.paper-reading\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  assert.match(readingRule, /max-width:\s*var\(--reading-measure\)/);
  assert.match(readingRule, /text-align:\s*left/);
  assert.doesNotMatch(readingRule, /justify/);
});
