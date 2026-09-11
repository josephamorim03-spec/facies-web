/**
 * O nome curto da banca — "USP - SP", não os 90 caracteres do catálogo.
 *
 * Pedido na tela: *"simplificar o nome e tirar a sigla do estado do início.
 * Ficando algo como USP - SP; USP - RP e não todo o nome extenso"*.
 *
 * ⚠️ O problema todo é COLISÃO. Reduzir à sigla sem cuidado transforma sete
 * bancas em "SMS" e cinco em "SES" — medido no dataset do Fácies. Dois botões
 * com o mesmo texto são piores que um botão comprido, e é por isso que a API é
 * uma função de LISTA: só com a lista dá para saber se o nome curto é único.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  nomesCurtosDasBancas,
  rotuloDaBanca,
} from "../../src/app/banco/_lib/rotuloDaBanca.ts";

const USP_SP =
  "SP - Universidade de São Paulo - USP - SP (Hospital das Clínicas da " +
  "Faculdade de Medicina da USP - HC)";
const USP_RP =
  "SP - Universidade de São Paulo - USP - RP (Hospital das Clínicas da " +
  "Faculdade de Medicina de Ribeirão Preto da USP)";

test("USP de São Paulo e de Ribeirão viram `USP - SP` e `USP - RP`", () => {
  const nomes = nomesCurtosDasBancas([USP_SP, USP_RP]);

  assert.equal(nomes.get(USP_SP), "USP - SP");
  assert.equal(nomes.get(USP_RP), "USP - RP");
});

test("a UF do início some — ela já está na sigla", () => {
  assert.doesNotMatch(nomesCurtosDasBancas([USP_SP]).get(USP_SP) ?? "", /^SP - Universidade/);
});

test("colisão de sigla é desempatada pela UF", () => {
  // O caso que impede reduzir às cegas: sete "SMS" no dataset do Fácies.
  const rj = "RJ - Secretaria Municipal de Saúde - SMS";
  const sp = "SP - Secretaria Municipal de Saúde - SMS";
  const nomes = nomesCurtosDasBancas([rj, sp]);

  assert.equal(nomes.get(rj), "SMS - RJ");
  assert.equal(nomes.get(sp), "SMS - SP");
  assert.notEqual(nomes.get(rj), nomes.get(sp), "dois botões com o mesmo texto");
});

test("colisão que a UF NÃO resolve devolve o nome inteiro", () => {
  // Duas do mesmo estado com a mesma sigla: encurtar seria mentir sobre serem
  // a mesma banca. Nome comprido é feio; nome ambíguo é errado.
  const a = "SP - Hospital Alfa - HX";
  const b = "SP - Hospital Beta - HX";
  const nomes = nomesCurtosDasBancas([a, b]);

  assert.notEqual(nomes.get(a), nomes.get(b));
  assert.match(nomes.get(a) ?? "", /Alfa/);
});

test("sem sigla na fonte, fica o nome limpo", () => {
  const enare = "Exame Nacional de Residência Médica EBSERH (ENARE)";

  assert.equal(nomesCurtosDasBancas([enare]).get(enare), enare.replace(" (ENARE)", ""));
});

test("cauda longa demais NÃO é sigla", () => {
  // Acima de 24 caracteres o que vem depois do hífen é outro nome por extenso,
  // e aí o principal informa mais.
  const nome = "MG - Fundação Educacional - Centro de Ensino Superior de Minas";
  const curto = nomesCurtosDasBancas([nome]).get(nome) ?? "";

  assert.equal(curto, "Fundação Educacional");
});

test("o nome curto NUNCA fica vazio", () => {
  for (const bruto of ["", "   ", "(só parênteses)", "SP - SP"]) {
    const nomes = nomesCurtosDasBancas([bruto]);
    if (bruto.trim() === "") continue;
    assert.notEqual((nomes.get(bruto) ?? "").trim(), "", `nome vazio para: ${bruto}`);
  }
});

test("`rotuloDaBanca` (sem lista) limpa mas NÃO reduz à sigla", () => {
  // Sem a lista não há como saber se "SMS" é único. Reduzir ali seria o
  // defeito que este arquivo inteiro existe para evitar.
  assert.equal(rotuloDaBanca(USP_SP), "Universidade de São Paulo - USP - SP");
  assert.equal(rotuloDaBanca(""), "");
});
