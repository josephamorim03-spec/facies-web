import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

/**
 * O nome de evento do funil vive em DOIS lugares, e eles têm de concordar.
 *
 * O backend valida contra uma allowlist e, quando o nome não está nela,
 * responde `ok: true` e **descarta em silêncio** (`app/api/routers/facies.py`,
 * ~linha 29). Isso é deliberado — devolver erro daria a quem sondar a rota um
 * oráculo da lista de eventos — mas cria um modo de falha específico: um evento
 * novo no frontend some sem que nada acuse.
 *
 * O TypeScript pega o tipo; o runtime não pega a allowlist. Este teste é a
 * ponte entre os dois. Foi assim que `diagnostico_clicado` ficou meses no tipo
 * e na allowlist sem nenhum componente emiti-lo, com o CTA principal cego —
 * `scripts/report_facies_funnel.py` até tinha uma constante `SEM_EMISSOR`
 * registrando a situação.
 */
const RAIZ = fileURLToPath(new URL("../..", import.meta.url));
const KROSMED = fileURLToPath(new URL("../../..", import.meta.url));

function eventosDoFrontend() {
  const fonte = readFileSync(`${RAIZ}/src/lib/faciesFunnel.ts`, "utf8");
  const bloco = fonte.match(/export type EventoFacies =([\s\S]*?);/);
  assert.ok(bloco, "não achei o tipo `EventoFacies`");
  return new Set([...bloco[1].matchAll(/"([a-z_]+)"/g)].map((m) => m[1]));
}

function eventosDoBackend() {
  const fonte = readFileSync(`${KROSMED}/app/repos/facies_funnel_repo.py`, "utf8");
  const bloco = fonte.match(/EVENTOS = frozenset\(\s*\{([\s\S]*?)\}\s*\)/);
  assert.ok(bloco, "não achei a allowlist `EVENTOS`");
  return new Set([...bloco[1].matchAll(/"([a-z_]+)"/g)].map((m) => m[1]));
}

test("a allowlist do backend e o tipo do frontend sao o MESMO conjunto", () => {
  const front = eventosDoFrontend();
  const back = eventosDoBackend();

  const soNoFront = [...front].filter((e) => !back.has(e));
  const soNoBack = [...back].filter((e) => !front.has(e));

  assert.deepEqual(
    soNoFront,
    [],
    `evento(s) que o frontend emite e o backend DESCARTA em silêncio: ${soNoFront.join(", ")}`,
  );
  assert.deepEqual(
    soNoBack,
    [],
    `evento(s) na allowlist que ninguém pode emitir (o tipo não os aceita): ${soNoBack.join(", ")}`,
  );
});

test("todo evento declarado tem ao menos UM emissor", () => {
  // Um evento sem emissor é pior que um evento a menos: ele aparece nos dois
  // lados, parece instrumentado, e o relatório mostra zero — que lê como "essa
  // etapa não converte" em vez de "essa etapa não é medida".
  const emissores = readFileSync(`${RAIZ}/src/lib/faciesFunnel.ts`, "utf8");
  // Varredura em vez de lista fixa. Uma lista de caminhos envelhece calada, e o
  // modo de falha dela é pior que uma falha: emitir um evento de um componente
  // novo faria este teste dizer "ninguém o emite" quando alguém emite — e o
  // desenvolvedor, lendo isso, removeria da allowlist um evento que funciona.
  const componentes = readdirSync(`${RAIZ}/src`, { recursive: true })
    .map(String)
    .filter((rel) => /[.]tsx?$/.test(rel) && !rel.includes("generated"))
    .map((rel) => readFileSync(`${RAIZ}/src/${rel}`, "utf8"))
    .join("\n");

  for (const evento of eventosDoFrontend()) {
    assert.ok(
      componentes.includes(`"${evento}"`),
      `\`${evento}\` está declarado e nenhum componente o emite — o funil mostraria zero e isso leria como "não converte"`,
    );
  }
  assert.ok(emissores.includes("keepalive"), "o sinal precisa sobreviver à troca de página");
});
