import assert from "node:assert/strict";
import test from "node:test";

import { fasesDoPlano, naoCoube } from "../../src/app/plano/_lib/fases.ts";

const HOJE = "2026-09-03";

function atividade(dia, kind = "topic_practice", questoes = 10, minutos = 20) {
  return {
    activity_id: `a-${dia}-${kind}`,
    scheduled_date: dia,
    slot_order: 0,
    kind,
    title: "Bloco",
    difficulty_class: "padrao",
    estimated_minutes: minutos,
    estimated_questions: questoes,
    status: "pending",
    locked: false,
    session_id: null,
    review_task_id: null,
    observed_minutes: null,
    observed_questions: null,
    completed_at: null,
    change_type: "added",
    unscheduled_reason: null,
    recommended_window: null,
    rationale: {},
  };
}

function maisDias(iso, dias) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

test("agrupa nas tres janelas do desenho", () => {
  const atividades = [
    atividade(maisDias(HOJE, 0)),
    atividade(maisDias(HOJE, 6)),
    atividade(maisDias(HOJE, 7), "review"),
    atividade(maisDias(HOJE, 20), "review"),
    atividade(maisDias(HOJE, 21), "review"),
  ];
  const fases = fasesDoPlano(atividades, HOJE, maisDias(HOJE, 40));
  assert.deepEqual(
    fases.map((f) => f.chave),
    ["esta_semana", "semanas_2_3", "restante"],
  );
  assert.equal(fases[0].atividades, 2);
  assert.equal(fases[1].atividades, 2);
  assert.equal(fases[2].atividades, 1);
});

test("janela sem atividade NAO vira caixa vazia", () => {
  // Um plano so' com esta semana nao pode desenhar "Semanas 2 e 3" vazio: seria
  // dizer que ha' plano onde nao ha'.
  const fases = fasesDoPlano([atividade(HOJE)], HOJE, maisDias(HOJE, 40));
  assert.deepEqual(fases.map((f) => f.chave), ["esta_semana"]);
});

test("horizonte curto nao inventa janela distante", () => {
  const atividades = [atividade(HOJE), atividade(maisDias(HOJE, 5))];
  const fases = fasesDoPlano(atividades, HOJE, maisDias(HOJE, 6));
  assert.equal(fases.length, 1);
  assert.equal(fases[0].dias, 7);
});

test("os dias da ultima janela param no horizonte", () => {
  const atividades = [atividade(maisDias(HOJE, 21), "review")];
  const fases = fasesDoPlano(atividades, HOJE, maisDias(HOJE, 27));
  assert.equal(fases[0].chave, "restante");
  // 21..27 sao sete dias, e nao "infinito".
  assert.equal(fases[0].dias, 7);
});

test("soma questoes e minutos da janela", () => {
  const fases = fasesDoPlano(
    [atividade(HOJE, "topic_practice", 12, 24), atividade(maisDias(HOJE, 1), "review", 8, 16)],
    HOJE,
    maisDias(HOJE, 10),
  );
  assert.equal(fases[0].questoes, 20);
  assert.equal(fases[0].minutos, 40);
});

test("'So revisao' so' aparece quando e' verdade", () => {
  const soRevisao = fasesDoPlano(
    [atividade(HOJE, "review"), atividade(maisDias(HOJE, 1), "review")],
    HOJE,
    maisDias(HOJE, 10),
  );
  assert.equal(soRevisao[0].resumo, "Só revisão.");

  const misto = fasesDoPlano(
    [atividade(HOJE, "review"), atividade(maisDias(HOJE, 1), "topic_practice")],
    HOJE,
    maisDias(HOJE, 10),
  );
  // A primeira letra e' maiuscula ("Revisão e prática..."), entao a busca e'
  // insensivel a caixa.
  assert.match(misto[0].resumo, /revisão/i);
  assert.doesNotMatch(misto[0].resumo, /^Só/);
});

test("nenhum nome de schema chega ao resumo", () => {
  // `dna_drill` e `multi_topic_simulado` sao vocabulario interno; o handoff
  // proibe nome de schema na tela.
  const fases = fasesDoPlano(
    [atividade(HOJE, "dna_drill"), atividade(maisDias(HOJE, 1), "multi_topic_simulado")],
    HOJE,
    maisDias(HOJE, 10),
  );
  assert.doesNotMatch(fases[0].resumo, /dna|drill|multi_topic|kros|_/i);
});

test("descanso nao conta como tipo dominante", () => {
  const fases = fasesDoPlano(
    [atividade(HOJE, "rest"), atividade(maisDias(HOJE, 1), "review")],
    HOJE,
    maisDias(HOJE, 10),
  );
  assert.equal(fases[0].resumo, "Só revisão.");
});

test("atividade sem data e' o que NAO coube, e fica visivel", () => {
  const semData = { ...atividade(HOJE), scheduled_date: null, unscheduled_reason: "no_capacity" };
  const todas = [atividade(HOJE), semData];
  assert.equal(naoCoube(todas).length, 1);
  // E ela nao entra em nenhuma fase, senao apareceria duas vezes.
  const fases = fasesDoPlano(todas, HOJE, maisDias(HOJE, 10));
  assert.equal(fases[0].atividades, 1);
});
