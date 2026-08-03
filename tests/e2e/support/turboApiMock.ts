import type { Page, Route } from "@playwright/test";

type TurboSessionState = {
  actionCalls: string[];
  finalOverviewLoaded: boolean;
};

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

const turboNote = {
  note_id: "note_turbo_1",
  area: "CM",
  theme: "Pneumonia",
  source_type: "question",
  question_outcome: "incorrect",
  insight_question: "Conduta inicial na pneumonia comunitaria ambulatorial?",
  title: "Pneumonia comunitaria",
  body: "Amoxicilina em dose adequada cobre o principal agente em paciente ambulatorial sem sinais de gravidade.",
  weight: 3,
  question_id: "q1",
  external_links: [],
  attachment_refs: [],
  turbo_due_at: nowISO(),
  turbo_seen: 0,
  turbo_correct: 0,
  turbo_incorrect: 1,
  last_turbo_at: null,
  created_at: nowISO(),
  updated_at: nowISO(),
  version: 1,
};

function overview(dueCount = 2) {
  return {
    due_count: dueCount,
    new_count: 1,
    overdue_count: 1,
    total_eligible: 3,
    suggested_target_cards: 1,
    estimated_minutes: 1,
    reason_counts: [
      { reason: "overdue", label: "Esta atrasado e pode comecar a enfraquecer.", count: 1 },
      { reason: "wrong_question", label: "Nasceu de uma questão errada.", count: 1 },
    ],
    by_area: [
      { area: "CM", due_count: dueCount, new_count: 1, overdue_count: 1, total_eligible: 2 },
    ],
    priority_preview: [
      {
        note_id: turboNote.note_id,
        area: turboNote.area,
        theme: turboNote.theme,
        insight_question: turboNote.insight_question,
        weight: turboNote.weight,
        turbo_due_at: turboNote.turbo_due_at,
        context: {
          note_id: turboNote.note_id,
          reasons: ["overdue", "wrong_question"],
          primary_reason: "overdue",
          label: "Card prioritário da revisão.",
        },
      },
    ],
  };
}

function activeSnapshot() {
  return {
    session_id: "turbo_session_e2e",
    status: "active",
    session_total: 1,
    session_pending: 1,
    session_correct: 0,
    session_incorrect: 0,
    session_done: false,
    is_repeat_session: false,
    is_standby_round: false,
    can_repeat_session: false,
    can_navigate_prev: false,
    can_navigate_next: false,
    note: turboNote,
    current_card_context: {
      note_id: turboNote.note_id,
      reasons: ["overdue", "wrong_question"],
      primary_reason: "overdue",
      label: "Card prioritário da revisão.",
    },
    last_review_change: null,
  };
}

function completedSnapshot(result: string) {
  return {
    session_id: "turbo_session_e2e",
    status: "completed",
    session_total: 1,
    session_pending: 0,
    session_correct: result === "good" || result === "easy" ? 1 : 0,
    session_incorrect: result === "again" || result === "hard" ? 1 : 0,
    session_done: true,
    is_repeat_session: false,
    is_standby_round: false,
    can_repeat_session: true,
    can_navigate_prev: false,
    can_navigate_next: false,
    note: null,
    current_card_context: null,
    last_review_change: {
      note_id: turboNote.note_id,
      area: turboNote.area,
      theme: turboNote.theme,
      rating: result,
      previous_due_at: turboNote.turbo_due_at,
      next_due_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      next_due_in_days: 3,
    },
  };
}

export async function mockTurboApi(page: Page): Promise<TurboSessionState> {
  const state: TurboSessionState = {
    actionCalls: [],
    finalOverviewLoaded: false,
  };

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const method = request.method();
    const path = new URL(request.url()).pathname;

    if (method === "GET" && path === "/api/profile") {
      return json(route, {
        user_id: "user_turbo_e2e",
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
      return json(route, { user_id: "user_turbo_e2e", display_name: "E2E User" });
    }

    if (method === "GET" && path === "/api/notes/operational/turbo/overview") {
      const body = overview(state.actionCalls.length > 0 ? 1 : 2);
      if (state.actionCalls.length > 0) state.finalOverviewLoaded = true;
      return json(route, body);
    }

    if (method === "GET" && path === "/api/notes/operational/turbo/interval-preview") {
      return json(route, { again: 0.2, hard: 1, good: 3, easy: 7 });
    }

    if (method === "POST" && path === "/api/notes/operational/turbo/session/start") {
      return json(route, activeSnapshot());
    }

    if (method === "POST" && path === "/api/notes/operational/turbo/session/turbo_session_e2e/action") {
      const payload = request.postDataJSON() as { result?: string };
      const result = payload.result ?? "good";
      state.actionCalls.push(result);
      return json(route, completedSnapshot(result));
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
