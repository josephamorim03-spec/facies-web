/**
 * Compara a home renderizada com a v7 do projeto de design — MEDINDO, não
 * olhando.
 *
 * A captura serve para eu ver; o relatório de estilo computado serve para
 * provar. O bug do rótulo a 28px passou por guard, typecheck e teste porque
 * nenhum deles lê pixel — e `getComputedStyle` teria pego na primeira rodada.
 *
 * Roda de dentro de `web/` (precisa resolver `@playwright/test`).
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";

const BASE = process.env.BASE || "http://127.0.0.1:3120";
const V7 = process.env.V7;
const OUT = process.env.OUT || "test-results/comparacao";
mkdirSync(OUT, { recursive: true });

const LARGURAS = [
  { nome: "390", w: 390, h: 1400 },
  { nome: "1280", w: 1280, h: 1500 },
];

/** O que eu quero PROVAR, e não achar. */
async function medir(pagina) {
  return pagina.evaluate(() => {
    const css = (el, prop) => (el ? getComputedStyle(el).getPropertyValue(prop) : null);
    const caixa = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { topo: Math.round(r.top + window.scrollY), altura: Math.round(r.height) };
    };
    const eyebrow = document.querySelector(".paper-eyebrow");
    const h1 = document.querySelector("h1");
    const faixa = document.querySelector('[role="img"]');
    const marca = document.querySelector("header, .paper-page > div:first-child");
    return {
      eyebrow_font: css(eyebrow, "font-size"),
      eyebrow_family: (css(eyebrow, "font-family") || "").split(",")[0],
      h1_font: css(h1, "font-size"),
      h1_line: css(h1, "line-height"),
      faixa_altura: caixa(faixa)?.altura ?? null,
      // O espaço morto: quanto de página existe ANTES do primeiro conteúdo.
      topo_do_conteudo: caixa(marca)?.topo ?? null,
      body_bg: css(document.body, "background-color"),
    };
  });
}

const navegador = await chromium.launch();

for (const alvo of LARGURAS) {
  const ctx = await navegador.newContext({
    viewport: { width: alvo.w, height: alvo.h },
    deviceScaleFactor: 1,
  });
  const pagina = await ctx.newPage();

  await pagina.goto(BASE + "/", { waitUntil: "networkidle" });
  await pagina.evaluate(() => document.fonts.ready);
  await pagina.screenshot({ path: `${OUT}/nossa-${alvo.nome}.png`, fullPage: false });
  console.log(`\n=== NOSSA · ${alvo.nome}px ===`);
  console.log(JSON.stringify(await medir(pagina), null, 2));

  if (V7) {
    await pagina.goto(pathToFileURL(V7).href, { waitUntil: "networkidle" });
    await pagina.evaluate(() => document.fonts.ready);
    await pagina.screenshot({ path: `${OUT}/v7-${alvo.nome}.png`, fullPage: false });
  }

  await ctx.close();
}

await navegador.close();
console.log("\ncapturas em " + OUT);
