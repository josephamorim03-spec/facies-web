import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

/**
 * O artefato do repositório tem de ser a previsão REGISTRADA que está no ar.
 *
 * ## O buraco que este teste fecha
 *
 * `previsao-hash.test.mjs` confere que o hash bate com o próprio conteúdo — ou
 * seja, consistência INTERNA. Ele passa em qualquer artefato bem formado,
 * inclusive num que nunca foi registrado, ou num de uma edição anterior.
 *
 * Medido em 2026-09-07 e não é hipótese: a branch de trabalho local carregava
 * `ef4fb66d` (30 assuntos, registrado em 30/08) enquanto `facies.app` publicava
 * `dae585e7` (42 assuntos, 04/09). Um deploy daquela branch teria trocado a
 * previsão publicada pela antiga, a seis dias da prova, e:
 *
 * - o teste de hash passaria (o artefato velho é internamente consistente);
 * - `design/verificar-landing-v8.mjs` não roda em CI nem em npm script nenhum —
 *   e, quando rodado, exige `lista.length === 30`, então **abençoaria a
 *   regressão e reprovaria a verdade**;
 * - a página seguiria dizendo "fechados em 04/09" com outra lista embaixo.
 *
 * Nada quebraria. Os dois números pareceriam legítimos. É a classe de defeito
 * mais cara deste projeto, e a única que a marca inteira existe para não
 * cometer.
 *
 * ## Por que um valor fixo, e o que fazer quando ele mudar
 *
 * A fonte da verdade é a linha em `facies_prediction_registry` (Postgres de
 * PRODUÇÃO — o banco local tem a tabela vazia). Um teste unitário não fala com
 * banco, então o hash publicado é fixado aqui.
 *
 * ⚠️ **Se este teste reprovar, NÃO atualize a constante para calar o erro.**
 * Reprovação significa uma destas duas coisas:
 *
 * 1. O artefato regrediu (branch atrasada, merge ruim) — o conserto é trazer o
 *    artefato publicado de volta, não mudar o número daqui.
 * 2. Você publicou uma previsão NOVA de propósito. Aí a constante muda **junto
 *    com**: a linha registrada no registry ANTES da aplicação, a data na página,
 *    e o `--sha` do runbook (`kbank/docs/runbook-previsao-enamed.md`).
 *
 * Trocar só a constante desfaz a única coisa que a Fácies tem e os concorrentes
 * não: a lista ser conferível por quem não confia nela.
 */

const ARQUIVO = new URL("../../src/data/facies/previsao.json", import.meta.url);
const PREVISAO = JSON.parse(readFileSync(ARQUIVO, "utf8"));

/** A previsão que `facies.app` publica, e que o marcador do dia 16 vai pinar. */
const PUBLICADA = {
  sha: "dae585e7b89ad75e0620011215868925e22d508733ea6beccd6c27a85fd75838",
  registradoEm: "2026-09-04",
  itens: 42,
};

test("o artefato é a previsão registrada que está publicada", () => {
  assert.equal(
    PREVISAO.content_sha256,
    PUBLICADA.sha,
    "o artefato não é o publicado — ler o cabeçalho deste arquivo antes de mexer",
  );
});

test("a data de registro é a que a página anuncia", () => {
  assert.equal(PREVISAO.registered_at.slice(0, 10), PUBLICADA.registradoEm);
});

test("os dois grãos têm o tamanho declarado em base_composition", () => {
  // Não é `42` digitado duas vezes: o `top_n` vem do próprio artefato, então
  // esta asserção pega artefato internamente incoerente mesmo que o hash mude.
  const topN = PREVISAO.base_composition.top_n;
  assert.equal(topN, PUBLICADA.itens);
  for (const grao of ["subtheme", "theme"]) {
    assert.equal(
      PREVISAO.predictions[grao].lista.length,
      topN,
      `o grão ${grao} não tem ${topN} itens`,
    );
  }
});

test("o grão da manchete está congelado junto com a lista", () => {
  // A migration 107 põe `headline_grain` dentro do hash de propósito: sem isso
  // daria para escolher o grão depois de ver a prova — 88% no tema contra 38%
  // no subtema, com a lista cobrindo metade da taxonomia.
  assert.equal(PREVISAO.headline_grain, "subtheme");
  assert.equal(PREVISAO.headline_metric, "lift");
});
