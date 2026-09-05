/**
 * O HARNESS DAS TELAS DO APP — mock da API, sessao e as asserções de render.
 *
 * ## Por que ele saiu do `capture-design-redesign.mjs`
 *
 * Estas ~700 linhas eram a unica forma de renderizar uma tela AUTENTICADA do
 * app sem backend: cookie de sessao, `page.route` interceptando cada endpoint,
 * e fixtures com forma real (hoje, cronograma, evolucao, banco, sessao).
 *
 * Elas estavam dentro de um script que EXECUTA no topo do modulo — importar
 * disparava a captura inteira, com build, servidor e escrita em disco. Na
 * pratica isso significava que so existia UM consumidor possivel, e qualquer
 * outra ferramenta que precisasse de uma tela renderizada teria de reescrever o
 * mock. Foi exatamente o que travou o comparador de design do app.
 *
 * Aqui nao ha efeito colateral nenhum: so definicoes. Quem executa e quem
 * importa.
 *
 * ⚠️ `addSession` recebe a base por parametro. Antes ela lia a constante
 * `BASE_URL` do script de captura, o que amarrava o cookie a porta 3107 — e um
 * cookie com `url` de outra origem simplesmente nao e enviado, entao a tela
 * voltaria para o login sem nenhum erro visivel.
 */

export const NOW = "2026-07-27T12:00:00.000Z";

export function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function plusDays(iso, days) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function fulfillJson(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

export function metric(key, label, value, unit = "") {
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

export function todayAction(overrides = {}) {
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

export function loadNote() {
  return {
    label: "adequada",
    estimated_minutes: 62,
    recommended_limit_minutes: 75,
    overload_alert: false,
    short_message: "Carga sustentável: um bloco clínico e revisão curta.",
  };
}

export function trainerAction(kind, title, href, actionId) {
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

export function studentExperience() {
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

export function surfaceHome(kind) {
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

export function reviewQueue() {
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

export function weeklyTimeline() {
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

export function calendarData() {
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

export function performanceSummary() {
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

export function qbankTopic(overrides = {}) {
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

export function questionBankBootstrap() {
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

export function questionBankAvailability() {
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

export function sessionPayload(answered = false) {
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

export async function mockApi(page) {
  const cal = calendarData();
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const path = url.pathname;

    // ⚠️ `/api/cadastro/status` E PEDIDO POR TODAS AS TELAS, e sem ele nenhuma
    // renderiza.
    //
    // O fallback deste mock e `{}`, entao a resposta vinha com
    // `cadastro_completo: undefined` — falsy — e o app tratava como cadastro
    // pendente: as cinco telas principais paravam em "Tentar novamente" com 8
    // elementos de texto na pagina. A captura de design saia com prints de uma
    // tela de erro, e o comparador mediria a tipografia do estado de erro
    // achando que media a do produto.
    //
    // Endpoint novo (`app/api/routers/cadastro.py`); o mock e' de antes dele. E'
    // a rotina desta base: fixture envelhece calada, porque nada quebra — so
    // passa a medir outra coisa.
    if (method === "GET" && path === "/api/cadastro/status") {
      return fulfillJson(route, { cadastro_completo: true, aceites_pendentes: [] });
    }
    // O INDICE das 138 bancas — a lista da aba "Comparar" (`9a`).
    //
    // ⚠️ Sem esta fixture o mapa QUEBRA INTEIRO ao trocar de aba. O fallback do
    // mock e `{}`, e `getIndiceDeBancas` promete um ARRAY: o componente faz
    // `(data ?? []).filter(...)` e o `??` nao pega objeto vazio, entao o erro e
    // `filter is not a function` dentro do render -- o error boundary come a
    // causa e a tela toda vira "Algo deu errado".
    if (method === "GET" && path === "/api/facies/bancas") {
      return fulfillJson(route, [
        {
          institution_key: "SP-UNIVERSIDADE-FEDERAL-DE-SAO-PAULO-UNIFESP-HOSPITAL-UNIVERSITARIO-DA-UNIFESP",
          nome: "UNIFESP",
          nome_longo: "SP - Universidade Federal de Sao Paulo - UNIFESP",
          uf: "SP",
          questoes_total: 1137,
        },
        {
          institution_key: "EXAME-NACIONAL-DE-RESIDENCIA-ENAMED",
          nome: "ENAMED",
          nome_longo: "Exame Nacional de Residencia",
          uf: null,
          questoes_total: 2483,
        },
        {
          institution_key: "SP-UNIVERSIDADE-DE-SAO-PAULO-USP",
          nome: "USP",
          nome_longo: "SP - Universidade de Sao Paulo - USP",
          uf: "SP",
          questoes_total: 612,
        },
      ]);
    }

    // A leitura DIARIA da evolucao — o mosaico "Seus dias" (`9b`).
    //
    // 28 dias porque o servidor so' devolve balde diario ate' 31
    // (`DAILY_MAX_DAYS`); pedir 6 semanas devolveria baldes SEMANAIS e o mosaico
    // de dias viraria um mosaico de semanas sem avisar.
    if (method === "GET" && path === "/api/student/evolution") {
      const pontos = [];
      for (let i = 27; i >= 0; i -= 1) {
        const dia = plusDays(todayISO(), -i);
        // Padrao de plantonista: estuda a maioria dos dias, some em alguns.
        const minutos = i % 7 === 3 || i % 11 === 0 ? 0 : i % 5 === 1 ? 14 : 42;
        pontos.push({
          bucket: dia,
          observed_minutes: minutos,
          sleep_minutes: null,
          sleep_quality: null,
          energy: null,
          on_call_days: i % 7 === 3 ? 1 : 0,
          covered_days: 1,
        });
      }
      return fulfillJson(route, {
        contract_version: "student-evolution-v1",
        window: {
          range_key: "4w",
          date_from: plusDays(todayISO(), -27),
          date_to: todayISO(),
          granularity: "daily",
          timezone: "America/Sao_Paulo",
        },
        points: pontos,
        associations: [],
      });
    }

    // O plano vigente (`9c`). Sem ele a tela do plano mede a si mesma vazia, e
    // o que o guard compara com o desenho passa a ser o estado vazio.
    if (method === "GET" && path === "/api/plan/current") {
      const dia = (n) => plusDays(todayISO(), n);
      return fulfillJson(route, {
        contract_version: "study-plan-v1",
        plan_id: "plan-design",
        revision: 3,
        policy_version: "study-plan-1",
        evidence_level: "adaptado_por_evidencias",
        horizon_start: todayISO(),
        horizon_end: dia(41),
        generated_at: NOW,
        objectives: [],
        explanation: {},
        activities: [
          {
            activity_id: "at-1",
            scheduled_date: dia(0),
            slot_order: 0,
            kind: "topic_practice",
            title: "Insuficiencia cardiaca",
            difficulty_class: "padrao",
            estimated_minutes: 24,
            estimated_questions: 12,
            status: "pending",
            locked: false,
            session_id: null,
            review_task_id: null,
            observed_minutes: null,
            observed_questions: null,
            completed_at: null,
            change_type: "kept",
            unscheduled_reason: null,
            recommended_window: null,
            rationale: {},
          },
          {
            activity_id: "at-2",
            scheduled_date: dia(9),
            slot_order: 0,
            kind: "review",
            title: "Revisao do que voce errou",
            difficulty_class: "leve",
            estimated_minutes: 16,
            estimated_questions: 8,
            status: "pending",
            locked: false,
            session_id: null,
            review_task_id: "rt-1",
            observed_minutes: null,
            observed_questions: null,
            completed_at: null,
            change_type: "added",
            unscheduled_reason: null,
            recommended_window: null,
            rationale: {},
          },
          {
            activity_id: "at-3",
            scheduled_date: dia(24),
            slot_order: 0,
            kind: "review",
            title: "Revisao final",
            difficulty_class: "leve",
            estimated_minutes: 20,
            estimated_questions: 10,
            status: "pending",
            locked: false,
            session_id: null,
            review_task_id: "rt-2",
            observed_minutes: null,
            observed_questions: null,
            completed_at: null,
            change_type: "added",
            unscheduled_reason: null,
            recommended_window: null,
            rationale: {},
          },
        ],
      });
    }

    // A semana declarada, que o cartao da rotina le no `9c` e a tela
    // "Minha semana" edita no `14a`.
    if (method === "GET" && path === "/api/onboarding") {
      return fulfillJson(route, {
        contract_version: "student-onboarding-v1",
        state: "ready",
        next_step: "ready",
        completed_steps: ["objectives", "routine", "capacity"],
        has_selected_objectives: true,
        objectives_revision: 2,
        has_routine: true,
        has_availability: true,
        weekly_goal_questions: 300,
        // seg plantao, ter pos-plantao, qua livre, qui ambulatorio, sex nada,
        // sab e dom livres — a semana do `14a`.
        study_availability: { 0: 10, 1: 20, 2: 60, 3: 35, 4: 0, 5: 60, 6: 35 },
        completed_at: NOW,
      });
    }

    // A proficiencia do aluno por competencia — o eixo "A prova e voce" do
    // mapa (`12b`). Sem ela a tela inteira cai em "Algo deu errado", porque a
    // consulta e' obrigatoria naquela aba.
    //
    // A fixture cobre os TRES estados de proposito: `medido` (>= o piso),
    // `estimado` (1..piso-1) e `nao_avaliado` (zero respostas). Sao formas
    // diferentes na grade, e um mock com um estado so' nao provaria nenhuma.
    if (method === "GET" && path === "/api/student/competency-mastery") {
      return fulfillJson(route, {
        contract_version: "competency-mastery-v1",
        observation_floor: 5,
        attempts_considered: 31,
        items: [
          {
            objective_id: "obj-diabetes",
            label: "Diabetes",
            primary_subtheme: "Diabetes",
            competency_question_count: 24,
            attempts: 12,
            correct: 7,
            mastery: 0.58,
            certeza: "medido",
          },
          {
            objective_id: "obj-prenatal",
            label: "Assistencia pre-natal",
            primary_subtheme: "Assistencia pre-natal",
            competency_question_count: 18,
            attempts: 3,
            correct: 2,
            mastery: 0.66,
            certeza: "estimado",
          },
          {
            objective_id: "obj-arritmias",
            label: "Arritmias Cardiacas",
            primary_subtheme: "Arritmias Cardiacas",
            competency_question_count: 14,
            attempts: 0,
            correct: 0,
            mastery: 0.5,
            certeza: "nao_avaliado",
          },
        ],
      });
    }

    // A facies da banca-alvo, servida pelo BFF (`app/api/facies/banca/[key]`).
    // E' o que o Mapa desenha; sem ela a tela cai em "Algo deu errado".
    if (method === "GET" && path.startsWith("/api/facies/banca/")) {
      const chave = decodeURIComponent(path.split("/").pop());
      // ⚠️ O MOCK RESPONDE PELA CHAVE, e nao com uma banca fixa.
      //
      // Ele devolvia a UNIFESP para qualquer chave, e a aba Comparar acabava
      // exibindo "UNIFESP" contra "UNIFESP", com todas as diferencas em zero.
      // A tela passava, o guard passava, e nenhum dos dois exercia a
      // comparacao -- que e a unica coisa que aquela aba faz.
      const outra = chave.includes("ENAMED") || chave.includes("ENARE");
      return fulfillJson(route, {
        institution_key: chave,
        // `slug` NAO e' decorativo: `nomeCurto()` faz `banca.slug.startsWith(...)`
        // para achar os nomes fixos (ENARE, Revalida). Sem ele o render estoura
        // em TypeError e a tela cai no error boundary — "Algo deu errado", sem
        // nada no console, porque o boundary engole.
        slug: outra
          ? "exame-nacional-de-residencia-enamed"
          : "sp-universidade-federal-de-sao-paulo-unifesp-hospital-universitario-da-unifesp",
        nome: outra
          ? "Exame Nacional de Residencia (ENAMED)"
          : "SP - Universidade Federal de Sao Paulo - UNIFESP",
        uf: outra ? null : "SP",
        total: 1137,
        questoes_total: 1137,
        questoes_recentes: 604,
        // ⚠️ `forma_recente` E OBRIGATORIO no tipo `Banca`, e a aba Comparar
        // le `forma_recente.vinheta_pct` sem guarda: sem ele o mapa inteiro
        // caia em "Algo deu errado" ao escolher a segunda prova, com o error
        // boundary comendo a causa. O dataset real tem o bloco nas 138 bancas
        // (medido), entao a falha era so do mock -- e um mock incompleto que
        // derruba a tela e' pior que mock nenhum, porque parece defeito do app.
        forma_recente: {
          anos: [2024, 2025, 2026],
          base: 604,
          base_com_tema: 588,
          formato_pct: outra ? 4.1 : 1.2,
          formato_pct_com_tema: outra ? 4.1 : 1.2,
          vinheta_pct: outra ? 51.4 : 21.6,
          vinheta_pct_com_tema: outra ? 52.0 : 22.1,
        },
        questoes_anuladas: 0,
        primeiro_ano: 2016,
        ultimo_ano: 2026,
        grao_confiavel: "subtema",
        leitura: ["A UNIFESP cobra Clinica Medica acima da media do acervo."],
        formato: {
          distribuicao: [{ codigo: "direta", rotulo: "multipla escolha direta", qtd: 1040, pct: 91.5 }],
          alternativas: [{ n: 5, qtd: 1040, pct: 91.5 }],
        },
        mais_cai: {
          cobertura: 82,
          base: 932,
          linhas: [
            { rotulo: "Diabetes", n: 24, exibivel: true, area: "Clinica Medica" },
            { rotulo: "Assistencia pre-natal", n: 18, exibivel: true, area: "Ginecologia e Obstetricia" },
            { rotulo: "Arritmias Cardiacas", n: 14, exibivel: true, area: "Clinica Medica" },
            { rotulo: "Abdome Agudo", n: 11, exibivel: true, area: "Cirurgia Geral" },
          ],
        },
        areas: {
          cobertura: 82,
          base: 932,
          linhas: [
            { rotulo: "Clinica Medica", n: 280, pct: 30 },
            { rotulo: "Ginecologia e Obstetricia", n: 186, pct: 20 },
            { rotulo: "Cirurgia Geral", n: 149, pct: 16 },
            { rotulo: "Medicina Preventiva", n: 149, pct: 16 },
            { rotulo: "Pediatria", n: 112, pct: 12 },
            { rotulo: "Outras", n: 56, pct: 6 },
          ],
        },
        blocos: { cobertura: 4, base: 40, linhas: [{ rotulo: "Cirurgia", n: 40, pct: 100 }] },
        denominador: null,
        mudanca: null,
        situacao: null,
      });
    }
    // A prova-alvo do aluno. Sem ela o Mapa nao tem sobre o que desenhar, e a
    // faixa por area do `8b` nunca aparece.
    if (method === "GET" && path === "/api/objectives/target-exam") {
      return fulfillJson(route, {
        items: [
          {
            institution_key: "SP-UNIVERSIDADE-FEDERAL-DE-SAO-PAULO-UNIFESP-HOSPITAL-UNIVERSITARIO-DA-UNIFESP",
            label: "UNIFESP",
            is_primary: true,
            exam_date: plusDays(todayISO(), 63),
          },
        ],
      });
    }
    if (method === "GET" && path === "/api/profile") {
      return fulfillJson(route, {
        user_id: "design-user",
        weekly_goal_questions: 240,
        timezone: "America/Sao_Paulo",
        reschedule_mode: "suggest",
        shift_12h_capacity: 40,
        shift_24h_capacity: 20,
        display_name: "Jose",
        // A tela /voce mostra a especialidade declarada; sem ela no fixture, a
        // captura exercitaria so o estado vazio.
        intended_specialty: "Oftalmologia",
        access_status: "active",
        has_completed_initial_goal_setup: true,
        // ⚠️ SEM ESTE CAMPO O APP INTEIRO FICA EM "CARREGANDO".
        //
        // `resolveBlockingRoute` (lib/initialGoalSetup.ts) le `cadastro_completo`
        // do PERFIL — nao de `/cadastro/status`, apesar do nome. Ausente, ele sai
        // `undefined`, que e' falsy, e o guard de navegacao do `AppShell` manda
        // toda rota para `/cadastro`. As telas nunca chegam a pedir os proprios
        // dados: `/hoje` parava com duas requisicoes e um esqueleto eterno.
        //
        // Campo novo, fixture de antes dele. Nada quebrou quando ele entrou —
        // o mock so passou a descrever um usuario que o app recusa.
        cadastro_completo: true,
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
      // O Hoje dimensiona o dia a partir daqui. Sem este mock, o
      // `TodayDimensioning` cai na guarda de "sem previsao e sem calendario" e
      // renderiza null: a linha simplesmente nao apareceria na captura, e o
      // resultado pareceria correto.
      //
      // Os valores descrevem um dia de plantao de proposito: 12h bloqueadas e
      // 60 min previstos exercitam o ramo COM evidencia, que e o que se quer ver.
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
    // ⚠️ TRES areas de proposito, e nao uma.
    //
    // `/banco/guardadas` so mostra os chips de area quando ha mais de uma —
    // um fixture de area unica exercitaria a tela sem a barra de filtro, que e
    // metade do que ela faz. E as `attempt_stats` variam para o chip de acerto
    // aparecer nos tres estados que ele tem.
    if (method === "GET" && path === "/api/question-bank/bookmarks") {
      const guardada = (id, area, no, stem, acertos, tentativas) => ({
        id,
        stem,
        alternatives: { A: "Primeira conduta", B: "Segunda conduta", C: "Terceira conduta" },
        answer: null,
        difficulty_estimate: 0.6,
        content_grade: "reviewed",
        image_refs: [],
        table_refs: [],
        knowledge_nodes: [
          qbankTopic({ knowledge_node_id: `${id}-no`, node_name: no, node_path: [area, no] }),
        ],
        attempt_stats: { attempt_count: tentativas, correct_count: acertos },
        bookmarked: true,
        source: { institution: "USP", board_code: "USP-SP", year: 2025 },
        metadata: { state_code: "SP" },
      });
      return fulfillJson(route, [
        guardada(
          "q-guardada-1",
          "Clínica Médica",
          "Sepse",
          "Homem de 62 anos, taquicárdico e hipotenso após 48h de tosse produtiva. Qual a primeira medida?",
          1,
          4,
        ),
        guardada(
          "q-guardada-2",
          "Clínica Médica",
          "Síndrome coronariana aguda",
          "Dor torácica há 2h com supradesnivelamento de ST em parede inferior. Qual a conduta?",
          3,
          4,
        ),
        guardada(
          "q-guardada-3",
          "Ginecologia e Obstetricia",
          "Hipertensão na gestação",
          "Gestante com PA 170/110, cefaleia e proteinúria. Qual a conduta?",
          0,
          2,
        ),
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

export async function addSession(context, baseUrl) {
  await context.addCookies([
    {
      name: "krosmed_session",
      value: "session_design",
      url: baseUrl,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

export async function ready(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
}

export async function assertNoOverflow(page) {
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
