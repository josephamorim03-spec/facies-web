import { expect, test } from "@playwright/test";

const E2E_BASE_URL = "http://127.0.0.1:3000";
const topic = {
  knowledge_node_id: "go-node",
  parent_knowledge_node_id: null,
  node_code: "GO",
  node_name: "Obstetricia",
  node_type: "theme",
  node_path: ["GO", "Obstetricia"],
  path_label: "GO / Obstetricia",
  depth: 1,
  description: null,
  question_count: 12,
  primary_question_count: 12,
  board_count: 1,
  difficulty_mean: 0.42,
  recurrence_score: 0.8,
  bank_demand_score: 0.9,
  board_frequency: { SMK: 12 },
  charge_patterns: {},
  answer_types: {},
  adaptive_weight: 2,
  adaptive_weight_score: 0.7,
  adaptive_weight_factors: {},
};

const childTopic = {
  ...topic,
  knowledge_node_id: "placenta-node",
  parent_knowledge_node_id: "go-node",
  node_name: "Placenta previa",
  node_type: "microcompetency",
  node_path: ["GO", "Obstetricia", "Placenta previa"],
  path_label: "GO / Obstetricia / Placenta previa",
  depth: 2,
  question_count: 6,
};

const item = {
  question_id: "q1",
  position: 1,
  stem: "Gestante com sangramento no terceiro trimestre.",
  alternatives: { A: "Placenta previa", B: "Abortamento", C: "ITU", D: "Asma", E: "DM" },
  image_refs: [],
  table_refs: [],
  knowledge_nodes: [],
  selection_reason: {},
  source: { institution: "USP - SP", board_code: "SMK", year: 2024 },
  selected_option: null,
  doubtful: false,
  answered: false,
  needs_correction: false,
  correct_answer: null,
  is_correct: null,
};

function sessionPayload(answered = false) {
  return {
    session_id: "session_qb_e2e",
    status: "active",
    mode: "adaptive",
    resolution_mode: "training",
    primary_knowledge_node_id: "go-node",
    area: "GO",
    theme: "Obstetricia",
    subtheme: null,
    adaptive_weight: 2,
    adaptive_weight_score: 0.7,
    adaptive_weight_factors: {},
    performed_at: "2026-05-27T15:00:00Z",
    filters: {},
    total_questions: 1,
    answered_count: answered ? 1 : 0,
    unanswered_count: answered ? 0 : 1,
    unanswered_question_numbers: answered ? [] : [1],
    doubtful_count: 0,
    items: [
      answered
        ? { ...item, selected_option: "A", answered: true, correct_answer: "A", is_correct: true }
        : item,
    ],
    created_at: "2026-05-27T15:00:00Z",
    updated_at: "2026-05-27T15:00:00Z",
    finalized_at: null,
    directed_study_id: null,
    review_task_id: "rt_e2e",
  };
}

test("question bank applies filters, calendar review context, and gated correction", async ({ page }) => {
  await page.context().addCookies([
    {
      name: "krosmed_session",
      value: "session_e2e",
      url: E2E_BASE_URL,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  const createPayloads: Record<string, unknown>[] = [];

  await page.route("**/api/question-bank/availability**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        total_count: 12,
        answered_count: 0,
        unanswered_count: 12,
        available_count: 12,
        max_selectable: 12,
        answer_status: "unanswered",
      }),
    });
  });
  await page.route("**/api/question-bank/topics**", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify([topic, childTopic]) });
  });
  await page.route("**/api/question-bank/questions**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify([{ id: "q1", stem: item.stem, alternatives: item.alternatives, charge_profile: null, difficulty_estimate: 0.42, content_grade: "usable", image_refs: [], table_refs: [], metadata: {}, source: item.source, knowledge_nodes: [] }]),
    });
  });
  await page.route("**/api/question-bank/next-action", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        kind: "weak_area",
        title: "Fortalecer GO",
        subtitle: "Foco nas lacunas desta area",
        meta: "~20 min - treino com correcao item a item",
        cta_label: "Revisar agora",
        area: "GO",
        area_label: "Ginecologia e Obstetricia",
        signals: [{ key: "area_critico", label: "area critica", severity: "critical" }],
        start_payload: {
          mode: "adaptive",
          resolution_mode: "training",
          area: "GO",
          answer_status: "needs_review",
          only_unanswered: false,
          limit: 7,
        },
        generated_at: "2026-05-27T15:00:00Z",
      }),
    });
  });
  await page.route("**/api/question-bank/performance", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        areas: [],
        exam: { simulation_count: 0, accuracy: null, avg_time_ms: null, slow_rate: null },
        generated_at: "2026-05-27T15:00:00Z",
      }),
    });
  });
  await page.route("**/api/question-bank/sessions", async (route) => {
    createPayloads.push(await route.request().postDataJSON());
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(sessionPayload(false)) });
  });
  // Session GET (loaded by the session route after navigation)
  await page.route("**/api/question-bank/sessions/session_qb_e2e", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(sessionPayload(false)) });
    }
  });
  await page.route("**/api/question-bank/sessions/session_qb_e2e/items/1/attempt", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(sessionPayload(true)) });
  });
  await page.route("**/api/question-bank/review-queue", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ due_count: 0, struggling_count: 0, total: 0 }),
    });
  });
  await page.route("**/api/reviews/agenda", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        tasks: [],
        due_question_total: 0,
        struggling_question_total: 0,
        question_review_total: 0,
        generated_at: new Date().toISOString(),
      }),
    });
  });

  await page.goto("/banco-de-questoes?review_task_id=rt_e2e&date=2026-05-27&area=GO&theme=Obstetricia&expected_questions=12");

  await expect(page.getByRole("heading", { name: "Questões com raciocínio clínico" })).toBeVisible();
  const recommendedSection = page.getByRole("region", { name: "Sessão recomendada" });
  await expect(recommendedSection.getByText("Fortalecer GO")).toBeVisible();
  await expect(recommendedSection.getByText("area critica")).toBeVisible();

  await expect(page.getByTestId("question-bank-top-filters")).toBeVisible();
  await expect(page.locator("main aside")).toBeVisible();
  await expect(page.getByText(/12 .*dispon/i)).toBeVisible();
  await expect(page.getByText("Obstetricia").first()).toBeVisible();

  const quantityInput = page.getByRole("spinbutton", { name: /Questões/i });
  await quantityInput.fill("99");
  await expect(quantityInput).toHaveValue("12");

  await recommendedSection.getByRole("button", { name: /Revisar agora/ }).click();

  const payload = createPayloads[0];
  expect(payload).toBeTruthy();
  if (!payload) throw new Error("Missing session creation payload.");
  expect(payload).toMatchObject({
    area: "GO",
    limit: 7,
    resolution_mode: "training",
    answer_status: "needs_review",
    only_unanswered: false,
  });
  expect(String(payload.performed_at)).toContain("2026-05-27");

  // Session opens in new route; wait for navigation
  await page.waitForURL("**/banco-de-questoes/sessao/session_qb_e2e**");

  await page.getByRole("button", { name: /^A\s+Placenta/ }).click();
  await expect(page.getByText("Gabarito A")).toHaveCount(0);
  await page.getByRole("button", { name: "Ver gabarito" }).click();
  await expect(page.getByText("Gabarito A")).toBeVisible();
  await expect(page.getByText("Momento de aprendizagem")).toBeVisible();
  await expect(page.getByRole("button", { name: /Próxima/ })).toBeVisible();
});

test("manual search filters topics without becoming a hidden session filter", async ({ page }) => {
  await page.context().addCookies([
    {
      name: "krosmed_session",
      value: "session_e2e",
      url: E2E_BASE_URL,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  const createPayloads: Record<string, unknown>[] = [];
  const topicRequestUrls: string[] = [];

  await page.route("**/api/question-bank/availability**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        total_count: 12,
        answered_count: 0,
        unanswered_count: 12,
        available_count: 12,
        max_selectable: 12,
        answer_status: "unanswered",
      }),
    });
  });
  await page.route("**/api/question-bank/topics**", async (route) => {
    topicRequestUrls.push(route.request().url());
    await route.fulfill({ contentType: "application/json", body: JSON.stringify([topic, childTopic]) });
  });
  await page.route("**/api/question-bank/next-action", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        kind: "fresh_practice",
        title: "Praticar questões novas",
        subtitle: "Bloco curto",
        meta: "~20 min",
        cta_label: "Começar treino",
        area: null,
        area_label: null,
        signals: [],
        start_payload: { mode: "adaptive", resolution_mode: "training", answer_status: "unanswered", only_unanswered: true, limit: 10 },
        generated_at: "2026-05-27T15:00:00Z",
      }),
    });
  });
  await page.route("**/api/question-bank/performance", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        areas: [],
        exam: { simulation_count: 0, accuracy: null, avg_time_ms: null, slow_rate: null },
        generated_at: "2026-05-27T15:00:00Z",
      }),
    });
  });
  await page.route("**/api/question-bank/review-queue", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ due_count: 0, struggling_count: 0, total: 0 }) });
  });
  await page.route("**/api/reviews/agenda", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        tasks: [],
        due_question_total: 0,
        struggling_question_total: 0,
        question_review_total: 0,
        generated_at: new Date().toISOString(),
      }),
    });
  });
  await page.route("**/api/question-bank/sessions", async (route) => {
    createPayloads.push(await route.request().postDataJSON());
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(sessionPayload(false)) });
  });
  await page.route("**/api/question-bank/sessions/session_qb_e2e", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(sessionPayload(false)) });
  });

  await page.goto("/banco-de-questoes");

  await page.getByPlaceholder("Buscar especialidade, macrotema ou subtema").fill("Placenta");
  await expect(page.getByRole("button", { name: /Placenta previa/ }).first()).toBeVisible();
  await expect
    .poll(() => topicRequestUrls.some((url) => new URL(url).searchParams.get("search") === "Placenta"))
    .toBe(true);

  await page.getByRole("button", { name: /Iniciar simulado/ }).click();
  await expect.poll(() => createPayloads.length).toBe(1);

  const payload = createPayloads[0];
  expect(payload.search).toBeUndefined();
  expect(payload.knowledge_node_ids).toBeUndefined();
  expect(payload).toMatchObject({
    answer_status: "unanswered",
    only_unanswered: true,
    limit: 10,
  });
});
