import { expect, test, type Page } from "@playwright/test";

import { addHttpOnlySession } from "./support/authCookies";
import {
  mockStudentTodayApi,
  studentAgendaPayload,
  studentTodayPayload,
} from "./support/studentTodayApiMock";

/**
 * As promessas do laço diário — cada teste prende um rótulo ao seu mecanismo.
 *
 * O diagnóstico de 2026-09-06 tinha uma forma só: o rótulo é escrito antes do
 * mecanismo, e nada verifica o par. Estes testes verificam o par. Nenhum deles
 * passaria antes da correção — foi assim que foram escritos.
 */

/** O mínimo para o shell montar e o Banco abrir sem 501. */
async function mockarBanco(page: Page, capturarCriacao?: (corpo: unknown) => void) {
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const method = request.method();
    const path = new URL(request.url()).pathname;
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

    if (method === "GET" && path === "/api/profile") {
      return json({
        user_id: "user_laco_e2e",
        weekly_goal_questions: 300,
        timezone: "America/Sao_Paulo",
        reschedule_mode: "suggest",
        display_name: "E2E User",
        access_status: "active",
        has_completed_initial_goal_setup: true,
        has_chosen_feedback_default: true,
        default_feedback_timing: "post_result",
        default_feedback_reveal_policy: "guided_choice",
        // Sem isto o shell manda todos para `/cadastro/completar`.
        cadastro_completo: true,
      });
    }
    if (method === "POST" && path === "/api/question-bank/sessions") {
      capturarCriacao?.(request.postDataJSON());
      return json({ session_id: "sessao_laco_e2e" }, 201);
    }
    if (method === "GET" && path === "/api/question-bank/topics") {
      return json({ items: [] });
    }
    if (method === "GET" && path === "/api/question-bank/questions") {
      return json({ items: [], available_count: 42, total: 42 });
    }
    return json({}, 200);
  });
}

test.describe("as promessas do laço", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test.beforeEach(async ({ context }) => {
    await addHttpOnlySession(context);
  });

  test("o Banco aplica o recorte de histórico que a URL pede", async ({ page }) => {
    // ⚠️ ESTE É O DEFEITO CENTRAL DA RODADA.
    //
    // "Revisar os erros desta sessão" navega para `/banco?answer_status=wrong`.
    // O Banco não lia o parâmetro e `answerStatus` nascia `"unanswered"` — o
    // aluno pedia o que ERROU e recebia o que NUNCA VIU. O oposto exato do
    // rótulo, sem lançar nada e sem nenhum teste a acusar.
    // ⚠️ A ORDEM IMPORTA, e ela custou uma corrida inteira: no Playwright a
    // rota registada por ÚLTIMO vence. Com o mock largo depois, ele engolia
    // este `**/api/question-bank/questions*` e a lista ficava vazia — o teste
    // falhava por defeito do próprio teste.
    await mockarBanco(page);
    const pedidos: string[] = [];
    // O montador pergunta a DISPONIBILIDADE, nao a lista: e este o pedido que
    // carrega o recorte, e foi nele que a primeira versao deste teste olhou para
    // o lado errado.
    await page.route("**/api/question-bank/availability*", async (route) => {
      pedidos.push(route.request().url());
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ available_count: 12, max_selectable: 12, distribution: [] }),
      });
    });

    // Chega SEM recorte: a barra de filtros ativos não menciona o histórico,
    // porque "não feitas" é o padrão e o padrão não é filtro.
    await page.goto("/banco");
    await expect(page.getByText("Acesso Direto")).toBeVisible({ timeout: 10_000 });

    // Chega COM recorte: o Banco tem de o ter aplicado. `getActiveFilters`
    // só nomeia o histórico quando ele SAI do padrão, então esta linha é
    // exatamente a diferença entre ler e ignorar o parâmetro.
    await page.goto("/banco?answer_status=wrong");
    // Com dois filtros a barra colapsa em "N filtros" — o rótulo individual só
    // aparece dentro do menu. É a contagem que muda, e é ela que se mede: com o
    // parâmetro ignorado, ela ficaria em um.
    await expect(page.getByText("2 filtros")).toBeVisible({ timeout: 10_000 });
  });

  test("praticar um assunto do mapa cria TREINO, não simulado", async ({ page }) => {
    // "Praticar" queria dizer duas coisas: do mapa e das guardadas a sessão
    // nascia sem `feedback_timing` e caía no padrão do perfil (`post_result`).
    // O aluno tocava "Praticar 12 questões" para APRENDER um assunto e não via
    // correção nenhuma até o fim.
    let criacao: Record<string, unknown> | null = null;
    await mockarBanco(page, (corpo) => {
      criacao = corpo as Record<string, unknown>;
    });
    await page.route("**/api/question-bank/topics*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [
            {
              knowledge_node_id: "no_sepse",
              node_name: "Sepse",
              node_code: "CM.SEPSE",
              node_type: "subtheme",
              question_count: 12,
              institutions: ["USP-SP"],
            },
          ],
        }),
      });
    });

    // ⚠️ SEM ESTE MOCK O TESTE ERA VAZIO. O fallback devolve `{}` para toda
    // rota não casada, então `/bookmarks` respondia vazio, a lista de guardadas
    // não tinha nenhuma questão, o botão "Praticar" nunca renderizava — e a
    // assercão vivia dentro de um `if (await praticar.count())` que a tornava
    // opcional. Verde sobre nada: tirar `feedback_timing` do código não
    // reprovava.
    await page.route("**/api/question-bank/bookmarks*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        // ⚠️ `knowledge_nodes` NAO E OPCIONAL: `areaDaQuestao` faz
        // `questao.knowledge_nodes.find(...)` sem guarda, e sem o campo a tela
        // inteira cai na fronteira de erro. Foi assim que a primeira versao
        // deste fixture deixou a lista vazia -- e o `if` que envolvia a
        // assercao escondeu isso por completo.
        body: JSON.stringify([
          {
            id: "q_sepse_1",
            stem: "Paciente com sepse de foco pulmonar…",
            options: [],
            knowledge_nodes: [
              { is_primary: true, node_path: ["CM"], path_label: "Clínica Médica" },
            ],
            source: { institution: "USP-SP", year: 2024 },
            attempt_stats: null,
          },
        ]),
      });
    });

    await page.goto("/banco/guardadas");
    const praticar = page.getByRole("button", { name: /^Praticar/ });
    await expect(praticar).toBeVisible({ timeout: 10_000 });
    await praticar.click();
    await expect.poll(() => criacao, { timeout: 10_000 }).not.toBeNull();
    expect(criacao).not.toBeNull();
    expect((criacao as unknown as Record<string, unknown>).feedback_timing).toBe("immediate");
  });

  test("a manchete do Hoje nunca é uma tag vazia", async ({ page }) => {
    // `manchetteDoDia` devolve `null` de propósito quando não há número nenhum
    // — "degradar em vez de mentir". Mas o JSX desenhava o `<h1>` na mesma:
    // título sem conteúdo para o leitor de tela, e uma linha de altura
    // reservada para nada.
    await mockarBanco(page);
    const hoje = await mockStudentTodayApi(page);
    // ⚠️ Depois do mock partilhado, para vencer: a agenda dele traz blocos com
    // `expected_questions`, e a manchete só devolve `null` quando NÃO há
    // questão nem minuto nenhum. É esse o caso que desenhava a tag vazia.
    await page.route("**/api/student/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      const json = (body: unknown) =>
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
      if (path === "/api/student/today") {
        return json({
          ...studentTodayPayload(hoje),
          today_load: { estimated_minutes: 0 },
        });
      }
      if (path === "/api/student/agenda") {
        const agenda = studentAgendaPayload(hoje) as Record<string, unknown>;
        return json({ ...agenda, overdue: [], days: [] });
      }
      return route.fallback();
    });

    await page.goto("/hoje");
    const h1 = page.locator("main h1").first();
    await expect(h1).toBeVisible();
    await expect(h1).not.toHaveText("");
  });

  test("o Banco abre na decisão, não num formulário", async ({ page }) => {
    // ⚠️ A MEDIDA QUE MOTIVOU A MUDANÇA. A 390px o botão "Começar" ficava
    // ~2.000px abaixo do topo: a tela cuja função é pôr o médico a responder
    // abria pedindo que ele configurasse — chips de área, busca, e uma caixa de
    // árvore de 512px que era a dobra inteira.
    //
    // Divulgação progressiva (NN/g): as opções secundárias recolhem, a decisão
    // sobe. O que este teste prende é a POSIÇÃO, que é o que regride.
    await mockarBanco(page);
    await page.goto("/banco");

    const comecar = page.getByRole("button", { name: /^Começar/ });
    await expect(comecar).toBeVisible({ timeout: 10_000 });
    const caixa = await comecar.boundingBox();
    expect(caixa).not.toBeNull();
    if (!caixa) return;
    // Acima da dobra útil: 844 menos a barra de abas e uma folga de leitura.
    expect(caixa.y).toBeLessThan(700);

    // E os três passos continuam alcançáveis, recolhidos.
    for (const passo of ["1. Foco clínico", "2. Refinar seleção", "3. Modo e carga"]) {
      await expect(page.getByText(passo, { exact: true })).toBeVisible();
    }

    // Nenhuma rolagem lateral — a caixa da árvore deixou de ser um scroller
    // aninhado dentro do scroller da página.
    const estouro = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(estouro).toBeLessThanOrEqual(1);
  });

  test("com os Cards LIGADOS, toda tela de aluno tem a aba deles", async ({ page }) => {
    // 🚨 ESTE TESTE AFIRMAVA O CONTRÁRIO, e a inversão é a decisão do operador
    // ("ligar as duas agora", 2026-09-10). Ele chamava-se "com os Cards
    // desligados, nenhuma tela de aluno leva a eles" e contava ZERO links.
    //
    // ⚠️ A LIÇÃO DELE SOBREVIVE, e é por isso que ele não foi apagado. A
    // primeira versão NÃO MEDIA NADA: contava `a[href^="/cards"]`, mas os cinco
    // destinos que o comentário nomeava eram `router.push("/cards")` em
    // `<button>` — que não produzem href nenhum no DOM. A asserção já estava
    // satisfeita antes da correção que ela dizia proteger.
    //
    // Invertida, ela deixa de ser vulnerável a esse defeito por construção:
    // `toHaveCount(0)` passa por vacuidade quando o seletor está errado;
    // `toBeVisible()` sobre um elemento que tem de existir, não.
    await mockarBanco(page);
    for (const rota of ["/inicio", "/banco", "/evolucao", "/mais"]) {
      await page.goto(rota);
      // A aba, em qualquer uma das duas superfícies (barra inferior no mobile,
      // sidebar no desktop).
      await expect(page.locator('[data-nav-item-href="/cards"]').first()).toBeVisible();
    }
  });
});
