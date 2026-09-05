import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { test } from "node:test";

import { SPECS_ADIADOS, SPECS_DE_GATE } from "../../scripts/lib/e2e-specs.mjs";

/**
 * O gate de e2e roda um RECORTE, e recorte sem guard vira cobertura fantasma.
 *
 * 🚨 O job bloqueante rodava a suite inteira, que o proprio
 * `run-smoke-e2e.mjs` declarava nao servir de gate por depender do backend em
 * `:8000`. Vermelho todos os dias por motivo conhecido e a esteira que se
 * aprende a ignorar -- pior que nao ter esteira.
 *
 * Agora ele roda os quatro que ficam verdes. O risco novo e' o oposto: um spec
 * criado depois nao entra em lista nenhuma, o gate nao o roda, e ninguem nota
 * -- porque um gate menor tambem fica verde.
 *
 * Estes testes fixam as duas pontas: o recorte tem de ser real (arquivos que
 * existem) e tem de ser CONSCIENTE (nada fora das duas listas por acidente).
 */
const dir = new URL("../e2e/", import.meta.url);

test("todo spec das listas existe em disco", () => {
  for (const spec of [...SPECS_DE_GATE, ...Object.keys(SPECS_ADIADOS)]) {
    assert.ok(
      existsSync(new URL(spec, dir)),
      `${spec} esta numa lista e nao existe -- o gate rodaria menos do que pensa`,
    );
  }
});

test("gate e adiados sao conjuntos DISJUNTOS", () => {
  const nos_dois = SPECS_DE_GATE.filter((s) => s in SPECS_ADIADOS);
  assert.deepEqual(nos_dois, [], "spec em gate E adiado: a intencao esta ambigua");
});

test("todo adiado declara a CAUSA, e nao so' o nome", () => {
  for (const [spec, motivo] of Object.entries(SPECS_ADIADOS)) {
    assert.ok(
      typeof motivo === "string" && motivo.trim().length > 10,
      `${spec} esta adiado sem motivo legivel -- e' assim que um adiamento vira permanente`,
    );
  }
});

/**
 * ⚠️ Este e' o que importa daqui a seis meses. Os oito specs que o smoke
 * conhecia estao classificados; um spec NOVO que ninguem classificar nao seria
 * rodado pelo gate nem apareceria como adiado.
 *
 * A lista de isencao e' explicita e vazia de proposito para os oito historicos:
 * os demais arquivos de `tests/e2e` nunca estiveram no smoke e tem donos
 * proprios (`playwright test` os roda).
 */
test("os specs que o smoke conhecia continuam todos classificados", () => {
  const historicos = [
    "navigation.shell.spec.ts",
    "banco.historico.spec.ts",
    "auth.proxy-cookie.spec.ts",
    "cadastro.funil.spec.ts",
    "cronograma.smoke.spec.ts",
    "caderno.header-toggle.spec.ts",
    "revisao-turbo.smoke.spec.ts",
    "study-import.smoke.spec.ts",
  ];
  const classificados = new Set([...SPECS_DE_GATE, ...Object.keys(SPECS_ADIADOS)]);
  const orfaos = historicos.filter((s) => !classificados.has(s));
  assert.deepEqual(orfaos, [], "spec do smoke saiu das duas listas sem decisao");
  assert.equal(classificados.size, historicos.length, "apareceu spec fora dos oito historicos");
});

test("o diretorio de e2e existe e tem specs -- a asserção acima nao mede o vazio", () => {
  const achados = readdirSync(dir).filter((f) => f.endsWith(".spec.ts"));
  assert.ok(achados.length > 20, `esperava dezenas de specs, achei ${achados.length}`);
});
