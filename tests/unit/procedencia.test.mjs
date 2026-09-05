/**
 * O BFF repassa o IP do aluno — e só quando pode provar que é o BFF.
 *
 * A regra mora em `@/lib/server/procedencia` e não dentro dos route handlers
 * porque são NOVE arquivos chamando o backend, e uma regra copiada nove vezes
 * diverge na primeira mudança. É a mesma razão de `upstreamAuth.ts` e
 * `rotasPublicas.ts` terem saído dos seus arquivos de origem.
 *
 * O caso mais importante aqui é o primeiro: sem `FACIES_PROXY_TOKEN`, nada é
 * enviado. A variável ausente não pode piorar o comportamento atual.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

import {
  CABECALHOS_DE_PROCEDENCIA_MINUSCULOS,
  CABECALHO_IP_DE_ORIGEM,
  CABECALHO_TOKEN_DE_PROCEDENCIA,
  cabecalhosDeProcedencia,
  ipDoCliente,
} from "../../src/lib/server/procedencia.ts";

const SEGREDO = "segredo-de-procedencia-com-32-caracteres";

/** Só `headers.get`, que é tudo que o módulo usa. */
function requisicao(headers = {}) {
  const mapa = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return { headers: { get: (nome) => mapa.get(String(nome).toLowerCase()) ?? null } };
}

function comSegredo(fn) {
  const anterior = process.env.FACIES_PROXY_TOKEN;
  process.env.FACIES_PROXY_TOKEN = SEGREDO;
  try {
    fn();
  } finally {
    if (anterior === undefined) delete process.env.FACIES_PROXY_TOKEN;
    else process.env.FACIES_PROXY_TOKEN = anterior;
  }
}

test("sem o segredo, nada é enviado", () => {
  const anterior = process.env.FACIES_PROXY_TOKEN;
  delete process.env.FACIES_PROXY_TOKEN;
  try {
    const saida = cabecalhosDeProcedencia(requisicao({ "x-real-ip": "203.0.113.9" }));
    assert.deepEqual(saida, {});
  } finally {
    if (anterior !== undefined) process.env.FACIES_PROXY_TOKEN = anterior;
  }
});

test("com o segredo e um IP, manda os dois cabeçalhos", () => {
  comSegredo(() => {
    const saida = cabecalhosDeProcedencia(requisicao({ "x-real-ip": "203.0.113.9" }));
    assert.equal(saida[CABECALHO_IP_DE_ORIGEM], "203.0.113.9");
    assert.equal(saida[CABECALHO_TOKEN_DE_PROCEDENCIA], SEGREDO);
  });
});

test("sem IP conhecido, não manda nada", () => {
  comSegredo(() => {
    assert.deepEqual(cabecalhosDeProcedencia(requisicao({})), {});
  });
});

test("x-real-ip ganha; sem ele vale o PRIMEIRO salto do x-forwarded-for", () => {
  // Na borda da Vercel o primeiro salto é o cliente; os seguintes seriam
  // proxies dela. É o oposto da regra do backend, e de propósito: lá o último
  // salto é o que o proxy acrescentou, aqui o primeiro é o que a borda escreveu.
  assert.equal(ipDoCliente(requisicao({ "x-real-ip": "203.0.113.9", "x-forwarded-for": "198.51.100.2" })), "203.0.113.9");
  assert.equal(ipDoCliente(requisicao({ "x-forwarded-for": "198.51.100.2, 10.0.0.1" })), "198.51.100.2");
});

test("porta e colchetes de IPv6 são descartados", () => {
  assert.equal(ipDoCliente(requisicao({ "x-real-ip": "203.0.113.9:44321" })), "203.0.113.9");
  assert.equal(ipDoCliente(requisicao({ "x-real-ip": "[2001:db8::1]" })), "2001:db8::1");
  // IPv6 sem colchetes tem vários `:` e não pode ser cortado no primeiro.
  assert.equal(ipDoCliente(requisicao({ "x-real-ip": "2001:db8::1" })), "2001:db8::1");
});

test("a lista de remoção cobre os dois cabeçalhos, em minúsculas", () => {
  // O proxy catch-all copia TODOS os headers do cliente e usa esta lista para
  // apagá-los antes de acrescentar os nossos. Um nome fora de sincronia aqui
  // deixaria o cliente declarar o próprio IP através da nossa rota.
  assert.deepEqual([...CABECALHOS_DE_PROCEDENCIA_MINUSCULOS].sort(), [
    CABECALHO_IP_DE_ORIGEM.toLowerCase(),
    CABECALHO_TOKEN_DE_PROCEDENCIA.toLowerCase(),
  ].sort());
  for (const nome of CABECALHOS_DE_PROCEDENCIA_MINUSCULOS) {
    assert.equal(nome, nome.toLowerCase());
  }
});

test("o proxy catch-all APAGA os cabeçalhos do cliente antes de acrescentar os seus", () => {
  // ⚠️ Este é o único teste daqui que lê o FONTE, e a razão é a mesma de
  // `proxy-public-routes.test.mjs`: o route handler importa `next/server` e não
  // roda fora do bundler. Ler o fonte é mais fraco que executar — só afirma que
  // a linha existe, não que ela funciona.
  //
  // Fica assim mesmo porque o que ela protege é grave e silencioso: aquela rota
  // copia TODOS os headers do cliente. Sem o `delete`, qualquer pessoa declara o
  // próprio IP de origem através da nossa própria rota, e o backend confia.
  const fonte = readFileSync(
    fileURLToPath(new URL("../../src/app/api/[...path]/route.ts", import.meta.url)),
    "utf8",
  );
  const posDelete = fonte.indexOf("headers.delete(cabecalho)");
  const posSet = fonte.indexOf("cabecalhosDeProcedencia(request)");
  assert.notEqual(posDelete, -1, "o proxy nao apaga os cabecalhos de procedencia do cliente");
  assert.notEqual(posSet, -1, "o proxy nao acrescenta os cabecalhos de procedencia");
  assert.ok(posDelete < posSet, "o delete precisa vir ANTES do set");
});
