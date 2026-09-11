/**
 * Recarregar no meio da prova não pode mandar o aluno para a questão 1.
 *
 * O DEFEITO: `loadSession` fazia
 * `setCurrentPosition(s.unanswered_question_numbers[0])`, e esse campo conta
 * **tentativa gravada**, não rascunho. Toda sessão nova é
 * `resolution_mode="simulation"` e o rascunho só vira tentativa no finalize —
 * logo, durante a prova inteira a lista contém TODAS as posições, e `[0]` é
 * sempre 1.
 *
 * Qualquer remontagem — recarregar, voltar de outra aba, tocar em "tentar de
 * novo" depois de um erro de rede — atirava o aluno para a **questão 1 com 40
 * respondidas**. Não perdia resposta: fazia-o andar 40 questões a pé.
 *
 * ⚠️ Nenhum gate via isto: o campo existe, o tipo bate, a chamada acontece. O
 * defeito é o SIGNIFICADO do campo, e significado não tem tipo.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { posicaoParaRetomar } from "../../src/app/banco/_lib/retomada.ts";

/** Uma prova onde as `respondidas` primeiras posições têm rascunho. */
function prova(total, respondidas, extras = {}) {
  return Array.from({ length: total }, (_, i) => ({
    position: i + 1,
    selected_option: i < respondidas ? "A" : null,
    is_annulled: false,
    excluded_from_scoring: false,
    ...(extras[i + 1] ?? {}),
  }));
}

test("com 40 de 100 respondidas, retoma na 41 — não na 1", () => {
  assert.equal(
    posicaoParaRetomar(prova(100, 40)),
    41,
    "é o defeito: `unanswered_question_numbers[0]` devolvia 1 e a caminhada era de 40 questões",
  );
});

test("prova intocada retoma na 1", () => {
  assert.equal(posicaoParaRetomar(prova(100, 0)), 1);
});

test("tudo respondido devolve null — `null` quer dizer NÃO MEXA", () => {
  // Mover o aluno sem ter para onde é pior do que deixá-lo onde está.
  assert.equal(posicaoParaRetomar(prova(60, 60)), null);
});

test("um buraco no meio: retoma no buraco, e não depois dele", () => {
  // O aluno pulou a 7 e seguiu. Ao voltar, é lá que falta.
  const items = prova(10, 10, { 7: { selected_option: null } });
  assert.equal(posicaoParaRetomar(items), 7);
});

test("a ORDEM do servidor não decide — a posição decide", () => {
  // `items` chega ordenado hoje, mas depender disso é depender de um detalhe
  // que ninguém prometeu.
  const items = [
    { position: 9, selected_option: null },
    { position: 3, selected_option: null },
    { position: 1, selected_option: "B" },
  ];
  assert.equal(posicaoParaRetomar(items), 3);
});

test("anulada e excluída não são destino de retomada", () => {
  // Não há o que responder lá; parar ali é um beco.
  const items = [
    { position: 1, selected_option: "A" },
    { position: 2, selected_option: null, is_annulled: true },
    { position: 3, selected_option: null, excluded_from_scoring: true },
    { position: 4, selected_option: null },
  ];
  assert.equal(posicaoParaRetomar(items), 4);
});

test("sessão sem item nenhum não explode", () => {
  assert.equal(posicaoParaRetomar([]), null);
});
