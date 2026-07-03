import { Page, Route } from "@playwright/test";

type ReviewTask = {
  task_id: string;
  user_id: string;
  area: string;
  theme: string;
  subtheme: string | null;
  source_study_id: string;
  due_date: string;
  ideal_due_date: string;
  due_at: string;
  ideal_due_at: string;
  is_critical: boolean;
  is_overdue: boolean;
  status: "pending" | "done";
  expected_questions: number;
  priority_score: number;
};

type DirectedStudyListItem = {
  study_id: string;
  area: string;
  theme: string;
  subtheme: string | null;
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

type CalendarEventOut = {
  event_id: string;
  user_id: string;
  label: string;
  event_type: "routine" | "event";
  weekday: number | null;
  event_date: string | null;
  active_until: string | null;
  duration_hours: number;
  created_at: string;
};

type DbState = {
  pendingTasks: ReviewTask[];
  doneTasks: ReviewTask[];
  studies: DirectedStudyListItem[];
  events: CalendarEventOut[];
  streak: {
    streak_days: number;
    streak_max: number;
    streak_at_risk: boolean;
    streak_reviews: number;
    streak_flashcards_seen: number;
    weekly_study_days: number;
    active_protection: boolean;
    protection_window_end: string | null;
  };
  turboCardsByDate: Record<string, number>;
  suggestions: Array<{
    suggestion_id: string;
    status: string;
    created_at: string;
    items: Array<{
      task_id: string;
      area: string;
      theme: string;
      current_due_date: string;
      suggested_due_date: string;
      reason: string;
      applied: boolean;
    }>;
  }>;
  counters: {
    event: number;
    study: number;
    task: number;
    suggestion: number;
    importSession: number;
  };
  autoReschedule: {
    noBetterDateTaskIds: string[];
  };
  apiHits: {
    listReviewTasks: number;
    autoReschedulePreview: number;
    autoRescheduleApply: number;
  };
};

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function plusDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

function createDb(): DbState {
  const today = todayISO();
  const tomorrow = plusDays(today, 1);
  const yesterday = plusDays(today, -1);
  const yesterdayWeekday = (new Date(`${yesterday}T12:00:00`).getDay() + 6) % 7;
  const now = new Date().toISOString();

  return {
    pendingTasks: [
      {
        task_id: "task_pending_1",
        user_id: "user_e2e",
        area: "CM",
        theme: "Pneumonia",
        subtheme: null,
        source_study_id: "study_initial_1",
        due_date: today,
        ideal_due_date: today,
        due_at: `${today}T12:00:00Z`,
        ideal_due_at: `${today}T12:00:00Z`,
        is_critical: false,
        is_overdue: false,
        status: "pending",
        expected_questions: 20,
        priority_score: 80,
      },
      {
        task_id: "task_pending_2",
        user_id: "user_e2e",
        area: "PED",
        theme: "Asma",
        subtheme: null,
        source_study_id: "study_initial_2",
        due_date: tomorrow,
        ideal_due_date: tomorrow,
        due_at: `${tomorrow}T12:00:00Z`,
        ideal_due_at: `${tomorrow}T12:00:00Z`,
        is_critical: true,
        is_overdue: false,
        status: "pending",
        expected_questions: 25,
        priority_score: 100,
      },
    ],
    doneTasks: [
      {
        task_id: "task_done_1",
        user_id: "user_e2e",
        area: "GO",
        theme: "Pré-eclâmpsia",
        subtheme: null,
        source_study_id: "study_review_done_1",
        due_date: yesterday,
        ideal_due_date: yesterday,
        due_at: `${yesterday}T12:00:00Z`,
        ideal_due_at: `${yesterday}T12:00:00Z`,
        is_critical: false,
        is_overdue: false,
        status: "done",
        expected_questions: 15,
        priority_score: 60,
      },
    ],
    studies: [
      {
        study_id: "study_initial_1",
        area: "CM",
        theme: "Pneumonia",
        subtheme: null,
        total_questions: 30,
        correct_questions: 20,
        user_weight: 2,
        performed_at: toDateTimeFromISO(today),
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
      {
        study_id: "study_review_done_1",
        area: "GO",
        theme: "Pré-eclâmpsia",
        subtheme: null,
        total_questions: 20,
        correct_questions: 15,
        user_weight: 2,
        performed_at: toDateTimeFromISO(yesterday),
        created_at: now,
        accuracy: 75,
        is_review: true,
        fsrs_rating: "good",
        study_kind: "topic",
        full_exam_name: null,
        full_exam_year: null,
        full_exam_type: null,
        origin_review_task_id: "task_done_1",
        import_session_id: "session_finalized_1",
      },
      {
        study_id: "study_full_exam_1",
        area: "MULTI",
        theme: "Simulado Maio",
        subtheme: null,
        total_questions: 100,
        correct_questions: 70,
        user_weight: 3,
        performed_at: toDateTimeFromISO(tomorrow),
        created_at: now,
        accuracy: 70,
        is_review: false,
        fsrs_rating: null,
        study_kind: "full_exam",
        full_exam_name: "Simulado Maio",
        full_exam_year: 2026,
        full_exam_type: "acesso_direto",
        origin_review_task_id: null,
        import_session_id: null,
      },
    ],
    events: [
      {
        event_id: "event_work_today",
        user_id: "user_e2e",
        label: "__WORK__:Trabalho",
        event_type: "event",
        weekday: null,
        event_date: today,
        active_until: null,
        duration_hours: 8,
        created_at: now,
      },
      {
        event_id: "event_other_tomorrow",
        user_id: "user_e2e",
        label: "Academia",
        event_type: "event",
        weekday: null,
        event_date: tomorrow,
        active_until: null,
        duration_hours: 1,
        created_at: now,
      },
      {
        event_id: "event_other_yesterday",
        user_id: "user_e2e",
        label: "__OTHER__:Plantao encerrado",
        event_type: "event",
        weekday: null,
        event_date: yesterday,
        active_until: null,
        duration_hours: 12,
        created_at: now,
      },
      {
        event_id: "event_work_routine_weekday",
        user_id: "user_e2e",
        label: "__WORK__:Ambulatorio fixo",
        event_type: "routine",
        weekday: yesterdayWeekday,
        event_date: null,
        active_until: null,
        duration_hours: 6,
        created_at: now,
      },
    ],
    streak: {
      streak_days: 12,
      streak_max: 20,
      streak_at_risk: false,
      streak_reviews: 48,
      streak_flashcards_seen: 36,
      weekly_study_days: 5,
      active_protection: false,
      protection_window_end: null,
    },
    turboCardsByDate: {
      [yesterday]: 20,
    },
    suggestions: [],
    counters: {
      event: 100,
      study: 100,
      task: 100,
      suggestion: 100,
      importSession: 100,
    },
    autoReschedule: {
      noBetterDateTaskIds: [],
    },
    apiHits: {
      listReviewTasks: 0,
      autoReschedulePreview: 0,
      autoRescheduleApply: 0,
    },
  };
}

function findTask(db: DbState, taskId: string): ReviewTask | null {
  return db.pendingTasks.find((t) => t.task_id === taskId)
    ?? db.doneTasks.find((t) => t.task_id === taskId)
    ?? null;
}

function toDateTimeFromISO(dateISO: string): string {
  return `${dateISO}T12:00:00Z`;
}

function buildSuggestionItems(db: DbState) {
  const today = todayISO();
  return db.pendingTasks
    .filter((task) => task.is_overdue && task.due_date < today)
    .map((task, index) => ({
      task_id: task.task_id,
      area: task.area,
      theme: task.theme,
      current_due_date: task.due_date,
      suggested_due_date: plusDays(today, index + 1),
      reason: "Atrasada e redistribuida para equilibrar a carga.",
      applied: false,
    }));
}

export async function mockCronogramaApi(page: Page): Promise<{ db: DbState }> {
  const db = createDb();

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const path = url.pathname;

    // App shell route-guard profile check
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
    if (method === "GET" && path === "/api/notes/operational/streak") {
      return json(route, clone(db.streak));
    }
    if (method === "GET" && path === "/api/notes/operational/turbo/overview") {
      return json(route, {
        due_count: 4,
        new_count: 1,
        overdue_count: 2,
        total_eligible: 18,
        suggested_target_cards: 4,
        estimated_minutes: 2,
        reason_counts: [
          { reason: "overdue", label: "Esta atrasado e pode comecar a enfraquecer.", count: 2 },
          { reason: "wrong_question", label: "Nasceu de uma questao errada.", count: 1 },
        ],
        by_area: [
          { area: "CM", due_count: 3, new_count: 1, overdue_count: 2, total_eligible: 10 },
          { area: "GO", due_count: 1, new_count: 0, overdue_count: 0, total_eligible: 8 },
        ],
        priority_preview: [],
      });
    }
    if (method === "GET" && path === "/api/notes/operational/turbo/session/daily-completed-cards") {
      const byDay = Object.entries(db.turboCardsByDate)
        .map(([day, cardsCompleted]) => ({
          day,
          cards_completed: cardsCompleted,
          sessions_completed: cardsCompleted > 0 ? 1 : 0,
        }))
        .sort((a, b) => a.day.localeCompare(b.day));
      return json(route, {
        timezone: "America/Fortaleza",
        by_day: byDay,
      });
    }

    // Cronograma initial loads
    if (method === "GET" && path === "/api/reviews/agenda") {
      const today = todayISO();
      return json(route, {
        tasks: db.pendingTasks.map((task, index) => ({
          ...task,
          knowledge_node_id: null,
          node_mastery: index === 0 ? 0.62 : 0.48,
          node_retention: index === 0 ? 0.58 : 0.34,
          node_volatility: index === 0 ? 0.18 : 0.42,
          at_risk: index !== 0,
          due_question_count: task.due_date <= today ? 2 : 0,
        })),
        due_question_total: 2,
        struggling_question_total: 1,
        question_review_total: 3,
        generated_at: new Date().toISOString(),
      });
    }
    if (method === "GET" && path === "/api/reviews/tasks") {
      db.apiHits.listReviewTasks += 1;
      const status = url.searchParams.get("status");
      if (status === "done") return json(route, clone(db.doneTasks));
      return json(route, clone(db.pendingTasks));
    }
    if (method === "GET" && path === "/api/studies/directed") {
      return json(route, clone(db.studies));
    }
    if (method === "GET" && path === "/api/events") {
      return json(route, clone(db.events));
    }
    if (method === "GET" && path === "/api/schedule/suggestions") {
      return json(route, clone(db.suggestions.filter((suggestion) => suggestion.status === "pending")));
    }
    if (method === "GET" && path === "/api/schedule/workload") {
      return json(route, []);
    }
    if (method === "GET" && path === "/api/studies/performance-summary") {
      return json(route, { area_summaries: [], diagnosis: { ready: false, weaknesses: [] } });
    }
    if (method === "POST" && path === "/api/schedule/suggest") {
      const items = buildSuggestionItems(db);
      if (items.length === 0) {
        return json(route, null);
      }
      for (const suggestion of db.suggestions) {
        if (suggestion.status === "pending") suggestion.status = "superseded";
      }
      db.counters.suggestion += 1;
      const suggestion = {
        suggestion_id: `suggestion_${db.counters.suggestion}`,
        status: "pending",
        created_at: new Date().toISOString(),
        items,
      };
      db.suggestions.push(suggestion);
      return json(route, clone(suggestion));
    }

    // Review task mutation
    if (method === "PATCH" && /^\/api\/reviews\/tasks\/[^/]+$/.test(path)) {
      const taskId = path.split("/").pop() as string;
      const task = findTask(db, taskId);
      if (!task) return json(route, { detail: "Task not found" }, 404);
      const payload = request.postDataJSON() as { status?: "pending" | "done"; due_date?: string };
      if (payload.due_date) {
        task.due_date = payload.due_date;
        task.due_at = toDateTimeFromISO(payload.due_date);
      }
      if (payload.status && payload.status !== task.status) {
        if (payload.status === "done") {
          db.pendingTasks = db.pendingTasks.filter((t) => t.task_id !== task.task_id);
          task.status = "done";
          db.doneTasks.push(task);
        } else {
          db.doneTasks = db.doneTasks.filter((t) => t.task_id !== task.task_id);
          task.status = "pending";
          db.pendingTasks.push(task);
        }
      }
      return json(route, clone(task));
    }

    if (method === "POST" && /^\/api\/reviews\/tasks\/[^/]+\/auto-reschedule$/.test(path)) {
      const taskId = path.split("/")[4];
      const task = findTask(db, taskId);
      if (!task) return json(route, { detail: "Task not found" }, 404);
      const isPreview = url.searchParams.get("preview") === "1";
      const noBetterDate = db.autoReschedule.noBetterDateTaskIds.includes(taskId);
      const suggestedDate = noBetterDate ? task.due_date : plusDays(task.due_date, 1);
      if (isPreview) {
        db.apiHits.autoReschedulePreview += 1;
        return json(route, clone({
          ...task,
          due_date: suggestedDate,
          due_at: toDateTimeFromISO(suggestedDate),
        }));
      }
      db.apiHits.autoRescheduleApply += 1;
      task.due_date = suggestedDate;
      task.due_at = toDateTimeFromISO(suggestedDate);
      task.is_overdue = task.due_date < todayISO();
      return json(route, clone(task));
    }

    // Event mutation
    if (method === "POST" && path === "/api/events") {
      const payload = request.postDataJSON() as {
        label: string;
        event_type: "routine" | "event";
        weekday?: number | null;
        event_date?: string | null;
        duration_hours: number;
      };
      db.counters.event += 1;
      const event: CalendarEventOut = {
        event_id: `event_${db.counters.event}`,
        user_id: "user_e2e",
        label: payload.label,
        event_type: payload.event_type,
        weekday: payload.weekday ?? null,
        event_date: payload.event_date ?? null,
        active_until: null,
        duration_hours: payload.duration_hours,
        created_at: new Date().toISOString(),
      };
      db.events.push(event);
      return json(route, clone(event), 201);
    }
    if (method === "DELETE" && /^\/api\/events\/[^/]+$/.test(path)) {
      const eventId = path.split("/").pop() as string;
      const scope = url.searchParams.get("scope") ?? "future";
      const effectiveFrom = url.searchParams.get("effective_from") ?? todayISO();
      if (scope === "all") {
        db.events = db.events.filter((event) => event.event_id !== eventId);
        return json(route, {});
      }

      db.events = db.events.map((event) => {
        if (event.event_id !== eventId) return event;
        if (event.event_type === "event" && event.event_date && event.event_date < effectiveFrom) {
          return event;
        }
        return {
          ...event,
          active_until: plusDays(effectiveFrom, -1),
        };
      });
      return json(route, {});
    }

    // Study mutation (used by modal/detail flows)
    if (method === "POST" && path === "/api/studies/directed") {
      const payload = request.postDataJSON() as {
        topic?: { area: string; theme: string; subtheme?: string | null };
        study_kind?: "topic" | "full_exam";
        full_exam?: { full_exam_name: string; full_exam_year?: number | null; full_exam_type?: "acesso_direto" | "r_plus" | null };
        total_questions: number;
        correct_questions: number;
        performed_at?: string | null;
      };
      db.counters.study += 1;
      db.counters.task += 1;
      const performedAt = String(payload.performed_at || toDateTimeFromISO(todayISO()));
      const area = payload.topic?.area ?? "MULTI";
      const theme = payload.topic?.theme ?? payload.full_exam?.full_exam_name ?? "Simulado";
      const studyKind = payload.study_kind ?? (payload.full_exam ? "full_exam" : "topic");
      const study: DirectedStudyListItem = {
        study_id: `study_${db.counters.study}`,
        area,
        theme,
        subtheme: payload.topic?.subtheme ?? null,
        total_questions: payload.total_questions,
        correct_questions: payload.correct_questions,
        user_weight: 2,
        performed_at: performedAt,
        created_at: new Date().toISOString(),
        accuracy: payload.total_questions > 0 ? (payload.correct_questions / payload.total_questions) * 100 : 0,
        is_review: false,
        fsrs_rating: null,
        study_kind: studyKind,
        full_exam_name: payload.full_exam?.full_exam_name ?? null,
        full_exam_year: payload.full_exam?.full_exam_year ?? null,
        full_exam_type: payload.full_exam?.full_exam_type ?? null,
        origin_review_task_id: null,
        import_session_id: null,
      };
      db.studies.push(study);
      const createdTask: ReviewTask = {
        task_id: `task_${db.counters.task}`,
        user_id: "user_e2e",
        area,
        theme,
        subtheme: payload.topic?.subtheme ?? null,
        source_study_id: study.study_id,
        due_date: plusDays(performedAt, 1),
        ideal_due_date: plusDays(performedAt, 1),
        due_at: `${plusDays(performedAt, 1)}T12:00:00Z`,
        ideal_due_at: `${plusDays(performedAt, 1)}T12:00:00Z`,
        is_critical: false,
        is_overdue: false,
        status: "pending",
        expected_questions: Math.max(10, Math.round(payload.total_questions * 0.5)),
        priority_score: 50,
      };
      db.pendingTasks.push(createdTask);
      return json(route, {
        study_id: study.study_id,
        created_tasks: [createdTask],
      }, 201);
    }

    if (method === "POST" && path === "/api/studies/import/sessions") {
      db.counters.importSession += 1;
      return json(route, {
        session_id: `session_${db.counters.importSession}`,
        status: "queued",
      }, 201);
    }

    if (method === "PATCH" && /^\/api\/studies\/directed\/[^/]+$/.test(path)) {
      const studyId = path.split("/").pop() as string;
      const study = db.studies.find((s) => s.study_id === studyId);
      if (!study) return json(route, { detail: "Study not found" }, 404);
      const payload = request.postDataJSON() as { total_questions?: number; correct_questions?: number };
      if (typeof payload.total_questions === "number") study.total_questions = payload.total_questions;
      if (typeof payload.correct_questions === "number") study.correct_questions = payload.correct_questions;
      study.accuracy = study.total_questions > 0 ? (study.correct_questions / study.total_questions) * 100 : 0;
      return json(route, clone(study));
    }

    if (method === "DELETE" && /^\/api\/studies\/directed\/[^/]+$/.test(path)) {
      const studyId = path.split("/").pop() as string;
      db.studies = db.studies.filter((study) => study.study_id !== studyId);
      return json(route, {});
    }

    if (method === "POST" && /^\/api\/schedule\/suggestions\/[^/]+\/accept-item$/.test(path)) {
      const suggestionId = path.split("/")[4] as string;
      const suggestion = db.suggestions.find((item) => item.suggestion_id === suggestionId);
      if (!suggestion) return json(route, { detail: "Suggestion not found" }, 404);
      const payload = request.postDataJSON() as { task_id?: string };
      const targetItem = suggestion.items.find((item) => item.task_id === payload.task_id);
      if (!targetItem) return json(route, { detail: "Suggestion item not found" }, 404);
      const task = findTask(db, targetItem.task_id);
      if (task) {
        task.due_date = targetItem.suggested_due_date;
        task.due_at = toDateTimeFromISO(targetItem.suggested_due_date);
        task.is_overdue = task.due_date < todayISO();
      }
      targetItem.applied = true;
      if (suggestion.items.every((item) => item.applied)) {
        suggestion.status = "accepted";
      }
      return json(route, clone(suggestion));
    }
    if (method === "POST" && /^\/api\/schedule\/suggestions\/[^/]+\/accept-all$/.test(path)) {
      const suggestionId = path.split("/")[4] as string;
      const suggestion = db.suggestions.find((item) => item.suggestion_id === suggestionId);
      if (!suggestion) return json(route, { detail: "Suggestion not found" }, 404);
      for (const item of suggestion.items) {
        const task = findTask(db, item.task_id);
        if (!task) continue;
        task.due_date = item.suggested_due_date;
        task.due_at = toDateTimeFromISO(item.suggested_due_date);
        task.is_overdue = task.due_date < todayISO();
        item.applied = true;
      }
      suggestion.status = "accepted";
      return json(route, clone(suggestion));
    }
    if (method === "POST" && /^\/api\/schedule\/suggestions\/[^/]+\/reject$/.test(path)) {
      const suggestionId = path.split("/")[4] as string;
      const suggestion = db.suggestions.find((item) => item.suggestion_id === suggestionId);
      if (!suggestion) return json(route, { detail: "Suggestion not found" }, 404);
      suggestion.status = "rejected";
      return json(route, clone(suggestion));
    }

    // Safe fallback for unrelated API calls in this page
    return json(route, {});
  });

  return { db };
}

export function currentTodayISO(): string {
  return todayISO();
}
