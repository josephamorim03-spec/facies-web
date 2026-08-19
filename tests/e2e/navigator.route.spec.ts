import { expect, test } from "@playwright/test";

import { addHttpOnlySessionForPage } from "./support/authCookies";
import { mockCronogramaApi } from "./support/cronogramaApiMock";
import { mockStudentTodayApi } from "./support/studentTodayApiMock";

/**
 * O Waze do Kros, ponta a ponta: o aluno diz quanto tempo tem e como está
 * agora, recebe uma rota, e o desfecho volta para o servidor.
 *
 * O último passo é o que este teste existe para provar. Sem o desfecho chegando,
 * o kill criterion do Navigator ("a rota montada faz o aluno terminar mais que a
 * lista ordenada?") não tem dado, e o critério escrito em `navigation_route.py`
 * vira disciplina de fachada.
 */

type RouteAction = {
  action: Record<string, unknown>;
  estimated_minutes: number;
  cognitive_load: string;
  reason_codes: string[];
};

function routePayload(options: {
  routeId?: string | null;
  actions?: RouteAction[];
  availableMinutes?: number;
  reasonCodes?: string[];
}) {
  const actions = options.actions ?? [];
  return {
    route_id: options.routeId === undefined ? "nrt_e2e" : options.routeId,
    actions,
    total_minutes: actions.reduce((sum, item) => sum + item.estimated_minutes, 0),
    available_minutes: options.availableMinutes ?? 45,
    energy: "normal",
    interruption_risk: false,
    policy_version: "navigation-1-budgeted-greedy",
    reason_codes: options.reasonCodes ?? [],
  };
}

function practiceAction(minutes: number): RouteAction {
  return {
    action: {
      kind: "targeted_practice",
      action_id: "act_practice_e2e",
      title: "Praticar Cardiologia",
      rationale: "Bloco adaptativo curto.",
      priority_score: 0.6,
      estimated_minutes: minutes,
      why_factors: [],
      outcome_targets: [],
      signals: [],
      required_capabilities: [],
    },
    estimated_minutes: minutes,
    cognitive_load: "high",
    reason_codes: [],
  };
}

/** Instala o Navigator por cima do mock geral: no Playwright, a rota registrada
 *  por último tem precedência, e o mock geral responde `{}` ao que não conhece. */
async function mockNavigator(
  page: import("@playwright/test").Page,
  options: {
    route: ReturnType<typeof routePayload>;
    onResolve?: (status: string) => void;
  },
) {
  await page.route("**/api/navigation/prompt", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        presets: [20, 45, 90],
        suggested_minutes: 45,
        suggested_energy: "normal",
        energy_source: "assumed",
        interruption_risk: false,
        interruption_reason: null,
      }),
    }),
  );
  await page.route("**/api/navigation/route", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(options.route),
    }),
  );
  await page.route("**/api/navigation/*/complete", async (route) => {
    options.onResolve?.("completed");
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ route_id: "nrt_e2e", status: "completed" }),
    });
  });
  await page.route("**/api/navigation/*/reject", async (route) => {
    options.onResolve?.("rejected");
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ route_id: "nrt_e2e", status: "rejected" }),
    });
  });
}

test.describe("Navigator", () => {
  test.beforeEach(async ({ page }) => {
    await addHttpOnlySessionForPage(page);
  });

  test("pergunta tempo e energia, monta a rota e devolve o desfecho", async ({ page }) => {
    await mockCronogramaApi(page);
    await mockStudentTodayApi(page);
    const resolved: string[] = [];
    await mockNavigator(page, {
      route: routePayload({ actions: [practiceAction(20)] }),
      onResolve: (status) => resolved.push(status),
    });

    await page.goto("/hoje");

    // Os presets vêm da rotina do aluno, não de uma lista fixa.
    await expect(page.getByRole("button", { name: "90 min" })).toBeVisible();

    // Energia é sempre perguntada; sem check-in, a tela diz que assumiu.
    await expect(page.getByText(/Assumimos normal/i)).toBeVisible();

    await page.getByRole("button", { name: "45 min" }).click();
    await page.getByRole("button", { name: "Normal", exact: true }).click();
    await page.getByRole("button", { name: /Calcular rota/i }).click();

    const routeSection = page.getByRole("region", { name: "Sua rota" });
    await expect(routeSection).toBeVisible();
    await expect(routeSection).toContainText("20 de 45 min");
    await expect(routeSection).toContainText("Praticar Cardiologia");

    await routeSection.getByRole("button", { name: /Concluir rota/i }).click();
    await expect(routeSection).toContainText(/Rota conclu/i);
    expect(resolved).toEqual(["completed"]);
  });

  test("recusar a rota tambem chega ao servidor", async ({ page }) => {
    // Recusa é o sinal mais direto de que o montador está errando; se ela não
    // chegar, metade do kill criterion desaparece.
    await mockCronogramaApi(page);
    await mockStudentTodayApi(page);
    const resolved: string[] = [];
    await mockNavigator(page, {
      route: routePayload({ actions: [practiceAction(20)] }),
      onResolve: (status) => resolved.push(status),
    });

    await page.goto("/hoje");
    await page.getByRole("button", { name: /Calcular rota/i }).click();

    const routeSection = page.getByRole("region", { name: "Sua rota" });
    await routeSection.getByRole("button", { name: /N.o serve agora/i }).click();

    await expect(routeSection).toContainText(/Anotado/i);
    expect(resolved).toEqual(["rejected"]);
  });

  test("rota vazia por falta de atividade nao culpa o tempo do aluno", async ({ page }) => {
    await mockCronogramaApi(page);
    await mockStudentTodayApi(page);
    await mockNavigator(page, {
      route: routePayload({ actions: [], reasonCodes: ["NO_CANDIDATES"] }),
    });

    await page.goto("/hoje");
    await page.getByRole("button", { name: /Calcular rota/i }).click();

    const empty = page.getByRole("region", { name: "Rota" });
    await expect(empty).toContainText(/em dia/i);
    await expect(empty).not.toContainText(/cabe nesse tempo/i);
  });

  test("banco fora do ar e' apresentado como falha nossa", async ({ page }) => {
    await mockCronogramaApi(page);
    await mockStudentTodayApi(page);
    await mockNavigator(page, {
      route: routePayload({
        actions: [],
        reasonCodes: ["CANDIDATES_UNAVAILABLE", "NO_CANDIDATES"],
      }),
    });

    await page.goto("/hoje");
    await page.getByRole("button", { name: /Calcular rota/i }).click();

    const empty = page.getByRole("region", { name: "Rota" });
    await expect(empty).toContainText(/N.o conseguimos montar sua rota/i);
  });

  test("rota nao gravada nao oferece desfecho", async ({ page }) => {
    // `route_id` nulo significa que a gravação falhou: o aluno estuda, mas não
    // há o que registrar. Oferecer o botão prometeria algo que não acontece.
    await mockCronogramaApi(page);
    await mockStudentTodayApi(page);
    await mockNavigator(page, {
      route: routePayload({ routeId: null, actions: [practiceAction(20)] }),
    });

    await page.goto("/hoje");
    await page.getByRole("button", { name: /Calcular rota/i }).click();

    const routeSection = page.getByRole("region", { name: "Sua rota" });
    await expect(routeSection).toBeVisible();
    await expect(routeSection.getByRole("button", { name: /Concluir rota/i })).toHaveCount(0);
  });

  test("prompt malformado faz o cartao sumir, nao a pagina cair", async ({ page }) => {
    // Regressao real: `/api/navigation/prompt` devolvendo payload parcial fazia
    // `presets.map` estourar o error boundary e o aluno perdia `/hoje` INTEIRA.
    // A tela principal do produto degrada; ela nao cai.
    await mockCronogramaApi(page);
    await mockStudentTodayApi(page);
    await page.route("**/api/navigation/prompt", async (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
      }),
    );

    await page.goto("/hoje");

    await expect(page.getByText(/Erro na p.gina de hoje/i)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Calcular rota/i })).toHaveCount(0);
    // E o resto do dia continua de pe.
    await expect(page.getByRole("region", { name: "Resumo de hoje" })).toBeVisible();
  });
});
