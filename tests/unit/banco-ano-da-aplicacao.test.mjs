/**
 * "2026" É A TURMA, NÃO O ANO EM QUE A PROVA CAIU.
 *
 * Relatado na tela: *"o ENARE de 2026 nem ocorreu ainda"*. Ocorreu — em
 * **20/10/2025**. A fonte rotula pelo ingresso, e o processo seletivo para
 * entrar em 2026 é aplicado no fim de 2025. Quem lê "2026" no seletor entende
 * "a prova deste ano".
 *
 * ⚠️ ESTE ARQUIVO EXISTE PARA IMPEDIR A CORREÇÃO ÓBVIA. Renumerar — exibir
 * 2025 no lugar de 2026 — foi medido contra produção em 2026-09-10 e colide:
 * das **2.043** edições de prova só **662** têm data provada, e renumerar onde
 * há prova mantendo o rótulo onde não há junta edições diferentes no mesmo
 * número — **133 grupos, 266 edições**. O ENARE é um deles: 2022 vira 2021 e
 * encontra o 2021 sem data. Dois chips "2021" oferecendo provas diferentes é
 * pior que o rótulo confuso.
 *
 * O que fica: dizer QUANDO caiu, ao lado do rótulo, e **nada** onde não se
 * sabe.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { aplicacaoPorAno } from "../../src/app/banco/_lib/tamanhoDaProva.ts";

/** Só o que importa à função: ela lê `year` e `applied_on`. */
function edicao(year, applied_on, extra = {}) {
  return { year, applied_on, captured_count: 100, annulled_count: 0, ...extra };
}

test("a ENARE 2026 caiu em out/2025", () => {
  const mapa = aplicacaoPorAno([edicao(2026, "2025-10-20")]);

  assert.equal(mapa.get(2026), "out/2025");
});

test("ano sem data NÃO ganha frase — nem `ano - 1` inventado", () => {
  // O ENARE 2021 é este caso em produção: `applied_on` nulo.
  const mapa = aplicacaoPorAno([edicao(2026, "2025-10-20"), edicao(2021, null)]);

  assert.equal(mapa.has(2021), false, "afirmou uma data que ninguém mediu");
  assert.equal(mapa.size, 1);
});

test("o rótulo do ano NUNCA é reescrito: a chave continua sendo o ano da fonte", () => {
  // A colisão que este arquivo evita: se a função devolvesse o ano renumerado,
  // 2022 e 2021 disputariam a mesma chave.
  const mapa = aplicacaoPorAno([edicao(2022, "2021-12-17"), edicao(2021, null)]);

  assert.deepEqual([...mapa.keys()], [2022]);
  assert.equal(mapa.get(2022), "dez/2021");
});

test("cadernos do mesmo ano que discordam da data não viram uma data só", () => {
  // O ENARE tem oito cadernos por ano; eleger o primeiro seria afirmar por
  // sorteio.
  const mapa = aplicacaoPorAno([
    edicao(2024, "2023-10-30"),
    edicao(2024, "2023-11-05"),
  ]);

  assert.equal(mapa.has(2024), false);
});

test("cadernos que CONCORDAM viram uma data só", () => {
  const mapa = aplicacaoPorAno([
    edicao(2024, "2023-10-30"),
    edicao(2024, "2023-10-30"),
  ]);

  assert.equal(mapa.get(2024), "out/2023");
});

test("a data é fatiada do ISO, não passada por `new Date`", () => {
  // `new Date("2025-10-01")` é UTC: num fuso a oeste vira 30/09 e a prova muda
  // de mês. O primeiro dia do mês é onde isso aparece.
  const mapa = aplicacaoPorAno([edicao(2026, "2025-10-01")]);

  assert.equal(mapa.get(2026), "out/2025");
});

/**
 * ⚠️ As asserções abaixo são sobre o CALL SITE, e não sobre a função.
 *
 * Nesta base já foram ao ar duas vezes um endpoint e uma view corretos que
 * **nenhuma tela consumia**. Função certa sem ligação é trabalho invisível ao
 * aluno.
 */
const fonte = (caminho) =>
  readFileSync(new URL(`../../src/app/banco/${caminho}`, import.meta.url), "utf8");

test("a página passa a data adiante, e a barra a entrega ao seletor", () => {
  assert.match(fonte("page.tsx"), /aplicacaoPorAnoDaProva=\{aplicacaoPorAnoDaProva\}/);
  assert.match(
    fonte("_components/FiltersBar.tsx"),
    /aplicacaoPorAnoDaProva=\{aplicacaoPorAnoDaProva\}/,
  );
});

test("o chip do ano RENDERIZA a data", () => {
  const picker = fonte("_components/YearPicker.tsx")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((linha) => linha.replace(/\/\/.*$/, ""))
    .join("\n");

  assert.match(picker, /aplicacaoPorAnoDaProva\?\.get\(year\)/);
  assert.match(picker, /\{quando\}/, "a data foi calculada e não foi exibida");
});

test("o hook só produz o mapa no modo prova", () => {
  const hook = fonte("_lib/useEdicoesDaProva.ts");

  assert.match(hook, /aplicacaoPorAnoDaProva: ehModoProva \? aplicacaoPorAno\(edicoes\) : null/);
});
