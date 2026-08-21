import { expect, test, type Page } from "@playwright/test";

import { addHttpOnlySessionForPage } from "./support/authCookies";

/**
 * O tamanho da sessão do Kros não pode se mexer sozinho.
 *
 * Este spec substitui `kros.size-slider.spec.ts`. A barra livre virou faixa
 * (`RotaSizeBand`) e o componente antigo ficou sem nenhum importador — os quatro
 * testes procuravam `role="slider"` numa tela que só tem botões, e estavam
 * vermelhos desde a troca.
 *
 * Dos quatro, dois sobreviveram com sentido. Os outros dois guardavam uma briga
 * específica de `<input type=range>`: o `max` do DOM amarrado ao teto limitava o
 * valor, o React reafirmava o anterior, e o controle oscilava a cada render. Com
 * botões isso é estruturalmente impossível — posição fora do acervo aparece
 * desabilitada e não tem valor para clampear.
 *
 * O que continua valendo, e por isso continua testado:
 *
 * 1. **A escolha do aluno vence a prévia.** `selectedSize = size ?? suggested`:
 *    depois do primeiro toque o servidor informa, não decide.
 * 2. **A prévia assenta.** Era um laço: a resposta realimentava a consulta e as
 *    chamadas nunca paravam. Esse defeito é do `useKrosPreview`, que segue vivo.
 */

const PREVIEW_ROUTE = "**/api/question-bank/kros/preview";

function previewBody(overrides: Record<string, unknown> = {}) {
  return {
    kros_mode: "equilibrado",
    requested_limit: 30,
    max_available: 120,
    estimated_minutes: 45,
    min_size: 20,
    max_size: 120,
    size_step: 5,
    size_anchors: [50, 100],
    suggested_size: 30,
    size_band: [20, 25, 30, 35, 40],
    target_boards: [],
    unsatisfied_target_boards: [],
    composition: {
      total: 30,
      by_intervention: [{ key: "questao_nova", label: "questao nova", count: 30 }],
      by_category: [],
      by_area: [{ area: "GO", count: 30 }],
      by_novelty: { new_count: 30, revisited_count: 0 },
      by_difficulty: [],
      by_board: [],
      top_microcompetencies: [],
    },
    ...overrides,
  };
}

/** Limites pedidos ao servidor, para provar ausência de laço. */
async function setupKros(page: Page, maxAvailable: number): Promise<number[]> {
  const requestedLimits: number[] = [];

  await addHttpOnlySessionForPage(page);
  await page.route("**/api/question-bank/performance", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ first_attempt_accuracy: 0.5, repeat_attempts: 0 }),
    });
  });
  await page.route("**/api/navigation/prompt", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        presets: [20, 45, 90],
        suggested_minutes: 45,
        suggested_energy: "normal",
        energy_source: "assumed",
        interruption_risk: false,
        interruption_reason: null,
      }),
    });
  });
  await page.route("**/api/navigation/route", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        route_id: "nrt_band",
        actions: [],
        total_minutes: 0,
        available_minutes: 45,
        energy: "normal",
        interruption_risk: false,
        policy_version: "navigation-1-budgeted-greedy",
        reason_codes: ["NO_CANDIDATES"],
      }),
    });
  });
  await page.route(PREVIEW_ROUTE, async (route) => {
    const payload = route.request().postDataJSON() as { limit?: number };
    requestedLimits.push(Number(payload?.limit ?? 0));
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(previewBody({ max_available: maxAvailable })),
    });
  });

  return requestedLimits;
}

/** A faixa mora no terceiro passo: perguntar, montar a rota, pedir questões. */
async function abrirFaixa(page: Page) {
  await page.goto("/rota");
  await page.getByRole("button", { name: /Calcular rota/i }).click();
  await page.getByRole("button", { name: /Fazer questões/i }).click();
  await expect(page.getByRole("group", { name: "Tamanho da sessão" })).toBeVisible();
}

test("a posicao escolhida sobrevive a chegada da previa", async ({ page }) => {
  const limits = await setupKros(page, 120);
  await abrirFaixa(page);

  const faixa = page.getByRole("group", { name: "Tamanho da sessão" });
  const escolhida = faixa.getByRole("button", { name: /^40/ });
  await escolhida.click();
  await expect(escolhida).toHaveAttribute("aria-pressed", "true");

  // A prévia chega depois (debounce de 450ms). Ela informa; não decide.
  await page.waitForTimeout(1500);
  await expect(escolhida).toHaveAttribute("aria-pressed", "true");
  expect(limits.at(-1)).toBe(40);
});

test("teto abaixo do escolhido desabilita a posicao, mas nao troca a escolha", async ({ page }) => {
  // Com barra, teto menor que o valor gerava a briga DOM-versus-React. Com
  // faixa, o acervo insuficiente é dito na própria posição — e a escolha do
  // aluno continua onde ele deixou.
  await setupKros(page, 22);
  await abrirFaixa(page);

  const faixa = page.getByRole("group", { name: "Tamanho da sessão" });
  const antes = await faixa.getByRole("button", { name: /^30/ }).getAttribute("aria-pressed");

  await page.waitForTimeout(1500);

  await expect(faixa.getByRole("button", { name: /Sem acervo/ }).first()).toBeDisabled();
  expect(await faixa.getByRole("button", { name: /^30/ }).getAttribute("aria-pressed")).toBe(antes);
});

test("a previa assenta e nenhuma requisicao sai sem interacao", async ({ page }) => {
  const limits = await setupKros(page, 120);
  await abrirFaixa(page);

  await page.waitForTimeout(2000);
  const depoisDeAssentar = limits.length;

  // Era o laço original: a resposta realimentava a consulta e as chamadas nunca
  // paravam. Ninguém toca na tela aqui — nada novo pode sair.
  await page.waitForTimeout(2500);
  expect(limits.length).toBe(depoisDeAssentar);
});
