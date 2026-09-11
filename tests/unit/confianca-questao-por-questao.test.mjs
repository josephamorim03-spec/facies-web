/**
 * A etapa de confiança, exercitada — não inspecionada.
 *
 * O operador relatou (2026-09-10): *"aparece, mas bugado — pelo menos no
 * mobile — não permitindo resposta questão por questão"*. Eram duas coisas
 * diferentes com o mesmo sintoma:
 *
 * 1. **A lista vinha vazia.** O filtro era `answered`, e a etapa abre com a
 *    sessão ainda `active`, antes do finalize. Até a PR #76, `answered` só
 *    ficava verdadeiro na tentativa GRAVADA, que só existe depois do finalize
 *    — numa prova inteira, zero itens. O ecrã aparecia com título, um botão, e
 *    nada para marcar.
 *
 * 2. **"Marcar restantes" marcava TODAS.** Montava um objeto novo com o valor
 *    para toda a gente e substituía o estado. Quarenta questões marcadas com
 *    cuidado desapareciam num toque, sem aviso e sem desfazer.
 *
 * ⚠️ Estes testes chamam as funções. A alternativa aqui seria procurar
 * `selected_option` no texto do componente — afirmar um PROXY em vez da
 * propriedade, que é como um `grep` verde já conviveu com o defeito nesta base.
 * Por isso as duas regras saíram do componente para `_lib/confianca.ts`:
 * `tests/unit` corre em `node --test` e não renderiza React.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { marcarRestantes, questoesParaConfianca } from "../../src/app/banco/_lib/confianca.ts";

/** Um item de sessão com o mínimo que a etapa lê. */
function item(position, extra = {}) {
  return { position, selected_option: "A", is_annulled: false, excluded_from_scoring: false, ...extra };
}

test("rascunho entra na lista — era aqui que a prova inteira vinha vazia", () => {
  // Durante o simulado a resposta é rascunho: `selected_option` está lá, e
  // `answered` era falso em 100% dos itens.
  const items = [item(1), item(2), item(3)].map((it) => ({ ...it, answered: false }));

  assert.equal(
    questoesParaConfianca(items).length,
    3,
    "com zero itens o aluno vê a etapa e não tem o que marcar — o defeito relatado",
  );
});

test("quem não respondeu fica de fora", () => {
  const items = [item(1), item(2, { selected_option: null }), item(3, { selected_option: "" })];
  assert.deepEqual(
    questoesParaConfianca(items).map((it) => it.position),
    [1],
  );
});

test("anulada e excluída da pontuação saem: não há calibração sem certo e errado", () => {
  const items = [item(1), item(2, { is_annulled: true }), item(3, { excluded_from_scoring: true })];
  assert.deepEqual(
    questoesParaConfianca(items).map((it) => it.position),
    [1],
  );
});

test("a ordem é a da prova, e não a que o servidor mandou", () => {
  assert.deepEqual(
    questoesParaConfianca([item(7), item(2), item(30), item(1)]).map((it) => it.position),
    [1, 2, 7, 30],
  );
});

test("`marcar restantes` NÃO apaga o que o aluno marcou", () => {
  const marcadoComCuidado = { 1: 5, 3: 1 };

  const depois = marcarRestantes(marcadoComCuidado, [1, 2, 3, 4], 3);

  assert.equal(depois[1], 5, "a certeza da Q1 virou dúvida — foi assim que 40 marcações sumiam");
  assert.equal(depois[3], 1, "o chute da Q3 virou dúvida");
  assert.equal(depois[2], 3, "a Q2 estava por marcar: recebe o valor");
  assert.equal(depois[4], 3, "a Q4 estava por marcar: recebe o valor");
});

test("`marcar restantes` não muda o objeto que recebeu", () => {
  // O estado do React é imutável por contrato: mutar em vez de devolver novo
  // dá tela que não repinta, que é falha silenciosa.
  const antes = { 1: 5 };
  const depois = marcarRestantes(antes, [1, 2], 3);

  assert.deepEqual(antes, { 1: 5 }, "mutou o estado anterior");
  assert.notEqual(depois, antes, "devolveu a mesma referência: o React não repinta");
});

test("sem nada marcado, marca tudo — que é o que o botão promete", () => {
  assert.deepEqual(marcarRestantes({}, [1, 2, 3], 3), { 1: 3, 2: 3, 3: 3 });
});
