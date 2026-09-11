/**
 * "Flashcard salvo no caderno" tem de dizer QUAL caderno, e levar lá.
 *
 * O DEFEITO: o modal confirmava com *"Flashcard salvo no caderno."* e oferecia
 * um único botão, "Fechar". O aluno salvava e não tinha como ver onde foi
 * parar — e, até 10/09/2026, nem havia onde: o `redirects()` do `next.config`
 * mandava `/cards` para `/hoje`, então a frase nomeava um lugar que não abria.
 *
 * O caderno reabriu. A frase continuou sem link.
 *
 * ## E a segunda metade: dizer a verdade sobre o agendamento
 *
 * `operational_note_service` põe a nota na fila do Turbo/FSRS quando
 * `weight >= 8`, e o modal usa `weight: 9` no erro. Ou seja, isto **vira card
 * com data**, não uma anotação parada — e a confirmação não dizia isso.
 *
 * ⚠️ A regra do agendamento NÃO pode ser espelhada aqui. O servidor devolve
 * `turbo_due_at` na resposta; ler esse campo é perguntar, espelhar `weight >= 8`
 * seria adivinhar — e regra copiada é regra que passa a divergir em silêncio.
 * Esta base já registra a mesma armadilha em `feedback_timing` e no vínculo por
 * e-mail, que vivia em três cópias.
 *
 * ⚠️ Asserção sobre o FONTE, e não render em jsdom, pela mesma razão que
 * `sessao-rodape-nao-pula-de-canto`: o que está em causa é qual campo o
 * componente lê e para onde o link aponta, e ambos são visíveis no fonte. O que
 * um teste de fonte NÃO prova é que o link foi clicado — isso é do e2e.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const FONTE = readFileSync(
  new URL(
    "../../src/app/banco/sessao/[sessionId]/_components/QuickNoteModal.tsx",
    import.meta.url,
  ).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
  "utf8",
);

/** Só o código: os comentários deste arquivo citam o defeito para explicá-lo. */
const CODIGO = FONTE.replace(/\/\*[\s\S]*?\*\//g, "")
  .split("\n")
  .map((linha) => linha.replace(/\/\/.*$/, ""))
  .join("\n");

test("a confirmação leva ao caderno, e não só o nomeia", () => {
  assert.match(
    CODIGO,
    /href="\/cards\/registros"/,
    'a frase diz "salvo no caderno" — sem link, nomeia um lugar e não leva lá',
  );
});

test("o link abre noutra aba: o aluno não pode perder a sessão para ver a nota", () => {
  const bloco = CODIGO.slice(CODIGO.indexOf('href="/cards/registros"'));
  const ate = bloco.slice(0, bloco.indexOf("</a>"));
  assert.match(ate, /target="_blank"/, "este modal abre no MEIO da prova");
  assert.match(ate, /rel="noopener/, "aba nova sem `noopener` entrega `window.opener`");
});

test("o que decide se agendou é `turbo_due_at`, do SERVIDOR", () => {
  assert.match(
    CODIGO,
    /notaCriada\.turbo_due_at/,
    "sem ler a resposta, a confirmação não sabe se virou card ou ficou anotação",
  );
});

test("a regra do agendamento NÃO é espelhada aqui", () => {
  // O servidor agenda com `weight >= 8`. Repetir esse número no cliente cria a
  // segunda fonte de verdade que diverge sem ninguém notar.
  assert.doesNotMatch(
    CODIGO,
    /weight\s*>=?\s*8/,
    "isto é a regra do `operational_note_service` copiada — leia `turbo_due_at`",
  );
});

test("o estado de sucesso é a NOTA, não um booleano solto", () => {
  // `done: boolean` não carrega `turbo_due_at`, então a confirmação teria de
  // adivinhar. O estado guarda o que o servidor respondeu.
  assert.doesNotMatch(
    CODIGO,
    /const \[done, setDone\]/,
    "`done` booleano perde a resposta do servidor",
  );
  assert.match(CODIGO, /const \[notaCriada, setNotaCriada\]/);
});
