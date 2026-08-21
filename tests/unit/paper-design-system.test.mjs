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

test("loading has exactly one vocabulary: segmented bar, static reticle, blinking cursor", () => {
  // O que este teste impede e a volta dos QUATRO dialetos que conviviam aqui:
  // 204 skeletons pulsando, 25 `animate-pulse`, um quadrado girando e meia
  // duzia de "Carregando..." em texto puro. Cada um dizia a mesma frase de um
  // jeito, e nenhum deles existia na epoca que a interface cita.

  // 1. A barra e gradiente repetido (receita do 98.css), nunca imagem.
  const fillRule = css.match(/\.load-bar__fill\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  assert.match(fillRule, /linear-gradient/);
  assert.doesNotMatch(fillRule, /url\(/);

  // 2. So o INDETERMINADO marcha. Barra com percentual conhecido nao anima:
  //    a largura ja carrega a informacao e movimento em cima dela atrapalha.
  assert.match(css, /\.load-bar__fill--indeterminate\s*\{[\s\S]*?animation:\s*load-bar-march/);
  assert.doesNotMatch(fillRule, /animation:/);

  // 3. Cursor e alerta piscam em DEGRAU. `step-end` e o contrato: qualquer
  //    easing suave aqui e um cursor de 2015 disfarcado de retro.
  assert.match(css, /\.chrome-cursor\s*\{[\s\S]*?animation:[^;]*step-end/);
  assert.match(css, /\.chrome-urgent\s*\{[\s\S]*?animation:[^;]*step-end/);

  // 4. O campo vazio se assume vazio: reticula estatica, sem animacao nenhuma.
  //    O respiro de opacidade que estava aqui simulava conteudo chegando.
  const skeletonRule = css.match(/\.paper-skeleton\s*\{([\s\S]*?)\n  \}/)?.[1] ?? "";
  assert.match(skeletonRule, /conic-gradient/);
  assert.doesNotMatch(skeletonRule, /animation/);
  assert.doesNotMatch(css, /paper-skeleton-breathe/);
});
