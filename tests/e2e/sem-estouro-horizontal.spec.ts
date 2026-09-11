import { test, expect } from "@playwright/test";

// O harness é `.mjs` sem tipos; `mapa.navegavel.spec.ts` já o
// importa assim. Reusar é o ponto: `assertNoOverflow` não diz só "estourou
// 15px", diz QUEM estourou, com a classe e o texto do elemento. Escrever aqui a
// nona cópia da mesma asserção era o caminho fácil e o errado.
import { assertNoOverflow } from "../../scripts/lib/app-harness.mjs";
import { mockFinalizedSession, RUNNER_SESSION_ID } from "./support/questionSessionMock";

/**
 * NENHUMA TELA DO ALUNO PODE SER MAIS LARGA QUE O TELEMÓVEL.
 *
 * ## Por que este ficheiro existe
 *
 * O operador reportou o pós-simulado a rolar na horizontal: a página fica mais
 * larga que o ecrã e a navegação dentro dela muda. A causa foi um `truncate`
 * dentro de um item de grelha sem `min-w-0` — item de grelha nasce com
 * `min-width: auto`, e o min-content de `white-space: nowrap` é a frase inteira.
 *
 * ⚠️ **O guard para isto já existia e não olhava para esta tela.**
 * `assertNoOverflow` vive em `scripts/lib/app-harness.mjs`, mas o único chamador
 * era `scripts/capture-design-redesign.mjs`, que visita oito rotas — e
 * `/banco/sessao/*` não é uma delas. `sessao.pos-prova.spec.ts` é o único spec
 * que renderiza o pós-simulado e não tinha nenhuma asserção de largura.
 *
 * Havia ainda seis cópias da mesma asserção espalhadas por outros specs — cada
 * tela nova ganhava, ou não, a sua. Cobertura por adesão voluntária é como o
 * defeito entrou.
 *
 * ## ⚠️ Medir a tela VAZIA seria verde por vacuidade
 *
 * A frase que estoura só existe quando há dado. O mock de sessão finalizada
 * **não** cobre o endpoint de diagnóstico, então sem o `page.route` abaixo o
 * bloco "Desempenho por tema" — justamente o que estourava — nunca renderiza, e
 * o teste passaria sem olhar para nada.
 *
 * ## ⚠️ A montagem é a do `sessao.pos-prova.spec.ts`, e por medição
 *
 * A primeira versão deste ficheiro chamava também `addHttpOnlySession(context)`
 * e `mockApi(page)` — o catch-all do harness — copiando a receita do
 * `mapa.navegavel.spec.ts`. Falhou duas vezes na CI sem nunca renderizar a tela.
 *
 * `sessao.pos-prova.spec.ts` renderiza ESTA MESMA tela, passa na CI, e monta só
 * `mockFinalizedSession(page)`: ele já instala a sessão (`addHttpOnlySessionForPage`),
 * o `/api/profile` com `cadastro_completo` e as rotas da sessão. O catch-all era
 * peso morto — e peso morto que responde a `**\/api\/**` tem como responder de
 * mais. A receita boa é a do vizinho que já corre verde aqui.
 */

const TELEMOVEL = { width: 390, height: 844 };

/** O rótulo real que estourou, no tamanho que o acervo produz. */
const MICRO_LONGA =
  "Decidir a conduta na angina instável quanto a cateterismo cardíaco com tempo para estratégia invasiva ≤ 24h";

function diagnosticoComRotuloLongo() {
  const no = (id: string, nome: string, accuracy: number) => ({
    knowledge_node_id: id,
    node_name: nome,
    node_type: "microcompetency",
    correct: Math.round(accuracy * 4),
    wrong: 4 - Math.round(accuracy * 4),
    accuracy,
  });
  return {
    session_id: RUNNER_SESSION_ID,
    total: 10,
    correct: 9,
    wrong: 1,
    accuracy: 0.9,
    nodes: [
      no("no-longo", MICRO_LONGA, 0.25),
      no("no-curto", "Aterosclerose e Doença Arterial Coronariana", 0.75),
    ],
    weak_node_ids: ["no-longo"],
    charge_pattern_breakdown: {},
    answer_type_breakdown: {},
    reasoning_type_breakdown: {},
    error_reasons: {},
    cognitive_breakdown: {},
    dominant_cognitive_tag: null,
    confident_and_wrong: 0,
    doubtful_and_wrong: 0,
    metacognitive_accuracy: null,
    impulsive_count: 0,
    overconfident_count: 0,
    recommended_blocks: [],
  };
}

test.describe("nenhuma tela do aluno estoura na horizontal", () => {
  test.use({ viewport: TELEMOVEL, isMobile: true, hasTouch: true });

  test("o pós-simulado cabe em 390px, com rótulo de microcompetência longo", async ({ page }) => {
    await mockFinalizedSession(page);

    // ⚠️ Registado DEPOIS do mock da sessão de propósito: no Playwright a rota
    // adicionada por último é a primeira a ser consultada.
    let pedidosDeDiagnostico = 0;
    await page.route("**/api/question-bank/sessions/*/diagnosis", async (route) => {
      pedidosDeDiagnostico += 1;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(diagnosticoComRotuloLongo()),
      });
    });

    await page.goto(`/banco/sessao/${RUNNER_SESSION_ID}`);

    // ── Três âncoras, em ordem, porque cada falha aponta para uma causa
    // diferente. Duas corridas de CI já se perderam a adivinhar qual era.

    // 1. A tela montou? Esta é a âncora que o `sessao.pos-prova.spec.ts` usa e
    //    que a CI já prova verde. Se falhar aqui, o problema é a montagem —
    //    sessão, perfil ou redirecionamento —, não o diagnóstico.
    await expect(page.getByRole("button", { name: /^Erros/ })).toBeVisible({ timeout: 15_000 });

    // 2. O app chegou a PEDIR o diagnóstico? `usePostExamReviewData` só o pede
    //    quando `session.all_feedback_revealed` é verdadeiro. Zero pedidos
    //    significa fixture errado; pedidos > 0 com o bloco ausente significa
    //    payload rejeitado. São consertos opostos, e sem este contador a
    //    mensagem de falha não distingue os dois.
    await expect
      .poll(() => pedidosDeDiagnostico, { timeout: 15_000 })
      .toBeGreaterThan(0);

    // 3. O bloco que estourava renderizou, com o rótulo longo dentro? A
    //    asserção é sobre o `main` inteiro porque, ao falhar, o Playwright
    //    imprime o texto recebido — e é isso que diz em que estado a tela ficou.
    const main = page.locator("main").first();
    await expect(main).toContainText("Desempenho por tema", { timeout: 15_000 });
    await expect(main).toContainText("angina instável");

    await assertNoOverflow(page);
  });
});
