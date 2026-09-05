import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const catalogo = JSON.parse(
  readFileSync(new URL("../../src/data/especialidades.json", import.meta.url), "utf8"),
);

/**
 * A lista de especialidades que o médico escolhe no objetivo.
 *
 * ⚠️ ELA NÃO É CURADORIA NOSSA, e este teste existe para que continue não
 * sendo. São as especialidades reconhecidas pela Resolução CFM nº 2.380/2024 —
 * o arquivo foi GERADO do anexo da resolução, não transcrito à mão.
 *
 * A tentação que ele bloqueia: reduzir a lista ao que a Fácies tem questão, ou
 * ao que "mais cai". Isso faria o produto decidir a carreira do médico pela sua
 * própria cobertura — e um dia alguém acrescentaria uma linha sem fonte.
 *
 * ⚠️ A resolução anterior era a 2.330/2023, e ela FOI SUBSTITUÍDA. Se a CFM
 * publicar outra, regere o arquivo do anexo novo e atualize a contagem aqui
 * junto — nunca só a contagem.
 */

test("são as 55 do CFM, e a fonte viaja com elas", () => {
  assert.equal(catalogo.total, 55);
  assert.equal(catalogo.especialidades.length, 55);
  assert.match(catalogo.fonte, /Resolução CFM nº 2\.380\/2024/);
  assert.match(catalogo.fonte_url, /^https:\/\/sistemas\.cfm\.org\.br\//);
});

test("cada uma tem nome e código, e nenhum código se repete", () => {
  const codigos = new Set();
  for (const item of catalogo.especialidades) {
    assert.ok(item.nome && item.nome.trim().length > 0, "especialidade sem nome");
    assert.match(item.codigo, /^[a-z0-9-]+$/, `código fora do formato: ${item.codigo}`);
    assert.ok(!codigos.has(item.codigo), `código repetido: ${item.codigo}`);
    codigos.add(item.codigo);
  }
});

test("as âncoras da lista oficial estão lá, na ordem alfabética da resolução", () => {
  // Primeira, última e três do meio que o produto cita em outros lugares. Se a
  // geração pular uma linha do anexo, a ordem quebra aqui antes de a tela
  // mentir sobre o que o CFM reconhece.
  const nomes = catalogo.especialidades.map((item) => item.nome);
  assert.equal(nomes[0], "Acupuntura");
  assert.equal(nomes[54], "Urologia");
  assert.ok(nomes.includes("Clínica médica"));
  assert.ok(nomes.includes("Ginecologia e obstetrícia"));
  assert.ok(nomes.includes("Oftalmologia"));
  // Ordem alfabética é como a resolução as publica; fora dela, a busca da tela
  // devolveria resultados em ordem arbitrária.
  const ordenadas = [...nomes].sort((a, b) => a.localeCompare(b, "pt-BR"));
  assert.deepEqual(nomes, ordenadas);
});

test("a lista não é o acervo: ela tem especialidades que a Fácies não cobre", () => {
  // O ponto inteiro. Se um dia alguém filtrar pelo que temos questão, estas
  // caem primeiro — e o médico que quer Homeopatia ou Medicina do tráfego
  // deixaria de conseguir declarar o próprio objetivo.
  const nomes = catalogo.especialidades.map((item) => item.nome);
  for (const rara of ["Homeopatia", "Acupuntura", "Medicina do tráfego", "Medicina legal e perícia médica"]) {
    assert.ok(nomes.includes(rara), `${rara} saiu da lista — a lista virou curadoria`);
  }
});
