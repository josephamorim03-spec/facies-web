/**
 * O `?next=` do login não pode mandar ninguém para fora do domínio.
 *
 * ## O caso que passava
 *
 * A versão anterior recusava `//` na ENTRADA e normalizava depois — e a
 * normalização recriava o que ela tinha acabado de recusar:
 *
 *     new URL("/..//evil.com", base).pathname  ===  "//evil.com"
 *
 * Voltava como caminho "interno", e `router.replace("//evil.com")` é
 * protocol-relative: o navegador sai do domínio. O uso hoje é só o handler de
 * login local — desligado em produção por `AUTH_MODE=google` — então isto trava
 * a regressão antes que ele volte, não conserta um vazamento em curso.
 *
 * ## Por que a tabela inclui casos que já eram seguros
 *
 * `/\evil.com` e `/<tab>/evil.com` viram `"/"` no parser WHATWG, e é fácil
 * "consertar" isso por engano numa próxima passada — barra invertida vira barra
 * em esquema especial. Ficam na tabela para que a mudança apareça.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { destinoInternoSeguro } from "../../src/lib/destinoInterno.ts";

const BARRA_INVERTIDA = String.fromCharCode(92);
const TAB = String.fromCharCode(9);

test("REGRESSÃO: /..//evil.com não escapa do domínio", () => {
  // O caso do achado. Antes devolvia "//evil.com".
  assert.equal(destinoInternoSeguro("/..//evil.com"), null);
});

test("nenhuma entrada produz destino protocol-relative", () => {
  const tentativas = [
    "//evil.com",
    "/..//evil.com",
    "/../..//evil.com",
    "/a/..//evil.com",
    "///evil.com",
    `/${BARRA_INVERTIDA}${BARRA_INVERTIDA}evil.com`,
    `/${BARRA_INVERTIDA}evil.com`,
    `/${TAB}/evil.com`,
    "https://evil.com",
    "http://evil.com",
    "evil.com",
  ];
  for (const entrada of tentativas) {
    const saida = destinoInternoSeguro(entrada);
    if (saida !== null) {
      // Não basta ser não-nulo: o que sai não pode começar com `//`.
      assert.equal(
        saida.startsWith("//"),
        false,
        `${JSON.stringify(entrada)} devolveu ${JSON.stringify(saida)}`,
      );
      assert.equal(saida.startsWith("/"), true, `${JSON.stringify(entrada)} nao e caminho`);
    }
  }
});

test("caminho interno legítimo passa, com busca e âncora", () => {
  assert.equal(destinoInternoSeguro("/hoje"), "/hoje");
  assert.equal(destinoInternoSeguro("/banco?area=clinica"), "/banco?area=clinica");
  assert.equal(destinoInternoSeguro("/estatisticas#topo"), "/estatisticas#topo");
  assert.equal(destinoInternoSeguro("  /hoje  "), "/hoje");
});

test("o destino não pode ser a própria tela de login", () => {
  assert.equal(destinoInternoSeguro("/login"), null);
  assert.equal(destinoInternoSeguro("/login?reason=expired"), null);
  assert.equal(destinoInternoSeguro("/auth/verify-email"), null);
});

test("ausente e vazio devolvem null, sem levantar", () => {
  assert.equal(destinoInternoSeguro(null), null);
  assert.equal(destinoInternoSeguro(undefined), null);
  assert.equal(destinoInternoSeguro(""), null);
  assert.equal(destinoInternoSeguro("   "), null);
});
