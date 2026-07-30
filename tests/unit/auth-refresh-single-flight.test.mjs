import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";

import { refreshAuthSession } from "../../src/lib/auth.ts";

/**
 * Regressão do logout "do nada": sem single-flight, cada requisição que tomava
 * 401 disparava seu próprio POST de refresh. N refreshes concorrentes com o mesmo
 * token faziam o backend ler as perdedoras como reuso e revogar a família inteira.
 */

const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;

function installBrowserGlobals() {
  const target = new EventTarget();
  globalThis.window = target;
}

beforeEach(() => {
  installBrowserGlobals();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalWindow === undefined) {
    delete globalThis.window;
  } else {
    globalThis.window = originalWindow;
  }
});

test("chamadas paralelas compartilham um único POST de refresh", async () => {
  let calls = 0;
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });

  globalThis.fetch = async () => {
    calls += 1;
    await gate;
    return new Response(JSON.stringify({ expires_in: 3600 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const pending = [
    refreshAuthSession(),
    refreshAuthSession(),
    refreshAuthSession(),
    refreshAuthSession(),
  ];
  release();
  const results = await Promise.all(pending);

  assert.equal(calls, 1, "quatro chamadas concorrentes devem gerar um único refresh");
  assert.deepEqual(results, ["renewed", "renewed", "renewed", "renewed"]);
});

test("uma nova chamada após a anterior terminar dispara outro refresh", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify({ expires_in: 3600 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  assert.equal(await refreshAuthSession(), "renewed");
  assert.equal(await refreshAuthSession(), "renewed");
  assert.equal(calls, 2);
});

test("409 refresh_race é corrida, não expiração", async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ code: "refresh_race" }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });

  assert.equal(await refreshAuthSession(), "raced");
});

test("503 refresh_unavailable não conta como sessão renovada", async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ code: "refresh_unavailable" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });

  assert.equal(await refreshAuthSession(), "failed");
});

test("falha de rede não derruba a chamada", async () => {
  globalThis.fetch = async () => {
    throw new TypeError("network down");
  };

  assert.equal(await refreshAuthSession(), "failed");
});

test("uma falha não deixa a promise em voo presa", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) throw new TypeError("network down");
    return new Response(JSON.stringify({ expires_in: 3600 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  assert.equal(await refreshAuthSession(), "failed");
  assert.equal(await refreshAuthSession(), "renewed");
  assert.equal(calls, 2);
});
