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
    onBuild?: (body: Record<string, unknown>) => void;
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
  await page.route("**/api/navigation/route", async (route) => {
    options.onBuild?.(route.request().postDataJSON() as Record<string, unknown>);
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(options.route),
    });
  });
  await page.route("**/api/navigation/*/accept", async (route) => {
    options.onResolve?.("accepted");
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ route_id: "nrt_e2e", status: "accepted" }),
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

    await page.goto("/rota");

    // Os presets vêm da rotina do aluno, não de uma lista fixa.
    await expect(page.getByRole("button", { name: "90 min" })).toBeVisible();
    // E preset é atalho, não a lista das respostas possíveis.
    await expect(page.getByRole("spinbutton", { name: /Outro tempo/i })).toBeVisible();

    // Energia é sempre perguntada; sem check-in, a tela diz que assumiu.
    await expect(page.getByText(/Assumimos normal/i)).toBeVisible();

    await page.getByRole("button", { name: "45 min" }).click();
    await page.getByRole("button", { name: "Normal", exact: true }).click();
    await page.getByRole("button", { name: /Calcular rota/i }).click();

    const routeSection = page.getByRole("region", { name: "Sua rota" });
    await expect(routeSection).toBeVisible();
    await expect(routeSection).toContainText("20 de 45 min");
    await expect(routeSection).toContainText("Praticar Cardiologia");

    // Iniciar É o aceite: é ele que marca a rota como `accepted` e faz a
    // energia declarada contar para a média do dia.
    await routeSection.getByRole("button", { name: /Iniciar rota/i }).click();
    await expect(routeSection).toContainText(/Rota iniciada/i);
    expect(resolved).toEqual(["accepted"]);
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

    await page.goto("/rota");
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

    await page.goto("/rota");
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

    await page.goto("/rota");
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

    await page.goto("/rota");
    await page.getByRole("button", { name: /Calcular rota/i }).click();

    const routeSection = page.getByRole("region", { name: "Sua rota" });
    await expect(routeSection).toBeVisible();
    await expect(routeSection.getByRole("button", { name: /Iniciar rota/i })).toHaveCount(0);
    await expect(routeSection.getByRole("button", { name: /N.o serve agora/i })).toHaveCount(0);
  });

  test("tempo digitado vence o preset e chega ao servidor", async ({ page }) => {
    // O preset sai da rotina — o dia típico do aluno. Hoje ele pode ter 35
    // minutos exatos entre um plantão e outro, e é esse número que precisa
    // chegar em `available_minutes`, não o atalho mais próximo.
    await mockCronogramaApi(page);
    await mockStudentTodayApi(page);
    const bodies: Record<string, unknown>[] = [];
    await mockNavigator(page, {
      route: routePayload({ actions: [practiceAction(20)], availableMinutes: 35 }),
      onBuild: (body) => bodies.push(body),
    });

    await page.goto("/rota");

    await page.getByRole("button", { name: "45 min" }).click();
    await page.getByRole("spinbutton", { name: /Outro tempo/i }).fill("35");
    await page.getByRole("button", { name: /Calcular rota/i }).click();

    expect(bodies).toHaveLength(1);
    expect(bodies[0].available_minutes).toBe(35);
  });

  test("tempo fora da faixa vira aviso, nao 422 do servidor", async ({ page }) => {
    // `NavigationRouteIn` valida 5..480. Deixar o clique sair para o servidor
    // trocaria uma frase legível por um erro cru na tela.
    await mockCronogramaApi(page);
    await mockStudentTodayApi(page);
    const bodies: Record<string, unknown>[] = [];
    await mockNavigator(page, {
      route: routePayload({ actions: [practiceAction(20)] }),
      onBuild: (body) => bodies.push(body),
    });

    await page.goto("/rota");

    const suggested = page.getByRole("button", { name: "45 min" });
    await expect(suggested).toHaveAttribute("aria-pressed", "true");

    const field = page.getByRole("spinbutton", { name: /Outro tempo/i });
    await field.fill("700");
    await expect(page.getByText(/entre 5 e 480 minutos/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Calcular rota/i })).toBeDisabled();
    // E nenhum atalho fica marcado: marcado significaria "é este que vale".
    await expect(suggested).toHaveAttribute("aria-pressed", "false");

    await field.fill("35");
    await expect(page.getByRole("button", { name: /Calcular rota/i })).toBeEnabled();
    expect(bodies).toHaveLength(0);
  });

  test("prompt malformado faz o cartao sumir, nao a pagina cair", async ({ page }) => {
    // Regressao real: `/api/navigation/prompt` devolvendo payload parcial fazia
    // `presets.map` estourar o error boundary e derrubar a pagina inteira. A
    // tela degrada — o cartao some — mas nao cai.
    await mockCronogramaApi(page);
    await mockStudentTodayApi(page);
    await page.route("**/api/navigation/prompt", async (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
      }),
    );

    await page.goto("/rota");

    await expect(page.getByText(/Erro na p.gina do Kros/i)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Calcular rota/i })).toHaveCount(0);
  });
});
