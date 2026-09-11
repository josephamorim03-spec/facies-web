/**
 * O botão não pode prometer uma correção que o servidor desfaz.
 *
 * O DEFEITO (2026-09-10): a secção "Como corrigir" oferecia "A cada questão"
 * nos três tipos de sessão, e o botão saía
 * `Começar prova · 100 questões · corrige a cada questão`. Mas
 * `normalize_session_contract` põe `feedback_timing = "post_result"` em
 * `session_kind="kros"` e `="institutional_exam"` — e por boa razão: nos dois o
 * exercício depende de não ver o gabarito antes do fim.
 *
 * É a mesma forma do beco do `guided_choice` fechado na PR #76: **oferecer a
 * escolha que o servidor descarta**. O aluno escolhe, a tela confirma, e a
 * sessão faz outra coisa — sem erro, sem aviso, e sem nada que ligue uma coisa
 * à outra quando ele estranhar.
 *
 * ## Os dois testes fazem trabalhos diferentes
 *
 * Os primeiros exercitam a regra da tela. O ÚLTIMO lê o schema do servidor: a
 * regra aqui é um espelho de uma decisão que mora em Python, e espelho que
 * ninguém confere é como front e back passam a discordar em silêncio. Se o
 * servidor deixar de pinar, este teste reprova e manda atualizar a tela — em
 * vez de a tela continuar a esconder uma opção que já era legítima.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { fonteDoBackend, MOTIVO } from "./_contrato-com-o-backend.mjs";

import {
  CORRECTION_MODE_SHORT_LABEL,
  correcaoEfetiva,
  correcaoEhEscolhaDoAluno,
  politicaDeCorrecao,
  questionBankCtaLabel,
} from "../../src/app/banco/_lib/sessionBuilder.ts";

test("o PAYLOAD também para de pedir o que o servidor descarta", () => {
  // O botão dizer a verdade não basta: era o payload que mandava
  // `feedback_timing: "immediate"` numa prova, para o servidor o deitar fora.
  assert.deepEqual(politicaDeCorrecao("immediate", "full_exam"), {
    feedback_timing: "post_result",
    feedback_reveal_policy: "guided_choice",
  });
  assert.deepEqual(politicaDeCorrecao("immediate", "kros"), {
    feedback_timing: "post_result",
    feedback_reveal_policy: "guided_choice",
  });
  assert.deepEqual(politicaDeCorrecao("immediate", "topic"), {
    feedback_timing: "immediate",
    feedback_reveal_policy: "guided_choice",
  });
  assert.deepEqual(politicaDeCorrecao("reveal_all", "full_exam"), {
    feedback_timing: "post_result",
    feedback_reveal_policy: "reveal_all",
  });
});

test("por tópico, a escolha do aluno vale — os três modos", () => {
  assert.equal(correcaoEhEscolhaDoAluno("topic"), true);
  for (const modo of ["immediate", "guided_choice", "reveal_all"]) {
    assert.equal(correcaoEfetiva(modo, "topic"), modo);
  }
});

test("prova e treino dirigido corrigem no FIM, escolha o aluno o que escolher", () => {
  for (const tipo of ["full_exam", "kros"]) {
    assert.equal(correcaoEhEscolhaDoAluno(tipo), false, `${tipo} não fixa a correção`);
    assert.equal(
      correcaoEfetiva("immediate", tipo),
      "guided_choice",
      `${tipo}: \`immediate\` tinha de cair para o fim — o servidor pina \`post_result\``,
    );
  }
});

test("o que o aluno escolheu para o fim continua valendo lá", () => {
  // Pinar o MOMENTO não é escolher a FORMA: "uma a uma" e "tudo de uma vez"
  // continuam sendo do aluno.
  for (const tipo of ["full_exam", "kros"]) {
    assert.equal(correcaoEfetiva("guided_choice", tipo), "guided_choice");
    assert.equal(correcaoEfetiva("reveal_all", tipo), "reveal_all");
  }
});

test("o BOTÃO da prova não diz mais `corrige a cada questão`", () => {
  const rotulo = questionBankCtaLabel(100, "immediate", "full_exam");

  assert.ok(rotulo.includes("100 questões"), `o tamanho sumiu do botão: ${rotulo}`);
  assert.doesNotMatch(
    rotulo,
    /a cada questão/,
    "o botão voltou a prometer correção por questão numa prova que corrige no fim",
  );
  assert.ok(
    rotulo.includes(CORRECTION_MODE_SHORT_LABEL.guided_choice),
    `o botão tem de dizer o que a sessão faz: ${rotulo}`,
  );
});

test("por tópico o botão continua a dizer `a cada questão`", () => {
  // O conserto não pode apagar o modo onde ele é verdade.
  assert.match(questionBankCtaLabel(20, "immediate", "topic"), /a cada questão/);
});

// ⚠️ Pelo helper, e nao por caminho cru. Este arquivo vive em DOIS
// repositorios -- o monorepo e o frontend separado -- e `fonteDoBackend`
// resolve os dois layouts. Com caminho cru, o teste rebenta com ENOENT no
// repo do frontend em vez de pular com motivo; foi o que aconteceu na
// primeira sincronizacao.
const SCHEMA = fonteDoBackend("app/api/schemas/question_bank.py");

test("o servidor ainda pina os dois — se parar, este espelho tem de cair", { skip: SCHEMA ? false : MOTIVO }, () => {
  const normalizacao = SCHEMA.slice(SCHEMA.indexOf("def normalize_session_contract"));
  assert.ok(normalizacao.length > 0, "`normalize_session_contract` sumiu; reveja este teste");

  for (const kind of ["kros", "institutional_exam"]) {
    const ramo = normalizacao.slice(normalizacao.indexOf(`self.session_kind == "${kind}"`));
    const fim = ramo.indexOf("elif ");
    assert.match(
      fim === -1 ? ramo : ramo.slice(0, fim),
      /self\.feedback_timing = "post_result"/,
      `o servidor deixou de pinar \`post_result\` em \`${kind}\`: a tela esconde ` +
        "\"A cada questão\" nesse tipo por causa deste pin, e agora está a esconder " +
        "uma opção legítima. Atualize `correcaoEhEscolhaDoAluno`.",
    );
  }
});
