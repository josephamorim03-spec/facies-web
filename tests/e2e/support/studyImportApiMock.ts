import type { Page, Route } from "@playwright/test";

type ImportOption = "A" | "B" | "C" | "D" | "E";

type ImportQuestion = {
  question_number: number;
  stem: string;
  options: Record<ImportOption, string>;
  is_annulled: boolean;
  has_image: boolean;
  image_attachment_refs: string[];
  option_image_attachment_refs: Partial<Record<ImportOption, string[]>>;
  state: {
    selected_option: ImportOption | null;
    eliminated_options: ImportOption[];
    doubtful: boolean;
    answered: boolean;
  };
  correct_answer: ImportOption | null;
};

type ImportMockState = {
  finalized: boolean;
  finalizeCalls: number;
  questions: ImportQuestion[];
};

const SESSION_ID = "session_import_e2e";

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

function nowISO() {
  return new Date().toISOString();
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function createQuestion(
  questionNumber: number,
  stem: string,
  correctAnswer: ImportOption,
): ImportQuestion {
  return {
    question_number: questionNumber,
    stem,
    options: {
      A: "Alternativa A",
      B: "Alternativa B",
      C: "Alternativa C",
      D: "Alternativa D",
      E: "Alternativa E",
    },
    is_annulled: false,
    has_image: false,
    image_attachment_refs: [],
    option_image_attachment_refs: {},
    state: {
      selected_option: null,
      eliminated_options: [],
      doubtful: false,
      answered: false,
    },
    correct_answer: correctAnswer,
  };
}

function unansweredNumbers(questions: ImportQuestion[]): number[] {
  return questions
    .filter((question) => !question.state.answered)
    .map((question) => question.question_number);
}

function sessionPayload(state: ImportMockState) {
  const unanswered = unansweredNumbers(state.questions);
  return {
    session_id: SESSION_ID,
    status: state.finalized ? "finalized" : "active",
    study_kind: "full_exam",
    area: null,
    theme: null,
    subtheme: null,
    full_exam_name: "Simulado E2E",
    full_exam_year: 2026,
    full_exam_type: "acesso_direto",
    user_weight: 3,
    performed_at: "2026-05-21",
    source_attachment_ref: "attachments/e2e.pdf",
    parser_model: "e2e-mock",
    total_questions: state.questions.length,
    question_numbers: state.questions.map((question) => question.question_number),
    answered_count: state.questions.length - unanswered.length,
    unanswered_count: unanswered.length,
    unanswered_question_numbers: unanswered,
    doubtful_count: state.questions.filter((question) => question.state.doubtful).length,
    created_at: nowISO(),
    updated_at: nowISO(),
    finalized_at: state.finalized ? nowISO() : null,
    directed_study_id: state.finalized ? "study_import_e2e" : null,
    review_task_id: null,
  };
}

function finalizationPayload(state: ImportMockState) {
  const scorable = state.questions.filter((question) => !question.is_annulled);
  const correct = scorable.filter(
    (question) => question.state.selected_option === question.correct_answer,
  );
  const wrong = scorable.filter(
    (question) => question.state.selected_option !== question.correct_answer,
  );
  return {
    study_id: "study_import_e2e",
    created_tasks: [],
    total_questions: scorable.length,
    correct_questions: correct.length,
    wrong_question_summaries: wrong.map((question) => ({
      question_number: question.question_number,
      stem: question.stem,
      options: question.options,
      marked_option: question.state.selected_option,
      correct_option: question.correct_answer,
    })),
  };
}

export async function mockStudyImportApi(page: Page): Promise<ImportMockState> {
  const state: ImportMockState = {
    finalized: false,
    finalizeCalls: 0,
    questions: [
      createQuestion(1, "Paciente com febre e tosse ha tres dias.", "A"),
      createQuestion(2, "Paciente com dor abdominal e instabilidade.", "C"),
    ],
  };

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const path = url.pathname;

    if (method === "GET" && path === "/api/profile") {
      return json(route, {
        user_id: "user_import_e2e",
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
      return json(route, { user_id: "user_import_e2e", display_name: "E2E User" });
    }

    if (method === "GET" && path === `/api/studies/import/sessions/${SESSION_ID}`) {
      return json(route, sessionPayload(state));
    }

    if (method === "GET" && path === `/api/studies/import/sessions/${SESSION_ID}/questions`) {
      const pageNumber = Number(url.searchParams.get("page") ?? "1");
      const pageSize = Number(url.searchParams.get("page_size") ?? "1");
      const start = (pageNumber - 1) * pageSize;
      const items = state.questions.slice(start, start + pageSize);
      return json(route, {
        items: clone(items),
        page: pageNumber,
        page_size: pageSize,
        total_items: state.questions.length,
        total_pages: Math.max(1, Math.ceil(state.questions.length / pageSize)),
        only_unanswered: url.searchParams.get("only_unanswered") === "true",
      });
    }

    const stateMatch = path.match(
      new RegExp(`^/api/studies/import/sessions/${SESSION_ID}/questions/(\\d+)/state$`),
    );
    if (method === "PUT" && stateMatch) {
      const questionNumber = Number(stateMatch[1]);
      const question = state.questions.find((item) => item.question_number === questionNumber);
      if (!question) return json(route, { detail: "Question not found" }, 404);
      const payload = request.postDataJSON() as {
        selected_option?: ImportOption | null;
        eliminated_options: ImportOption[] | null;
        doubtful?: boolean;
      };
      if ("selected_option" in payload) {
        question.state.selected_option = payload.selected_option ?? null;
        question.state.answered = Boolean(payload.selected_option);
      }
      if (Array.isArray(payload.eliminated_options)) {
        question.state.eliminated_options = payload.eliminated_options;
      }
      if (typeof payload.doubtful === "boolean") {
        question.state.doubtful = payload.doubtful;
      }
      return json(route, clone(question));
    }

    if (method === "POST" && path === `/api/studies/import/sessions/${SESSION_ID}/finalize`) {
      const confirmUnanswered = url.searchParams.get("confirm_unanswered") === "true";
      const unanswered = unansweredNumbers(state.questions);
      if (unanswered.length > 0 && !confirmUnanswered) {
        return json(
          route,
          {
            detail: {
              code: "unanswered_questions",
              unanswered_question_numbers: unanswered,
            },
          },
          422,
        );
      }
      state.finalized = true;
      state.finalizeCalls += 1;
      return json(route, finalizationPayload(state));
    }

    if (method === "GET" && path === `/api/import/sessions/${SESSION_ID}/overrides`) {
      const result = finalizationPayload(state);
      return json(route, {
        session_id: SESSION_ID,
        overrides: {},
        updated_total: result.total_questions,
        updated_correct: result.correct_questions,
      });
    }

    if (method === "GET" && path === `/api/analysis/simulations/${SESSION_ID}/results`) {
      return json(route, { simulation_id: SESSION_ID, user_id: "user_import_e2e", results: [] });
    }

    if (method === "GET" && path === "/api/notes/operational/streak") {
      return json(route, {
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
      return json(route, {
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

    if (method === "GET" && path === "/api/notes/operational/turbo/session/daily-completed-cards") {
      return json(route, { timezone: "America/Sao_Paulo", by_day: [] });
    }

    if (method === "GET" && path === "/api/studies/performance-summary") {
      return json(route, { area_summaries: [], diagnosis: { ready: false, weaknesses: [] } });
    }

    if (method === "GET" && path === "/api/reviews/agenda") {
      return json(route, {
        tasks: [],
        due_question_total: 0,
        struggling_question_total: 0,
        question_review_total: 0,
        generated_at: new Date().toISOString(),
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
      return json(route, []);
    }

    return json(route, {});
  });

  return state;
}

export { SESSION_ID as STUDY_IMPORT_E2E_SESSION_ID };
