/**
 * O FINALIZAR NÃO PULA DE CANTO quando a linha do rodapé quebra.
 *
 * Relatado pelo operador: *"botão de finalizar no canto esquerdo ao invés de
 * centralizado"*, e *"a depender do modo"*.
 *
 * Não era o modo. O rodapé é `flex-wrap` + `justify-between` com três grupos:
 * marcar/guardar, navegação, e o finalizar. Numa linha só, o `justify-between`
 * encosta o terceiro à direita. Quando o grupo do meio cresce — "Fixar erros
 * (N)" aparece no treino, ou o rótulo vira "Corrigir simulado" em vez de
 * "Finalizar" — a linha quebra, o botão fica **sozinho** na segunda, e
 * `justify-between` com um único item o alinha à **esquerda**.
 *
 * Ou seja: o canto mudava com o COMPRIMENTO do que estava ao lado, e o modo só
 * decidia esse comprimento. `ml-auto` fixa a borda nas duas situações.
 *
 * ⚠️ Asserção sobre o FONTE porque o defeito é de layout sob quebra de linha, e
 * um render em jsdom não tem largura — jsdom não faz layout, então `flex-wrap`
 * nunca quebraria ali e o teste passaria sempre.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const FOCUSED = new URL(
  "../../src/app/banco/sessao/[sessionId]/_components/FocusedQuestion.tsx",
  import.meta.url,
);

const fonte = readFileSync(FOCUSED, "utf8");

/** O trecho do botão de finalizar, do `<button` até o fecho da abertura. */
function aberturaDoFinalizar() {
  const marcador = fonte.indexOf("{finalizeLabel ?? \"Finalizar\"}");
  assert.ok(marcador > 0, "o botão de finalizar sumiu do rodapé");
  const inicio = fonte.lastIndexOf("<button", marcador);
  return fonte.slice(inicio, marcador);
}

test("o finalizar tem `ml-auto` — a borda não depende da quebra de linha", () => {
  assert.match(
    aberturaDoFinalizar(),
    /className="[^"]*\bml-auto\b/,
    "sem `ml-auto` o botão vai para a ESQUERDA quando fica sozinho na segunda linha",
  );
});

test("o rodapé continua usando justify-between com três grupos", () => {
  // Se alguém trocar por `justify-end`, o `ml-auto` vira redundante e o
  // comentário passa a descrever um layout que não existe mais — este teste
  // falha junto e obriga a revisitar os dois.
  const rodape = fonte.slice(fonte.indexOf("<footer"), fonte.indexOf("</footer>"));

  assert.match(rodape, /flex-wrap/);
  assert.match(rodape, /justify-between/);
});

test("o rótulo do finalizar É variável — é o que faz a linha quebrar", () => {
  // "Corrigir simulado" tem mais que o dobro de "Finalizar". Fixar o rótulo
  // esconderia o defeito em vez de corrigi-lo, então o teste registra que a
  // variação é esperada e o layout é que tem de aguentá-la.
  assert.match(fonte, /finalizeLabel \?\? "Finalizar"/);
  assert.match(fonte, /finalizeLabel\?: string;/);
});
