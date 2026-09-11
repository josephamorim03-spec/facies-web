import assert from "node:assert/strict";
import { test } from "node:test";

/**
 * O INTERRUPTOR DOS FLASHCARDS AINDA DESLIGA — e a barra fica com quatro abas.
 *
 * ## Por que existe um ficheiro só para isto
 *
 * `FLASHCARDS_LIGADOS` lê `process.env` no CARREGAMENTO do módulo, e o ESM só
 * carrega cada módulo uma vez por processo. Um valor por processo, logo um
 * ficheiro por valor: o estado ligado (o de produção) vive em
 * `navConfig.test.mjs`.
 *
 * ## O que esta prova protege
 *
 * ⚠️ Uma aba não é uma feature flag — e enquanto a chave existir, ela TEM de
 * valer para a barra também. Com `NEXT_PUBLIC_FLASHCARDS=0`, `next.config.js`
 * emite `/cards → /hoje`; uma aba permanente seria uma porta para lado nenhum,
 * e o menu acenderia estado ativo para uma URL que ninguém alcança.
 *
 * Quatro abas não é elegante. É o comportamento honesto do interruptor, e a
 * alternativa — deixar a aba lá e confiar que a chave nunca desce — é como uma
 * tela morta sobrevive a um redesenho sem que ninguém repare.
 */
process.env.NEXT_PUBLIC_FLASHCARDS = "0";

const { NAV_ITEMS, getStudentRoute, getIntentChildren } = await import(
  "../../src/lib/navConfig.ts"
);

test("com a chave desligada, a barra tem QUATRO abas e Cards nao esta la", () => {
  assert.deepEqual(
    NAV_ITEMS.map((item) => item.href),
    ["/inicio", "/banco", "/mapa", "/mais"],
  );
  assert.equal(
    NAV_ITEMS.some((item) => item.shortLabel === "Cards"),
    false,
  );
});

test("com a chave desligada, `/cards` sai do REGISTRO, e nao so do menu", () => {
  // ⚠️ Nao basta esconder o link: o registro alimenta `getStudentRoute`, o
  // titulo do topo e o pre-aquecimento. Uma rota registada para uma URL que e
  // 307 faria o menu acender aba para um sitio inalcancavel.
  assert.equal(getStudentRoute("/cards"), null);
  assert.equal(getStudentRoute("/cards/registros"), null);
  assert.deepEqual(getIntentChildren("/cards"), []);
});

test("as outras quatro abas nao mudam de rotulo por causa da chave", () => {
  // Guarda contra o conserto errado: alguem que queira "manter cinco" pode
  // sentir-se tentado a devolver "Pratica" quando os cards saem. Nao -- Banco
  // continua Banco, e a barra encolhe.
  assert.deepEqual(
    NAV_ITEMS.map((item) => item.shortLabel),
    ["Início", "Banco", "Mapa", "Mais"],
  );
});
