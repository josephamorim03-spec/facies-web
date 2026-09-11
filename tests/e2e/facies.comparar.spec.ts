import { expect, test, type Page } from "@playwright/test";

import { addHttpOnlySession } from "./support/authCookies";
import { forceDesktopNavigation } from "./support/desktopNav";

/**
 * Abre a aba Comparar do `/mapa`.
 *
 * ⚠️ Localiza pelo NOME acessível, e não pela classe: a fileira de abas trocou
 * de primitivo em 2026-09-10 (`BotaoDeEscolha` → `TAB_TRIGGER_CLASS`) e um
 * localizador por classe teria morrido nessa troca sem que nada de aluno
 * mudasse. O que não pode mudar é haver um controlo chamado Comparar.
 */
async function abrirAbaComparar(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Comparar", exact: true }).click();
}

/**
 * A comparação de duas provas no `/mapa` — o artboard `B1`.
 *
 * 🚨 A DOCSTRING AQUI DIZIA O CONTRÁRIO DA TELA, e as três provas estavam
 * partidas por causa disso.
 *
 * Ela afirmava: *"era uma ABA e virou o painel 05 da leitura; o `/mapa` deixou
 * de ter abas, e estas specs chegam por `/mapa#comparar`"*. Medido em
 * 2026-09-10: o `/mapa` tem três abas (`mapa`, `leitura`, `comparar`), `eixo`
 * nasce em `"mapa"` e NADA no ficheiro lê `location.hash`. Ou seja,
 * `/mapa#comparar` abria o mapa, o `#comparar-com` não existia no DOM, e as
 * três provas morriam em `toBeEnabled` — sem nunca chegar ao que medem.
 *
 * Passaram a CLICAR na aba, que é o que o aluno faz. Honrar o hash seria
 * funcionalidade nova, e não é o que estas provas existem para cobrir.
 *
 * ⚠️ Este ficheiro não está em `SPECS_DE_GATE` nem em `SPECS_ADIADOS`, então
 * não corre em lado nenhum — foi por isso que ficou anos-luz da tela sem
 * ninguém notar. Continua fora do gate por depender do backend em `:8000`.
 *
 * ## Por que esta spec existe
 *
 * A conta da comparação tem teste unitário (`tests/unit/comparacao-de-provas`),
 * mas a TELA não tinha nenhum, porque o runner desta base
 * (`node --test --experimental-strip-types`) não compreende JSX. E os dois
 * defeitos que a comparação teve até aqui eram os dois de tela, invisíveis para
 * teste de unidade:
 *
 *   - um delta de 3,4 era desenhado como `+3`, logo acima da legenda que promete
 *     ao aluno "só aparece o que passa de 3 pontos percentuais";
 *   - a coluna de números era estreita demais para a decimal, e as linhas com
 *     `+3,4` empurravam a frase 6,4px para a direita.
 *
 * ## O dado é REAL, e de propósito
 *
 * `/api/facies/**` não é mockado: são rotas do próprio Next servindo o
 * `facies.json` deste repositório, sem backend. Mockar aqui seria testar o mock
 * — e o par abaixo foi escolhido rodando `calcularDeltas` sobre o dataset de
 * verdade, então a asserção vale sobre o número que o aluno veria.
 *
 * ⚠️ Se o dataset mudar, o valor no limiar pode virar outro e esta spec falha. É o
 * comportamento desejado: ela existe para vigiar o formato do número no limiar,
 * e um dataset novo pede uma conferida no par, não um `toContain` frouxo. Já
 * aconteceu uma vez — ver `NO_LIMIAR`.
 */

/**
 * A prova do aluno: SES PE. Contra a AMP-PR ela rende `+3,2` — um valor NO
 * LIMIAR, que é a única coisa que esta spec sabe vigiar.
 *
 * ⚠️ O PAR MUDOU porque o antigo parou de servir. Era SES-PE × USP-SP, escolhido
 * por render `+3,4`; com o dataset de hoje esse par produz `["+37", "−9"]` — nada
 * no limiar, nada com decimal, e a spec falhava sem que nada estivesse quebrado
 * na tela. É exatamente o desfecho que o aviso abaixo previa.
 *
 * O par novo foi achado rodando `calcularDeltas` + `formatarDelta` sobre os
 * 138×137 pares do `facies.json` e ficando com um que tem valor no limiar E pelo
 * menos duas outras linhas — a segunda condição é do teste de alinhamento, que
 * precisa de coluna para alinhar. Ele rende `["+9", "−7", "−6", "+3,2"]`.
 */
const MINHA_KEY = "PE-SECRETARIA-ESTADUAL-DE-SAUDE-DO-ESTADO-DE-PERNAMBUCO-SES-PE";
const OUTRA_KEY = "PR-ASSOCIACAO-MEDICA-DO-PARANA-AMP";
/** O valor no limiar que o par acima produz. Um lugar só, três asserções. */
const NO_LIMIAR = "+3,2";

async function mockMapaApi(page: Page) {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;

    // A fácies é servida pelo próprio Next, do dataset versionado. Deixar passar
    // é o que torna esta spec um teste da comparação, e não do mock.
    if (path.startsWith("/api/facies/")) return route.continue();

    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

    if (path === "/api/profile") {
      return json({
        user_id: "user_mapa_e2e",
        weekly_goal_questions: 300,
        timezone: "America/Sao_Paulo",
        reschedule_mode: "suggest",
        display_name: "E2E User",
        access_status: "active",
        has_completed_initial_goal_setup: true,
        // ⚠️ SEM ISTO A SPEC NEM CHEGA NO /mapa. `resolveBlockingRoute`
        // (`lib/initialGoalSetup.ts:87`) lê `cadastro_completo` DAQUI, do
        // perfil — não do `/cadastro/status`. Ausente é `undefined`, que é
        // falso, e o app manda para `/cadastro/completar` no meio da
        // renderização: a aba "Comparar" chega a existir e some do DOM.
        cadastro_completo: true,
      });
    }
    if (path === "/api/me") return json({ user_id: "user_mapa_e2e", display_name: "E2E User" });

    // ⚠️ SEM ISTO A TELA NEM CARREGA. O app checa a conclusão do cadastro em
    // toda rota logada; um `{}` deixa `aceites_pendentes` indefinido e o
    // formulário de `cadastro/completar` estoura em `.length`, levando a página
    // inteira para o error boundary. É o que hoje derruba as sete specs do
    // smoke — elas não conhecem esta rota.
    if (path === "/api/cadastro/status") {
      return json({ cadastro_completo: true, aceites_pendentes: [] });
    }

    if (path === "/api/objectives/target-exam") {
      return json({
        contract_version: "student-target-exam-v1",
        selection_revision: 1,
        has_target_exam: true,
        items: [
          {
            priority: 1,
            label: "SES PE",
            board_code: "SES-PE",
            institution_key: MINHA_KEY,
            exam_name: null,
            exam_date: null,
          },
        ],
      });
    }

    if (path === "/api/student/competency-mastery") {
      return json({
        contract_version: "competency-mastery-v1",
        observation_floor: 20,
        attempts_considered: 0,
        items: [],
      });
    }

    return json({});
  });
}

test.describe("Comparar duas provas (/mapa)", () => {
  test.beforeEach(async ({ context, page }) => {
    await forceDesktopNavigation(page);
    await addHttpOnlySession(context);
    await mockMapaApi(page);
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  test("o número no limiar aparece com decimal, nunca como o próprio limiar", async ({ page }) => {
    // A comparacao e o painel 05 da leitura, e nao mais uma aba: o `/mapa` ja
    // chega com ela montada. `#comparar` e a ancora que substituiu o botao.
    await page.goto("/mapa");
    await abrirAbaComparar(page);

    const seletor = page.locator("#comparar-com");
    await expect(seletor).toBeEnabled({ timeout: 15_000 });
    await seletor.selectOption(OUTRA_KEY);

    // ⚠️ ESCOPADO AO PAINEL 05. Quando a comparacao era uma aba ela tinha a
    // pagina inteira; hoje divide a leitura com os paineis 01-04, e um
    // `text-warning` solto tambem casava os deltas da media nacional do painel
    // 02 — o array vinha ["+37", "−9"] em vez dos numeros da comparacao.
    const numeros = page.locator("#comparar").locator("ul li span.text-warning");
    await expect(numeros.first()).toBeVisible({ timeout: 15_000 });

    const textos = (await numeros.allTextContents()).map((t) => t.trim());

    // O par foi escolhido por render um valor NO LIMIAR — ver `NO_LIMIAR`.
    expect(textos).toContain(NO_LIMIAR);

    // A REGRA: nada na tela pode ser lido como o limiar. A legenda logo abaixo
    // promete "só aparece o que passa de 3 pontos percentuais", e um "+3" ali
    // desmentiria a frase que o aluno acabou de ler.
    for (const texto of textos) {
      expect(texto).not.toMatch(/^[+\u2212]3$/);
      expect(texto).not.toMatch(/^[+\u2212]3,0$/);
    }

    await expect(page.getByText(/só aparece o que passa de 3 pontos percentuais/i)).toBeVisible();
  });

  test("a coluna de números fica alinhada mesmo com decimal", async ({ page }) => {
    // A comparacao e o painel 05 da leitura, e nao mais uma aba: o `/mapa` ja
    // chega com ela montada. `#comparar` e a ancora que substituiu o botao.
    await page.goto("/mapa");
    await abrirAbaComparar(page);

    const seletor = page.locator("#comparar-com");
    await expect(seletor).toBeEnabled({ timeout: 15_000 });
    await seletor.selectOption(OUTRA_KEY);

    // ⚠️ ESCOPADO AO PAINEL 05. Quando a comparacao era uma aba ela tinha a
    // pagina inteira; hoje divide a leitura com os paineis 01-04, e um
    // `text-warning` solto tambem casava os deltas da media nacional do painel
    // 02 — o array vinha ["+37", "−9"] em vez dos numeros da comparacao.
    const numeros = page.locator("#comparar").locator("ul li span.text-warning");
    await expect(numeros.first()).toBeVisible({ timeout: 15_000 });

    // Cada linha é um flex próprio, então a frase começa onde o número termina:
    // se a decimal estoura a largura mínima, aquela linha desalinha sozinha. A
    // Azeret Mono avança 15,61px por glifo em 24px — `+3,4` ocupa 62,41px, e
    // era exatamente isso que estourava a coluna de 3,5rem (56px).
    const larguras = await numeros.evaluateAll((spans) =>
      spans.map((s) => Math.round(s.getBoundingClientRect().width)),
    );

    expect(larguras.length).toBeGreaterThan(1);
    expect(new Set(larguras).size).toBe(1);
  });

  test("a segunda prova do aluno já vem escolhida, sem ele repetir a escolha", async ({
    page,
  }) => {
    // A regra é do `Webapp - telas`: "Até três provas […] Só a principal monta
    // o dia; as outras duas entram como comparação no mapa e como filtro no
    // banco". Registrada DEPOIS do mock geral, esta rota tem precedência.
    await page.route("**/api/objectives/target-exam", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          contract_version: "student-target-exam-v1",
          selection_revision: 1,
          has_target_exam: true,
          items: [
            {
              priority: 1,
              label: "SES PE",
              board_code: "SES-PE",
              institution_key: MINHA_KEY,
              exam_name: null,
              exam_date: null,
            },
            {
              priority: 2,
              label: "AMP",
              board_code: "AMP",
              institution_key: OUTRA_KEY,
              exam_name: null,
              exam_date: null,
            },
          ],
        }),
      });
    });

    // A comparacao e o painel 05 da leitura, e nao mais uma aba: o `/mapa` ja
    // chega com ela montada. `#comparar` e a ancora que substituiu o botao.
    await page.goto("/mapa");
    await abrirAbaComparar(page);

    // Sem nenhum clique NO SELETOR: aberta a aba, a comparação já vem
    // escolhida. (O clique acima é na aba, não na escolha da prova.)
    const seletor = page.locator("#comparar-com");
    await expect(seletor).toHaveValue(OUTRA_KEY, { timeout: 15_000 });

    // ⚠️ ESCOPADO AO PAINEL 05. Quando a comparacao era uma aba ela tinha a
    // pagina inteira; hoje divide a leitura com os paineis 01-04, e um
    // `text-warning` solto tambem casava os deltas da media nacional do painel
    // 02 — o array vinha ["+37", "−9"] em vez dos numeros da comparacao.
    const numeros = page.locator("#comparar").locator("ul li span.text-warning");
    await expect(numeros.first()).toBeVisible({ timeout: 15_000 });
    expect((await numeros.allTextContents()).map((t) => t.trim())).toContain(NO_LIMIAR);

    // E a prova do aluno não fica perdida no meio das 138.
    await expect(seletor.locator('optgroup[label="Suas provas"] option')).toHaveCount(1);
  });
});
