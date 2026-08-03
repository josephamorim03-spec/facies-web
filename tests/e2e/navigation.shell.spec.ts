import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

import type { StudentToday } from "@/lib/api";
import { addHttpOnlySession } from "./support/authCookies";
import { forceDesktopNavigation } from "./support/desktopNav";

const STUDENT_TODAY_FIXTURE = {
  contract_version: "student-today-v1",
  generated_at: "2026-07-29T12:00:00Z",
  status: "complete",
  primary_action: {
    kind: "targeted_practice",
    title: "Treino leve",
    rationale: "Pratique um bloco curto para manter o ritmo.",
    estimated_minutes: 5,
    href: "/banco-de-questoes",
    cta_label: "Começar",
    source: "navigation-shell-e2e",
    priority_reason: "Manter consistência no estudo.",
    confidence: "high",
    area: "CM",
  },
  backup_actions: [],
  today_load: {
    label: "leve",
    estimated_minutes: 5,
    recommended_limit_minutes: 30,
    overload_alert: false,
    short_message: "Carga leve para hoje.",
  },
  schedule_preview: {
    date: "2026-07-29",
    items: [],
    overdue_count: 0,
    hidden_count: 0,
    reschedule_recommended: false,
  },
  review_snapshot: {
    pending_reviews: 0,
    overdue_reviews: 0,
    cards_due: 0,
    estimated_minutes: 0,
  },
  progress_snapshot: {
    questions_done_week: 0,
    weekly_goal_questions: 300,
    weekly_progress_pct: 0,
    accuracy_pct: null,
  },
  details: {
    active_session: null,
    trainer_action: null,
    secondary_actions: [],
    schedule_suggestions_count: 0,
    evidence_confidence: "high",
  },
  missing_sources: [],
} satisfies StudentToday;

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

    if (method === "GET" && path === "/api/student/today") {
      return json(STUDENT_TODAY_FIXTURE);
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
        plan_progress: { completed_actions: 0, total_actions: 1 },
        previous_outcome: null,
        missing_sources: [],
      });
    }

    if (
      method === "POST" &&
      path === "/api/trainer/recommendations/rec_nav_e2e/events"
    ) {
      return json({
        event_id: "event_nav_e2e_shown",
        recommendation_id: "rec_nav_e2e",
        event_type: "shown",
        occurred_at: "2026-07-29T12:00:00Z",
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

    return json({ detail: `Unhandled shell API mock: ${method} ${path}` }, 501);
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

  test("meets the automated WCAG gate on the Today shell", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/hoje");
    await expect(page.getByRole("heading", { name: /Olá|Bom dia|Boa tarde|Boa noite/i })).toBeVisible();

    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(results.violations).toEqual([]);
  });

  // Rotas antigas continuam entrando pelo link de alguem; o que importa e' que
  // o menu acuse a intencao de DESTINO. `activeHref` e' o `intentPath` para onde
  // o 308 do next.config leva (ou, quando a rota e' real, o intent que
  // LEGACY_PATHS lhe atribui em navConfig.ts).
  const desktopCases = [
    { path: "/hoje", activeHref: "/hoje" },
    { path: "/calendario", activeHref: "/cronograma" }, // 308 -> /cronograma
    { path: "/caderno", activeHref: "/cards" }, // 308 -> /cards/registros
    { path: "/revisoes", activeHref: "/evolucao" }, // 308 -> /evolucao
    { path: "/dados-e-relatorios/graficos", activeHref: "/evolucao" }, // 308 -> /evolucao
    { path: "/estatisticas/relatorio", activeHref: "/evolucao" }, // rota real, intent evolution
    // `/desempenho` encadeia DOIS saltos: `redirect("/cronograma")` no servidor
    // e o /cronograma agora e' a propria canonica.
    { path: "/desempenho", activeHref: "/cronograma", landsOn: "/cronograma" },
  ];

  for (const { path, activeHref, landsOn } of desktopCases) {
    test(`keeps sidebar active for ${path}`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(path);
      // Sem ancorar a URL final, a assercao podia rodar no meio da cadeia de
      // redirect e ver a sidebar ainda sem item ativo -- falha intermitente.
      if (landsOn) await page.waitForURL(`**${landsOn}`);

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

    // "Cronograma" e' o rotulo mais longo do menu atual -- se algum couber
    // errado no container, e' este.
    const longestItem = page.locator("aside [data-nav-item-href='/cronograma']");
    const longestLabel = longestItem.locator("span");
    await expect(longestItem).toBeVisible();
    await expect(longestLabel).toHaveText("Cronograma");

    const [itemBox, labelBox] = await Promise.all([longestItem.boundingBox(), longestLabel.boundingBox()]);
    expect(itemBox).not.toBeNull();
    expect(labelBox).not.toBeNull();
    if (!itemBox || !labelBox) return;

    expect(labelBox.x).toBeGreaterThanOrEqual(itemBox.x);
    expect(labelBox.x + labelBox.width).toBeLessThanOrEqual(itemBox.x + itemBox.width + 1);
  });

  test("mostra Cronograma e mantem Caderno fora da sidebar", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/hoje");

    const sidebar = navSidebar(page);
    await expect(sidebar).toBeVisible();
    await expect(sidebar.locator("[data-nav-item-href='/cronograma']")).toHaveCount(1);
    await expect(sidebar.locator("[data-nav-item-href='/caderno']")).toHaveCount(0);
  });

  test("shows reciprocal top-right links on desktop child pages", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });

    await page.goto("/caderno");
    await expect(page.getByRole("link", { name: "Cards" })).toHaveAttribute("href", "/cards");

    // O atalho "Ir para Hoje" do cabecalho do Cronograma saiu: Hoje e Cronograma
    // sao vizinhos no menu, e o atalho ensinava um segundo caminho para o mesmo
    // destino.
    await page.goto("/calendario");
    await expect(page.getByRole("link", { name: "Ir para Hoje" })).toHaveCount(0);

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
    // Rota FILHA de um grupo (`isNavItemActive` casa por prefixo `/cards/`).
    // `/desempenho` nao serve: redireciona ao cronograma, que tem cabecalho
    // proprio. `/preferencias` tambem nao: apesar da intencao `planning`, ela
    // fica fora de `groupPaths`, entao nao acende item nenhum.
    await page.goto("/cards/registros");
    await page.getByLabel("Menu").click();

    const activeItems = page.locator("[data-nav-surface='drawer'][data-nav-active='true']");
    await expect(activeItems).toHaveCount(1);
    await expect(activeItems).toHaveAttribute("data-nav-item-href", "/cards");
    await expect(activeItems).toHaveAttribute("aria-current", "page");
  });

  test("mostra as sete intencoes no drawer sem estouro horizontal", async ({ page }) => {
    // No mobile a navegacao e' o drawer, nao uma barra inferior: o `aria-label`
    // "Navegação principal" pertence a sidebar, que fica oculta neste viewport.
    await page.goto("/hoje");
    await page.getByLabel("Menu").click();

    const drawerItems = page.locator("[data-nav-surface='drawer']");
    for (const label of ["Kros", "Hoje", "Cronograma", "Banco", "Cards", "Evolução", "Perfil"]) {
      await expect(drawerItems.getByText(label, { exact: true })).toBeVisible();
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("mostra Cronograma e mantem Caderno fora do drawer", async ({ page }) => {
    await page.goto("/hoje");
    await page.getByLabel("Menu").click();

    // Ancora obrigatoria: sem ela as duas contagens abaixo dariam 0 com o drawer
    // FECHADO e o teste passaria sem testar nada.
    await expect(page.locator("[data-nav-surface='drawer']").first()).toBeVisible();

    // Cronograma deixou de ser rota escondida: virou item do menu, ao lado de Hoje.
    await expect(page.locator("[data-nav-surface='drawer'][data-nav-item-href='/cronograma']")).toHaveCount(1);
    await expect(page.locator("[data-nav-surface='drawer'][data-nav-item-href='/caderno']")).toHaveCount(0);
  });

  test("mantem os atalhos entre paginas irmas no mobile", async ({ page }) => {
    // O par Hoje<->Planejamento deixou de ser "Calendário" no topo. O rotulo
    // agora depende do estado do dia ("Ver plano completo" com plano, "Abrir
    // planejamento" vazio), entao o contrato verificado e' o destino, nao o
    // texto: de /hoje sempre se alcanca o cronograma.
    await page.goto("/hoje");
    await expect(page.locator('main a[href^="/cronograma"]').first()).toBeVisible();

    // O cabecalho do mobile nao repete os atalhos do desktop (que a suite ja
    // cobre em "shows reciprocal top-right links on desktop child pages"); o que
    // precisa valer aqui e' que a filha continue oferecendo volta ao pai.
    await page.goto("/caderno");
    await expect(page.locator('a[href^="/cards"]').first()).toBeVisible();

    await page.goto("/estatisticas/relatorio");
    await expect(page.locator('a[href^="/estatisticas"]').first()).toBeVisible();
  });
});
