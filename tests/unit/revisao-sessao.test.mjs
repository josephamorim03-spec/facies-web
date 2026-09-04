import assert from "node:assert/strict";
import { test } from "node:test";

import { payloadDoDia } from "../../src/lib/revisaoSessao.ts";

/**
 * As escolhas do payload da Semana Final — as que quebram em silêncio.
 *
 * Nenhuma delas dá erro quando regride: se `answer_status` deixar de ser `"all"`,
 * o dia só vem menor para quem já respondeu parte da base da prova, sem log e
 * sem exceção. Se `session_kind` virar `"kros"`, o servidor pina
 * `feedback_timing: "post_result"` e a revisão passa a esconder o gabarito até o
 * fim — deixando de ser revisão. Estes asserts são o que impede as duas.
 */

test("a sessão leva exatamente as questões do dia, na ordem", () => {
  const ids = ["q3", "q1", "q2"];
  const payload = payloadDoDia(ids);
  assert.deepEqual(payload.question_ids, ids);
  assert.equal(payload.limit, 3);
});

test("answer_status é 'all' — a revisão não pula o que já foi respondido", () => {
  // Sem este campo o servidor cai em "unanswered" e o dia encolhe em silêncio
  // para quem já treinou a base do ENAMED.
  assert.equal(payloadDoDia(["q1"]).answer_status, "all");
});

test("feedback_timing é 'immediate' — é revisão, não mini-simulado", () => {
  assert.equal(payloadDoDia(["q1"]).feedback_timing, "immediate");
});

test("session_kind é 'bank_topic' e não 'kros'", () => {
  // `kros` faz o servidor pinar `post_result` e `only_unanswered` — os dois
  // contrariam a revisão.
  assert.equal(payloadDoDia(["q1"]).session_kind, "bank_topic");
});

test("resolution_mode não é enviado: o servidor o pina em 'simulation'", () => {
  // Campo morto se enviado. O teste trava a ausência para ninguém "consertar"
  // de volta acreditando que o valor tem efeito.
  assert.ok(!("resolution_mode" in payloadDoDia(["q1"])));
});

test("limit acompanha o tamanho do dia (3 a 5 questões)", () => {
  assert.equal(payloadDoDia(["a", "b", "c", "d", "e"]).limit, 5);
  assert.equal(payloadDoDia(["a", "b", "c"]).limit, 3);
});
