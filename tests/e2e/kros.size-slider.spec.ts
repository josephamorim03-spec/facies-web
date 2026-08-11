import { expect, test, type Page } from "@playwright/test";

import { addHttpOnlySessionForPage } from "./support/authCookies";

/**
 * A barra de quantidade do Kros não pode se mexer sozinha.
 *
 * Três correções anteriores falharam porque foram validadas por typecheck, lint
 * e testes de backend — nenhuma abriu a tela. Este spec existe para ser o único
 * gate que olha o comportamento real: prévia mockada, valor observado no DOM, e
 * contagem de requisições.
 *
 * O mock é deliberado. O defeito não depende do conteúdo do banco, e sim de
 * COMO o cliente reage ao `max_available` que chega — controlar essa resposta é
 * o que torna o caso determinístico e reproduzível por outra pessoa.
 */

const PREVIEW_ROUTE = "**/api/question-bank/kros/preview";

function previewBody(overrides: Record<string, unknown> = {}) {
  return {
    kros_mode: "equilibrado",
    requested_limit: 50,
    max_available: 120,
    estimated_minutes: 75,
    min_size: 20,
    max_size: 120,
    size_step: 5,
    size_anchors: [50, 100],
    target_boards: [],
    composition: {
      total: 50,
      by_intervention: [{ key: "questao_nova", label: "questao nova", count: 50 }],
      by_category: [],
      by_area: [{ area: "GO", count: 50 }],
      by_novelty: { new_count: 50, revisited_count: 0 },
      by_difficulty: [],
      by_board: [],
      top_microcompetencies: [],
    },
    ...overrides,
  };
}

/** Requisições de prévia observadas, para provar ausência de laço. */
async function setupKros(page: Page, maxAvailable: number): Promise<number[]> {
  const requestedLimits: number[] = [];

  await addHttpOnlySessionForPage(page);
  await page.route("**/api/question-bank/performance", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ first_attempt_accuracy: 0.5, repeat_attempts: 0 }),
    });
  });
  await page.route(PREVIEW_ROUTE, async (route) => {
    const payload = route.request().postDataJSON() as { limit?: number };
    const limit = Number(payload?.limit ?? 0);
    requestedLimits.push(limit);
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        previewBody({ requested_limit: limit, max_available: maxAvailable }),
      ),
    });
  });

  return requestedLimits;
}

function slider(page: Page) {
  return page.getByRole("slider", { name: "Quantidade de questões" });
}

test("o valor escolhido sobrevive à chegada da prévia", async ({ page }) => {
  const limits = await setupKros(page, 120);
  await page.goto("/kros");

  const bar = slider(page);
  await expect(bar).toBeVisible();

  await bar.fill("80");
  await expect(bar).toHaveValue("80");

  // A prévia chega depois (debounce de 450ms). O valor não pode mudar por isso.
  await page.waitForTimeout(1500);
  await expect(bar).toHaveValue("80");
  expect(limits.at(-1)).toBe(80);
});

test("prévia com teto abaixo do valor atual não move a barra", async ({ page }) => {
  // O caso que quebrou na terceira tentativa: `size` nasce em 50 e o teto chega
  // menor. Com o `max` do input amarrado ao teto, o DOM limitava para 30, o
  // React reafirmava 50, e os dois brigavam a cada render — a barra "mudando
  // sozinha" sem ninguém tocar nela.
  await setupKros(page, 30);
  await page.goto("/kros");

  const bar = slider(page);
  await expect(bar).toBeVisible();

  const inicial = await bar.inputValue();
  await page.waitForTimeout(1500);

  expect(await bar.inputValue()).toBe(inicial);
});

test("teto que muda a cada resposta não move a barra", async ({ page }) => {
  // A combinação que os outros casos NÃO cobrem, e que é a que quebrava de
  // verdade: antes do `f0fb8bf` o servidor devolvia `max_available` em função do
  // tamanho pedido, porque a amostra de candidatos escalava com o pedido. Um
  // mock de teto constante prova que o cliente é estável diante de um servidor
  // estável — foi exatamente essa a validação que me deu confiança errada três
  // vezes seguidas.
  //
  // Aqui o teto muda a cada requisição, como o servidor real fazia. O cliente
  // corrigido não repassa isso para o controle: a barra é a intenção do aluno,
  // e o teto é informação.
  const tetos = [100, 30, 75, 45];
  let i = 0;

  await addHttpOnlySessionForPage(page);
  await page.route("**/api/question-bank/performance", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ first_attempt_accuracy: 0.5, repeat_attempts: 0 }),
    });
  });
  await page.route(PREVIEW_ROUTE, async (route) => {
    const maxAvailable = tetos[i % tetos.length];
    i += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(previewBody({ max_available: maxAvailable })),
    });
  });

  await page.goto("/kros");
  const bar = slider(page);
  await expect(bar).toBeVisible();

  await bar.fill("90");
  await expect(bar).toHaveValue("90");

  // Várias respostas com tetos diferentes chegam. Nenhuma pode mexer na barra.
  await page.waitForTimeout(2500);
  await expect(bar).toHaveValue("90");
});

test("a prévia assenta e nenhuma requisição sai sem interação", async ({ page }) => {
  const limits = await setupKros(page, 120);
  await page.goto("/kros");

  await expect(slider(page)).toBeVisible();
  await page.waitForTimeout(2000);
  const depoisDeAssentar = limits.length;

  // Nada de novo pode sair enquanto ninguém toca na tela. Era o laço original:
  // a resposta realimentava a consulta e as chamadas nunca paravam.
  await page.waitForTimeout(2500);
  expect(limits.length).toBe(depoisDeAssentar);
});
