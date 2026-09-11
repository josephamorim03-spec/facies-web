/**
 * NO R+, O CADERNO É QUE SEPARA UMA PROVA DA OUTRA.
 *
 * A chave era o `exam_number` para todo mundo. Os cadernos de especialidade do
 * R+ partilham o número "1", então todos caíam na MESMA entrada e eram servidos
 * como um caderno só. Medido em produção (2026-09-10):
 *
 *     101 recortes de R+ fundiam ......... 20.559 questões
 *     SES-DF 2021 ...... 12 cadernos ..... 2.400 questões como "a prova"
 *     ENARE R+ 2024 ..... 7 cadernos ....... 600
 *
 * No acesso direto o mesmo padrão soma no máximo 100 — é o caso legítimo da
 * Unicamp (91 + 9, edital de 100). A mesma coluna com dois significados em
 * populações diferentes, e por isso a chave é escolhida pela MODALIDADE.
 *
 * ⚠️ `chaveDaProva` é o par de `_chave_da_prova` no serviço. As duas têm de
 * concordar: a tela manda a chave escolhida e o servidor procura por ela.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { chaveDaProva } from "../../src/app/banco/_lib/tamanhoDaProva.ts";

const CM = "Residência com pré-requisito - Clínica Médica (R+ CM)";

function edicao(over = {}) {
  return {
    year: 2024,
    exam_number: "1",
    access_group: "ACESSO-DIRETO",
    access_type: "Residência (Acesso Direto)",
    captured_count: 100,
    annulled_count: 0,
    ...over,
  };
}

test("no R+ a chave é o CADERNO", () => {
  assert.equal(chaveDaProva(edicao({ access_group: "RPLUS", access_type: CM })), CM);
});

test("no acesso direto a chave continua sendo o NÚMERO", () => {
  assert.equal(chaveDaProva(edicao()), "1");
  assert.equal(chaveDaProva(edicao({ exam_number: "2" })), "2");
});

test("dois cadernos de R+ com o mesmo número NÃO colapsam", () => {
  const cm = edicao({ access_group: "RPLUS", access_type: CM });
  const cir = edicao({
    access_group: "RPLUS",
    access_type: "Residência com pré-requisito - Cirurgia Geral (R+ CIR)",
  });

  assert.notEqual(chaveDaProva(cm), chaveDaProva(cir));
});

test("as duas metades do MESMO caderno de acesso direto colapsam", () => {
  // A Unicamp: 91 + 9, edital de 100. Chavear por `access_type` aqui quebraria
  // 31 recortes que hoje funcionam.
  const inteira = edicao({ captured_count: 91 });
  const revalida = edicao({
    access_type: "Residência (Acesso Direto)+Revalida",
    captured_count: 9,
  });

  assert.equal(chaveDaProva(inteira), chaveDaProva(revalida));
});

test("caderno sem texto não vira chave falsa", () => {
  assert.equal(chaveDaProva(edicao({ access_group: "RPLUS", access_type: null })), "");
});

/** ⚠️ Call site: função certa que ninguém chama é igual a função ausente. */
const fonte = (caminho) =>
  readFileSync(new URL(`../../src/app/banco/${caminho}`, import.meta.url), "utf8");

test("o seletor agrupa pela chave, e não pelo número", () => {
  const seletor = fonte("_components/EscolhaDaProva.tsx");

  assert.match(seletor, /chaveDaProva\(edicao\)/);
  assert.doesNotMatch(
    seletor,
    /porNumero\.get\(edicao\.exam_number\)/,
    "voltou a agrupar pelo número: os cadernos de R+ fundem de novo",
  );
});

test("o tamanho anunciado é o do caderno ESCOLHIDO, não a soma do ano", () => {
  // Sem isto o botão prometeria 600 questões para uma sessão de 120.
  const hook = fonte("_lib/useEdicoesDaProva.ts");

  assert.match(hook, /escolha \? noAno\.filter\(\(e\) => chaveDaProva\(e\) === escolha\)/);
  assert.match(fonte("page.tsx"), /escolha: fullExamNumber/);
});
