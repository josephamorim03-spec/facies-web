import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page, type Route, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

import { addHttpOnlySession } from "./support/authCookies";
import { mockCronogramaApi } from "./support/cronogramaApiMock";

const SCREENSHOT_DIR = resolve(process.cwd(), "test-results", "design-redesign");
const NOW = "2026-07-27T12:00:00.000Z";

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

function metric(key: string, label: string, value: number | string | null, unit = "") {
  return {
    key,
    label,
    value,
    unit,
    definition: label,
    period: "week",
    scope: "student",
    evidence_kind: "observed",
    confidence: "high",
    generated_at: NOW,
    source_status: "complete",
  };
}

function todayAction(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    kind: "question_block",
    title: "Resolver bloco clínico de GO",
    rationale: "A maior alavanca hoje é corrigir pré-eclâmpsia e hemorragias do terceiro trimestre enquanto a memória ainda está quente.",
    estimated_minutes: 35,
    href: "/banco-de-questoes?area=GO&answer_status=needs_review",
    cta_label: "Começar bloco",
    source: "trainer",
    priority_reason: "fila crítica",
    confidence: "high",
    ...overrides,
  };
}

function loadNote() {
  return {
    label: "adequada",
    estimated_minutes: 62,
    recommended_limit_minutes: 75,
    overload_alert: false,
    short_message: "Carga sustentável: um bloco clínico e revisão curta.",
  };
}

function studentExperience() {
  return {
    contract_version: "student-experience-v1",
    enabled: true,
    generated_at: NOW,
    status: "complete",
    period: { kind: "week", starts_at: "2026-07-20", ends_at: "2026-07-27", timezone: "America/Sao_Paulo" },
    activity: {
      questions_answered: metric("questions_answered", "Questões respondidas", 186, "q"),
      questions_correct: metric("questions_correct", "Acertos", 132, "q"),
      questions_wrong: metric("questions_wrong", "Erros", 54, "q"),
      accuracy_pct: metric("accuracy_pct", "Precisão", 71, "%"),
      weekly_goal_questions: metric("weekly_goal_questions", "Meta semanal", 240, "q"),
      weekly_progress_pct: metric("weekly_progress_pct", "Progresso semanal", 78, "%"),
    },
    review_load: {
      topic_tasks_due: 2,
      questions_due: 38,
      cards_due: 24,
      overdue_topic_tasks: 0,
      overdue_cards: 4,
      estimated_minutes: 46,
    },
    active_session: null,
    next_action: null,
    evidence: { finalized_sessions: 8, scorable_questions: 186, editorial_coverage_pct: 0.82, confidence: "high" },
    missing_sources: [],
  };
}

function surfaceHome(kind: "review" | "track" | "plan") {
  const titleByKind = {
    review: "Revisar GO antes de abrir assunto novo",
    track: "Gráficos primeiro: queda recente em GO",
    plan: "Proteger calendário de revisão",
  };
  return {
    contract_version: kind === "review" ? "student-review-home-v1" : kind === "track" ? "student-track-v1" : "student-plan-v1",
    generated_at: NOW,
    status: "complete",
    primary_action: todayAction({
      title: titleByKind[kind],
      href: kind === "plan" ? "/calendario" : kind === "track" ? "/estatisticas/graficos" : "/banco-de-questoes?answer_status=needs_review",
      cta_label: kind === "plan" ? "Abrir calendário" : "Começar",
    }),
    backup_actions: [
      todayAction({ title: "Revisar cards críticos", cta_label: "Abrir cards", href: "/cards-adaptativos", estimated_minutes: 12 }),
      todayAction({ title: "Fazer bloco curto", cta_label: "Praticar", href: "/banco-de-questoes", estimated_minutes: 20 }),
    ],
    load_note: loadNote(),
    insight: {
      title: kind === "track" ? "GO perdeu estabilidade nas últimas semanas" : "Revisão cabe no dia sem apertar",
      message: "O sinal vem de questões recentes, não de uma média antiga. Use a próxima ação como intervenção curta.",
      severity: "attention",
      action_kind: "question_block",
      href: "/banco-de-questoes",
      confidence: "high",
    },
    support_metric: {
      label: "Precisão recente",
      value: 64,
      unit: "%",
      period: "week",
      source: "question_bank",
      interpretation: "Abaixo do seu platô de 72%.",
    },
    deep_links: [
      { label: "Banco de questões", href: "/banco-de-questoes", reason: "treino ativo" },
      { label: "Gráficos", href: "/estatisticas/graficos", reason: "detalhar sinal" },
    ],
    data_quality: "sufficient",
    goal_status: {
      weekly_goal: 240,
      weekly_progress_pct: 78,
      load_label: "adequada",
      overload_alert: false,
      recommended_action: "manter revisão curta",
    },
    details: { questions_done_week: 186, accuracy_pct: 71 },
    missing_sources: [],
  };
}

function trainerAction(kind: string, title: string, href: string, actionId: string) {
  return {
    kind,
    action_id: actionId,
    title,
    rationale: "Alta chance de ganho com baixa troca de contexto.",
    priority_score: 90,
    estimated_minutes: 18,
    source_module: "trainer",
    required_capabilities: [],
    blocked_reason: null,
    handoff: null,
    why_factors: [{ factor: "weak_area", detail: "queda recente" }],
    outcome_targets: ["retention"],
    signals: [{ key: "review_due", label: "vence hoje", severity: "warning" }],
    start_payload: { mode: "adaptive", resolution_mode: "training", answer_status: "needs_review", limit: 12 },
    href,
    pedagogical_confidence: null,
  };
}

function reviewQueue() {
  const first = {
    rank: 1,
    action: trainerAction("scheduled_review", "Revisar hemorragias do 3º trimestre", "/banco-de-questoes?theme=Hemorragias", "review-1"),
    urgency_score: 92,
    expected_gain_score: 80,
    queue_reason: "vence hoje e reaparece em provas",
    expected_result: "reduzir erro de diagnóstico diferencial",
    editorial_quality: { state: "reviewed", label: "revisada", coverage_pct: 0.86 },
  };
  const second = {
    rank: 2,
    action: trainerAction("flashcard_review", "Cards de pré-eclâmpsia", "/cards-adaptativos", "cards-1"),
    urgency_score: 70,
    expected_gain_score: 65,
    queue_reason: "24 cards no ponto",
    expected_result: "proteger retenção",
    editorial_quality: { state: "reviewed", label: "revisada", coverage_pct: 0.78 },
  };
  return {
    recommendation_id: "review-evidence",
    generated_at: NOW,
    policy_version: "design-test",
    primary_item: first,
    items: [first, second],
    counts: { total: 2, questions: 1, corrections: 0, cards: 1 },
    daily_load: {
      prescribed_minutes: 46,
      cognitive_load: "moderate",
      pending_reviews: 2,
      recommended_limit_minutes: 75,
      overload_alert: false,
      review_load: {
        topic_tasks_due: 1,
        questions_due: 38,
        cards_due: 24,
        overdue_topic_tasks: 0,
        overdue_cards: 4,
        estimated_minutes: 46,
      },
    },
    flashcards_overview: {
      due_count: 24,
      new_count: 6,
      overdue_count: 4,
      total_eligible: 80,
      suggested_target_cards: 24,
      estimated_minutes: 12,
      reason_counts: [{ reason: "due_now", label: "No ponto", count: 20 }],
      by_area: [{ area: "GO", due_count: 18, new_count: 4, overdue_count: 3, total_eligible: 42 }],
      priority_preview: [
        {
          note_id: "note-1",
          area: "GO",
          theme: "Pré-eclâmpsia",
          insight_question: "Quando antecipar sulfato de magnésio?",
          weight: 3,
          turbo_due_at: NOW,
          context: { note_id: "note-1", reasons: ["due_now"], primary_reason: "due_now", label: "No ponto" },
        },
      ],
    },
    previous_outcome: null,
    missing_sources: [],
  };
}

function weeklyTimeline() {
  const labels = ["05/05", "12/05", "19/05", "26/05", "02/06", "09/06", "16/06", "23/06", "30/06", "07/07", "14/07", "21/07"];
  return {
    weeks: labels.map((label, index) => {
      const total = 80 + index * 8;
      const goTotal = 20 + index;
      const cmTotal = 24 + Math.max(0, 6 - index);
      const accuracy = 64 + Math.round(Math.sin(index / 2) * 8) + (index > 7 ? 4 : 0);
      return {
        week_label: label,
        week_start: `2026-07-${String(Math.max(1, index + 1)).padStart(2, "0")}`,
        total,
        correct: Math.round(total * accuracy / 100),
        accuracy_pct: accuracy,
        areas: {
          GO: { total: goTotal, correct: Math.round(goTotal * 0.64), accuracy_pct: 64 },
          CM: { total: cmTotal, correct: Math.round(cmTotal * 0.76), accuracy_pct: 76 },
          PD: { total: 14, correct: 10, accuracy_pct: 71 },
          CG: { total: 10, correct: 7, accuracy_pct: 70 },
          MP: { total: 8, correct: 6, accuracy_pct: 75 },
          OU: { total: 3, correct: 2, accuracy_pct: 67 },
        },
      };
    }),
    delta_by_area: { GO: -8, CM: 6, PD: 2, CG: 1, MP: 0, OU: null },
  };
}

function performanceSummary() {
  return {
    area_summaries: [
      { area: "GO", total_questions: 72, correct_questions: 46, accuracy: 63.9, accuracy_pct: 63.9, weak_themes: [{ theme: "Pré-eclâmpsia", total_questions: 18, accuracy: 55, accuracy_pct: 55 }] },
      { area: "CM", total_questions: 84, correct_questions: 64, accuracy: 76.2, accuracy_pct: 76.2, weak_themes: [] },
      { area: "PD", total_questions: 48, correct_questions: 34, accuracy: 70.8, accuracy_pct: 70.8, weak_themes: [] },
    ],
    diagnosis: {
      ready: true,
      weaknesses: [{ area: "GO", theme: "Pré-eclâmpsia", accuracy_pct: 55, total_questions: 18 }],
    },
    health_score_pct: 72,
  };
}

function sessionPayload(answered = false) {
  return {
    session_id: "design_session",
    status: "active",
    mode: "adaptive",
    resolution_mode: "training",
    primary_knowledge_node_id: "go-node",
    area: "GO",
    theme: "Pré-eclâmpsia",
    subtheme: null,
    adaptive_weight: 2,
    adaptive_weight_score: 0.7,
    adaptive_weight_factors: {},
    performed_at: NOW,
    filters: {},
    total_questions: 1,
    answered_count: answered ? 1 : 0,
    unanswered_count: answered ? 0 : 1,
    unanswered_question_numbers: answered ? [] : [1],
    doubtful_count: 0,
    items: [
      {
        question_id: "q-design-1",
        position: 1,
        stem: "Gestante de 33 semanas chega com cefaleia intensa, escotomas e PA 170/110 mmHg. Proteinúria confirmada. Qual é a próxima conduta mais adequada?",
        alternatives: {
          A: "Internar, controlar PA, iniciar sulfato de magnésio e avaliar interrupção da gestação.",
          B: "Alta com metildopa e retorno em sete dias.",
          C: "Tocolítico e corticoterapia isolada até 40 semanas.",
          D: "Restrição hídrica e observação domiciliar.",
          E: "Antibiótico empírico por suspeita de pielonefrite.",
        },
        image_refs: [],
        table_refs: [],
        knowledge_nodes: [{ knowledge_node_id: "go-node", node_name: "Pré-eclâmpsia grave", node_type: "microcompetency", is_primary: true }],
        primary_microcompetency_label: "Pré-eclâmpsia grave",
        selection_reason: { selected_because: ["erro recente", "alta recorrência"] },
        source: { institution: "USP - SP", board_code: "USP", year: 2024 },
        selected_option: answered ? "A" : null,
        doubtful: false,
        answered,
        needs_correction: true,
        correct_answer: answered ? "A" : null,
        is_correct: answered ? true : null,
        post_answer_reflection: null,
        distractor_diagnosis: {},
        text_highlights: [],
        bookmarked: false,
      },
    ],
    created_at: NOW,
    updated_at: NOW,
    finalized_at: null,
    results_revealed_at: null,
    directed_study_id: null,
    review_task_id: "rt-design",
  };
}

async function mockDesignApi(page: Page) {
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const method = request.method();
    const path = new URL(request.url()).pathname;

    if (method === "GET" && path === "/api/profile") {
      return json(route, {
        user_id: "design-user",
        weekly_goal_questions: 240,
        timezone: "America/Sao_Paulo",
        reschedule_mode: "suggest",
        display_name: "Jose",
        access_status: "active",
        has_completed_initial_goal_setup: true,
      });
    }
    if (method === "GET" && path === "/api/me") return json(route, { user_id: "design-user", display_name: "Jose" });
    if (method === "GET" && path === "/api/student/today") {
      return json(route, {
        contract_version: "student-today-v1",
        generated_at: NOW,
        status: "complete",
        primary_action: todayAction(),
        backup_actions: [
          todayAction({ title: "Revisar cards críticos", href: "/cards-adaptativos", cta_label: "Abrir cards", estimated_minutes: 12 }),
          todayAction({ title: "Ajustar calendário", href: "/calendario", cta_label: "Planejar", estimated_minutes: 5 }),
          todayAction({ title: "Ver relatório", href: "/estatisticas", cta_label: "Acompanhar", estimated_minutes: 6 }),
        ],
        today_load: loadNote(),
        schedule_preview: {
          date: "2026-07-27",
          items: [
            { task_id: "task-1", title: "Pré-eclâmpsia", area: "GO", due_date: "2026-07-27", expected_questions: 18, is_overdue: false, is_critical: true, href: "/banco-de-questoes?theme=pre-eclampsia" },
            { task_id: "task-2", title: "Pneumonia adquirida na comunidade", area: "CM", due_date: "2026-07-27", expected_questions: 20, is_overdue: false, is_critical: false, href: "/banco-de-questoes?theme=pneumonia" },
          ],
          overdue_count: 0,
          hidden_count: 1,
          reschedule_recommended: false,
        },
        review_snapshot: { pending_reviews: 2, overdue_reviews: 0, cards_due: 24, estimated_minutes: 46 },
        progress_snapshot: { questions_done_week: 186, weekly_goal_questions: 240, weekly_progress_pct: 78, accuracy_pct: 71 },
        details: { active_session: null, trainer_action: null, secondary_actions: [], schedule_suggestions_count: 0, evidence_confidence: "high" },
        missing_sources: [],
      });
    }
    if (method === "GET" && path === "/api/student/experience") return json(route, studentExperience());
    if (method === "GET" && path === "/api/student/review-home") return json(route, surfaceHome("review"));
    if (method === "GET" && path === "/api/student/track") return json(route, surfaceHome("track"));
    if (method === "GET" && path === "/api/student/plan") return json(route, surfaceHome("plan"));
    if (method === "GET" && path === "/api/trainer/review-queue") return json(route, reviewQueue());
    if (method === "GET" && path === "/api/trainer/prescription/today") {
      return json(route, {
        recommendation_id: "today-design",
        generated_at: NOW,
        policy_version: "design-test",
        primary_action: trainerAction("question_block", "Resolver bloco clínico de GO", "/banco-de-questoes", "today-1"),
        secondary_actions: [],
        state_summary: { headline: "Dia sustentável", detail: null },
        signals: [],
        closed_loop: { measure: [], next_check: [], recalibration_hint: [] },
        daily_load: { prescribed_minutes: 62, cognitive_load: "moderate", pending_reviews: 2, recommended_limit_minutes: 75, overload_alert: false },
        previous_outcome: null,
        plan_progress: { completed_actions: 1, total_actions: 3, label: "1/3" },
        missing_sources: [],
      });
    }
    if (method === "POST" && path.includes("/api/trainer/recommendations/")) return json(route, { event_id: "event-design", recommendation_id: "design", event_type: "shown", occurred_at: NOW });

    if (method === "GET" && path === "/api/notes/operational/streak") {
      return json(route, { streak_days: 7, streak_max: 18, streak_at_risk: false, streak_reviews: 6, streak_flashcards_seen: 74, weekly_study_days: 5, weekly_protected_days: 2, active_protection: false, protection_window_end: null });
    }
    if (method === "GET" && path === "/api/notes/operational/turbo/overview") return json(route, reviewQueue().flashcards_overview);
    if (method === "GET" && path === "/api/notes/operational/turbo/area-stats") {
      return json(route, { total_notes: 80, total_reviews: 220, total_correct: 160, total_incorrect: 60, by_area: [{ area: "GO", notes_count: 34, reviews_total: 90, reviews_correct: 58, reviews_incorrect: 32 }, { area: "CM", notes_count: 28, reviews_total: 76, reviews_correct: 62, reviews_incorrect: 14 }] });
    }
    if (method === "GET" && path === "/api/notes/operational/turbo/session/daily-completed-cards") return json(route, { timezone: "America/Sao_Paulo", by_day: [] });

    if (method === "GET" && path === "/api/studies/performance-summary") return json(route, performanceSummary());
    if (method === "GET" && path === "/api/studies/weekly-timeline") return json(route, weeklyTimeline());
    if (method === "GET" && path === "/api/schedule/generate") {
      return json(route, { mode: "NORMAL", date: "2026-07-27", focus_minutes: 62, buffer_minutes: 20, total_planned_minutes: 82, recovery_mode: false, rebalance_required: false, reason: null, blocks: [] });
    }
    if (method === "GET" && path === "/api/question-bank/diagnosis/longitudinal") {
      return json(route, { trap_sensitivity: 0.32, overconfidence_score: 0.18, impulsive_rate: 0.12, weak_node_ids: ["go-node"], at_risk_node_ids: ["go-node"], nodes: [] });
    }
    if (method === "GET" && path === "/api/question-bank/learner-model") {
      return json(route, { user_id: "design-user", generated_at: NOW, competencies: [], metacognition: {}, adaptive_summary: {} });
    }
    if (method === "GET" && path === "/api/question-bank/sessions") return json(route, []);
    if (method === "GET" && path === "/api/question-bank/sessions/design_session") return json(route, sessionPayload(false));
    if (method === "PUT" && path === "/api/question-bank/sessions/design_session/items/1/attempt") return json(route, sessionPayload(true));
    if (method === "POST" && path === "/api/question-bank/sessions/design_session/items/1/events") return json(route, { events: [] });
    if (method === "GET" && path === "/api/question-bank/sessions/design_session/items/1/guided-review") {
      return json(route, { eligible: false, checkpoints: [], existing_responses: [] });
    }

    return route.fallback();
  });
}

async function capture(page: Page, testInfo: TestInfo, name: string) {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
  const shotPath = resolve(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: shotPath, fullPage: true, animations: "disabled" });
  await testInfo.attach(name, { path: shotPath, contentType: "image/png" });
}

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe("P0 redesign evidence screenshots", () => {
  test.beforeEach(async ({ context, page }) => {
    await addHttpOnlySession(context);
    await mockCronogramaApi(page);
    await mockDesignApi(page);
  });

  for (const viewport of [
    { name: "desktop", size: { width: 1440, height: 1000 }, axe: true },
    { name: "mobile", size: { width: 390, height: 844 }, axe: false },
  ]) {
    test(`captures student P0 surfaces on ${viewport.name}`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport.size);

      await page.goto("/hoje");
      await expect(page.getByRole("heading", { name: /Olá|Bom dia|Boa tarde|Boa noite/i })).toBeVisible();
      await expect(page.getByRole("link", { name: "Começar bloco" })).toBeVisible();
      await capture(page, testInfo, `${viewport.name}-hoje`);
      if (viewport.axe) {
        const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
        expect(results.violations).toEqual([]);
      }
      await assertNoHorizontalOverflow(page);

      await page.goto("/revisar");
      await expect(page.getByRole("heading", { name: "Revisar" })).toBeVisible();
      await expect(page.getByText(/Carga de revisão|Revisão essencial/i).first()).toBeVisible();
      await capture(page, testInfo, `${viewport.name}-revisar`);
      await assertNoHorizontalOverflow(page);

      await page.goto("/calendario");
      await expect(page.locator("[aria-label='Calendário mensal']")).toBeVisible();
      await expect(page.locator("[data-calendar-viewport='true']")).toBeVisible();
      await capture(page, testInfo, `${viewport.name}-calendario`);
      if (viewport.axe) {
        const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
        expect(results.violations).toEqual([]);
      }
      await assertNoHorizontalOverflow(page);

      await page.goto("/estatisticas");
      await expect(page.getByRole("heading", { name: "Evolução" })).toBeVisible();
      await expect(page.getByText("Dados das últimas 12 semanas")).toBeVisible();
      await capture(page, testInfo, `${viewport.name}-acompanhar`);
      if (viewport.axe) {
        const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
        expect(results.violations).toEqual([]);
      }
      await assertNoHorizontalOverflow(page);

      await page.goto("/banco-de-questoes/sessao/design_session");
      await expect(page.getByText("Gestante de 33 semanas")).toBeVisible();
      await expect(page.getByText(/Gabarito A/i)).toHaveCount(0);
      await capture(page, testInfo, `${viewport.name}-questao-resolver`);
      await page.getByRole("button", { name: /^A\s+Internar/ }).click();
      await expect(page.getByRole("button", { name: "Ver gabarito" })).toBeVisible();
      await expect(page.getByText(/Gabarito A/i)).toHaveCount(0);
      await page.getByRole("button", { name: "Ver gabarito" }).click();
      await expect(page.getByText(/Gabarito/i).first()).toBeVisible();
      await expect(page.getByText(/Caminho validado|Erro capturado/i)).toBeVisible();
      await capture(page, testInfo, `${viewport.name}-questao-correcao`);
      await assertNoHorizontalOverflow(page);
    });
  }
});
