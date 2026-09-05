import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const pagina = readFileSync(
  new URL("../../src/app/banco/sessao/[sessionId]/page.tsx", import.meta.url),
  "utf8",
);

/**
 * "Estado que abre uma tela nao pode viver num ramo que talvez nao rode."
 *
 * O DEFEITO: `finalize()` abre `confidenceStepOpen` em QUALQUER sessao cuja
 * preferencia seja `post_session` — que e o padrao e tambem o fallback quando o
 * perfil nao carrega — e devolve sem chamar a API; quem chama e' `proceedReveal`,
 * disparado pela etapa. Mas `<ConfidenceReviewStep>` so' era renderizado dentro
 * do ramo do simulado.
 *
 * Consequencia numa sessao com `feedback_timing === "immediate"`: o aluno
 * clicava em Finalizar, o estado abria, NADA aparecia na tela e nenhuma
 * requisicao saia. Botao morto — sem erro, sem toast, sem log. Foi por isso que
 * `POST /sessions/{id}/finalize` nunca apareceu nos logs de producao.
 *
 * POR QUE NENHUM GATE VIA: o typecheck passa (o estado existe e o componente e'
 * importado), o lint passa (o import E' usado — num ramo), o contract drift
 * compara caminhos e a chamada simplesmente nao acontecia, e o e2e percorre o
 * caminho padrao (`post_result`), que renderiza.
 *
 * Estes testes protegem a ESTRUTURA que torna o defeito dificil de refazer, e
 * correm em milissegundos. O comportamento em si e' do e2e; um teste que so'
 * roda no CI de navegador nao impede ninguem de empurrar a mudanca.
 */

const FORK_DO_RAMO = 'if (session.feedback_timing === "immediate")';

test("a etapa de confianca e renderizada antes de qualquer ramo", () => {
  const render = pagina.indexOf("<ConfidenceReviewStep");
  assert.notEqual(render, -1, "a etapa de confianca sumiu da pagina");

  const fork = pagina.indexOf(FORK_DO_RAMO);
  assert.notEqual(fork, -1, "o ramo de feedback imediato mudou de forma; reveja este teste");

  assert.ok(
    render < fork,
    "`<ConfidenceReviewStep>` voltou para dentro de um ramo de retorno. " +
      "Ha caminho que abre o estado e nao renderiza nada: o botao Finalizar " +
      "fica morto, sem erro e sem requisicao.",
  );
});

test("a etapa existe UMA vez, e nao uma copia por ramo", () => {
  const ocorrencias = pagina.split("<ConfidenceReviewStep").length - 1;
  assert.equal(
    ocorrencias,
    1,
    `<ConfidenceReviewStep> aparece ${ocorrencias} vezes. Uma copia por ramo e' ` +
      "como o buraco nasceu: o ramo novo esquece a copia e o botao morre de novo.",
  );
});

test("quem abre a etapa nao decide por modo de sessao", () => {
  // A abertura le' `confidenceTiming` (preferencia do ALUNO) e o estado da
  // sessao. Se voltasse a olhar `feedback_timing` ou `session_kind`, opener e
  // renderer passariam a ter dois criterios diferentes para a mesma tela — que
  // e' a forma geral do defeito, e nao o caso particular ja consertado.
  const inicio = pagina.indexOf("async function finalize()");
  assert.notEqual(inicio, -1, "`finalize()` mudou de nome; reveja este teste");
  const fim = pagina.indexOf("async function ", inicio + 1);
  const corpo = pagina.slice(inicio, fim === -1 ? pagina.length : fim);

  assert.ok(
    corpo.includes("setConfidenceStepOpen(true)"),
    "`finalize()` nao abre mais a etapa; se isso foi de proposito, este teste " +
      "e o comentario acima precisam mudar junto",
  );
  for (const eixo of ["feedback_timing", "session_kind", "resolution_mode"]) {
    assert.ok(
      !corpo.includes(eixo),
      `\`finalize()\` passou a decidir por \`${eixo}\`. O renderer nao le esse ` +
        "eixo, entao os dois podem discordar e a tela some outra vez.",
    );
  }
});
