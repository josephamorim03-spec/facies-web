import { expect, test, type Page } from "@playwright/test";

import { addHttpOnlySessionForPage } from "./support/authCookies";

const FIXED_TODAY_ISO = "2026-06-02";
const FIXED_BROWSER_ISO = "2026-06-02T12:00:00-03:00";
const TARGET_WEEKDAY_LABEL = "Ter";

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

type Profile = {
  user_id: string;
  weekly_goal_questions: number;
  timezone: string;
  reschedule_mode: "suggest" | "auto" | "never" | string;
  display_name: string | null;
  photo_url: string | null;
  has_completed_initial_goal_setup: boolean;
  access_status: "active" | "expired" | "pending_key";
};

function plusDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

async function mockBrowserClock(page: Page, fixedIso: string) {
  await page.addInitScript((iso) => {
    const RealDate = Date;
    const fixedNow = new RealDate(iso).getTime();
    class MockDate extends RealDate {
      constructor(...args: ConstructorParameters<typeof Date>) {
        if ((args as unknown[]).length === 0) {
          super(fixedNow);
          return;
        }
        super(...args);
      }

      static now() {
        return fixedNow;
      }
    }

    MockDate.parse = RealDate.parse;
    MockDate.UTC = RealDate.UTC;
    window.Date = MockDate as unknown as DateConstructor;
  }, fixedIso);
}

async function mockRoutinePlanApi(page: Page) {
  const profile: Profile = {
    user_id: "user_plan_e2e",
    weekly_goal_questions: 300,
    timezone: "America/Sao_Paulo",
    reschedule_mode: "suggest",
    display_name: "E2E User",
    photo_url: null,
    access_status: "active",
    has_completed_initial_goal_setup: true,
  };

  const fsrsConfig = {
    parameters: null as number[] | null,
    desired_retention: 0.75,
  };

  const userState = {
    user_id: "user_plan_e2e",
    is_on_call: false,
    post_call: false,
    energy_level: 3,
    sleep_hours: 7,
    updated_at: `${FIXED_TODAY_ISO}T12:00:00Z`,
  };

  const state = {
    nextEventId: 1,
    events: [] as CalendarEventOut[],
  };

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const path = url.pathname;

    const json = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });

    if (method === "GET" && path === "/api/profile") {
      return json(profile);
    }

    if (method === "PATCH" && path === "/api/profile") {
      Object.assign(profile, request.postDataJSON());
      return json(profile);
    }

    if (method === "GET" && path === "/api/me") {
      return json({ user_id: profile.user_id, display_name: profile.display_name });
    }

    if (method === "GET" && path === "/api/fsrs/config") {
      return json(fsrsConfig);
    }

    if (method === "PUT" && path === "/api/fsrs/config") {
      Object.assign(fsrsConfig, request.postDataJSON());
      return json(fsrsConfig);
    }

    if (method === "GET" && path === "/api/notes/operational/streak") {
      return json({
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
      return json({
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
      return json({ timezone: "America/Sao_Paulo", by_day: [] });
    }

    if (method === "GET" && path === "/api/reviews/tasks") {
      return json([]);
    }

    if (method === "GET" && path === "/api/reviews/agenda") {
      return json({
        tasks: [],
        due_question_total: 0,
        struggling_question_total: 0,
        question_review_total: 0,
        generated_at: new Date().toISOString(),
      });
    }

    if (method === "GET" && path === "/api/studies/directed") {
      return json([]);
    }

    if (method === "GET" && path === "/api/studies/performance-summary") {
      return json({ area_summaries: [], diagnosis: { ready: false, weaknesses: [] } });
    }

    if (method === "GET" && path === "/api/subjects/rank") {
      return json([]);
    }

    if (method === "GET" && path === "/api/schedule/workload") {
      return json([]);
    }

    if (method === "GET" && path === "/api/schedule/generate") {
      return json({
        mode: "NORMAL",
        date: url.searchParams.get("day") ?? FIXED_TODAY_ISO,
        focus_minutes: 0,
        buffer_minutes: 0,
        total_planned_minutes: 0,
        recovery_mode: false,
        rebalance_required: false,
        reason: null,
        blocks: [],
      });
    }

    if (method === "GET" && path === "/api/events") {
      return json(state.events);
    }

    if (method === "POST" && path === "/api/events") {
      const payload = request.postDataJSON() as {
        label: string;
        event_type: "routine" | "event";
        weekday?: number | null;
        event_date?: string | null;
        duration_hours: number;
      };
      const created: CalendarEventOut = {
        event_id: `event_${state.nextEventId++}`,
        user_id: profile.user_id,
        label: payload.label,
        event_type: payload.event_type,
        weekday: payload.weekday ?? null,
        event_date: payload.event_date ?? null,
        active_until: null,
        duration_hours: payload.duration_hours,
        created_at: `${FIXED_TODAY_ISO}T12:00:00Z`,
      };
      state.events.push(created);
      return json(created, 201);
    }

    if (method === "DELETE" && /^\/api\/events\/[^/]+$/.test(path)) {
      const eventId = path.split("/").pop() as string;
      const scope = url.searchParams.get("scope") ?? "future";
      const effectiveFrom = url.searchParams.get("effective_from") ?? FIXED_TODAY_ISO;

      if (scope === "all") {
        state.events = state.events.filter((event) => event.event_id !== eventId);
        return json({});
      }

      state.events = state.events.map((event) => {
        if (event.event_id !== eventId) return event;
        if (event.event_type === "event" && event.event_date && event.event_date < effectiveFrom) {
          return event;
        }
        return {
          ...event,
          active_until: plusDays(effectiveFrom, -1),
        };
      });
      return json({});
    }

    if (method === "GET" && path === "/api/user/state") {
      return json(userState);
    }

    if (method === "POST" && path === "/api/user/state") {
      Object.assign(userState, request.postDataJSON(), { updated_at: `${FIXED_TODAY_ISO}T12:00:00Z` });
      return json(userState);
    }

    return json({});
  });
}

async function addRecurringEvent(page: Page, label: string, durationHours: "12" | "24") {
  await page.getByRole("button", { name: TARGET_WEEKDAY_LABEL, exact: true }).click();
  await page.locator("input[placeholder*='Plant']").fill(label);
  await page.locator("select").first().selectOption(durationHours);
  await page.getByRole("button", { name: /\+ Adicionar/ }).click();
}

async function exerciseSoftDeleteFlow(page: Page, path: "/rotina-e-metas" | "/rotina", heading: "Metas" | "Rotina") {
  await mockBrowserClock(page, FIXED_BROWSER_ISO);
  await mockRoutinePlanApi(page);
  await page.goto(path);

  await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();

  await addRecurringEvent(page, "Plantao fixo 24h", "24");
  await expect(page.getByText(/Ter - Plantao fixo 24h \(24h\)/)).toBeVisible();

  await page.locator("li", { hasText: "Plantao fixo 24h" }).getByTitle("Remover").click();
  await expect(page.getByText(/Plantao fixo 24h/)).toHaveCount(0);
  await expect(page.getByText("Nenhum evento fixo.")).toBeVisible();

  await addRecurringEvent(page, "Plantao substituto 12h", "12");
  await expect(page.getByText(/ultrapassa 24h/)).toHaveCount(0);
  await expect(page.getByText(/Ter - Plantao substituto 12h \(12h\)/)).toBeVisible();
}

test.describe("Routine event overflow stays aligned with future soft-delete", () => {
  test.beforeEach(async ({ page }) => {
    await addHttpOnlySessionForPage(page);
  });

  test("PLANO allows a new recurring event after future deletion", async ({ page }) => {
    await exerciseSoftDeleteFlow(page, "/rotina-e-metas", "Metas");
  });

  test("/rotina mirrors the same effective-hours behavior", async ({ page }) => {
    await exerciseSoftDeleteFlow(page, "/rotina", "Rotina");
  });
});
