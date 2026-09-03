import assert from "node:assert/strict";
import test from "node:test";

import { manchetteDoDia } from "../../src/app/hoje/_lib/manchete.ts";

const INTOCADO = { questoesDoDia: 24, respondidasHoje: 0, minutosDoDia: 35, temSessaoAberta: false };

test("dia intocado anuncia o TAMANHO do dia (8b)", () => {
  assert.equal(manchetteDoDia(INTOCADO), "Hoje são 24 questões, cerca de 35 minutos");
});

test("dia comecado conta o que FALTA, nao o que foi feito (13e)", () => {
  const frase = manchetteDoDia({ ...INTOCADO, respondidasHoje: 8 });
  assert.equal(frase, "Faltam 16 questões das 24 de hoje");
});

test("sessao aberta sem nenhuma resposta ja' e' dia comecado", () => {
  // Abrir a sessao e nao responder nada e' o caso do plantao que interrompeu:
  // a manchete tem de falar do que falta, senao ela propoe recomecar o dia.
  const frase = manchetteDoDia({ ...INTOCADO, temSessaoAberta: true });
  assert.equal(frase, "Faltam 24 questões das 24 de hoje");
});

test("dia cumprido tem frase propria, e nao 'Faltam 0'", () => {
  const frase = manchetteDoDia({ ...INTOCADO, respondidasHoje: 24 });
  assert.equal(frase, "Você fechou o dia");
});

test("responder MAIS que o planejado nao produz numero negativo", () => {
  const frase = manchetteDoDia({ ...INTOCADO, respondidasHoje: 30 });
  assert.equal(frase, "Você fechou o dia");
});

test("singular", () => {
  assert.equal(
    manchetteDoDia({ questoesDoDia: 1, respondidasHoje: 0, minutosDoDia: 0, temSessaoAberta: false }),
    "Hoje são 1 questão",
  );
  assert.equal(
    manchetteDoDia({ questoesDoDia: 2, respondidasHoje: 1, minutosDoDia: 0, temSessaoAberta: false }),
    "Faltam 1 questão das 2 de hoje",
  );
});

test("degrada em vez de mentir quando falta um dos numeros", () => {
  // Sem total conhecido, o dia comecado NAO vira "Faltam X das 0".
  assert.equal(
    manchetteDoDia({ questoesDoDia: 0, respondidasHoje: 5, minutosDoDia: 40, temSessaoAberta: true }),
    "Hoje, cerca de 40 minutos",
  );
  assert.equal(
    manchetteDoDia({ questoesDoDia: 0, respondidasHoje: 0, minutosDoDia: 0, temSessaoAberta: false }),
    null,
  );
});
