import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const css = readFileSync(new URL("../../src/app/globals.css", import.meta.url), "utf8");

test("KROS/DOS exposes the reading and motion contracts", () => {
  for (const token of [
    "--reading-measure: 68ch",
    "--motion-fast: 120ms",
    "--motion-base: 180ms",
    "--motion-slow: 240ms",
    // Zero em todos os raios. Era 0.5rem na identidade e-ink; o retro nao tem
    // canto arredondado, e este contrato e o que impede a curva de voltar.
    "--radius-control: 0",
    "--radius-surface: 0",
    "--radius-hero: 0",
  ]) {
    assert.match(css, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test("clinical reading is left aligned, capped at the measure, and stays serif", () => {
  const readingRule = css.match(/\.paper-reading\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  assert.match(readingRule, /max-width:\s*var\(--reading-measure\)/);
  assert.match(readingRule, /text-align:\s*left/);
  assert.doesNotMatch(readingRule, /justify/);
  // `--font-sans` aponta para a mono neste sistema, entao a prosa PRECISA
  // declarar a serifa. Sem esta linha o enunciado clinico vira monoespacado
  // silenciosamente e o aluno perde ~15% de palavras por linha.
  assert.match(readingRule, /font-family:\s*var\(--font-serif\)/);
});

test("the chrome layer never renders box-drawing or block glyphs as content", () => {
  // Regua = border, barra = gradiente, colchete = ::before/::after. Um leitor
  // de tela le "▓▓▓▓" como "sombreado escuro" quatro vezes; a unica forma de
  // isso nao acontecer e o caractere nunca existir no CSS nem no markup.
  assert.doesNotMatch(css, /content:\s*["'][^"']*[─-╿▀-▟]/);
  const meterRule = css.match(/\.chrome-meter\s*>\s*\*\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  assert.match(meterRule, /repeating-linear-gradient/);
});

test("dark mode drops the hard shadow instead of painting black on black", () => {
  const darkBlock = css.match(/\.dark\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  assert.match(darkBlock, /--overlay-shadow:\s*none/);
  assert.match(darkBlock, /--color-primary:\s*#FFB000/i);
});
