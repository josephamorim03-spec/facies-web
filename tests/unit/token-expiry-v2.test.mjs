/**
 * O pré-check de expiração lê os DOIS formatos de payload.
 *
 * Este parser falha ABERTO por desenho: qualquer coisa que não decodifique
 * devolve `false` ("não sei dizer que expirou") e a decisão volta ao backend.
 * É a escolha certa — declarar expirado um token válido derrubaria sessão viva a
 * partir de um parser.
 *
 * Mas é também o que torna a regressão INVISÍVEL: se ele não entender o `v2`, o
 * pré-check simplesmente para de disparar e nada erra. Foi exatamente assim que
 * a versão anterior deste arquivo passou meses sem funcionar, exigindo três
 * partes de um token que tem quatro.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { CLOCK_SKEW_SECONDS, tokenEstaExpirado } from "../../src/lib/server/tokenExpiry.ts";

const agora = Math.floor(Date.now() / 1000);

function token(payload, prefixo = "kros.v1.") {
  const b64 = Buffer.from(payload, "utf8").toString("base64url");
  return `${prefixo}${b64}.assinatura-nao-conferida-aqui`;
}

const v1 = (exp) => token(`v1|uid=aluno-1|exp=${exp}`);
const v2 = (exp, iat = exp - 3600) => token(`v2|cls=kros|uid=aluno-1|iat=${iat}|exp=${exp}`);

test("v2 expirado é reconhecido", () => {
  assert.equal(tokenEstaExpirado(v2(agora - CLOCK_SKEW_SECONDS - 60)), true);
});

test("v2 válido não é declarado expirado", () => {
  assert.equal(tokenEstaExpirado(v2(agora + 3600)), false);
});

test("v1 continua sendo lido — token em circulação no deploy", () => {
  assert.equal(tokenEstaExpirado(v1(agora - CLOCK_SKEW_SECONDS - 60)), true);
  assert.equal(tokenEstaExpirado(v1(agora + 3600)), false);
});

test("as duas classes de prefixo são lidas", () => {
  const expirado = agora - CLOCK_SKEW_SECONDS - 60;
  assert.equal(tokenEstaExpirado(v2(expirado)), true);
  assert.equal(
    tokenEstaExpirado(token(`v2|cls=local|uid=a|iat=${expirado - 3600}|exp=${expirado}`, "local.v1.")),
    true,
  );
});

test("payload com contagem de campos errada falha ABERTO, não fechado", () => {
  // Um `v2` truncado não pode derrubar sessão viva: a decisão volta ao backend.
  assert.equal(tokenEstaExpirado(token("v2|cls=kros|uid=a|exp=1")), false);
  assert.equal(tokenEstaExpirado(token("v1|uid=a|iat=1|exp=1")), false);
  assert.equal(tokenEstaExpirado(token("v3|uid=a|exp=1")), false);
});

test("a tolerância de relógio vale nos dois formatos", () => {
  const dentroDaTolerancia = agora - 1;
  assert.equal(tokenEstaExpirado(v1(dentroDaTolerancia)), false);
  assert.equal(tokenEstaExpirado(v2(dentroDaTolerancia)), false);
});
