import { expect, test } from "@playwright/test";

import { addHttpOnlySessionForPage } from "./support/authCookies";
import { mockStudentTodayApi } from "./support/studentTodayApiMock";

/**
 * O tamanho do dia aparece SEM ter sido perguntado.
 *
 * Isto é o que substituiu a aba Rota. Ela existia para fazer duas perguntas —
 * quanto tempo você tem, com que energia está — e as duas morreram: o
 * calendário já sabe quantos minutos sobram e as rotas iniciadas já sabem com
 * que energia o aluno de fato estuda. Comportamento observado vale mais que
 * relatado, e custa zero toque.
 *
 * O que estes testes prendem:
 *
 * 1. O número aparece sem formulário nenhum antes dele.
 * 2. Ele vem acompanhado da PROCEDÊNCIA. Número inferido exibido sozinho é
 *    decreto com cara de dado — quem lê não tem como saber se "96 min" saiu do
 *    calendário dele ou de um default do sistema.
 * 3. A evidência abre a um toque e não se impõe: a Home é de densidade baixa e
 *    tem uma decisão só, que é começar.
 * 4. Sem previsão E sem calendário, a linha some. Um dimensionamento que diz
 *    "≈ 45 min" porque não soube prever apresenta a ignorância do sistema como
 *    leitura do dia.
 */

type PromptOverrides = {
  predictedMinutes?: number;
  blockedHours?: number;
  interruptionRisk?: boolean;
  energySource?: "daily_checkin" | "assumed";
  energy?: "low" | "normal" | "high";
};

async function mockNavigationPrompt(page: import("@playwright/test").Page, o: PromptOverrides = {}) {
  const predicted = o.predictedMinutes ?? 96;
  await page.route("**/api/navigation/prompt", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        presets: [20, 45, 60, predicted].filter((n) => n > 0),
        suggested_minutes: predicted > 0 ? predicted : 45,
        suggested_energy: o.energy ?? "normal",
        energy_source: o.energySource ?? "assumed",
        interruption_risk: o.interruptionRisk ?? false,
        interruption_reason: o.interruptionRisk ? "plantao" : null,
        blocked_hours_today: o.blockedHours ?? 0,
        predicted_minutes: predicted,
      }),
    }),
  );
}

test.describe("o dia vem dimensionado", () => {
  test.beforeEach(async ({ page }) => {
    await addHttpOnlySessionForPage(page);
    await mockStudentTodayApi(page);
  });

  test("mostra os minutos e de onde eles vieram, sem perguntar nada", async ({ page }) => {
    await mockNavigationPrompt(page, { predictedMinutes: 96 });
    await page.goto("/hoje");

    const bloco = page.getByLabel("Dimensionamento de hoje");
    await expect(bloco).toBeVisible();
    await expect(bloco).toContainText("96 min disponíveis");
    // A procedência é obrigatória: sem ela o número é decreto.
    await expect(bloco).toContainText("detectado pelo seu calendário");

    // E nada de formulário: os controles que a aba Rota tinha não voltaram por
    // outra porta. Este é o coração da mudança.
    await expect(page.getByRole("slider")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /energia/i })).toHaveCount(0);
    await expect(page.getByText(/quanto tempo voc[êe] tem/i)).toHaveCount(0);
  });

  test("a conta abre a um toque, e fica fechada por padrão", async ({ page }) => {
    await mockNavigationPrompt(page, { predictedMinutes: 96, blockedHours: 3 });
    await page.goto("/hoje");

    const bloco = page.getByLabel("Dimensionamento de hoje");
    const capacidade = bloco.getByText("Capacidade prevista");

    // Fechada: a Home tem uma decisão só, e a evidência não compete com ela.
    await expect(capacidade).toBeHidden();

    await bloco.locator("summary").click();
    await expect(capacidade).toBeVisible();
    await expect(bloco.getByText("Horas bloqueadas")).toBeVisible();
    await expect(bloco).toContainText("3h");
  });

  test("plantão aparece com a evidência colada nele", async ({ page }) => {
    await mockNavigationPrompt(page, {
      predictedMinutes: 60,
      blockedHours: 12,
      interruptionRisk: true,
    });
    await page.goto("/hoje");

    const bloco = page.getByLabel("Dimensionamento de hoje");
    // "Plantão detectado" nunca aparece sozinho: as 12h vêm junto, porque a
    // afirmação sem a conta é exatamente o que o aluno não consegue contestar.
    await expect(bloco).toContainText("plantão detectado");
    await expect(bloco).toContainText("12h bloqueadas");
  });

  test("sem calendário e sem previsão, a linha some", async ({ page }) => {
    await mockNavigationPrompt(page, { predictedMinutes: 0, blockedHours: 0 });
    await page.goto("/hoje");

    // O `suggested_minutes` cai em 45 quando não há previsão. Exibir "≈ 45 min
    // hoje" ali seria apresentar o piso do sistema como leitura do dia.
    await expect(page.getByLabel("Dimensionamento de hoje")).toHaveCount(0);
    await expect(page.getByText("45 min disponíveis")).toHaveCount(0);
  });

  test("a aba Rota não existe mais, e o endereço dela leva ao Hoje", async ({ page }) => {
    await mockNavigationPrompt(page);
    await page.goto("/rota");

    await expect(page).toHaveURL(/\/hoje$/);
    await expect(page.locator("[data-nav-item-href='/rota']")).toHaveCount(0);
  });
});
