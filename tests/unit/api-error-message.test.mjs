import assert from "node:assert/strict";
import test from "node:test";

import { mensagemDeErroDeValidacao } from "../../src/lib/api/shared/validationMessage.ts";

/**
 * Regressão do "Request failed: 422".
 *
 * O backend valida a identidade do titular com Pydantic e produz mensagens
 * específicas — "e necessario ter ao menos 18 anos", "medico ja formado: informe
 * o ano em que concluiu". FastAPI as devolve numa LISTA em `detail`, e
 * `toAPIError` só sabia ler string ou objeto com `.message`: caía no fallback e
 * o aluno via `Request failed: 422` em `/cadastro/completar`, que é tela
 * obrigatória para todo mundo que entra pelo Google.
 *
 * Os payloads abaixo foram COPIADOS da resposta real, medida com o TestClient
 * contra `POST /cadastro/identidade` — não inventados a partir da documentação.
 */

test("menor de idade: a mensagem do backend chega ao aluno", () => {
  const detail = [
    {
      type: "value_error",
      loc: ["body", "birth_date"],
      msg: "Value error, e necessario ter ao menos 18 anos",
      input: "2015-01-01",
    },
  ];
  assert.equal(mensagemDeErroDeValidacao(detail), "e necessario ter ao menos 18 anos");
});

test("ano incoerente com a situação declarada", () => {
  const detail = [
    {
      type: "value_error",
      loc: ["body"],
      msg: "Value error, medico ja formado: informe o ano em que concluiu",
    },
  ];
  assert.equal(
    mensagemDeErroDeValidacao(detail),
    "medico ja formado: informe o ano em que concluiu",
  );
});

test("nome sem sobrenome", () => {
  const detail = [
    { type: "value_error", loc: ["body", "full_name"], msg: "Value error, informe nome e sobrenome" },
  ];
  assert.equal(mensagemDeErroDeValidacao(detail), "informe nome e sobrenome");
});

test("o prefixo do Pydantic sai — é ruído de framework", () => {
  for (const prefixo of ["Value error, ", "Type error, ", "Assertion error, "]) {
    assert.equal(mensagemDeErroDeValidacao([{ msg: `${prefixo}texto util` }]), "texto util");
  }
});

test("vários campos inválidos: todos aparecem", () => {
  // A pessoa precisa dos dois, não do primeiro — senão corrige um, reenvia, e
  // descobre o outro.
  const detail = [
    { loc: ["body", "full_name"], msg: "Value error, informe nome e sobrenome" },
    { loc: ["body", "birth_date"], msg: "Value error, data de nascimento no futuro" },
  ];
  assert.equal(
    mensagemDeErroDeValidacao(detail),
    "informe nome e sobrenome; data de nascimento no futuro",
  );
});

test("mensagens repetidas não são repetidas na tela", () => {
  const detail = [
    { loc: ["body", "a"], msg: "Value error, campo obrigatorio" },
    { loc: ["body", "b"], msg: "Value error, campo obrigatorio" },
  ];
  assert.equal(mensagemDeErroDeValidacao(detail), "campo obrigatorio");
});

test("o que não é lista de validação devolve null e deixa o fluxo antigo agir", () => {
  // `null` significa "não sei formatar isto" — quem chama cai no `body.message`
  // ou no `Request failed: NNN`, como antes. Inventar mensagem aqui seria pior.
  for (const entrada of [
    null,
    undefined,
    "invalid_credentials",
    { code: "rate_limited" },
    [],
    [{ semMsg: 1 }],
    [{ msg: 42 }],
    [{ msg: "   " }],
  ]) {
    assert.equal(mensagemDeErroDeValidacao(entrada), null, `${JSON.stringify(entrada)}`);
  }
});

test("detalhe em string continua sendo tratado pelo caminho antigo", () => {
  // Regressão inversa: os 4xx com `detail` string (a maioria das rotas de auth)
  // não podem passar a devolver null aqui e perder a mensagem.
  assert.equal(mensagemDeErroDeValidacao("Email is not verified"), null);
});
