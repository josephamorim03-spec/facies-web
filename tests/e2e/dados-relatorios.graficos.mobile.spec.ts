import { type Locator, Page, devices, expect, test } from "@playwright/test";

import { addHttpOnlySessionForPage } from "./support/authCookies";

const PROFILE_RESPONSE = {
  user_id: "user_e2e",
  weekly_goal_questions: 300,
  timezone: "America/Fortaleza",
  reschedule_mode: "suggest",
  shift_12h_capacity: 40,
  shift_24h_capacity: 20,
  display_name: "E2E User",
  access_status: "active",
  has_completed_initial_goal_setup: true,
};

const WEEKLY_TIMELINE_RESPONSE = {
  weeks: [
    {
      week_label: "S1",
      week_start: "2026-02-02",
      total: 38,
      correct: 24,
      accuracy_pct: 63,
      areas: {
        GO: { total: 8, correct: 5, accuracy_pct: 63 },
        PD: { total: 5, correct: 3, accuracy_pct: 60 },
        MP: { total: 7, correct: 5, accuracy_pct: 71 },
      },
    },
    {
      week_label: "S2",
      week_start: "2026-02-09",
      total: 46,
      correct: 33,
      accuracy_pct: 72,
      areas: {
        GO: { total: 10, correct: 8, accuracy_pct: 80 },
        PD: { total: 6, correct: 4, accuracy_pct: 67 },
        MP: { total: 8, correct: 6, accuracy_pct: 75 },
      },
    },
    {
      week_label: "S3",
      week_start: "2026-02-16",
      total: 42,
      correct: 30,
      accuracy_pct: 71,
      areas: {
        GO: { total: 9, correct: 7, accuracy_pct: 78 },
        PD: { total: 5, correct: 3, accuracy_pct: 60 },
        MP: { total: 7, correct: 5, accuracy_pct: 71 },
      },
    },
  ],
  delta_by_area: {
    GO: 8,
    PD: -4,
    MP: 5,
    CG: 2,
    CM: -1,
    OU: null,
  },
};

const WEEKLY_TIMELINE_DENSE_LABEL_RESPONSE = {
  weeks: [
    { week_label: "Sem 1", week_start: "2026-01-05", total: 0, correct: 0, accuracy_pct: null, areas: {} },
    { week_label: "Sem 2", week_start: "2026-01-12", total: 0, correct: 0, accuracy_pct: null, areas: {} },
    { week_label: "Sem 3", week_start: "2026-01-19", total: 0, correct: 0, accuracy_pct: null, areas: {} },
    { week_label: "Sem 4", week_start: "2026-01-26", total: 0, correct: 0, accuracy_pct: null, areas: {} },
    { week_label: "Sem 5", week_start: "2026-02-02", total: 0, correct: 0, accuracy_pct: null, areas: {} },
    {
      week_label: "Sem 6",
      week_start: "2026-02-09",
      total: 24,
      correct: 19,
      accuracy_pct: 79,
      areas: {
        GO: { total: 4, correct: 3, accuracy_pct: 72 },
        PD: { total: 5, correct: 4, accuracy_pct: 78 },
        CG: { total: 4, correct: 3, accuracy_pct: 70 },
        MP: { total: 4, correct: 3, accuracy_pct: 84 },
        CM: { total: 3, correct: 2, accuracy_pct: 74 },
        OU: { total: 4, correct: 3, accuracy_pct: 79 },
      },
    },
    {
      week_label: "Sem 7",
      week_start: "2026-02-16",
      total: 29,
      correct: 23,
      accuracy_pct: 79,
      areas: {
        GO: { total: 5, correct: 4, accuracy_pct: 80 },
        PD: { total: 6, correct: 5, accuracy_pct: 79 },
        CG: { total: 4, correct: 3, accuracy_pct: 77 },
        MP: { total: 5, correct: 4, accuracy_pct: 85 },
        CM: { total: 4, correct: 3, accuracy_pct: 79 },
        OU: { total: 5, correct: 4, accuracy_pct: 80 },
      },
    },
    {
      week_label: "Sem 8",
      week_start: "2026-02-23",
      total: 28,
      correct: 22,
      accuracy_pct: 79,
      areas: {
        GO: { total: 4, correct: 3, accuracy_pct: 77 },
        PD: { total: 6, correct: 5, accuracy_pct: 82 },
        CG: { total: 4, correct: 3, accuracy_pct: 76 },
        MP: { total: 5, correct: 4, accuracy_pct: 84 },
        CM: { total: 4, correct: 3, accuracy_pct: 85 },
        OU: { total: 5, correct: 4, accuracy_pct: 81 },
      },
    },
    {
      week_label: "Sem 9",
      week_start: "2026-03-02",
      total: 26,
      correct: 20,
      accuracy_pct: 77,
      areas: {
        GO: { total: 4, correct: 3, accuracy_pct: 76 },
        PD: { total: 6, correct: 5, accuracy_pct: 77 },
        CG: { total: 4, correct: 3, accuracy_pct: 77 },
        MP: { total: 4, correct: 3, accuracy_pct: 77 },
        CM: { total: 4, correct: 3, accuracy_pct: 78 },
        OU: { total: 4, correct: 3, accuracy_pct: 82 },
      },
    },
    {
      week_label: "Sem 10",
      week_start: "2026-03-09",
      total: 30,
      correct: 25,
      accuracy_pct: 83,
      areas: {
        GO: { total: 4, correct: 3, accuracy_pct: 82 },
        PD: { total: 6, correct: 5, accuracy_pct: 85 },
        CG: { total: 4, correct: 3, accuracy_pct: 81 },
        MP: { total: 5, correct: 4, accuracy_pct: 90 },
        CM: { total: 5, correct: 4, accuracy_pct: 81 },
        OU: { total: 6, correct: 5, accuracy_pct: 84 },
      },
    },
    {
      week_label: "Sem 11",
      week_start: "2026-03-16",
      total: 31,
      correct: 24,
      accuracy_pct: 77,
      areas: {
        GO: { total: 5, correct: 3, accuracy_pct: 63 },
        PD: { total: 6, correct: 5, accuracy_pct: 88 },
        CG: { total: 5, correct: 4, accuracy_pct: 88 },
        MP: { total: 5, correct: 4, accuracy_pct: 89 },
        CM: { total: 4, correct: 3, accuracy_pct: 75 },
        OU: { total: 6, correct: 5, accuracy_pct: 85 },
      },
    },
    {
      week_label: "Sem 12",
      week_start: "2026-03-23",
      total: 33,
      correct: 28,
      accuracy_pct: 85,
      areas: {
        GO: { total: 5, correct: 4, accuracy_pct: 81 },
        PD: { total: 7, correct: 6, accuracy_pct: 88 },
        CG: { total: 5, correct: 3, accuracy_pct: 61 },
        MP: { total: 5, correct: 5, accuracy_pct: 93 },
        CM: { total: 5, correct: 5, accuracy_pct: 99 },
        OU: { total: 6, correct: 5, accuracy_pct: 86 },
      },
    },
  ],
  delta_by_area: {
    GO: 9,
    PD: 10,
    MP: 4,
    CG: -2,
    CM: 18,
    OU: 7,
  },
};

const PERFORMANCE_SUMMARY_RESPONSE = {
  diagnosis: {
    ready: false,
    reason: "insufficient_total",
    total_questions: 126,
    min_theme_questions: 20,
    strengths: [],
    weaknesses: [],
  },
  area_summaries: [
    { area: "GO", area_accuracy_pct: 74, total_questions: 40, themes: [] },
    { area: "PD", area_accuracy_pct: 68, total_questions: 22, themes: [] },
    { area: "MP", area_accuracy_pct: 71, total_questions: 30, themes: [] },
    { area: "CG", area_accuracy_pct: 65, total_questions: 18, themes: [] },
    { area: "CM", area_accuracy_pct: 70, total_questions: 16, themes: [] },
    { area: "OU", area_accuracy_pct: null, total_questions: 0, themes: [] },
  ],
};

const REVIEW_TASKS_RESPONSE = {
  pending: [] as Array<Record<string, unknown>>,
  done: [] as Array<Record<string, unknown>>,
};

const DIRECTED_STUDIES_RESPONSE = [
  {
    study_id: "study_1",
    area: "GO",
    theme: "Tema 1",
    total_questions: 20,
    correct_questions: 14,
    user_weight: 1,
    performed_at: "2026-02-20T10:00:00Z",
    created_at: "2026-02-20T10:00:00Z",
    accuracy: 70,
    is_review: false,
    fsrs_rating: null,
    study_kind: "topic",
    full_exam_name: null,
    full_exam_year: null,
    full_exam_type: null,
    origin_review_task_id: null,
    import_session_id: null,
  },
];

const STALE_DIRECTED_STUDIES_RESPONSE = Array.from({ length: 10 }).map((_, index) => ({
  study_id: `study_stale_${index + 1}`,
  area: index % 2 === 0 ? "GO" : "CM",
  theme: `Tema sem contato ${index + 1}`,
  total_questions: 20 + index,
  correct_questions: 12 + index,
  user_weight: 1,
  performed_at: `2026-01-${String(10 + index).padStart(2, "0")}T10:00:00Z`,
  created_at: `2026-01-${String(10 + index).padStart(2, "0")}T10:00:00Z`,
  accuracy: 60 + index,
  is_review: false,
  fsrs_rating: null,
  study_kind: "topic",
  full_exam_name: null,
  full_exam_year: null,
  full_exam_type: null,
  origin_review_task_id: null,
  import_session_id: null,
}));

const TURBO_AREA_STATS_RESPONSE = {
  total_notes: 12,
  total_reviews: 18,
  total_correct: 13,
  total_incorrect: 5,
  by_area: [
    { area: "GO", notes_count: 5, reviews_total: 9, reviews_correct: 7, reviews_incorrect: 2 },
    { area: "PD", notes_count: 4, reviews_total: 6, reviews_correct: 4, reviews_incorrect: 2 },
    { area: "MP", notes_count: 3, reviews_total: 3, reviews_correct: 2, reviews_incorrect: 1 },
  ],
};

const ADAPTIVE_SCHEDULE_RESPONSE = {
  mode: "NORMAL",
  date: "2026-04-23",
  focus_minutes: 120,
  buffer_minutes: 20,
  total_planned_minutes: 140,
  recovery_mode: false,
  rebalance_required: false,
  reason: null,
  blocks: [],
};

async function mockDadosRelatoriosApi(
  page: Page,
  override: {
    directedStudiesResponse?: unknown;
    weeklyTimelineResponse?: unknown;
  } = {},
) {
  const directedStudiesResponse = override.directedStudiesResponse ?? DIRECTED_STUDIES_RESPONSE;
  const weeklyTimelineResponse = override.weeklyTimelineResponse ?? WEEKLY_TIMELINE_RESPONSE;

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === "GET" && url.pathname === "/api/profile") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(PROFILE_RESPONSE),
      });
      return;
    }

    if (request.method() === "GET" && url.pathname === "/api/reviews/agenda") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          tasks: REVIEW_TASKS_RESPONSE.pending,
          due_question_total: 0,
          struggling_question_total: 0,
          question_review_total: 0,
          generated_at: new Date().toISOString(),
        }),
      });
      return;
    }

    if (request.method() === "GET" && url.pathname === "/api/reviews/tasks") {
      const status = url.searchParams.get("status");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(status === "done" ? REVIEW_TASKS_RESPONSE.done : REVIEW_TASKS_RESPONSE.pending),
      });
      return;
    }

    if (request.method() === "GET" && url.pathname === "/api/studies/directed") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(directedStudiesResponse),
      });
      return;
    }

    if (request.method() === "GET" && url.pathname === "/api/studies/weekly-timeline") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(weeklyTimelineResponse),
      });
      return;
    }

    if (request.method() === "GET" && url.pathname === "/api/studies/performance-summary") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(PERFORMANCE_SUMMARY_RESPONSE),
      });
      return;
    }

    if (request.method() === "GET" && url.pathname === "/api/notes/operational/turbo/area-stats") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(TURBO_AREA_STATS_RESPONSE),
      });
      return;
    }

    if (request.method() === "GET" && url.pathname === "/api/schedule/generate") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(ADAPTIVE_SCHEDULE_RESPONSE),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });
}

async function tickCenterX(section: Locator, weekLabel: string): Promise<number> {
  const tick = section.getByText(weekLabel, { exact: true }).first();
  await expect(tick).toBeVisible();
  const box = await tick.boundingBox();
  expect(box).not.toBeNull();
  return Number(box?.x ?? 0) + Number(box?.width ?? 0) / 2;
}

test.describe("Dados e relatorios - graficos mobile", () => {
  const mobileDevice = devices["iPhone 13"];
  test.use({
    viewport: mobileDevice.viewport,
    userAgent: mobileDevice.userAgent,
    deviceScaleFactor: mobileDevice.deviceScaleFactor,
    isMobile: mobileDevice.isMobile,
    hasTouch: mobileDevice.hasTouch,
  });

  test.beforeEach(async ({ page }) => {
    await addHttpOnlySessionForPage(page);
    await mockDadosRelatoriosApi(page);
  });

  test("hub de dados mostra graficos, analise de cards no fim e nao renderiza relatorio inline", async ({ page }) => {
    await page.goto("/dados-e-relatorios");

    await expect(page.getByTestId("chart-weekly-accuracy")).toBeVisible();
    await expect(page.getByTestId("chart-weekly-volume")).toBeVisible();
    await expect(page.getByTestId("chart-area-lines")).toBeVisible();
    const slopeSection = page.getByTestId("chart-area-slope");
    const cardsAnalysisSection = page.getByTestId("chart-cards-analysis");
    await expect(slopeSection).toBeVisible();
    await expect(cardsAnalysisSection).toBeVisible();
    await expect(cardsAnalysisSection.getByRole("heading", { name: "Análise de cards" })).toBeVisible();
    await expect(page.getByText("Cards Adaptativos — 30 dias")).toHaveCount(0);

    const slopeBox = await slopeSection.boundingBox();
    const cardsAnalysisBox = await cardsAnalysisSection.boundingBox();
    expect(slopeBox).not.toBeNull();
    expect(cardsAnalysisBox).not.toBeNull();
    expect(Number(slopeBox?.y ?? 0)).toBeLessThan(Number(cardsAnalysisBox?.y ?? 0));

    await expect(page.getByRole("heading", { name: /Reten/i })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /do estudo/i })).toHaveCount(0);
  });

  test("relatorio abre com diagnostico no topo e lista de temas sem contato em preview", async ({ page }) => {
    await page.unroute("**/api/**");
    await mockDadosRelatoriosApi(page, {
      directedStudiesResponse: STALE_DIRECTED_STUDIES_RESPONSE,
    });

    await page.goto("/dados-e-relatorios");

    await page.getByRole("link", { name: /Relat/i }).first().click();
    await expect(page).toHaveURL(/\/dados-e-relatorios\/relatorio$/);
    // Era `getByLabel("Menu")` (o hamburguer), aposentado junto com o drawer.
    // A barra de topo continua existindo — ela carrega titulo e acoes de tela.
    await expect(page.locator("[data-nav-surface='tabbar']")).toHaveCount(1);

    const diagnosticoSection = page.getByTestId("relatorio-section-diagnostico");
    const retencaoSection = page.getByTestId("relatorio-section-retencao");
    await expect(diagnosticoSection).toBeVisible();
    await expect(retencaoSection).toBeVisible();
    await expect(page.getByRole("heading", { name: "Análise de cards" })).toHaveCount(0);

    const diagnosticoBox = await diagnosticoSection.boundingBox();
    const retencaoBox = await retencaoSection.boundingBox();
    expect(diagnosticoBox).not.toBeNull();
    expect(retencaoBox).not.toBeNull();
    expect(Number(diagnosticoBox?.y ?? 0)).toBeLessThan(Number(retencaoBox?.y ?? 0));

    const staleRows = page.getByTestId("relatorio-stale-theme-row");
    await expect(staleRows).toHaveCount(8);
    await expect(page.getByText("Mostrando 8 de 10 temas.")).toBeVisible();

    await page.getByRole("button", { name: "Ver temas" }).click();
    await expect(staleRows).toHaveCount(10);
    await expect(page.getByRole("button", { name: "Ocultar temas" })).toBeVisible();
  });

  test("interacao mobile exibe % no grafico de evolucao e no por area", async ({ page }) => {
    await page.goto("/dados-e-relatorios/graficos");

    await expect(page.getByTestId("chart-weekly-accuracy")).toBeVisible();
    await expect(page.getByTestId("chart-weekly-volume")).toBeVisible();
    await expect(page.getByTestId("chart-area-lines")).toBeVisible();

    const accuracySection = page.getByTestId("chart-weekly-accuracy");
    const accuracyChart = accuracySection.getByTestId("accuracy-interaction-overlay");
    await accuracyChart.click({ position: { x: 35, y: 70 } });
    const accuracyPercentLabel = page.getByTestId("accuracy-overlay-percent-label");
    await expect(accuracyPercentLabel).toBeVisible();
    await expect(accuracyPercentLabel).toHaveText(/\d+%/);

    const volumeSection = page.getByTestId("chart-weekly-volume");
    const volumeChart = volumeSection.getByTestId("volume-interaction-overlay");
    await volumeChart.click({ position: { x: 120, y: 60 } });

    const activeSegments = page.getByTestId("volume-active-segments");
    await expect(activeSegments).toHaveAttribute("data-areas", /GO/);
    await expect(activeSegments).toHaveAttribute("data-areas", /PD/);
    await expect(activeSegments).toHaveAttribute("data-areas", /MP/);

    const areaLinesSection = page.getByTestId("chart-area-lines");
    await areaLinesSection.getByRole("button", { name: "GO" }).click();
    const areaPercentLabels = page.getByTestId("area-line-overlay-percent-label");
    await expect(areaPercentLabels.first()).toBeVisible();
    const texts = await areaPercentLabels.allTextContents();
    expect(texts.some((value) => /\d+%/.test(value))).toBeTruthy();
  });

  test("interacao mobile posiciona labels de % sem colisoes em cenario denso", async ({ page }) => {
    await page.unroute("**/api/**");
    await mockDadosRelatoriosApi(page, {
      weeklyTimelineResponse: WEEKLY_TIMELINE_DENSE_LABEL_RESPONSE,
    });
    await page.goto("/dados-e-relatorios/graficos");
    const areaLinesSection = page.getByTestId("chart-area-lines");
    await expect(areaLinesSection).toBeVisible();

    await areaLinesSection.getByRole("button", { name: "PD" }).click();
    const areaPercentLabels = areaLinesSection.getByTestId("area-line-overlay-percent-label");
    await expect(areaPercentLabels.first()).toBeVisible();

    const labelBoxes = await areaPercentLabels.evaluateAll((nodes) => {
      return nodes
        .map((node) => {
          const rect = node.getBoundingClientRect();
          const weekIndex = Number((node as HTMLElement).dataset.weekIndex ?? -1);
          return {
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
            weekIndex,
          };
        })
        .sort((a, b) => a.weekIndex - b.weekIndex);
    });

    expect(labelBoxes.length).toBeGreaterThanOrEqual(6);

    const activeDots = areaLinesSection.locator("circle[r='3.5']");
    await expect(activeDots).toHaveCount(labelBoxes.length);
    const dotCenters = await activeDots.evaluateAll((nodes) => {
      return nodes
        .map((node) => {
          const rect = node.getBoundingClientRect();
          return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          };
        })
        .sort((a, b) => a.x - b.x);
    });

    const frameBox = await areaLinesSection.locator("div.relative.overflow-visible").first().boundingBox();
    expect(frameBox).not.toBeNull();

    const plotBounds = {
      left: Number(frameBox?.x ?? 0) + 46, // Y axis width + left margin
      right: Number(frameBox?.x ?? 0) + Number(frameBox?.width ?? 0) - 20,
      top: Number(frameBox?.y ?? 0) + 6, // top margin + inset
      bottom: Number(frameBox?.y ?? 0) + Number(frameBox?.height ?? 0) - 24,
    };

    for (const box of labelBoxes) {
      expect(box.left).toBeGreaterThanOrEqual(plotBounds.left - 2);
      expect(box.right).toBeLessThanOrEqual(plotBounds.right + 2);
      expect(box.top).toBeGreaterThanOrEqual(plotBounds.top - 2);
      expect(box.bottom).toBeLessThanOrEqual(plotBounds.bottom + 2);
    }

    for (let i = 0; i < labelBoxes.length; i += 1) {
      for (let j = i + 1; j < labelBoxes.length; j += 1) {
        const a = labelBoxes[i];
        const b = labelBoxes[j];
        const overlaps = !(
          a.right + 1 <= b.left
          || b.right + 1 <= a.left
          || a.bottom + 1 <= b.top
          || b.bottom + 1 <= a.top
        );
        expect(overlaps).toBeFalsy();
      }
    }

    for (let i = 0; i < labelBoxes.length; i += 1) {
      const label = labelBoxes[i];
      const point = dotCenters[i];

      const pointInsideLabel = (
        point.x > label.left + 1
        && point.x < label.right - 1
        && point.y > label.top + 1
        && point.y < label.bottom - 1
      );
      expect(pointInsideLabel).toBeFalsy();

      const dx = point.x < label.left ? label.left - point.x : point.x > label.right ? point.x - label.right : 0;
      const dy = point.y < label.top ? label.top - point.y : point.y > label.bottom ? point.y - label.bottom : 0;
      const distance = Math.sqrt(dx * dx + dy * dy);
      expect(distance).toBeLessThanOrEqual(30);
    }
  });
});

test.describe("Dados e relatorios - graficos desktop", () => {
  test.beforeEach(async ({ page }) => {
    await addHttpOnlySessionForPage(page);
    await mockDadosRelatoriosApi(page);
  });

  test("mantem % no hover de acerto e alinhamento aproximado de semanas no volume", async ({ page }) => {
    await page.goto("/dados-e-relatorios/graficos");

    const accuracySection = page.getByTestId("chart-weekly-accuracy");
    const accuracyChart = accuracySection.getByTestId("accuracy-interaction-overlay");
    await accuracyChart.hover({ position: { x: 110, y: 60 } });
    await expect(page.getByTestId("accuracy-overlay-percent-label")).toBeVisible();

    const volumeSection = page.getByTestId("chart-weekly-volume");
    const areaSection = page.getByTestId("chart-area-lines");
    const centerAccuracy = await tickCenterX(accuracySection, "S2");
    const centerVolume = await tickCenterX(volumeSection, "S2");
    const centerArea = await tickCenterX(areaSection, "S2");
    expect(Math.abs(centerVolume - centerAccuracy)).toBeLessThanOrEqual(3);
    expect(Math.abs(centerVolume - centerArea)).toBeLessThanOrEqual(3);
  });
});

