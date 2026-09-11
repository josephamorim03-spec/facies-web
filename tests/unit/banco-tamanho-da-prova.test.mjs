/**
 * A TELA PRECISA SABER O TAMANHO DA PROVA — o servidor já sabia.
 *
 * O backend passou a servir a prova inteira (100 do ENARE, não 10). Mas os três
 * números que o aluno lê antes de começar continuavam saindo do seletor de
 * quantidade, e a tela dele mostrava:
 *
 *     Número de questões    10        ← `clampedLimit`
 *     Tempo estimado        15 min    ← 10 × 1,5
 *     [ Começar prova · 10 questões ]
 *     2026 · 67   2025 · 90   2024 · 95   ← contagem do ÍNDICE DE TREINO
 *
 * Consertar o servidor e deixar a tela mentindo é meio conserto: para quem usa,
 * nada mudou — e foi exatamente esse o relato.
 *
 * Os números aqui são os medidos em produção para o ENARE.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  tamanhoDaProva,
  tamanhoPorAno,
} from "../../src/app/banco/_lib/tamanhoDaProva.ts";

/** ENARE, acesso direto: um caderno por ano, com as anuladas medidas. */
const ENARE = [
  { year: 2026, captured_count: 100, annulled_count: 10 },
  { year: 2025, captured_count: 100, annulled_count: 4 },
  { year: 2024, captured_count: 100, annulled_count: 5 },
];

test("com as anuladas, a prova tem o tamanho que teve", () => {
  const so2026 = ENARE.filter((e) => e.year === 2026);

  assert.equal(tamanhoDaProva(so2026, true), 100);
});

test("sem as anuladas, o número cai — e é o número honesto", () => {
  // 100 − 10. O aluno que não quer questão sem gabarito válido recebe 90, e o
  // botão passa a prometer 90.
  const so2026 = ENARE.filter((e) => e.year === 2026);

  assert.equal(tamanhoDaProva(so2026, false), 90);
});

test("metades do mesmo caderno SOMAM", () => {
  // A fonte parte alguns cadernos em duas entradas por variação do texto da
  // modalidade. Contar só uma daria meia prova.
  const partido = [
    { year: 2024, captured_count: 60, annulled_count: 2 },
    { year: 2024, captured_count: 40, annulled_count: 1 },
  ];

  assert.equal(tamanhoDaProva(partido, true), 100);
  assert.equal(tamanhoDaProva(partido, false), 97);
});

test("sem edição, `null` — e não zero", () => {
  // `null` faz a tela cair no número do seletor; `0` faria o botão prometer
  // zero questões numa sessão que teria questões.
  assert.equal(tamanhoDaProva([], true), null);
});

test("prova só de anuladas, sem incluí-las, é `null`", () => {
  const so_anuladas = [{ year: 2020, captured_count: 4, annulled_count: 4 }];

  assert.equal(tamanhoDaProva(so_anuladas, false), null);
  assert.equal(tamanhoDaProva(so_anuladas, true), 4);
});

test("o tamanho POR ANO alimenta o seletor de ano", () => {
  // Era "2026 · 67" (índice de treino) e passa a ser o tamanho da prova.
  const comAnuladas = tamanhoPorAno(ENARE, true);
  const semAnuladas = tamanhoPorAno(ENARE, false);

  assert.equal(comAnuladas.get(2026), 100);
  assert.equal(comAnuladas.get(2024), 100);
  assert.equal(semAnuladas.get(2026), 90);
  assert.equal(semAnuladas.get(2025), 96);
});

test("o ano sem prova NÃO entra no mapa", () => {
  // Entrar com 0 faria o seletor oferecer um ano que não tem prova.
  const mapa = tamanhoPorAno(
    [{ year: 2019, captured_count: 3, annulled_count: 3 }],
    false,
  );

  assert.equal(mapa.has(2019), false);
});
