import assert from "node:assert/strict";
import test from "node:test";

import { podeEnviarCadastro } from "../../src/app/cadastro/podeEnviar.ts";

/**
 * Regressão do funil quebrado.
 *
 * O botão "Criar a minha conta" da landing aponta para `/cadastro`, e a tela
 * renderizava o formulário de e-mail incondicionalmente. Em produção o alvo é
 * google-only e o router de auth local nem é registrado: `POST /auth/signup`
 * responde 404. O funil inteiro terminava num formulário que o servidor não
 * atende — e o botão do Google, que é o caminho real, ficava abaixo dele.
 */

const COMPLETO = {
  viaEmailDisponivel: true,
  recaptchaSiteKey: "site-key",
  busy: false,
  email: "aluna@exemplo.com",
  password: "SenhaForte123",
  confirmPassword: "SenhaForte123",
  termsAccepted: true,
  captchaToken: "captcha-ok",
};

test("formulário completo e auth local ligada: envia", () => {
  assert.equal(podeEnviarCadastro(COMPLETO), true);
});

test("auth local DESLIGADA trava o envio mesmo com tudo preenchido", () => {
  // A condição de contrato: sem ela, esconder o formulário seria só cosmético.
  assert.equal(podeEnviarCadastro({ ...COMPLETO, viaEmailDisponivel: false }), false);
});

test("o padrão antes da resposta de /auth/modes é NÃO enviar", () => {
  // `useState(false)` na tela: mostrar um caminho que talvez não exista é pior
  // que esconder um que existe, e a resposta chega em milissegundos.
  assert.equal(podeEnviarCadastro({ ...COMPLETO, viaEmailDisponivel: false }), false);
});

test("sem site key do reCAPTCHA não envia", () => {
  assert.equal(podeEnviarCadastro({ ...COMPLETO, recaptchaSiteKey: "" }), false);
});

test("sem token de captcha não envia", () => {
  assert.equal(podeEnviarCadastro({ ...COMPLETO, captchaToken: "" }), false);
});

test("sem aceite dos termos não envia", () => {
  assert.equal(podeEnviarCadastro({ ...COMPLETO, termsAccepted: false }), false);
});

test("senhas diferentes não enviam", () => {
  assert.equal(podeEnviarCadastro({ ...COMPLETO, confirmPassword: "Outra123456" }), false);
});

test("e-mail só de espaço não envia", () => {
  assert.equal(podeEnviarCadastro({ ...COMPLETO, email: "   " }), false);
});

test("envio em andamento não reenvia", () => {
  assert.equal(podeEnviarCadastro({ ...COMPLETO, busy: true }), false);
});

test("nenhum campo sozinho ressuscita o envio com auth local desligada", () => {
  // A primeira condição é curto-circuito: nada depois dela pode compensá-la.
  const variacoes = [
    { recaptchaSiteKey: "outra" },
    { captchaToken: "outro" },
    { termsAccepted: true },
    { busy: false },
    { email: "outra@exemplo.com" },
  ];
  for (const variacao of variacoes) {
    assert.equal(
      podeEnviarCadastro({ ...COMPLETO, viaEmailDisponivel: false, ...variacao }),
      false,
      `${JSON.stringify(variacao)} nao pode liberar o envio`,
    );
  }
});
