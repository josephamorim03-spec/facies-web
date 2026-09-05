import { expect, test, type Page } from "@playwright/test";

import { addHttpOnlySession } from "./support/authCookies";
import { forceDesktopNavigation } from "./support/desktopNav";

/**
 * A aba "Comparar" do `/mapa` — o artboard `B1`.
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
 * ⚠️ Se o dataset mudar, o número no limiar vira outro valor e esta spec falha.
 * É o comportamento desejado: ela existe para vigiar o FORMATO do número no
 * limiar, e um dataset novo pede uma conferida no par, não um `toContain`
 * frouxo.
 *
 * ⚠️ **E o dataset MUDOU, em 2026-09-05.** O par antigo era SES PE × USP-SP,
 * escolhido por render `+3,4` em cirurgia. Nos dados de hoje ele não rende
 * delta de ÁREA nenhum acima do limiar — o maior é 2,8 — e a tela passou a
 * mostrar só as diferenças de FORMA (`+37`, `−9`), que são inteiras e não
 * exercitam a decimal.
 *
 * O par novo foi escolhido rodando `calcularDeltas` sobre as 138 bancas: dos
 * 39 pares que rendem delta de área positivo com decimal entre 3 e 5, a FAMENE
 * dá `+3,1` em cirurgia geral — o valor mais colado no limiar que existe, que
 * é justamente onde o formato importa.
 */

/** A prova do aluno: SES PE. Contra a FAMENE ela rende `+3,1` em cirurgia geral. */
const MINHA_KEY = "PE-SECRETARIA-ESTADUAL-DE-SAUDE-DO-ESTADO-DE-PERNAMBUCO-SES-PE";
const OUTRA_KEY = "PB-FACULDADE-DE-MEDICINA-NOVA-ESPERANCA-FAMENE";

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
      // ⚠️ COM ITENS, e nao vazio. A aba "A prova e você" tem um estado de
      // saida quando NENHUM assunto tem resposta ("Você ainda não respondeu os
      // assuntos desta prova") -- com a lista vazia, todo teste sobre a grade
      // mediria a tela de estado vazio.
      return json({
        contract_version: "competency-mastery-v1",
        observation_floor: 5,
        attempts_considered: 42,
        items: [
          {
            objective_id: "obj-1",
            label: "Neoplasias do Sistema Digestivo",
            primary_subtheme: "Neoplasias do Sistema Digestivo",
            competency_question_count: 30,
            attempts: 12,
            correct: 6,
            mastery: 0.5,
            uncertainty: 0.1,
            certeza: "medido",
          },
        ],
      });
    }

    // O no da taxonomia que a folha do assunto resolve antes de oferecer a
    // pratica. Sem ele a folha diz "nao ha questoes deste assunto", que e' o
    // outro caminho -- legitimo, e coberto pelo teste do assunto sem acervo.
    if (path === "/api/question-bank/topics") {
      const busca = new URL(route.request().url()).searchParams.get("search") ?? "";
      if (!busca.toLowerCase().includes("neoplasias")) return json([]);
      return json([
        {
          knowledge_node_id: "no-neoplasias",
          parent_knowledge_node_id: null,
          node_code: "QB-CM-NEO-DIGESTIVO",
          node_name: "Neoplasias do Sistema Digestivo",
          node_type: "subtheme",
          node_path: ["Clínica Médica", "Neoplasias do Sistema Digestivo"],
          path_label: "CM > Neoplasias do Sistema Digestivo",
          depth: 2,
          question_count: 37,
          primary_question_count: 30,
          board_count: 5,
        },
      ]);
    }

    return json({});
  });
}

test.describe("Explorar o mapa (/mapa)", () => {
  test.beforeEach(async ({ context, page }) => {
    await addHttpOnlySession(context);
    await mockMapaApi(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/mapa");
    await page.getByRole("button", { name: "A prova e você" }).click();
    await expect(page.getByText("tamanho é incidência · preenchimento é você")).toBeVisible();
  });

  test("a area filtra o mosaico, e a contagem do chip bate com o que fica", async ({ page }) => {
    // ⚠️ A CONTAGEM DO CHIP E' DOS ASSUNTOS MOSTRADOS, e nao do acervo.
    //
    // Os dois numeros existem e sao diferentes: a grade conta a janela recente
    // que a facies publica, o acervo conta o que da' para praticar. Este teste
    // prende o primeiro -- se o chip passar a contar o acervo, ele dira "37"
    // ao lado de uma area que tem uma celula na tela.
    const celulas = page.locator("ul.grid > li");
    const antes = await celulas.count();
    expect(antes).toBeGreaterThan(1);

    const chip = page.getByRole("button", { name: /^Clínica Médica/ });
    await expect(chip).toBeVisible();
    const quantos = Number((await chip.innerText()).match(/(\d+)\s*$/)?.[1] ?? "0");
    expect(quantos).toBeGreaterThan(0);

    await chip.click();
    await expect(celulas).toHaveCount(quantos);

    // "Tudo" devolve a grade inteira -- filtrar nao pode ser um caminho sem volta.
    await page.getByRole("button", { name: "Tudo", exact: true }).click();
    await expect(celulas).toHaveCount(antes);
  });

  test("tocar num assunto abre a folha, e ela pratica com o no exato", async ({ page }) => {
    // O mapa deixava de ser leitura aqui: antes, tocar numa celula abria uma
    // linha de texto e parava. A decisao que o mapa provoca ("entao vou estudar
    // neoplasias") tinha de ser refeita a mao no Banco, com filtro.
    let payload: Record<string, unknown> | null = null;
    await page.route("**/api/question-bank/sessions", async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      payload = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ session_id: "sessao-do-mapa", items: [] }),
      });
    });

    await page.getByRole("button", { name: /^Neoplasias do Sistema Digestivo/ }).click();
    const folha = page.getByRole("dialog", { name: "Neoplasias do Sistema Digestivo" });
    await expect(folha).toBeVisible();

    // ⚠️ O DENOMINADOR E' DITO. "no acervo desta banca", nunca "da prova":
    // confundir os dois ja custou 12.103 questoes a este componente.
    await expect(folha.getByText(/no acervo de/)).toBeVisible();

    await folha.getByRole("button", { name: /^Praticar/ }).click();
    await expect.poll(() => payload).not.toBeNull();
    // Nó exato, e nao busca textual: e' o que separa "questoes de sepse" de
    // "questoes que mencionam sepse".
    expect(payload!.knowledge_node_ids).toEqual(["no-neoplasias"]);
    await expect(page).toHaveURL(/\/banco\/sessao\/sessao-do-mapa$/);
  });

  test("assunto sem acervo diz isso, em vez de oferecer uma sessao vazia", async ({ page }) => {
    // O outro caminho, e ele importa: o assunto aparece no mapa porque a PROVA
    // o cobrou. O acervo pode nao o ter alcancado ainda, e um botao ali abriria
    // uma sessao de zero questoes.
    const outra = page.locator("ul.grid > li button").filter({ hasNotText: "Neoplasias" }).first();
    await outra.click();
    const folha = page.getByRole("dialog");
    await expect(folha).toBeVisible();
    await expect(folha.getByText(/Não há questões deste assunto no acervo/)).toBeVisible();
    await expect(folha.getByRole("button", { name: /^Praticar/ })).toHaveCount(0);
  });
});

test.describe("Comparar duas provas (/mapa)", () => {
  test.beforeEach(async ({ context, page }) => {
    await forceDesktopNavigation(page);
    await addHttpOnlySession(context);
    await mockMapaApi(page);
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  test("o número no limiar aparece com decimal, nunca como o próprio limiar", async ({ page }) => {
    await page.goto("/mapa");
    await page.getByRole("button", { name: "Comparar" }).click();

    const seletor = page.locator("#comparar-com");
    await expect(seletor).toBeEnabled({ timeout: 15_000 });
    await seletor.selectOption(OUTRA_KEY);

    const numeros = page.locator("ul li span.text-warning");
    await expect(numeros.first()).toBeVisible({ timeout: 15_000 });

    const textos = (await numeros.allTextContents()).map((t) => t.trim());

    // O par foi escolhido por render este valor: 3,1 pontos de cirurgia geral.
    expect(textos).toContain("+3,1");

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
    await page.goto("/mapa");
    await page.getByRole("button", { name: "Comparar" }).click();

    const seletor = page.locator("#comparar-com");
    await expect(seletor).toBeEnabled({ timeout: 15_000 });
    await seletor.selectOption(OUTRA_KEY);

    const numeros = page.locator("ul li span.text-warning");
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
              label: "FAMENE",
              board_code: "FAMENE",
              institution_key: OUTRA_KEY,
              exam_name: null,
              exam_date: null,
            },
          ],
        }),
      });
    });

    await page.goto("/mapa");
    await page.getByRole("button", { name: "Comparar" }).click();

    // Sem nenhum clique no seletor: a comparação já está na tela.
    const seletor = page.locator("#comparar-com");
    await expect(seletor).toHaveValue(OUTRA_KEY, { timeout: 15_000 });

    const numeros = page.locator("ul li span.text-warning");
    await expect(numeros.first()).toBeVisible({ timeout: 15_000 });
    expect((await numeros.allTextContents()).map((t) => t.trim())).toContain("+3,1");

    // E a prova do aluno não fica perdida no meio das 138.
    await expect(seletor.locator('optgroup[label="Suas provas"] option')).toHaveCount(1);
  });
});
