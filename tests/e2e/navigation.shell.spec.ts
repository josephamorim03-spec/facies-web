import { expect, test, type Page } from "@playwright/test";

import { addHttpOnlySession } from "./support/authCookies";
import { forceDesktopNavigation } from "./support/desktopNav";

function navSidebar(page: Page) {
  return page.locator("aside").filter({ has: page.locator("[data-nav-surface='sidebar']") });
}

async function mockShellApi(page: Page) {
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
        user_id: "user_nav_e2e",
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
      return json({ user_id: "user_nav_e2e", display_name: "E2E User" });
    }

    if (method === "GET" && path === "/api/trainer/prescription/today") {
      return json({
        recommendation_id: "rec_nav_e2e",
        generated_at: new Date().toISOString(),
        policy_version: "test",
        primary_action: {
          kind: "question_block",
          title: "Treino leve",
          rationale: "Mock do shell de navegação.",
          priority_score: 1,
          estimated_minutes: 5,
          why_factors: [],
          outcome_targets: [],
          signals: [],
          start_payload: null,
          href: "/banco-de-questoes",
        },
        secondary_actions: [],
        state_summary: { headline: "Tudo em dia", detail: null },
        signals: [],
        closed_loop: { measure: [], next_check: [], recalibration_hint: [] },
        daily_load: {
          prescribed_minutes: 5,
          cognitive_load: "low",
          pending_reviews: 0,
          recommended_limit_minutes: 5,
          overload_alert: false,
        },
        missing_sources: [],
      });
    }

    if (method === "GET" && path === "/api/notes/operational/streak") {
      return json({
        streak_days: 0,
        streak_max: 0,
        streak_at_risk: false,
        streak_reviews: 0,
        streak_flashcards_seen: 0,
        weekly_study_days: 0,
        active_protection: false,
        protection_window_end: null,
      });
    }

    if (method === "GET" && path === "/api/notes/operational/turbo/overview") {
      return json({
        due_count: 0,
        new_count: 0,
        overdue_count: 0,
        total_eligible: 0,
        suggested_target_cards: 0,
        estimated_minutes: 0,
        reason_counts: [],
        by_area: [],
        priority_preview: [],
      });
    }

    if (method === "GET" && path === "/api/notes/operational/turbo/area-stats") {
      return json({
        total_notes: 0,
        total_reviews: 0,
        total_correct: 0,
        total_incorrect: 0,
        by_area: [],
      });
    }

    if (method === "GET" && path === "/api/notes/operational/turbo/session/daily-completed-cards") {
      return json({ timezone: "America/Sao_Paulo", by_day: [] });
    }

    if (method === "GET" && path === "/api/studies/performance-summary") {
      return json({ area_summaries: [], diagnosis: { ready: false, weaknesses: [] } });
    }

    if (method === "GET" && path === "/api/question-bank/sessions") {
      return json([]);
    }

    if (method === "GET" && path === "/api/question-bank/diagnosis/longitudinal") {
      return json({
        trap_sensitivity: 0,
        overconfidence_score: 0,
        impulsive_rate: 0,
        weak_node_ids: [],
        at_risk_node_ids: [],
        nodes: [],
      });
    }

    if (method === "GET" && path === "/api/reviews/agenda") {
      return json({
        tasks: [],
        due_question_total: 0,
        struggling_question_total: 0,
        question_review_total: 0,
        generated_at: new Date().toISOString(),
      });
    }

    if (method === "GET" && path === "/api/schedule/generate") {
      return json({
        mode: "NORMAL",
        date: "2026-07-06",
        focus_minutes: 0,
        buffer_minutes: 0,
        total_planned_minutes: 0,
        recovery_mode: false,
        rebalance_required: false,
        reason: null,
        blocks: [],
      });
    }

    if (
      method === "GET" &&
      [
        "/api/events",
        "/api/notes/operational",
        "/api/reviews/tasks",
        "/api/schedule/suggestions",
        "/api/schedule/workload",
        "/api/studies/directed",
      ].includes(path)
    ) {
      return json([]);
    }

    return json({});
  });
}

test.describe("Navigation shell", () => {
  test.beforeEach(async ({ context, page }) => {
    await forceDesktopNavigation(page);
    await addHttpOnlySession(context);
    await mockShellApi(page);
  });

  test("renders sidebar with consistent layout (visual regression)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/hoje");

    const sidebar = navSidebar(page);
    await expect(sidebar).toBeVisible();
    await expect(page.locator("[data-nav-surface='sidebar']").first()).toBeVisible();
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot("sidebar-layout.png", {
      maxDiffPixels: 100,
      animations: "disabled",
    });
  });

  const desktopCases = [
    { path: "/hoje", activeHref: "/hoje" },
    { path: "/calendario", activeHref: "/planejar" },
    { path: "/caderno", activeHref: "/revisar" },
    { path: "/revisoes", activeHref: "/acompanhar" },
    { path: "/dados-e-relatorios/graficos", activeHref: "/acompanhar" },
    { path: "/estatisticas/relatorio", activeHref: "/acompanhar" },
    { path: "/desempenho", activeHref: "/planejar" },
  ];

  for (const { path, activeHref } of desktopCases) {
    test(`keeps sidebar active for ${path}`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(path);

      const sidebar = navSidebar(page);
      await expect(sidebar).toBeVisible();

      const activeItems = sidebar.locator("[data-nav-surface='sidebar'][data-nav-active='true']");
      await expect(activeItems).toHaveCount(1);
      await expect(activeItems).toHaveAttribute("data-nav-item-href", activeHref);
      await expect(activeItems).toHaveAttribute("aria-current", "page");
    });
  }

  for (const legacyPath of ["/semana", "/today"]) {
    test(`redirects ${legacyPath} to /hoje`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(legacyPath);
      await expect(page).toHaveURL(/\/hoje$/);

      const sidebar = navSidebar(page);
      await expect(sidebar).toBeVisible();
      const activeItems = sidebar.locator("[data-nav-surface='sidebar'][data-nav-active='true']");
      await expect(activeItems).toHaveCount(1);
      await expect(activeItems).toHaveAttribute("data-nav-item-href", "/hoje");
    });
  }

  test("keeps long sidebar labels inside their container", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/hoje");
    await navSidebar(page).hover();

    const acompanharItem = page.locator("aside [data-nav-item-href='/acompanhar']");
    const acompanharLabel = acompanharItem.locator("span");
    await expect(acompanharItem).toBeVisible();
    await expect(acompanharLabel).toHaveText("Acompanhar");

    const [itemBox, labelBox] = await Promise.all([acompanharItem.boundingBox(), acompanharLabel.boundingBox()]);
    expect(itemBox).not.toBeNull();
    expect(labelBox).not.toBeNull();
    if (!itemBox || !labelBox) return;

    expect(labelBox.x).toBeGreaterThanOrEqual(itemBox.x);
    expect(labelBox.x + labelBox.width).toBeLessThanOrEqual(itemBox.x + itemBox.width + 1);
  });

  test("removes Cronograma and Caderno from desktop sidebar", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/hoje");

    const sidebar = navSidebar(page);
    await expect(sidebar).toBeVisible();
    await expect(sidebar.locator("[data-nav-item-href='/cronograma']")).toHaveCount(0);
    await expect(sidebar.locator("[data-nav-item-href='/caderno']")).toHaveCount(0);
  });

  test("shows reciprocal top-right links on desktop child pages", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });

    await page.goto("/caderno");
    await expect(page.getByRole("link", { name: "Cards" })).toHaveAttribute("href", "/cards-adaptativos");

    await page.goto("/calendario");
    await expect(page.getByRole("link", { name: "Hoje" }).first()).toHaveAttribute("href", "/hoje");

    await page.goto("/estatisticas/relatorio");
    await expect(page.getByRole("link", { name: "Desempenho" })).toHaveAttribute("href", "/estatisticas");
  });
});

test.describe("Navigation shell mobile drawer", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test.beforeEach(async ({ context, page }) => {
    await addHttpOnlySession(context);
    await mockShellApi(page);
  });

  test("keeps grouped mobile drawer item active", async ({ page }) => {
    await page.goto("/desempenho");
    await page.getByLabel("Menu").click();

    const activeItems = page.locator("[data-nav-surface='drawer'][data-nav-active='true']");
    await expect(activeItems).toHaveCount(1);
    await expect(activeItems).toHaveAttribute("data-nav-item-href", "/planejar");
    await expect(activeItems).toHaveAttribute("aria-current", "page");
  });

  test("removes Cronograma and Caderno from mobile drawer", async ({ page }) => {
    await page.goto("/hoje");
    await page.getByLabel("Menu").click();

    await expect(page.locator("[data-nav-surface='drawer'][data-nav-item-href='/cronograma']")).toHaveCount(0);
    await expect(page.locator("[data-nav-surface='drawer'][data-nav-item-href='/caderno']")).toHaveCount(0);
  });

  test("keeps reciprocal top-right links on mobile pairs", async ({ page }) => {
    await page.goto("/hoje");
    await expect(page.getByRole("link", { name: "Calendário" })).toHaveAttribute("href", "/calendario");

    await page.goto("/calendario");
    await expect(page.getByRole("link", { name: "Hoje" })).toHaveAttribute("href", "/hoje");

    await page.goto("/caderno");
    await expect(page.getByRole("link", { name: "Cards" })).toHaveAttribute("href", "/cards-adaptativos");

    await page.goto("/estatisticas");
    await expect(page.getByRole("link", { name: "Relatórios" })).toHaveAttribute("href", "/estatisticas/relatorio");

    await page.goto("/estatisticas/relatorio");
    await expect(page.getByRole("link", { name: "Desempenho" })).toHaveAttribute("href", "/estatisticas");
  });
});
