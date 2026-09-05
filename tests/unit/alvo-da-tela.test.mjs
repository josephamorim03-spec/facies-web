import assert from "node:assert/strict";
import test from "node:test";

import {
  alvoDaProvaAlvo,
  alvoDoObjetivoV2,
  objetivoPrincipal,
  provaAlvoPrincipal,
  textoDaContagem,
} from "../../src/components/alvoDaTela.ts";

/**
 * A primeira linha do `/hoje` — quem é a prova do aluno, e quanto falta.
 *
 * ## O defeito que estes testes existem para não deixar voltar
 *
 * A linha ficava VAZIA em produção. Não por bug de renderização: por escolha de
 * fonte. Ela lia só `student-objectives-v2`, que vive atrás de
 * `ENABLE_STUDENT_OBJECTIVES_V2` — `false` no `.env.example` — e cuja rota
 * responde 404 com a flag desligada. O aluno declarava a prova em
 * `/preferencias`, o `/mapa` a reconhecia, e o Hoje continuava sem nomeá-la.
 *
 * Typecheck e lint não veem isso: os tipos casam, a query existe, o componente
 * devolve `null` educadamente. Só um teste da ESCOLHA pega.
 */

function objetivoV2({
  priority = 1,
  status = "active",
  institution_name = "UNIFESP",
  planning_date = {},
} = {}) {
  return {
    priority,
    status,
    resolved: {
      destination: { institution_name },
      planning_date: {
        status: "confirmed",
        precision: "exact",
        days_remaining: 63,
        days_remaining_min: null,
        days_remaining_max: null,
        explanation: "",
        ...planning_date,
      },
    },
  };
}

function provaAlvo({
  priority = 1,
  label = "SP - Universidade de São Paulo - USP-SP",
  exam_date = "2027-01-10",
  days_remaining = 40,
  date_status = "estimated",
} = {}) {
  return { priority, label, exam_date, days_remaining, date_status };
}

test("o contrato por BANCA sustenta a linha sozinho", () => {
  // O caso de produção: v2 indisponível (404 → `undefined`), prova declarada.
  const alvo =
    alvoDoObjetivoV2(objetivoPrincipal(undefined)) ??
    alvoDaProvaAlvo(provaAlvoPrincipal([provaAlvo()]));

  assert.ok(alvo, "sem alvo a primeira linha do Hoje volta a ficar vazia");
  assert.equal(alvo.nome, "SP - Universidade de São Paulo - USP-SP");
  assert.equal(textoDaContagem(alvo), "40 dias");
});

test("o v2 vence quando resolve, porque so' ele tem data de EDITAL", () => {
  const alvo =
    alvoDoObjetivoV2(objetivoPrincipal([objetivoV2()])) ??
    alvoDaProvaAlvo(provaAlvoPrincipal([provaAlvo()]));

  assert.equal(alvo.nome, "UNIFESP");
  assert.equal(alvo.prevista, false, "data de edital nao pode sair como prevista");
});

test("data declarada pelo aluno SEMPRE sai como prevista", () => {
  // O aluno não é autoridade editorial sobre a data da prova dele: o endpoint
  // fixa `estimated` na escrita, e a tela tem de dizer isso.
  assert.equal(alvoDaProvaAlvo(provaAlvo()).prevista, true);
});

test("sem data, sai o nome e nenhuma contagem", () => {
  const alvo = alvoDaProvaAlvo(provaAlvo({ exam_date: null, days_remaining: null }));

  assert.equal(alvo.nome, "SP - Universidade de São Paulo - USP-SP");
  assert.equal(alvo.precisao, null);
  assert.equal(textoDaContagem(alvo), null);
});

test("prova que ja' passou nao vira contagem negativa", () => {
  // "Faltam -4 dias" seria o pior jeito de dizer isso. O nome fica, o número sai.
  const alvo = alvoDaProvaAlvo(provaAlvo({ days_remaining: -4 }));

  assert.equal(textoDaContagem(alvo), null);
  assert.equal(alvo.nome, "SP - Universidade de São Paulo - USP-SP");
});

test("a declaracao por banca NUNCA produz faixa", () => {
  // O contrato tem um campo de data só. Inventar `min`/`max` aqui escreveria
  // "entre X e Y dias" a partir de uma fonte que nunca deu intervalo.
  const alvo = alvoDaProvaAlvo(provaAlvo());

  assert.equal(alvo.diasMin, null);
  assert.equal(alvo.diasMax, null);
});

test("a FAIXA do v2 se escreve como faixa, e colapsada vira numero", () => {
  const faixa = alvoDoObjetivoV2(
    objetivoV2({
      planning_date: {
        precision: "window",
        days_remaining: null,
        days_remaining_min: 58,
        days_remaining_max: 72,
      },
    }),
  );
  assert.equal(textoDaContagem(faixa), "entre 58 e 72 dias");

  const colapsada = alvoDoObjetivoV2(
    objetivoV2({
      planning_date: {
        precision: "window",
        days_remaining: null,
        days_remaining_min: 63,
        days_remaining_max: 63,
      },
    }),
  );
  assert.equal(textoDaContagem(colapsada), "63 dias", "'entre 63 e 63 dias' e' pedantismo");
});

test("o principal e' a menor PRIORIDADE, nao o primeiro do array", () => {
  // Ordem de array é acidente de serialização; prioridade carrega a decisão.
  assert.equal(
    provaAlvoPrincipal([
      provaAlvo({ priority: 3, label: "TERCEIRA" }),
      provaAlvo({ priority: 1, label: "PRIMEIRA" }),
      provaAlvo({ priority: 2, label: "SEGUNDA" }),
    ]).label,
    "PRIMEIRA",
  );
  assert.equal(
    objetivoPrincipal([
      objetivoV2({ priority: 2, institution_name: "SEGUNDA" }),
      objetivoV2({ priority: 1, institution_name: "PRIMEIRA" }),
    ]).resolved.destination.institution_name,
    "PRIMEIRA",
  );
});

test("objetivo v2 retratado nao pode montar o dia", () => {
  // Ele continua na lista — é assim que o aluno vê que existiu — mas cai para a
  // declaração por banca em vez de virar o alvo.
  const alvo =
    alvoDoObjetivoV2(objetivoPrincipal([objetivoV2({ status: "retracted" })])) ??
    alvoDaProvaAlvo(provaAlvoPrincipal([provaAlvo()]));

  assert.equal(alvo.nome, "SP - Universidade de São Paulo - USP-SP");
});

test("nenhuma das duas fontes: a linha simplesmente nao sai", () => {
  const alvo =
    alvoDoObjetivoV2(objetivoPrincipal([])) ?? alvoDaProvaAlvo(provaAlvoPrincipal([]));

  assert.equal(alvo, null);
});
