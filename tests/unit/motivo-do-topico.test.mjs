import assert from "node:assert/strict";
import test from "node:test";

import { motivoDoTopico, ROTULO_DO_MOTIVO } from "../../src/lib/motivoDoTopico.ts";

/**
 * A honestidade do card de tema, testada como REGRA e não como texto-fonte.
 *
 * O que o produto vende é "o app escolheu isto porque a SUA prova cobra". O modo
 * de falha correspondente não é um erro: é uma frase plausível sem número por
 * trás. Um "recomendado para você" sem contagem custa mais do que não mostrar
 * nada, porque põe em dúvida todo o resto da tela.
 */

function topico(extra = {}) {
  return {
    knowledge_node_id: "no-1",
    node_name: "Pré-eclâmpsia",
    recommendation_reason: "high_yield",
    ...extra,
  };
}

function evidencia(extra = {}) {
  return {
    institution_label: "SP - Universidade de São Paulo - USP - SP",
    recent_question_count: 18,
    institution_recent_question_count: 1244,
    node_role: "subtheme",
    score: 0.96,
    ...extra,
  };
}

test("com evidência, o número da prova do aluno vence a frase e o rótulo", () => {
  const motivo = motivoDoTopico(
    topico({
      target_demand_evidence: evidencia(),
      recommendation_explanation: "frase generica que nao deveria aparecer",
    }),
  );

  assert.equal(motivo.forma, "evidencia");
  assert.equal(motivo.cobradas, 18);
  assert.equal(motivo.total, 1244);
  assert.match(motivo.instituicao, /USP/);
});

test("sem evidência, cai na frase do backend — e nunca cita instituição", () => {
  const motivo = motivoDoTopico(
    topico({
      target_demand_evidence: null,
      recommendation_explanation: "Pré-eclâmpsia é um tema de alta incidência nas provas.",
    }),
  );

  assert.equal(motivo.forma, "frase");
  assert.doesNotMatch(motivo.texto, /USP/);
});

test("sem evidência e sem frase, o rótulo seco — que não finge medida", () => {
  const motivo = motivoDoTopico(topico({ recommendation_reason: "under_covered" }));

  assert.deepEqual(motivo, { forma: "rotulo", texto: ROTULO_DO_MOTIVO.under_covered });
});

test("contagem zero NAO vira evidência", () => {
  // "A USP cobrou isto em 0 das últimas 1.244 questões" é uma frase que
  // desqualifica o tópico que o sistema acabou de recomendar. O objeto de
  // evidência existir não é permissão para afirmar.
  const motivo = motivoDoTopico(
    topico({
      target_demand_evidence: evidencia({ recent_question_count: 0 }),
      recommendation_explanation: "Pré-eclâmpsia é um tema de alta incidência nas provas.",
    }),
  );

  assert.equal(motivo.forma, "frase");
});

test("sem denominador NAO vira evidência", () => {
  // 18 de 1.244 e 18 de 40 são afirmações opostas. Mostrar "18" sozinho entrega
  // ao aluno um número que ele não tem como julgar — e o julgamento dele é o
  // ponto inteiro de mostrar o número.
  const motivo = motivoDoTopico(
    topico({
      target_demand_evidence: evidencia({ institution_recent_question_count: 0 }),
    }),
  );

  assert.equal(motivo.forma, "rotulo");
});

test("rótulo de instituição vazio NAO vira evidência", () => {
  // O rótulo chega nulo quando o catálogo é anterior à 096. Sem ele a frase
  // viraria "18 de 1.244 questões recentes da " — uma preposição pendurada.
  for (const rotulo of [null, "", "   "]) {
    const motivo = motivoDoTopico(
      topico({ target_demand_evidence: evidencia({ institution_label: rotulo }) }),
    );
    assert.equal(motivo.forma, "rotulo", `rotulo=${JSON.stringify(rotulo)}`);
  }
});

test("frase só de espaços não conta como frase", () => {
  const motivo = motivoDoTopico(
    topico({ recommendation_explanation: "   ", recommendation_reason: "knowledge_gap" }),
  );

  assert.deepEqual(motivo, { forma: "rotulo", texto: ROTULO_DO_MOTIVO.knowledge_gap });
});

test("todo motivo do contrato tem rótulo — nenhum cai em undefined na tela", () => {
  for (const motivo of ["knowledge_gap", "high_yield", "under_covered", "scheduled"]) {
    assert.equal(typeof ROTULO_DO_MOTIVO[motivo], "string");
    assert.ok(ROTULO_DO_MOTIVO[motivo].length > 0);
  }
});
