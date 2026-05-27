import { Page, Route } from "@playwright/test";

type DirectedStudyListItem = {
  study_id: string;
  area: string;
  theme: string;
  total_questions: number;
  correct_questions: number;
  user_weight: number;
  performed_at: string;
  created_at: string;
  accuracy: number;
  is_review: boolean;
  fsrs_rating: "again" | "hard" | "good" | "easy" | null;
  study_kind: "topic" | "full_exam";
  full_exam_name: string | null;
  full_exam_year: number | null;
  full_exam_type: "acesso_direto" | "r_plus" | null;
  origin_review_task_id: string | null;
  import_session_id: string | null;
};

type OperationalNoteItem = {
  note_id: string;
  user_id: string;
  area: string;
  theme: string;
  source_type: "question" | "reading";
  question_outcome: "correct" | "incorrect" | null;
  insight_question: string;
  body: string;
  weight: number;
  question_id: string | null;
  external_links: string[];
  attachment_refs: string[];
  created_at: string;
  updated_at: string;
};

type DbState = {
  studies: DirectedStudyListItem[];
  notes: OperationalNoteItem[];
};

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

function createDb(): DbState {
  const now = new Date().toISOString();
  return {
    studies: [
      {
        study_id: "study_caderno_1",
        area: "CM",
        theme: "Insuficiencia cardiaca",
        total_questions: 30,
        correct_questions: 22,
        user_weight: 2,
        performed_at: now.slice(0, 10),
        created_at: now,
        accuracy: 73.3,
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
    notes: [],
  };
}

export async function mockCadernoApi(page: Page): Promise<{ db: DbState }> {
  const db = createDb();

  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const method = req.method();
    const url = new URL(req.url());
    const path = url.pathname;

    if (method === "GET" && path === "/api/studies/directed") {
      return json(route, db.studies);
    }

    if (method === "GET" && path === "/api/notes/operational") {
      return json(route, db.notes);
    }

    if (method === "GET" && path === "/api/events") {
      return json(route, []);
    }

    if (method === "GET" && path === "/api/reviews/tasks") {
      return json(route, []);
    }

    if (method === "GET" && path === "/api/profile") {
      return json(route, {
        user_id: "user_e2e",
        weekly_goal_questions: 300,
        timezone: "America/Fortaleza",
        reschedule_mode: "suggest",
        shift_12h_capacity: 40,
        shift_24h_capacity: 20,
        display_name: "E2E User",
        access_status: "active",
        has_completed_initial_goal_setup: true,
      });
    }

    return json(route, {});
  });

  return { db };
}
