/**
 * O que a tela diz sobre a prova ANTES de o aluno começar.
 *
 * Duas perguntas que ela não respondia:
 *
 * 1. **"Esta prova já aconteceu?"** — a fonte rotula pela TURMA. As questões da
 *    "ENARE 2026" nasceram em 20/10/2025, porque o processo seletivo para
 *    ingresso em 2026 é aplicado no fim de 2025 (medido em seis edições
 *    seguidas). Quem lê "2026" entende "a prova deste ano" e se engana.
 * 2. **"Está completa?"** — o aluno pedia "ENARE 2024" e recebia 95 de 100 sem
 *    nada dizer que faltava.
 *
 * A regra é `null`-first: **nada é afirmado sem evidência**.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { resumoDaProva } from "../../src/app/banco/_lib/resumoDaProva.ts";

const ENARE_2024 = {
  applied_on: "2023-10-30",
  declared_count: 100,
  captured_count: 100,
  annulled_count: 5,
  completeness: "complete",
};

test("diz QUANDO a prova caiu, e não o ano do rótulo", () => {
  // O caso que confundiu o operador: rótulo 2024, aplicada em out/2023.
  const resumo = resumoDaProva(ENARE_2024);

  assert.equal(resumo.quando, "aplicada em out/2023");
  assert.equal(resumo.tamanho, "100 questões · 5 anuladas");
  assert.equal(resumo.alerta, null);
});

test("sem data, NÃO inventa — e o resto continua", () => {
  const resumo = resumoDaProva({ ...ENARE_2024, applied_on: null });

  assert.equal(resumo.quando, null);
  assert.equal(resumo.tamanho, "100 questões · 5 anuladas");
});

test("a data NÃO passa por `new Date` — fuso mudaria o dia", () => {
  // `new Date("2025-10-01")` é UTC; num fuso a oeste vira 30/09, e a prova
  // mudaria de MÊS. O parse é por fatia do ISO, de propósito.
  assert.equal(
    resumoDaProva({ ...ENARE_2024, applied_on: "2025-10-01" }).quando,
    "aplicada em out/2025",
  );
  assert.equal(
    resumoDaProva({ ...ENARE_2024, applied_on: "2025-01-01" }).quando,
    "aplicada em jan/2025",
  );
});

test("sem denominador, diz o que TEM — nunca 'de quantas'", () => {
  // Inventar o denominador seria pior que omiti-lo: a PE não tem edital
  // conferido, e "97 de 100" afirmaria um 100 que ninguém mediu.
  const resumo = resumoDaProva({
    applied_on: null,
    declared_count: null,
    captured_count: 97,
    annulled_count: 0,
    completeness: "unknown",
  });

  assert.equal(resumo.tamanho, "97 questões");
  assert.equal(resumo.alerta, null, "sem denominador não há falta a anunciar");
});

test("prova incompleta AVISA antes, não no meio", () => {
  const resumo = resumoDaProva({
    applied_on: "2023-11-08",
    declared_count: 100,
    captured_count: 93,
    annulled_count: 2,
    completeness: "partial",
  });

  assert.match(resumo.alerta ?? "", /93 das 100/);
  assert.match(resumo.alerta ?? "", /7 não foram capturadas/);
});

test("capturado ACIMA do declarado mostra o capturado", () => {
  // USP-SP 2024 declara 120 e captura 122. Dizer "120 questões" esconderia as
  // duas a mais, que é o único sinal de que há duplicata a investigar.
  const resumo = resumoDaProva({
    applied_on: null,
    declared_count: 120,
    captured_count: 122,
    annulled_count: 3,
    completeness: "over",
  });

  assert.match(resumo.tamanho, /^122 questões/);
});

test("singular e plural da anulada", () => {
  assert.match(resumoDaProva({ ...ENARE_2024, annulled_count: 1 }).tamanho, /1 anulada$/);
  assert.match(resumoDaProva({ ...ENARE_2024, annulled_count: 2 }).tamanho, /2 anuladas$/);
  assert.doesNotMatch(
    resumoDaProva({ ...ENARE_2024, annulled_count: 0 }).tamanho,
    /anulad/,
    "zero anuladas não vira '0 anuladas'",
  );
});
