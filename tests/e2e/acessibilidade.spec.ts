import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { addHttpOnlySessionForPage } from "./support/authCookies";
import { mockCadernoApi } from "./support/cadernoApiMock";
import { mockCronogramaApi } from "./support/cronogramaApiMock";
import {
  mockFinalizedSession,
  mockQuestionSession,
  RUNNER_SESSION_ID,
} from "./support/questionSessionMock";
import { mockStudentTodayApi } from "./support/studentTodayApiMock";

/**
 * Gate automático de WCAG nas telas que o aluno usa todo dia.
 *
 * O gate existia numa tela só (`/hoje`, no desktop). Uma tela não é amostra: os
 * defeitos que a rodada de acessibilidade encontrou — estado "selecionada" que
 * só existia como cor, barra de progresso marcada `aria-hidden`, abas sem estado
 * anunciado — estavam todos FORA dela.
 *
 * Roda no viewport do celular porque é onde o produto é usado e onde alvo de
 * toque e ordem de leitura quebram primeiro. `wcag22aa` inclui as regras novas
 * de tamanho de alvo e foco.
 */
const TAGS = ["wcag2a", "wcag2aa", "wcag22aa"];

async function analyze(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  // A mensagem crua do axe é ilegível num relatório de CI: sem isto a falha diz
  // "expected [] to equal [ …400 linhas de nós DOM ]" e ninguém lê.
  return results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    nodes: violation.nodes.length,
    help: violation.help,
  }));
}

test.describe("Gate de acessibilidade", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("Hoje", async ({ page }) => {
    await addHttpOnlySessionForPage(page);
    await mockCronogramaApi(page);
    await mockStudentTodayApi(page);
    await page.goto("/hoje");
    await expect(page.getByRole("heading", { name: /Bom dia|Boa tarde|Boa noite/ })).toBeVisible();

    expect(await analyze(page)).toEqual([]);
  });

  test("Cronograma", async ({ page }) => {
    await addHttpOnlySessionForPage(page);
    await mockCronogramaApi(page);
    await mockStudentTodayApi(page);
    await page.goto("/cronograma");
    await expect(page.locator("main")).toBeVisible();

    expect(await analyze(page)).toEqual([]);
  });

  test("Caderno de cards", async ({ page }) => {
    await addHttpOnlySessionForPage(page);
    await mockCadernoApi(page);
    await page.goto("/cards/registros");
    await expect(page.locator("main")).toBeVisible();

    expect(await analyze(page)).toEqual([]);
  });

  test("Correcao pos-prova", async ({ page }) => {
    await mockFinalizedSession(page);
    await page.goto(`/banco/sessao/${RUNNER_SESSION_ID}`);
    await page.getByRole("button", { name: /^Erros/ }).click();

    expect(await analyze(page)).toEqual([]);
  });
});

/**
 * O mesmo gate no desktop.
 *
 * Não é o mesmo DOM. A barra da sessão mostra no desktop quatro controles que o
 * celular esconde — o par Aprender/Prova, o cartucho do tipo, o cronômetro e o
 * modo foco —, e o shell troca a barra inferior de abas pela lateral. Rodar só
 * num viewport deixa metade dos elementos sem gate.
 */
test.describe("Gate de acessibilidade no desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("Runner da sessao", async ({ page }) => {
    await mockQuestionSession(page);
    await page.goto(`/banco/sessao/${RUNNER_SESSION_ID}`);
    await expect(page.getByRole("progressbar", { name: /Progresso da sessão/i })).toBeVisible();

    expect(await analyze(page)).toEqual([]);
  });

  test("Correcao pos-prova", async ({ page }) => {
    await mockFinalizedSession(page);
    await page.goto(`/banco/sessao/${RUNNER_SESSION_ID}`);
    await page.getByRole("button", { name: /^Erros/ }).click();

    expect(await analyze(page)).toEqual([]);
  });
});
