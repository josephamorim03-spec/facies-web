import assert from "node:assert/strict";
import test from "node:test";

import { CLOCK_SKEW_SECONDS, tokenEstaExpirado } from "../../src/lib/server/tokenExpiry.ts";

/**
 * Regressão do pré-check morto.
 *
 * O proxy tinha `isJwtExpired`, que exigia 3 partes no `split(".")`. O cookie de
 * sessão guarda `kros.v1.<payload>.<assinatura>`, que dá quatro: a função
 * retornava `false` para todo token real desde que foi escrita. Não quebrava
 * nada — só nunca protegeu nada, parecendo que protegia.
 */

const AGORA = 1_800_000_000;

function base64url(texto) {
  return Buffer.from(texto, "utf8").toString("base64url");
}

/** Mesmo formato de `issue_app_access_token` em `app/auth/local_auth.py`. */
function tokenFacies(prefixo, exp, uid = "aluno-1") {
  return `${prefixo}${base64url(`v1|uid=${uid}|exp=${exp}`)}.assinatura-fake`;
}

function jwt(exp) {
  return `${base64url('{"alg":"RS256"}')}.${base64url(JSON.stringify({ exp }))}.sig`;
}

test("kros.v1. expirado é detectado — era o caso que nunca disparava", () => {
  assert.equal(tokenEstaExpirado(tokenFacies("kros.v1.", AGORA - 3600), AGORA), true);
});

test("local.v1. expirado é detectado", () => {
  assert.equal(tokenEstaExpirado(tokenFacies("local.v1.", AGORA - 3600), AGORA), true);
});

test("kros.v1. válido não é declarado expirado", () => {
  assert.equal(tokenEstaExpirado(tokenFacies("kros.v1.", AGORA + 3600), AGORA), false);
});

test("dentro da tolerância de relógio, ainda NÃO expirou", () => {
  // Expirou há 10s: menos que a folga, então continua valendo.
  assert.equal(tokenEstaExpirado(tokenFacies("kros.v1.", AGORA - 10), AGORA), false);
  // Exatamente na borda.
  assert.equal(tokenEstaExpirado(tokenFacies("kros.v1.", AGORA - CLOCK_SKEW_SECONDS), AGORA), false);
  // Um segundo além dela.
  assert.equal(
    tokenEstaExpirado(tokenFacies("kros.v1.", AGORA - CLOCK_SKEW_SECONDS - 1), AGORA),
    true,
  );
});

test("JWT continua funcionando (id_token do Google no bootstrap)", () => {
  assert.equal(tokenEstaExpirado(jwt(AGORA - 3600), AGORA), true);
  assert.equal(tokenEstaExpirado(jwt(AGORA + 3600), AGORA), false);
});

test("falha ABERTA: o que não decodifica nunca é declarado expirado", () => {
  // Declarar expirado um token válido derruba sessão viva a partir de um parser,
  // sem nada ter sido verificado. O backend é quem confere assinatura.
  const entradas = [
    "",
    "   ",
    "lixo",
    "kros.v1.",
    "kros.v1.$$$.sig",
    `kros.v1.${base64url("payload sem pipes")}.sig`,
    `kros.v1.${base64url("v2|uid=x|exp=1")}.sig`,
    `kros.v1.${base64url("v1|uid=x|venc=1")}.sig`,
    `kros.v1.${base64url("v1|uid=x|exp=nao-numero")}.sig`,
    `${base64url("{}")}.${base64url("{}")}.sig`,
    `${base64url("{}")}.nao-json.sig`,
    jwt("1800000000"),
  ];
  for (const token of entradas) {
    assert.equal(
      tokenEstaExpirado(token, AGORA),
      false,
      `${JSON.stringify(token)} nao pode ser declarado expirado`,
    );
  }
});

test("o formato de 4 partes não é confundido com JWT", () => {
  // O bug original: `kros.v1.X.Y`.split(".") tem 4 elementos, o ramo JWT desistia
  // e ninguém percebia. Aqui o prefixo decide antes de contar partes.
  const token = tokenFacies("kros.v1.", AGORA - 99999);
  assert.equal(token.split(".").length, 4);
  assert.equal(tokenEstaExpirado(token, AGORA), true);
});
