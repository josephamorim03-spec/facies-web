import { expect, test, type Page } from "@playwright/test";

import { addHttpOnlySession } from "./support/authCookies";
import { forceDesktopNavigation } from "./support/desktopNav";

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    session_id: "sess-base",
    status: "active",
    mode: "by_topic",
    resolution_mode: "training",
    scoring_mode: "immediate",
    study_kind: "topic",
    full_exam_name: null,
    full_exam_year: null,
    full_exam_type: null,
    review_trail_enabled: true,
    primary_knowledge_node_id: null,
    area: "GO",
    theme: "Placenta prévia",
    subtheme: null,
    adaptive_weight: 3,
    adaptive_weight_score: 0.5,
    adaptive_weight_factors: {},
    performed_at: "2026-07-01T10:00:00+00:00",
    filters: {},
    total_questions: 10,
    answered_count: 4,
    unanswered_count: 6,
    unanswered_question_numbers: [5, 6, 7, 8, 9, 10],
    doubtful_count: 0,
    answered_time_ms: 300000,
    items: [],
    created_at: "2026-07-01T10:00:00+00:00",
    updated_at: "2026-07-01T10:20:00+00:00",
    results_revealed_at: null,
    finalized_at: null,
    directed_study_id: null,
    review_task_id: null,
    reported_problem_count: 0,
    excluded_from_scoring_count: 0,
    scorable_question_count: 10,
    ...overrides,
  };
}

const SESSIONS = [
  makeSession({ session_id: "sess-active-training" }),
  makeSession({
    session_id: "sess-finalized-simulation",
    status: "finalized",
    resolution_mode: "simulation",
    study_kind: "full_exam",
    theme: null,
    full_exam_name: "ENARE",
    full_exam_year: 2025,
    area: "CM",
    answered_count: 10,
    unanswered_count: 0,
    unanswered_question_numbers: [],
    answered_time_ms: 5400000,
    items: Array.from({ length: 10 }, (_, index) => ({ is_correct: index < 7 })),
    finalized_at: "2026-06-30T12:00:00+00:00",
  }),
  makeSession({
    session_id: "sess-simulation-revealed",
    resolution_mode: "simulation",
    theme: "Simulado de cirurgia",
    area: "CG",
    answered_count: 10,
    unanswered_count: 0,
    unanswered_question_numbers: [],
    answered_time_ms: 0,
    results_revealed_at: "2026-07-01T11:00:00+00:00",
  }),
  makeSession({
    session_id: "sess-invalidated",
    status: "invalidated",
    theme: "Sessão anulada",
    answered_time_ms: 0,
  }),
];

async function mockSessionsApi(page: Page) {
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const method = request.method();
    const path = new URL(request.url()).pathname;

    const json = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });

    if (method === "GET" && path === "/api/profile") {
      return json({
        user_id: "user_sessions_e2e",
        weekly_goal_questions: 300,
        timezone: "America/Sao_Paulo",
        reschedule_mode: "suggest",
        shift_12h_capacity: 40,
        shift_24h_capacity: 20,
        display_name: "E2E User",
        access_status: "active",
        has_completed_initial_goal_setup: true,
      });
    }

    if (method === "GET" && path === "/api/me") {
      return json({ user_id: "user_sessions_e2e", display_name: "E2E User" });
    }

    if (method === "GET" && path === "/api/question-bank/sessions") {
      return json(SESSIONS);
    }

    if (method === "GET" && path === "/api/question-bank/diagnosis/longitudinal") {
      return json({
        trap_sensitivity: 0.2,
        overconfidence_score: 0.1,
        impulsive_rate: 0.3,
        weak_node_ids: [],
        at_risk_node_ids: [],
        nodes: [],
      });
    }

    if (method === "GET" && path === "/api/studies/performance-summary") {
      return json({ area_summaries: [], diagnosis: { ready: false, weaknesses: [] } });
    }

    if (method === "GET" && path === "/api/reviews/tasks") {
      return json([]);
    }

    return json({});
  });
}

test.describe("Histórico de sessões (/revisoes)", () => {
  test.beforeEach(async ({ context, page }) => {
    await forceDesktopNavigation(page);
    await addHttpOnlySession(context);
    await mockSessionsApi(page);
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  test("aba padrão mostra só inacabadas com CTAs corretos", async ({ page }) => {
    await page.goto("/revisoes");

    await expect(page.getByRole("heading", { name: "Histórico", exact: true })).toBeVisible();
    await expect(page.locator("[data-sessions-tab='inacabadas']")).toHaveAttribute("aria-selected", "true");

    const rows = page.locator("[data-session-id]");
    await expect(rows).toHaveCount(2);
    await expect(page.locator("[data-session-id='sess-active-training'] [data-session-cta='Continuar']")).toBeVisible();
    await expect(
      page.locator("[data-session-id='sess-simulation-revealed'] [data-session-cta='Concluir revisão']"),
    ).toBeVisible();

    // Contagens vivem nos filtros (segmentado), não em cards de métrica.
    await expect(page.locator("[data-sessions-tab='inacabadas']")).toContainText("2");
    await expect(page.locator("[data-sessions-tab='resultados']")).toContainText("1");
    await expect(page.locator("[data-sessions-tab='provas']")).toContainText("2");
  });

  test("aba Resultados filtra e atualiza a URL", async ({ page }) => {
    await page.goto("/revisoes");
    await page.locator("[data-sessions-tab='resultados']").click();

    await expect(page).toHaveURL(/tipo=resultados/);
    const rows = page.locator("[data-session-id]");
    await expect(rows).toHaveCount(1);
    const row = page.locator("[data-session-id='sess-finalized-simulation']");
    await expect(row.locator("[data-session-cta='Ver resultado']")).toBeVisible();
    await expect(row).toContainText("ENARE · 2025");
    await expect(row).toContainText("1:30:00"); // answered_time_ms somado
    await expect(row).toHaveAttribute("href", "/banco-de-questoes/sessao/sess-finalized-simulation");
  });

  test("deep-link ?tipo=provas pré-seleciona a aba", async ({ page }) => {
    await page.goto("/revisoes?tipo=provas");

    await expect(page.locator("[data-sessions-tab='provas']")).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("[data-session-id]")).toHaveCount(2);
  });

  test("/provas redireciona para o painel com a aba de provas", async ({ page }) => {
    await page.goto("/provas");

    await expect(page).toHaveURL(/\/revisoes\?tipo=provas/);
    await expect(page.locator("[data-sessions-tab='provas']")).toHaveAttribute("aria-selected", "true");
  });

  test("invalidada só aparece em Todas, com selo e sem CTA", async ({ page }) => {
    await page.goto("/revisoes?tipo=todas");

    const rows = page.locator("[data-session-id]");
    await expect(rows).toHaveCount(4);
    const invalidated = page.locator("[data-session-id='sess-invalidated']");
    await expect(invalidated).toContainText("Invalidada");
    await expect(invalidated.locator("[data-session-cta]")).toHaveCount(0);
    await expect(invalidated).not.toHaveAttribute("href", /.+/);
  });
});
