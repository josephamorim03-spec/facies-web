import { expect, test, type Page } from "@playwright/test";

const E2E_BASE_URL = "http://127.0.0.1:3000";
const topic = {
  knowledge_node_id: "go-node",
  parent_knowledge_node_id: null,
  node_code: "GO",
  node_name: "Obstetricia",
  node_type: "specialty",
  node_path: ["Medicina", "Obstetricia"],
  path_label: "Medicina / Obstetricia",
  depth: 0,
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
  node_type: "subtheme",
  node_path: ["Medicina", "Obstetricia", "Placenta previa"],
  path_label: "Medicina / Obstetricia / Placenta previa",
  depth: 2,
  question_count: 6,
};

const otherAreaTopic = {
  ...topic,
  knowledge_node_id: "cm-node",
  parent_knowledge_node_id: null,
  node_code: "CM",
  node_name: "Cardiologia",
  node_path: ["Medicina", "Cardiologia"],
  path_label: "Medicina / Cardiologia",
  question_count: 9,
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

const sourceOptions = [
  {
    option_key: "SMK",
    label: "Smoke Board",
    option_kind: "board",
    question_count: 12,
    first_year: 2023,
    last_year: 2024,
  },
  {
    option_key: "USP-SP",
    label: "USP - SP",
    option_kind: "institution",
    question_count: 7,
    first_year: 2023,
    last_year: 2024,
  },
];

const yearStats = [
  { year: 2024, question_count: 8 },
  { year: 2023, question_count: 4 },
];

async function mockQuestionBankMetadata(page: Page) {
  await page.route("**/api/question-bank/sources", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(sourceOptions) });
  });
  await page.route("**/api/question-bank/years", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(yearStats) });
  });
}

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
  await mockQuestionBankMetadata(page);

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
  await expect(page.getByTestId("question-bank-top-filters")).not.toContainText("Medicina");

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

test("manual search becomes an active session filter and clears selected topics", async ({ page }) => {
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
  const availabilityRequestUrls: string[] = [];
  await mockQuestionBankMetadata(page);

  await page.route("**/api/question-bank/availability**", async (route) => {
    availabilityRequestUrls.push(route.request().url());
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
    await route.fulfill({ contentType: "application/json", body: JSON.stringify([topic, childTopic, otherAreaTopic]) });
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

  const filterPanel = page.getByTestId("question-bank-top-filters");
  await expect(filterPanel).toContainText("2024");
  await expect(filterPanel).not.toContainText("2016");

  await page.getByRole("checkbox", { name: /Smoke Board/ }).check();
  await page.getByRole("checkbox", { name: /USP - SP/ }).check();
  await expect
    .poll(() =>
      topicRequestUrls.some((url) => {
        const params = new URL(url).searchParams;
        return (
          params.getAll("board_codes").includes("SMK") &&
          params.getAll("institutions").includes("USP-SP")
        );
      }),
    )
    .toBe(true);

  const topicRequestsBeforeAreaChange = topicRequestUrls.length;
  await expect(filterPanel).toContainText("Cardiologia");
  await page.getByRole("button", { name: "GO" }).click();
  await expect(filterPanel).not.toContainText("Cardiologia");
  await page.waitForTimeout(400);
  expect(topicRequestUrls).toHaveLength(topicRequestsBeforeAreaChange);

  await page.getByRole("button", { name: /Placenta previa/ }).first().click();
  await page.getByPlaceholder("Buscar especialidade, macrotema ou subtema").fill("Placenta");
  await expect(page.getByRole("button", { name: /Placenta previa/ }).first()).toBeVisible();
  await expect(page.getByText("Obstetricia").first()).toBeVisible();
  await page.waitForTimeout(400);
  expect(topicRequestUrls.some((url) => new URL(url).searchParams.get("search") === "Placenta")).toBe(false);
  await expect
    .poll(() =>
      availabilityRequestUrls.some((url) => {
        const params = new URL(url).searchParams;
        return params.get("search") === "Placenta" && params.getAll("knowledge_node_ids").length === 0;
      }),
    )
    .toBe(true);
  await expect
    .poll(() => topicRequestUrls.some((url) => new URL(url).searchParams.get("include_empty") === "false"))
    .toBe(true);
  await expect(page.getByTestId("question-bank-top-filters")).not.toContainText("Medicina");

  await page.getByRole("button", { name: /Iniciar simulado/ }).click();
  await expect.poll(() => createPayloads.length).toBe(1);

  const payload = createPayloads[0];
  expect(payload.search).toBe("Placenta");
  expect(payload.knowledge_node_ids).toBeUndefined();
  expect(payload.generate_review_trail).toBeUndefined();
  expect(payload.board_codes).toEqual(["SMK"]);
  expect(payload.institutions).toEqual(["USP-SP"]);
  expect(payload).toMatchObject({
    answer_status: "unanswered",
    only_unanswered: true,
    limit: 10,
  });
});

test("builder keeps requested quantity above 50 before availability resolves", async ({ page }) => {
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
  await mockQuestionBankMetadata(page);

  await page.route("**/api/question-bank/availability**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        total_count: 120,
        answered_count: 0,
        unanswered_count: 120,
        available_count: 120,
        max_selectable: 120,
        answer_status: "unanswered",
      }),
    });
  });
  await page.route("**/api/question-bank/topics**", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify([topic, childTopic]) });
  });
  await page.route("**/api/question-bank/next-action", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        kind: "fresh_practice",
        title: "Praticar questoes novas",
        subtitle: "Bloco estendido",
        meta: "~60 min",
        cta_label: "Comecar treino",
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
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ ...sessionPayload(false), session_id: "session_qb_large" }),
    });
  });
  await page.route("**/api/question-bank/sessions/session_qb_large", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ ...sessionPayload(false), session_id: "session_qb_large" }),
    });
  });

  await page.goto("/banco-de-questoes?expected_questions=75");

  const quantityInput = page.getByRole("spinbutton", { name: /Questões/i });
  await expect(quantityInput).toHaveValue("75");
  await expect(page.getByText(/120 .*dispon/i)).toBeVisible();

  await quantityInput.fill("99");
  await expect(quantityInput).toHaveValue("99");

  await page.getByRole("button", { name: /Iniciar simulado/ }).click();
  await expect.poll(() => createPayloads.length).toBe(1);
  expect(createPayloads[0]).toMatchObject({ limit: 99 });
});

test("simulation session allows answer changes by click and keyboard", async ({ page }) => {
  await page.context().addCookies([
    {
      name: "krosmed_session",
      value: "session_e2e",
      url: E2E_BASE_URL,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  const attemptPayloads: Record<string, unknown>[] = [];
  const eventTypes: string[] = [];
  let selectedOption: "A" | "B" | null = null;

  const simulationSession = () => ({
    ...sessionPayload(Boolean(selectedOption)),
    session_id: "session_qb_sim_change",
    resolution_mode: "simulation",
    answered_count: selectedOption ? 1 : 0,
    unanswered_count: selectedOption ? 0 : 1,
    unanswered_question_numbers: selectedOption ? [] : [1],
    items: [
      {
        ...item,
        selected_option: selectedOption,
        answered: Boolean(selectedOption),
        correct_answer: null,
        is_correct: null,
      },
    ],
  });

  await page.route("**/api/question-bank/sessions/session_qb_sim_change", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(simulationSession()) });
  });
  await page.route("**/api/question-bank/sessions/session_qb_sim_change/items/1/attempt", async (route) => {
    const payload = await route.request().postDataJSON();
    attemptPayloads.push(payload);
    selectedOption = payload.selected_option === "B" ? "B" : "A";
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(simulationSession()) });
  });
  await page.route("**/api/question-bank/sessions/session_qb_sim_change/items/1/events", async (route) => {
    const payload = await route.request().postDataJSON();
    for (const event of payload.events ?? []) {
      if (typeof event?.event_type === "string") eventTypes.push(event.event_type);
    }
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ events: [] }) });
  });

  await page.goto("/banco-de-questoes/sessao/session_qb_sim_change");

  await page.getByRole("button", { name: /^A\s+Placenta/ }).click();
  await expect(page.getByText("Resposta A")).toBeVisible();

  await page.keyboard.press("B");
  await expect(page.getByText("Resposta B")).toBeVisible();
  await page.waitForTimeout(800);

  expect(attemptPayloads).toHaveLength(2);
  expect(attemptPayloads[0]).toMatchObject({ selected_option: "A" });
  expect(attemptPayloads[1]).toMatchObject({ selected_option: "B" });
  expect(eventTypes).toEqual(expect.arrayContaining(["answer_selected", "answer_changed"]));
});

test("session shows an honest placeholder when a question image is unavailable", async ({ page }) => {
  await page.context().addCookies([
    {
      name: "krosmed_session",
      value: "session_e2e",
      url: E2E_BASE_URL,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  const brokenImageSrc = "/v1/images/expired-token";
  const brokenSession = {
    ...sessionPayload(false),
    session_id: "session_qb_broken_image",
    items: [
      {
        ...item,
        image_refs: [brokenImageSrc],
      },
    ],
  };

  await page.route("**/api/profile", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user_id: "user_e2e",
        weekly_goal_questions: 300,
        timezone: "America/Sao_Paulo",
        reschedule_mode: "suggest",
        shift_12h_capacity: 40,
        shift_24h_capacity: 20,
        display_name: "E2E User",
        access_status: "active",
        has_completed_initial_goal_setup: true,
      }),
    });
  });
  await page.route("**/api/question-bank/sessions/session_qb_broken_image", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(brokenSession) });
  });
  await page.route("**/v1/images/expired-token", async (route) => {
    await route.fulfill({ status: 410, contentType: "text/plain", body: "expired" });
  });

  await page.goto("/banco-de-questoes/sessao/session_qb_broken_image");

  await expect(page.getByText("Imagem indisponível")).toBeVisible();
});
