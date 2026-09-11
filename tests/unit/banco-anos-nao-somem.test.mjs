/**
 * OS ANOS NÃO PODEM SUMIR — e sumiram, por uma linha minha.
 *
 * Relatado na tela (2026-09-10): *"ao selecionar a banca não tá aparecendo mais
 * os anos (não só ENARE, mas também outras instituições)"*.
 *
 * A causa: ao fazer o seletor de ano mostrar o tamanho da PROVA em vez da
 * contagem do índice de treino, eu troquei o mapa inteiro —
 *
 *     if (tamanhoPorAnoDaProva) return tamanhoPorAnoDaProva;
 *
 * — e no modo prova esse mapa **nasce vazio**: as edições chegam por rede,
 * depois. A lista de anos deriva das chaves do mapa, então ela ficava vazia
 * entre escolher a banca e a resposta chegar. Numa banca sem edição publicada,
 * ficava vazia para sempre.
 *
 * A regra que fica: **quais anos existem** é do `yearStats`; **quantas questões
 * cada um tem** é da prova, onde ela souber.
 *
 * ⚠️ Asserção sobre o FONTE porque o defeito é de composição de dados sob
 * carregamento — um render em jsdom com o mapa já cheio nunca o reproduziria,
 * que é exatamente o estado em que eu testei e deixei passar.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const PICKER = new URL(
  "../../src/app/banco/_components/YearPicker.tsx",
  import.meta.url,
);

/** Só o código: o comentário cita a linha defeituosa para explicá-la. */
const fonte = readFileSync(PICKER, "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split("\n")
  .map((linha) => linha.replace(/\/\/.*$/, ""))
  .join("\n");

test("o mapa de contagens NUNCA é substituído pelo da prova", () => {
  assert.doesNotMatch(
    fonte,
    /return\s+tamanhoPorAnoDaProva\s*;/,
    "substituir o mapa inteiro faz os anos sumirem enquanto as edições não chegam",
  );
});

test("os anos vêm do `yearStats`, e a prova só sobrepõe a contagem", () => {
  const bloco = fonte.slice(fonte.indexOf("const countByYear"), fonte.indexOf("const numericYears"));

  assert.match(bloco, /for \(const item of yearStats\)/, "a lista de anos deixou de vir do facet");
  assert.match(
    bloco,
    /for \(const \[ano, tamanho\] of tamanhoPorAnoDaProva \?\? \[\]\) map\.set\(ano, tamanho\)/,
    "a sobreposição ano a ano sumiu",
  );
});

test("a sobreposição vem DEPOIS do facet — senão o treino vence", () => {
  const bloco = fonte.slice(fonte.indexOf("const countByYear"), fonte.indexOf("const numericYears"));

  assert.ok(
    bloco.indexOf("of yearStats") < bloco.indexOf("of tamanhoPorAnoDaProva"),
    "o facet sobrescreveria o tamanho da prova",
  );
});
