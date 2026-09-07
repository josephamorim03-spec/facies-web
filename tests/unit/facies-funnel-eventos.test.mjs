import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { fonteDoBackend, MOTIVO } from "./_contrato-com-o-backend.mjs";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/** Todo `.ts`/`.tsx` de `src/`, menos o schema gerado do OpenAPI. */
function varrer(dir) {
  return readdirSync(dir).flatMap((entrada) => {
    const cheio = join(dir, entrada);
    if (statSync(cheio).isDirectory()) {
      return entrada === "generated" ? [] : varrer(cheio);
    }
    return /.tsx?$/.test(cheio) ? [cheio] : [];
  });
}

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

/**
 * Comentar um evento não pode contar como declará-lo.
 *
 * Os dois blocos abaixo são lidos como texto, e nos dois idiomas a forma mais
 * provável de tirar um evento de circulação é comentá-lo — `// | "x"` no TS,
 * `# "x",` no Python. Sem tirar os comentários antes, o regex continuaria
 * achando o nome, os dois conjuntos continuariam iguais, e o teste daria verde
 * sobre um tipo que já não aceita o evento e uma allowlist que já o descarta.
 * Falso verde é o único resultado pior que falha, e é o formato que esta base já
 * produziu mais de uma vez.
 */
function semComentarios(texto, estilo) {
  return estilo === "py"
    ? texto.replace(/^\s*#.*$/gm, "")
    : texto.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

function eventosDoFrontend() {
  const fonte = readFileSync(`${RAIZ}/src/lib/faciesFunnel.ts`, "utf8");
  const bloco = fonte.match(/export type EventoFacies =([\s\S]*?);/);
  assert.ok(bloco, "não achei o tipo `EventoFacies`");
  return new Set([...semComentarios(bloco[1], "ts").matchAll(/"([a-z_]+)"/g)].map((m) => m[1]));
}

//: `null` quando o backend nao esta ao lado -- ver `_contrato-com-o-backend.mjs`.
const FONTE_BACKEND = fonteDoBackend("app/repos/facies_funnel_repo.py");

function eventosDoBackend() {
  const fonte = FONTE_BACKEND;
  const bloco = fonte.match(/EVENTOS = frozenset\(\s*\{([\s\S]*?)\}\s*\)/);
  assert.ok(bloco, "não achei a allowlist `EVENTOS`");
  return new Set([...semComentarios(bloco[1], "py").matchAll(/"([a-z_]+)"/g)].map((m) => m[1]));
}

test("evento comentado não conta como declarado", { skip: FONTE_BACKEND ? false : MOTIVO }, () => {
  const ts = `\n  | "facies_vista"\n  // | "destaque_clicado";\n  | "diagnostico_clicado";`;
  assert.deepEqual(
    [...semComentarios(ts, "ts").matchAll(/"([a-z_]+)"/g)].map((m) => m[1]),
    ["facies_vista", "diagnostico_clicado"],
    "o evento comentado sobreviveu — o guard daria verde sobre um tipo que já não o aceita",
  );

  const py = `\n        "facies_vista",\n        # "destaque_clicado",\n`;
  assert.deepEqual(
    [...semComentarios(py, "py").matchAll(/"([a-z_]+)"/g)].map((m) => m[1]),
    ["facies_vista"],
    "o evento comentado sobreviveu no lado Python",
  );

  // E o inverso: o que NÃO é comentário tem de continuar sendo lido.
  assert.equal(eventosDoFrontend().size, eventosDoBackend().size);
  assert.ok(eventosDoFrontend().size >= 6, "a extração encolheu — o filtro comeu evento real");
});

test("a allowlist do backend e o tipo do frontend sao o MESMO conjunto", { skip: FONTE_BACKEND ? false : MOTIVO }, () => {
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
