import { createWriteStream, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const ROOT = process.cwd();
const OUT_DIR = resolve(ROOT, "test-results", "design-redesign");
const SERVER_LOG_DIR = resolve(ROOT, "test-results", "design-redesign-server");
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3107";
const NOW = "2026-07-27T12:00:00.000Z";

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(SERVER_LOG_DIR, { recursive: true });

function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function plusDays(iso, days) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function waitForServer(url, timeoutMs = 90_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${url}/api/version`, { signal: AbortSignal.timeout(2_000) });
      if (response.ok) return true;
    } catch {
      // keep polling
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 1_000));
  }
  return false;
}

async function ensureServer() {
  if (await waitForServer(BASE_URL, 2_000)) return null;
  const { port } = new URL(BASE_URL);
  const out = createWriteStream(resolve(SERVER_LOG_DIR, "next-out.log"), { flags: "a" });
  const err = createWriteStream(resolve(SERVER_LOG_DIR, "next-err.log"), { flags: "a" });
  const child = spawn(
    "node",
    ["./node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", port || "3107"],
    { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
  );
  child.stdout.pipe(out);
  child.stderr.pipe(err);
  if (!(await waitForServer(BASE_URL))) {
    child.kill();
    throw new Error(`Next server did not become ready at ${BASE_URL}`);
  }
  return child;
}

function fulfillJson(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

function metric(key, label, value, unit = "") {
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

function todayAction(overrides = {}) {
  return {
    kind: "question_block",
    title: "Resolver bloco clínico de GO",
    rationale: "A maior alavanca hoje é corrigir pré-eclâmpsia e hemorragias do terceiro trimestre enquanto a memória ainda está quente.",
    estimated_minutes: 35,
    href: "/banco-de-questoes?area=GO&answer_status=needs_review",
    cta_label: "Começar bloco",
    source: "trainer",
    priority_reason: "fila critica",
    confidence: "high",
    // O contrato manda `area`; sem ela no mock a captura exercitava so a
    // inferencia por texto e registrava "Outras" como se fosse o normal da tela.
    area: "GO",
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

function trainerAction(kind, title, href, actionId) {
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
      accuracy_pct: metric("accuracy_pct", "Precisao", 71, "%"),
      weekly_goal_questions: metric("weekly_goal_questions", "Meta semanal", 240, "q"),
      weekly_progress_pct: metric("weekly_progress_pct", "Progresso semanal", 78, "%"),
    },
    review_load: { topic_tasks_due: 2, questions_due: 38, cards_due: 24, overdue_topic_tasks: 0, overdue_cards: 4, estimated_minutes: 46 },
    active_session: null,
    next_action: null,
    evidence: { finalized_sessions: 8, scorable_questions: 186, editorial_coverage_pct: 0.82, confidence: "high" },
    missing_sources: [],
  };
}

function surfaceHome(kind) {
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
      cta_label: kind === "plan" ? "Abrir calendario" : "Comecar",
    }),
    backup_actions: [
      todayAction({ title: "Revisar cards críticos", cta_label: "Abrir cards", href: "/cards-adaptativos", estimated_minutes: 12 }),
      todayAction({ title: "Fazer bloco curto", cta_label: "Praticar", href: "/banco-de-questoes", estimated_minutes: 20 }),
    ],
    load_note: loadNote(),
    insight: {
      title: kind === "track" ? "GO perdeu estabilidade nas ultimas semanas" : "Revisão cabe no dia sem apertar",
      message: "O sinal vem de questões recentes, não de uma média antiga. Use a próxima ação como intervenção curta.",
      severity: "attention",
      action_kind: "question_block",
      href: "/banco-de-questoes",
      confidence: "high",
    },
    support_metric: { label: "Precisao recente", value: 64, unit: "%", period: "week", source: "question_bank", interpretation: "Abaixo do seu plato de 72%." },
    deep_links: [
      { label: "Banco de questões", href: "/banco-de-questoes", reason: "treino ativo" },
      { label: "Relatorio", href: "/estatisticas/relatorio", reason: "detalhar sinal" },
    ],
    data_quality: "sufficient",
    goal_status: { weekly_goal: 240, weekly_progress_pct: 78, load_label: "adequada", overload_alert: false, recommended_action: "manter revisão curta" },
    details: { questions_done_week: 186, accuracy_pct: 71 },
    missing_sources: [],
  };
}

function reviewQueue() {
  const first = {
    rank: 1,
    action: trainerAction("scheduled_review", "Revisar hemorragias do 3o trimestre", "/banco-de-questoes?theme=Hemorragias", "review-1"),
    urgency_score: 92,
    expected_gain_score: 80,
    queue_reason: "vence hoje e reaparece em provas",
    expected_result: "reduzir erro de diagnostico diferencial",
    editorial_quality: { state: "reviewed", label: "revisada", coverage_pct: 0.86 },
  };
  const second = {
    rank: 2,
    action: trainerAction("flashcard_review", "Cards de pre-eclampsia", "/cards-adaptativos", "cards-1"),
    urgency_score: 70,
    expected_gain_score: 65,
    queue_reason: "24 cards no ponto",
    expected_result: "proteger retencao",
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
      review_load: { topic_tasks_due: 1, questions_due: 38, cards_due: 24, overdue_topic_tasks: 0, overdue_cards: 4, estimated_minutes: 46 },
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
          theme: "Pre-eclampsia",
          insight_question: "Quando antecipar sulfato de magnesio?",
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
        correct: Math.round((total * accuracy) / 100),
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

function calendarData() {
  const today = todayISO();
  const tomorrow = plusDays(today, 1);
  const yesterday = plusDays(today, -1);
  const now = new Date().toISOString();
  const task = (id, date, area, theme, status = "pending") => ({
    task_id: id,
    user_id: "design-user",
    area,
    theme,
    subtheme: null,
    source_study_id: `study-${id}`,
    due_date: date,
    ideal_due_date: date,
    due_at: `${date}T12:00:00Z`,
    ideal_due_at: `${date}T12:00:00Z`,
    is_critical: area === "GO",
    is_overdue: date < today && status !== "done",
    status,
    expected_questions: area === "GO" ? 18 : 20,
    priority_score: area === "GO" ? 95 : 70,
  });
  return {
    pending: [task("task-today-go", today, "GO", "Pre-eclampsia"), task("task-tomorrow-cm", tomorrow, "CM", "Pneumonia")],
    done: [task("task-done", yesterday, "PD", "Asma", "done")],
    studies: [
      {
        study_id: "study-today-go",
        area: "GO",
        theme: "Pre-eclampsia",
        subtheme: null,
        total_questions: 30,
        correct_questions: 20,
        user_weight: 2,
        performed_at: `${today}T14:00:00Z`,
        created_at: now,
        accuracy: 66.7,
        is_review: false,
        fsrs_rating: null,
        study_kind: "topic",
        full_exam_name: null,
        full_exam_year: null,
        full_exam_type: null,
        origin_review_task_id: null,
        import_session_id: null,
      },
    ],
    events: [
      { event_id: "event-work", user_id: "design-user", label: "__WORK__:Trabalho", event_type: "event", weekday: null, event_date: today, active_until: null, duration_hours: 8, created_at: now },
      { event_id: "event-shift", user_id: "design-user", label: "__DUTY_12__:Plantao", event_type: "event", weekday: null, event_date: tomorrow, active_until: null, duration_hours: 12, created_at: now },
    ],
  };
}

function performanceSummary() {
  const weakTheme = {
    key: "GO:Pre-eclampsia",
    area: "GO",
    theme: "Pre-eclampsia",
    total_questions: 18,
    correct_questions: 10,
    accuracy_pct: 55,
    review_count: 3,
    stable_review_ratio_pct: 42,
    consistency_score: 0.48,
    days_since_last_study: 2,
    retention_pct: 58,
    consistency_pct: 42,
    system_confidence_pct: 82,
    impact_score_pct: 76,
    regression_risk_pct: 68,
    trend: "down",
    dominant_signal: "queda recente",
    action_hint: "Refazer erros e comparar condutas.",
    strong_score: 24,
    weak_score: 76,
  };
  return {
    area_summaries: [
      { area: "GO", area_accuracy_pct: 63.9, total_questions: 72, themes: [weakTheme], trend: "down" },
      {
        area: "CM",
        area_accuracy_pct: 76.2,
        total_questions: 84,
        themes: [{
          key: "CM:Pneumonia",
          area: "CM",
          theme: "Pneumonia",
          total_questions: 24,
          correct_questions: 19,
          accuracy_pct: 79,
          review_count: 2,
          stable_review_ratio_pct: 70,
          consistency_score: 0.74,
          days_since_last_study: 3,
        }],
        trend: "up",
      },
      { area: "PD", area_accuracy_pct: 70.8, total_questions: 48, themes: [], trend: "flat" },
    ],
    diagnosis: {
      ready: true,
      reason: null,
      total_questions: 204,
      min_theme_questions: 10,
      strengths: [],
      weaknesses: [weakTheme],
    },
    health_score_pct: 72,
  };
}

function qbankTopic(overrides = {}) {
  return {
    knowledge_node_id: "go-node",
    parent_knowledge_node_id: "go-root",
    node_code: "QB-GO-PREECLAMPSIA",
    node_name: "Pré-eclâmpsia grave",
    node_type: "microcompetency",
    node_path: ["Ginecologia e Obstetricia", "Hipertensão na gestação"],
    path_label: "GO > Hipertensão na gestação > Pré-eclâmpsia grave",
    depth: 3,
    display_order: 1,
    description: "Conduta, sulfato de magnesio e criterio de interrupcao.",
    question_count: 42,
    primary_question_count: 34,
    board_count: 8,
    avg_link_weight: 0.9,
    avg_confidence: 0.92,
    difficulty_mean: 0.58,
    classification_confidence_mean: 0.94,
    first_seen_year: 2018,
    last_seen_year: 2026,
    recurrence_score: 0.81,
    bank_demand_score: 0.88,
    board_frequency: { "USP-SP": 8, "ENARE": 6 },
    charge_patterns: {},
    answer_types: {},
    adaptive_weight: 0.86,
    adaptive_weight_score: 86,
    adaptive_weight_factors: { student_error_need: 0.9, bank_demand: 0.8 },
    ...overrides,
  };
}

function questionBankBootstrap() {
  const topics = [
    qbankTopic({ knowledge_node_id: "go-root", parent_knowledge_node_id: null, node_name: "Ginecologia e Obstetricia", node_type: "specialty", depth: 1, question_count: 180, adaptive_weight_score: 72 }),
    qbankTopic({ knowledge_node_id: "go-hipertensao", parent_knowledge_node_id: "go-root", node_name: "Hipertensão na gestação", node_type: "theme", depth: 2, question_count: 74, adaptive_weight_score: 80 }),
    qbankTopic(),
  ];
  return {
    topics,
    sources: [
      { option_key: "USP-SP", label: "USP-SP", option_kind: "board", question_count: 18, first_year: 2019, last_year: 2026 },
      { option_key: "ENARE", label: "ENARE", option_kind: "exam", question_count: 34, first_year: 2021, last_year: 2026 },
      { option_key: "USP", label: "USP", option_kind: "institution", question_count: 18, first_year: 2019, last_year: 2026 },
    ],
    states: [
      { state_code: "SP", label: "SP", question_count: 18, first_year: 2019, last_year: 2026 },
      { state_code: "PE", label: "PE", question_count: 7, first_year: 2020, last_year: 2025 },
      { state_code: "MG", label: "MG", question_count: 6, first_year: 2018, last_year: 2024 },
      { state_code: "SC", label: "SC", question_count: 4, first_year: 2021, last_year: 2025 },
    ],
    years: [
      { year: 2026, question_count: 12 },
      { year: 2025, question_count: 18 },
      { year: 2024, question_count: 20 },
      { year: null, question_count: 2 },
    ],
    total_global: 1240,
    read_model: { generation: 42, projected_at: NOW, lag_seconds: 0, status: "ready", projected_count: 1240 },
  };
}

function questionBankAvailability() {
  return {
    total_count: 42,
    answered_count: 12,
    unanswered_count: 30,
    available_count: 30,
    max_selectable: 30,
    answer_status: "unanswered",
    correction_status: "all",
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
    theme: "Pre-eclampsia",
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
          C: "Tocolitico e corticoterapia isolada ate 40 semanas.",
          D: "Restrição hídrica e observação domiciliar.",
          E: "Antibiotico empirico por suspeita de pielonefrite.",
        },
        image_refs: [],
        table_refs: [],
        knowledge_nodes: [{ knowledge_node_id: "go-node", node_name: "Pré-eclâmpsia grave", node_type: "microcompetency", is_primary: true }],
        primary_microcompetency_label: "Pré-eclâmpsia grave",
        selection_reason: { selected_because: ["erro recente", "alta recorrencia"] },
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

async function mockApi(page) {
  const cal = calendarData();
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const path = url.pathname;

    if (method === "GET" && path === "/api/profile") {
      return fulfillJson(route, {
        user_id: "design-user",
        weekly_goal_questions: 240,
        timezone: "America/Sao_Paulo",
        reschedule_mode: "suggest",
        shift_12h_capacity: 40,
        shift_24h_capacity: 20,
        display_name: "Jose",
        access_status: "active",
        has_completed_initial_goal_setup: true,
        photo_url: null,
        priority_boards: ["USP-SP", "ENARE"],
        weekly_goal_notifications_enabled: true,
        calendar_change_alerts_enabled: true,
        calendar_recommendations_enabled: true,
        default_feedback_timing: "post_result",
        default_feedback_reveal_policy: "guided_choice",
        confidence_timing: "post_session",
        has_chosen_feedback_default: true,
      });
    }
    if (method === "GET" && path === "/api/fsrs/config") {
      return fulfillJson(route, { parameters: null, desired_retention: 0.9 });
    }
    if (method === "GET" && path === "/api/question-bank/boards") {
      return fulfillJson(route, [
        { board_code: "USP-SP", board_name: "USP-SP", question_count: 420 },
        { board_code: "ENARE", board_name: "ENARE", question_count: 810 },
        { board_code: "SUS-SP", board_name: "SUS-SP", question_count: 305 },
      ]);
    }
    if (method === "GET" && path === "/api/me") return fulfillJson(route, { user_id: "design-user", display_name: "Jose" });
    if (method === "GET" && path === "/api/student/today") {
      return fulfillJson(route, {
        contract_version: "student-today-v1",
        generated_at: NOW,
        status: "complete",
        primary_action: todayAction(),
        backup_actions: [
          todayAction({ title: "Revisar cards criticos", href: "/cards-adaptativos", cta_label: "Abrir cards", estimated_minutes: 12 }),
          todayAction({ title: "Ajustar calendário", href: "/calendario", cta_label: "Planejar", estimated_minutes: 5 }),
          todayAction({ title: "Ver relatório", href: "/estatisticas", cta_label: "Acompanhar", estimated_minutes: 6 }),
        ],
        today_load: loadNote(),
        schedule_preview: {
          date: todayISO(),
          items: [
            { task_id: "task-1", title: "Pre-eclampsia", area: "GO", due_date: todayISO(), expected_questions: 18, is_overdue: false, is_critical: true, href: "/banco-de-questoes?theme=pre-eclampsia" },
            { task_id: "task-2", title: "Pneumonia adquirida na comunidade", area: "CM", due_date: todayISO(), expected_questions: 20, is_overdue: false, is_critical: false, href: "/banco-de-questoes?theme=pneumonia" },
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
    if (method === "GET" && path === "/api/student/experience") return fulfillJson(route, studentExperience());
    if (method === "GET" && path === "/api/student/review-home") return fulfillJson(route, surfaceHome("review"));
    if (method === "GET" && path === "/api/student/track") return fulfillJson(route, surfaceHome("track"));
    if (method === "GET" && path === "/api/student/plan") return fulfillJson(route, surfaceHome("plan"));
    if (method === "GET" && path === "/api/trainer/review-queue") return fulfillJson(route, reviewQueue());
    if (method === "GET" && path === "/api/trainer/prescription/today") {
      return fulfillJson(route, {
        recommendation_id: "today-design",
        generated_at: NOW,
        policy_version: "design-test",
        primary_action: trainerAction("question_block", "Resolver bloco clínico de GO", "/banco-de-questoes", "today-1"),
        secondary_actions: [],
        state_summary: { headline: "Dia sustentavel", detail: null },
        signals: [],
        closed_loop: { measure: [], next_check: [], recalibration_hint: [] },
        daily_load: { prescribed_minutes: 62, cognitive_load: "moderate", pending_reviews: 2, recommended_limit_minutes: 75, overload_alert: false },
        previous_outcome: null,
        plan_progress: { completed_actions: 1, total_actions: 3, label: "1/3" },
        missing_sources: [],
      });
    }
    if (method === "POST" && path.includes("/api/trainer/recommendations/")) {
      return fulfillJson(route, { event_id: "event-design", recommendation_id: "design", event_type: "shown", occurred_at: NOW });
    }
    if (method === "GET" && path === "/api/notes/operational/streak") {
      return fulfillJson(route, { streak_days: 7, streak_max: 18, streak_at_risk: false, streak_reviews: 6, streak_flashcards_seen: 74, weekly_study_days: 5, active_protection: false, protection_window_end: null });
    }
    if (method === "GET" && path === "/api/notes/operational/turbo/overview") return fulfillJson(route, reviewQueue().flashcards_overview);
    if (method === "GET" && path === "/api/notes/operational/turbo/area-stats") {
      return fulfillJson(route, { total_notes: 80, total_reviews: 220, total_correct: 160, total_incorrect: 60, by_area: [{ area: "GO", notes_count: 34, reviews_total: 90, reviews_correct: 58, reviews_incorrect: 32 }, { area: "CM", notes_count: 28, reviews_total: 76, reviews_correct: 62, reviews_incorrect: 14 }] });
    }
    if (method === "GET" && path === "/api/notes/operational/turbo/session/daily-completed-cards") return fulfillJson(route, { timezone: "America/Sao_Paulo", by_day: [] });
    if (method === "GET" && path === "/api/reviews/tasks") {
      return fulfillJson(route, url.searchParams.get("status") === "done" ? cal.done : cal.pending);
    }
    // A Rota pergunta tempo e energia antes de qualquer coisa. Sem este mock o
    // `RotaPrompt` cai na guarda de `presets` vazio e renderiza null — a tela
    // apareceria em branco na captura.
    if (method === "GET" && path === "/api/navigation/prompt") {
      return fulfillJson(route, {
        presets: [20, 45, 90],
        suggested_minutes: 45,
        suggested_energy: "low",
        energy_source: "daily_checkin",
        interruption_risk: true,
        interruption_reason: "plantao",
        blocked_hours_today: 12,
        predicted_minutes: 60,
      });
    }
    if (method === "GET" && path === "/api/reviews/agenda") {
      return fulfillJson(route, { tasks: cal.pending, due_question_total: 38, struggling_question_total: 12, question_review_total: 38, generated_at: NOW });
    }
    // `/hoje` chama isto via `useStudentAgenda`. Sem o mock a query caia no
    // fallback generico e o dashboard quebrava em `agenda.days[0]` e depois em
    // `agenda.summary.weekly_progress_pct` — a captura do /hoje nunca chegava a
    // tirar screenshot. Forma do contrato `student-agenda-v1`.
    if (method === "GET" && path === "/api/student/agenda") {
      const localDate = todayISO();
      return fulfillJson(route, {
        contract_version: "student-agenda-v1",
        generated_at: NOW,
        status: "complete",
        timezone: "America/Sao_Paulo",
        today: localDate,
        date_from: localDate,
        date_to: localDate,
        summary: {
          completed_items: 3,
          total_items: 8,
          overdue_items: 1,
          questions_done_week: 248,
          weekly_goal_questions: 400,
          weekly_progress_pct: 62,
        },
        overdue: [],
        // `recommended_questions` entra explicitamente: sem ele o mock omitia o
        // campo, a tela pintava o texto "undefined" e a captura registrava o
        // defeito como se fosse o desenho normal da tela.
        days: [{ date: localDate, completed_items: 3, total_items: 8, overdue_items: 1, overloaded: false, recommended_questions: 40, items: [] }],
        missing_sources: [],
      });
    }
    if (method === "GET" && path === "/api/studies/directed") return fulfillJson(route, cal.studies);
    if (method === "GET" && path === "/api/events") return fulfillJson(route, cal.events);
    if (method === "GET" && path === "/api/schedule/suggestions") return fulfillJson(route, []);
    if (method === "GET" && path === "/api/schedule/workload") return fulfillJson(route, []);
    if (method === "GET" && path === "/api/studies/performance-summary") return fulfillJson(route, performanceSummary());
    if (method === "GET" && path === "/api/studies/weekly-timeline") return fulfillJson(route, weeklyTimeline());
    if (method === "GET" && path === "/api/schedule/generate") {
      return fulfillJson(route, { mode: "NORMAL", date: todayISO(), focus_minutes: 62, buffer_minutes: 20, total_planned_minutes: 82, recovery_mode: false, rebalance_required: false, reason: null, blocks: [] });
    }
    if (method === "GET" && path === "/api/question-bank/diagnosis/longitudinal") {
      return fulfillJson(route, { trap_sensitivity: 0.32, overconfidence_score: 0.18, impulsive_rate: 0.12, weak_node_ids: ["go-node"], at_risk_node_ids: ["go-node"], nodes: [] });
    }
    if (method === "GET" && path === "/api/question-bank/learner-model") {
      return fulfillJson(route, { user_id: "design-user", generated_at: NOW, competencies: [], metacognition: {}, adaptive_summary: {} });
    }
    if (method === "GET" && path === "/api/question-bank/next-action") {
      return fulfillJson(route, {
        kind: "weak_area",
        title: "Bloco curto de pre-eclampsia",
        subtitle: "Use se quiser acelerar este recorte; a montagem manual continua como foco da página.",
        meta: "12 questões · ~25 min",
        cta_label: "Usar sugestao",
        rationale: "Erro recente e alta cobranca em banca paulista.",
        area: "GO",
        area_label: "GO",
        signals: [{ key: "weak_area", label: "queda recente", severity: "warning" }],
        start_payload: { mode: "adaptive", resolution_mode: "training", area: "GO", answer_status: "needs_review", only_unanswered: false, limit: 12, knowledge_node_ids: ["go-node"] },
        generated_at: NOW,
      });
    }
    if (method === "GET" && path === "/api/question-bank/performance") {
      return fulfillJson(route, {
        areas: [{ area: "GO", label: "GO", questions_seen: 72, accuracy: 0.64, wrong_count: 26, practice_count: 26, readiness: 0.58, level: "atencao", next_action: "Treinar pre-eclampsia" }],
        exam: { simulation_count: 2, question_count: 100, accuracy: 0.71, avg_time_ms: 94000, slow_rate: 0.18 },
        unique_questions: 72,
        total_attempts: 94,
        first_attempt_correct: 46,
        first_attempt_accuracy: 0.64,
        repeat_attempts: 22,
        repeat_correct: 17,
        repeat_accuracy: 0.77,
        corrected_questions: 12,
        generated_at: NOW,
      });
    }
    if (method === "GET" && path === "/api/question-bank/bootstrap") return fulfillJson(route, questionBankBootstrap());
    if (method === "GET" && path === "/api/question-bank/facets") {
      const bootstrap = questionBankBootstrap();
      return fulfillJson(route, { years: bootstrap.years, boards: bootstrap.sources.filter((item) => item.option_kind === "board"), exams: bootstrap.sources.filter((item) => item.option_kind === "exam"), institutions: bootstrap.sources.filter((item) => item.option_kind === "institution"), states: bootstrap.states });
    }
    if (method === "GET" && path === "/api/question-bank/topics") return fulfillJson(route, questionBankBootstrap().topics);
    if (method === "GET" && path === "/api/question-bank/availability") return fulfillJson(route, questionBankAvailability());
    if (method === "GET" && path === "/api/question-bank/questions") {
      return fulfillJson(route, [
        {
          id: "q-preview-1",
          stem: "Gestante com PA 170/110, cefaleia e proteinuria. Qual a conduta?",
          alternatives: { A: "Sulfato de magnesio e interrupcao planejada", B: "Alta com retorno", C: "Tocolise ate termo" },
          answer: null,
          difficulty_estimate: 0.58,
          classification_confidence: 0.94,
          content_grade: "reviewed",
          knowledge_nodes: [qbankTopic()],
          primary_microcompetency_label: "Pré-eclâmpsia grave",
          source: { institution: "USP", board_code: "USP-SP", year: 2025 },
          metadata: { state_code: "SP" },
        },
      ]);
    }
    if (method === "GET" && path === "/api/question-bank/sessions") {
      return fulfillJson(route, [
        {
          ...sessionPayload(true),
          theme: "Emergencias cardiovasculares",
          feedback_timing: "post_result",
        },
      ]);
    }
    if (method === "GET" && path === "/api/question-bank/sessions/design_session") return fulfillJson(route, sessionPayload(false));
    if (method === "PUT" && path === "/api/question-bank/sessions/design_session/items/1/attempt") return fulfillJson(route, sessionPayload(true));
    if (method === "POST" && path === "/api/question-bank/sessions/design_session/items/1/events") return fulfillJson(route, { events: [] });
    if (method === "GET" && path === "/api/question-bank/sessions/design_session/items/1/guided-review") {
      return fulfillJson(route, { eligible: false, checkpoints: [], existing_responses: [] });
    }
    return fulfillJson(route, {});
  });
}

async function addSession(context) {
  await context.addCookies([
    {
      name: "krosmed_session",
      value: "session_design",
      url: BASE_URL,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

async function ready(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
}

async function capture(page, name) {
  await ready(page);
  const path = resolve(OUT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: true, animations: "disabled" });
  return path;
}

async function axe(page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
  return results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    description: violation.description,
    nodes: violation.nodes.length,
    targets: violation.nodes.slice(0, 8).map((node) => ({
      target: node.target,
      html: node.html,
      summary: node.failureSummary,
    })),
  }));
}

async function assertNoOverflow(page) {
  // Reporta QUEM estoura, nao so quantos pixels. "Horizontal overflow: 15px"
  // sozinho obriga a caçar o elemento a mao em cada regressao.
  const report = await page.evaluate(() => {
    const root = document.documentElement;
    const overflow = root.scrollWidth - root.clientWidth;
    if (overflow <= 1) return { overflow, offenders: [] };
    const viewportWidth = root.clientWidth;
    const offenders = [];
    for (const el of document.querySelectorAll("body *")) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      if (getComputedStyle(el).position === "fixed") continue;
      if (rect.right <= viewportWidth + 1 && rect.left >= -1) continue;
      offenders.push({
        tag: el.tagName.toLowerCase(),
        className: String(el.className || "").slice(0, 120),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
        text: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60),
      });
      if (offenders.length >= 6) break;
    }
    const box = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return `${sel}: ausente`;
      const r = el.getBoundingClientRect();
      return `${sel}: w=${Math.round(r.width)} left=${Math.round(r.left)}`;
    };
    const roots = [
      `html: scrollW=${root.scrollWidth} clientW=${root.clientWidth}`,
      box("body"),
      box("main"),
      box("header"),
    ];
    return { overflow, offenders, roots };
  });
  if (report.overflow <= 1) return;
  if (report.roots) console.error("  raizes: " + report.roots.join(" | "));
  const detail = report.offenders.length
    ? report.offenders
        .map((o) => `\n  <${o.tag} class="${o.className}"> left=${o.left} right=${o.right} w=${o.width}${o.text ? `\n      texto: ${o.text}` : ""}`)
        .join("")
    : "\n  (nenhum elemento estatico fora da viewport — provavelmente margem ou transform)";
  throw new Error(`Horizontal overflow: ${report.overflow}px${detail}`);
}

async function runViewport(browser, viewport) {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport: viewport.size,
    isMobile: viewport.mobile,
    hasTouch: viewport.mobile,
    deviceScaleFactor: viewport.mobile ? 3 : 1,
  });
  await addSession(context);
  const page = await context.newPage();
  await mockApi(page);
  const report = { viewport: viewport.name, screenshots: [], axeViolations: {} };

  async function visit(path, name, assertion, runAxe = false) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    try {
      await assertion();
    } catch (error) {
      const debugBase = `${viewport.name}-${name}-debug`;
      await page.screenshot({ path: resolve(OUT_DIR, `${debugBase}.png`), fullPage: true, animations: "disabled" }).catch(() => null);
      writeFileSync(resolve(OUT_DIR, `${debugBase}.txt`), await page.locator("body").innerText().catch(() => ""));
      writeFileSync(resolve(OUT_DIR, `${debugBase}.html`), await page.content().catch(() => ""));
      throw error;
    }
    await assertNoOverflow(page);
    report.screenshots.push(await capture(page, `${viewport.name}-${name}`));
    if (runAxe) report.axeViolations[name] = await axe(page);
  }

  await visit("/hoje", "hoje", async () => {
    await page.getByRole("link", { name: /Come/ }).waitFor({ state: "visible", timeout: 30_000 });
  }, !viewport.mobile);

  await visit("/rota", "rota", async () => {
    // A Rota abre na PERGUNTA (tempo e energia), nao numa tela de montagem:
    // "Simulador adaptativo" era o titulo da tela antiga, que pedia o numero de
    // questoes que o aluno nao tem como saber.
    await page.getByRole("heading", { name: "Quanto tempo você tem?" }).waitFor({ state: "visible", timeout: 30_000 });
  });

  await visit("/cards", "cards", async () => {
    // Era `getByRole("heading", { name: "Revisão dinâmica" })`: esse titulo nao
    // existe mais no codigo, e a arvore de /cards nao tem NENHUM heading — a
    // asserção nunca poderia passar. Alvo estavel enquanto /cards nao ganha
    // estrutura de titulo. `getByText` casa com textContent, entao nao sofre
    // com o `text-transform: uppercase` do chrome retro (ao contrario de
    // `getByRole({name})`, que no Chromium aplica a transformacao).
    await page.getByText("Cards para revisar agora").first().waitFor({ state: "visible", timeout: 30_000 });
  });

  await visit("/cards/registros", "cards-registros", async () => {
    // O Caderno nao mostra a fila de revisao: o alvo estavel e o seletor de modo.
    await page.getByText("Pesquisar registros").first().waitFor({ state: "visible", timeout: 30_000 });
  });

  // Era `/planejamento` esperando o calendario MENSAL. `/planejamento` e 308
  // para `/cronograma`, que abre na visao de SEMANA por padrao desde que
  // `initialView = "week"` — a asserção nunca poderia passar.
  await visit("/cronograma", "cronograma", async () => {
    await page.locator("[data-cronograma-week='true']").waitFor({ state: "visible", timeout: 30_000 });
  }, !viewport.mobile);

  await visit("/evolucao", "evolucao", async () => {
    // Terceira versao desta assercao, e as duas anteriores erraram do mesmo
    // jeito: prenderam um elemento que a pagina nao tem.
    //
    // Era `heading "Analise sua trajetória"`, string que nunca existiu. Virou a
    // aba "Gráficos" — que existia quando /evolucao tinha tres abas, e sumiu
    // quando a tela virou leitura unica.
    //
    // `#evolution-charts-title` e o cabecalho da secao de graficos: ele nasce
    // com a pagina, tem id proprio (ninguem o renomeia sem querer) e some se a
    // secao sumir — que e exatamente a falha que esta captura deve pegar.
    await page.locator("#evolution-charts-title").waitFor({ state: "visible", timeout: 30_000 });
    await page.locator("svg.recharts-surface").first().waitFor({ state: "visible", timeout: 30_000 });
  }, !viewport.mobile);

  await visit("/banco", "banco", async () => {
    // "Montar sessão" aparece duas vezes agora: no titulo do topo e na linha de
    // filhos da barra de abas. Ambos sao sinal de que a nav funcionou; basta um.
    await page.getByText("Montar sessão").first().waitFor({ state: "visible", timeout: 30_000 });
    await page.getByText("Banca, ano e histórico").click();
    await page.getByText("Estado da prova").waitFor({ state: "visible", timeout: 30_000 });
    await page.getByText("SP").first().waitFor({ state: "visible", timeout: 30_000 });
  }, !viewport.mobile);

  await visit("/preferencias", "preferencias", async () => {
    // Nao existe heading "Preferências": esse e o titulo da PAGINA, que mora no
    // topo como span. Os <h2> da tela sao os titulos de secao.
    await page.getByRole("heading", { name: "Rotina" }).first().waitFor({ state: "visible", timeout: 30_000 });
  }, !viewport.mobile);

  await context.close();
  return report;
}

const server = await ensureServer();
const browser = await chromium.launch({ headless: true });
const reports = [];

try {
  for (const viewport of [
    { name: "desktop", size: { width: 1440, height: 1000 }, mobile: false },
    { name: "mobile", size: { width: 390, height: 844 }, mobile: true },
  ]) {
    reports.push(await runViewport(browser, viewport));
  }
  const reportPath = resolve(OUT_DIR, "report.json");
  writeFileSync(reportPath, JSON.stringify({ baseURL: BASE_URL, generatedAt: new Date().toISOString(), reports }, null, 2));
  console.log(`Design screenshots saved to ${OUT_DIR}`);
  console.log(`Report saved to ${reportPath}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
