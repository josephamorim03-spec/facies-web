import assert from "node:assert/strict";
import test from "node:test";

import {
  BOOTSTRAP_COM_AUTHORIZATION_DO_CLIENTE,
  decidirAuthorizationUpstream,
} from "../../src/lib/server/upstreamAuth.ts";

/**
 * Regressão da sobreposição de identidade no BFF.
 *
 * O proxy injetava o token do cookie httpOnly SÓ quando o navegador não tinha
 * mandado `Authorization` — então o header escolhido pelo cliente vencia o
 * cookie em qualquer rota. Com `ALLOW_LEGACY_AUTH_PASSTHROUGH=1` (dev, staging,
 * suíte) o token vira o `user_id` sem verificação de assinatura: um header
 * bastava para ser outra pessoa.
 *
 * A matriz abaixo é o contrato: cookie x header x rota.
 */

const COOKIE = "kros.v1.abc.def";
const HEADER_DO_CLIENTE = true;
const SEM_HEADER = false;

test("com cookie, o cookie vence o header do cliente em rota comum", () => {
  const decisao = decidirAuthorizationUpstream({
    pathKey: "profile",
    temAuthorizationDoCliente: HEADER_DO_CLIENTE,
    sessionToken: COOKIE,
  });
  assert.deepEqual(decisao, { acao: "usar-cookie", token: COOKIE });
});

test("sem cookie, o header do cliente é REMOVIDO em rota comum", () => {
  const decisao = decidirAuthorizationUpstream({
    pathKey: "profile",
    temAuthorizationDoCliente: HEADER_DO_CLIENTE,
    sessionToken: "",
  });
  assert.deepEqual(decisao, { acao: "remover" });
});

test("sem cookie e sem header, a requisição segue anônima", () => {
  const decisao = decidirAuthorizationUpstream({
    pathKey: "facies/bancas",
    temAuthorizationDoCliente: SEM_HEADER,
    sessionToken: "",
  });
  assert.deepEqual(decisao, { acao: "remover" });
});

test("com cookie e sem header, usa o cookie", () => {
  const decisao = decidirAuthorizationUpstream({
    pathKey: "question-bank/sessions",
    temAuthorizationDoCliente: SEM_HEADER,
    sessionToken: COOKIE,
  });
  assert.deepEqual(decisao, { acao: "usar-cookie", token: COOKIE });
});

test("cookie só de espaço em branco não vale como sessão", () => {
  const decisao = decidirAuthorizationUpstream({
    pathKey: "profile",
    temAuthorizationDoCliente: HEADER_DO_CLIENTE,
    sessionToken: "   ",
  });
  assert.deepEqual(decisao, { acao: "remover" });
});

test("bootstrap do Google: `me` com header e sem cookie mantém o header", () => {
  const decisao = decidirAuthorizationUpstream({
    pathKey: "me",
    temAuthorizationDoCliente: HEADER_DO_CLIENTE,
    sessionToken: "",
  });
  assert.deepEqual(decisao, { acao: "manter-do-cliente" });
});

test("`me` sem header cai na regra normal", () => {
  assert.deepEqual(
    decidirAuthorizationUpstream({
      pathKey: "me",
      temAuthorizationDoCliente: SEM_HEADER,
      sessionToken: COOKIE,
    }),
    { acao: "usar-cookie", token: COOKIE },
  );
  assert.deepEqual(
    decidirAuthorizationUpstream({
      pathKey: "me",
      temAuthorizationDoCliente: SEM_HEADER,
      sessionToken: "",
    }),
    { acao: "remover" },
  );
});

test("a lista de bootstrap tem exatamente uma rota", () => {
  // Cada nome aqui reabre, para aquela rota, o buraco que este módulo fechou.
  // O teste existe para que acrescentar um seja uma decisão, e não um descuido.
  assert.deepEqual([...BOOTSTRAP_COM_AUTHORIZATION_DO_CLIENTE], ["me"]);
});

test("rota que só CONTÉM 'me' não entra no bootstrap", () => {
  for (const pathKey of ["me/extra", "some/me", "member", "mensagens"]) {
    assert.deepEqual(
      decidirAuthorizationUpstream({
        pathKey,
        temAuthorizationDoCliente: HEADER_DO_CLIENTE,
        sessionToken: "",
      }),
      { acao: "remover" },
      `${pathKey} nao pode ser tratada como bootstrap`,
    );
  }
});
