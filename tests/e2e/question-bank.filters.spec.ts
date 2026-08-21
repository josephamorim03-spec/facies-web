import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const E2E_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
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
  recommendation_rank: 1,
  recommendation_reason: "high_yield",
  ranking_policy_version: "question-ranking-2",
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
  question_version: 1,
  position: 1,
  stem: "Gestante com sangramento no terceiro trimestre.",
  alternatives: { A: "Placenta previa", B: "Abortamento", C: "ITU", D: "Asma", E: "DM" },
  image_refs: [],
  table_refs: [],
  knowledge_nodes: [],
  selection_reason: {},
  source: { institution: "USP - SP", board_code: "SMK", year: 2024 },
  selected_option: null,
  eliminated_options: [],
  answer_state: "unanswered",
  answer_committed: false,
  doubtful: false,
  confidence_self_rating: null,
  answered: false,
  result_state: "unanswered",
  feedback_state: "concealed",
  reasoning_review_eligible: false,
  needs_correction: false,
  correct_answer: null,
  is_correct: null,
  is_annulled: false,
  reported_problem: false,
  report_type: null,
  report_reason: null,
  reported_at: null,
  excluded_from_scoring: false,
  exclusion_reason: null,
  exclusion_note: null,
  excluded_at: null,
};

const sourceOptions = [
  {
    option_key: "ACESSO-DIRETO",
    label: "Residência (Acesso Direto)",
    option_kind: "exam",
    question_count: 18,
    first_year: 2017,
    last_year: 2026,
  },
  {
    option_key: "REVALIDA",
    label: "Revalida",
    option_kind: "exam",
    question_count: 2,
    first_year: 2023,
    last_year: 2024,
  },
  {
    option_key: "Especialista",
    label: "Residência R+",
    option_kind: "exam",
    question_count: 5,
    first_year: 2017,
    last_year: 2021,
  },
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
  await page.route("**/api/question-bank/bootstrap**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        topics: [topic, childTopic, otherAreaTopic],
        sources: sourceOptions,
        states: [],
        years: yearStats,
        total_global: 21,
        read_model: {
          generation: 1,
          projected_at: "2026-05-27T15:00:00Z",
          lag_seconds: 0,
          status: "ready",
          projected_count: 21,
        },
      }),
    });
  });
  await page.route("**/api/question-bank/facets**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        years: yearStats,
        boards: sourceOptions.filter((source) => source.option_kind === "board"),
        exams: sourceOptions.filter((source) => source.option_kind === "exam"),
        institutions: sourceOptions.filter((source) => source.option_kind === "institution"),
        states: [],
      }),
    });
  });
}

function sessionPayload(answered = false) {
  return {
    session_id: "session_qb_e2e",
    status: "active",
    mode: "adaptive",
    resolution_mode: "simulation",
    session_purpose: "assessment",
    session_purpose_inferred: false,
    session_kind: "bank_topic",
    feedback_timing: "post_result",
    feedback_reveal_policy: "guided_choice",
    all_feedback_revealed: false,
    scoring_mode: "deferred",
    study_kind: "topic",
    full_exam_name: null,
    full_exam_year: null,
    full_exam_type: null,
    review_trail_enabled: true,
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
    draft_count: answered ? 1 : 0,
    draft_question_numbers: answered ? [1] : [],
    doubtful_count: 0,
    answered_time_ms: 0,
    items: [
      answered
        ? {
            ...item,
            selected_option: "A",
            answer_state: "draft",
            answered: true,
            result_state: "unanswered",
            feedback_state: "concealed",
            correct_answer: null,
            is_correct: null,
          }
        : item,
    ],
    created_at: "2026-05-27T15:00:00Z",
    updated_at: "2026-05-27T15:00:00Z",
    results_revealed_at: null,
    finalized_at: null,
    directed_study_id: null,
    review_task_id: "rt_e2e",
    reported_problem_count: 0,
    excluded_from_scoring_count: 0,
    scorable_question_count: 1,
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
  await page.route("**/api/reviews/agenda", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        tasks: [],
        generated_at: new Date().toISOString(),
      }),
    });
  });

  await page.goto("/banco-de-questoes?source=calendar-review&activity_id=rt_e2e&review_task_id=rt_e2e&knowledge_node_id=go-node&date=2026-05-27&area=GO&theme=Obstetricia&expected_questions=12");

  await expect(page.getByRole("region", { name: "Sessão recomendada" })).toHaveCount(0);

  await expect(page.getByTestId("question-bank-top-filters")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("main aside")).toBeVisible();
  await expect(page.getByText(/12 .*dispon/i)).toBeVisible();
  await expect(page.getByText("Obstetricia").first()).toBeVisible();
  await expect(page.getByTestId("question-bank-top-filters")).not.toContainText("Medicina");
  await expect(page.getByRole("button", { name: /filtros ativos/i })).toBeVisible();

  const quantityInput = page.getByRole("spinbutton", { name: /Questões/i });
  await quantityInput.fill("99");
  await quantityInput.blur();
  await expect(quantityInput).toHaveValue("12");

  // O padrao corrige ao terminar, uma a uma — e o rotulo agora diz isso. Antes
  // ele prometia "feedback por questão", que era o unico modo que a tela NAO
  // oferecia.
  await page.getByRole("button", { name: /Começar 12 questões.*ao terminar, uma a uma/i }).click();
  await page.waitForURL("**/banco/sessao/session_qb_e2e**");

  const payload = createPayloads[0];
  expect(payload).toBeTruthy();
  if (!payload) throw new Error("Missing session creation payload.");
  expect(payload).toMatchObject({
    area: "GO",
    knowledge_node_ids: ["go-node"],
    exam_codes: ["ACESSO-DIRETO"],
    limit: 12,
    resolution_mode: "simulation",
    feedback_timing: "post_result",
    feedback_reveal_policy: "guided_choice",
    answer_status: "unanswered",
    only_unanswered: true,
    review_task_id: "rt_e2e",
  });
  expect(String(payload.performed_at)).toContain("2026-05-27");

  await page.getByRole("button", { name: /^A\s+Placenta/ }).click();
  await expect(page.getByText("Gabarito A")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Ver gabarito" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Corrigir simulado" })).toBeVisible();
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
  await page.route("**/api/reviews/agenda", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        tasks: [],
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

  await page.getByText("2. Refinar seleção", { exact: true }).click();
  await expect(page.getByRole("checkbox", { name: /Residência \(Acesso Direto\)/ })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: /^Revalida/ })).not.toBeChecked();
  await expect(page.getByRole("checkbox", { name: /Residência R\+/ })).not.toBeChecked();
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
  await page.getByRole("button", { name: "GO", exact: true }).click();
  await expect(filterPanel).not.toContainText("Cardiologia");
  await page.waitForTimeout(400);
  expect(topicRequestUrls).toHaveLength(topicRequestsBeforeAreaChange);

  // A arvore nasce colapsada, entao o subtema so existe no DOM depois de abrir
  // o ramo. ACHADO: buscar "Placenta" tambem NAO abre o ramo que casa — a
  // filtragem preserva os ancestrais mas os mantem fechados, e o aluno que
  // pesquisa ainda precisa expandir na mao.
  await page.getByRole("button", { name: /Expandir Obstetricia/ }).click();
  await page.getByRole("checkbox", { name: /Placenta previa/ }).first().click();
  await page.getByPlaceholder("Buscar especialidade, macrotema ou subtema").fill("Placenta");
  await expect(page.getByRole("checkbox", { name: /Placenta previa/ }).first()).toBeVisible();
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

  await page.getByRole("button", { name: /Começar/ }).click();
  await expect.poll(() => createPayloads.length).toBe(1);

  const payload = createPayloads[0];
  expect(payload.search).toBe("Placenta");
  expect(payload.knowledge_node_ids).toBeUndefined();
  // A tela passou a mandar `false` explicito em vez de omitir o campo; para o
  // servidor os dois dizem a mesma coisa.
  expect(payload.generate_review_trail).toBeFalsy();
  expect(payload.board_codes).toEqual(["SMK"]);
  expect(payload.exam_codes).toEqual(["ACESSO-DIRETO"]);
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
  await page.route("**/api/reviews/agenda", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        tasks: [],
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

  await page.getByRole("button", { name: /Começar/ }).click();
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
        answer_state: selectedOption ? "draft" : "unanswered",
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

  const optionA = page.getByRole("button", { name: /^A\s+Placenta/ });
  const optionB = page.getByRole("button", { name: /^B\s+Abortamento/ });
  await optionA.click();
  await expect(optionA).toHaveAttribute("aria-pressed", "true");

  await page.keyboard.press("B");
  await expect(optionB).toHaveAttribute("aria-pressed", "true");
  await expect(optionA).toHaveAttribute("aria-pressed", "false");
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

test("o montador de sessao passa no gate automatico de WCAG", async ({ page }) => {
  // O gate mora aqui, e nao no spec de acessibilidade, porque `/banco` precisa
  // de sete rotas mockadas e elas ja existem neste arquivo. Duplicar o fixture
  // criaria uma segunda verdade sobre como o banco responde — e e' a copia
  // desatualizada que passa a ser testada.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.context().addCookies([
    {
      name: "krosmed_session",
      value: "session_e2e",
      url: E2E_BASE_URL,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  await mockQuestionBankMetadata(page);
  await page.route("**/api/question-bank/availability**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        total_count: 120,
        available_count: 120,
        answered_count: 0,
        unanswered_count: 120,
        max_selectable: 120,
      }),
    });
  });
  await page.route("**/api/question-bank/topics**", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify([]) });
  });
  await page.route("**/api/question-bank/performance", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ areas: [], first_attempt_accuracy: null }),
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

  await page.goto("/banco-de-questoes");
  await expect(page.getByTestId("question-bank-top-filters")).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(
    results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.length,
      help: violation.help,
    })),
  ).toEqual([]);
});
