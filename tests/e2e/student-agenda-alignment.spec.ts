import { expect, test } from "@playwright/test";

import { addHttpOnlySessionForPage } from "./support/authCookies";
import { currentTodayISO, mockCronogramaApi } from "./support/cronogramaApiMock";

function shiftISO(iso: string, days: number): string {
  const value = new Date(`${iso}T12:00:00`);
  value.setDate(value.getDate() + days);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function weekStart(iso: string): string {
  const value = new Date(`${iso}T12:00:00`);
  return shiftISO(iso, -((value.getDay() + 6) % 7));
}

const capabilities = {
  can_start: true,
  can_reschedule: true,
  can_edit: false,
  can_delete: false,
};

test.describe("student agenda alignment", () => {
  test.beforeEach(async ({ page }) => {
    await addHttpOnlySessionForPage(page);
    await mockCronogramaApi(page);
    const today = currentTodayISO();
    await page.route("**/api/student/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/student/today") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            contract_version: "student-today-v1",
            generated_at: `${today}T12:00:00Z`,
            status: "complete",
            primary_action: {
              kind: "scheduled_topic_practice",
              title: "Revisar Pneumonia",
              rationale: "Revisão no ponto.",
              estimated_minutes: 20,
              href: "/banco",
              cta_label: "Revisar agora",
              source: "schedule",
              priority_reason: "Revisão vencida.",
              confidence: "high",
              area: "CM",
              agenda_occurrence_id: "review_task:primary",
            },
            backup_actions: [],
            today_load: {
              label: "adequada",
              estimated_minutes: 40,
              recommended_limit_minutes: 60,
              overload_alert: false,
              short_message: "Carga adequada.",
            },
            schedule_preview: {
              date: today,
              items: [],
              overdue_count: 0,
              hidden_count: 0,
              reschedule_recommended: false,
            },
            review_snapshot: { pending_reviews: 2, overdue_reviews: 0, cards_due: 0, estimated_minutes: 40 },
            progress_snapshot: { questions_done_week: 50, weekly_goal_questions: 100, weekly_progress_pct: 50, accuracy_pct: 72 },
            details: { active_session: null, trainer_action: null, secondary_actions: [], schedule_suggestions_count: 0, evidence_confidence: "medium" },
            missing_sources: [],
          }),
        });
        return;
      }
      if (path === "/api/student/agenda") {
        const requestUrl = new URL(route.request().url());
        const requestedFrom = requestUrl.searchParams.get("date_from") ?? weekStart(today);
        const requestedTo = requestUrl.searchParams.get("date_to") ?? shiftISO(requestedFrom, 6);
        const dayCount = Math.round(
          (new Date(`${requestedTo}T12:00:00`).getTime() - new Date(`${requestedFrom}T12:00:00`).getTime()) /
            86_400_000,
        ) + 1;
        const dates = Array.from({ length: dayCount }, (_, index) => shiftISO(requestedFrom, index));
        const nonTodayDates = dates.filter((date) => date !== today);
        const days = dates.map((date) => {
          const primary = {
            occurrence_id: "review_task:primary",
            date,
            source: "review_queue",
            kind: "review_task",
            status: "pending",
            title: "Revisar Pneumonia",
            area: "CM",
            rationale: null,
            href: "/banco",
            estimated_minutes: 20,
            expected_questions: 10,
            completed_questions: 0,
            plan_activity_id: null,
            review_task_id: "primary",
            directed_study_id: null,
            session_id: null,
            event_id: null,
            capabilities,
          };
          const secondary = { ...primary, occurrence_id: "review_task:secondary", review_task_id: "secondary", title: "Revisar Asma" };
          const denseCount = date === nonTodayDates[0]
            ? 1
            : date === nonTodayDates[1]
              ? 5
              : date === nonTodayDates[2]
                ? 6
                : 0;
          const denseAreas = ["GO", "PD", null, "CG", "MP", "CM"] as const;
          const denseItems = Array.from({ length: denseCount }, (_, itemIndex) => ({
            ...primary,
            occurrence_id: `review_task:dense-${itemIndex}`,
            review_task_id: `dense-${itemIndex}`,
            title: `Atividade ${itemIndex + 1}`,
            area: denseAreas[itemIndex] ?? null,
          }));
          const items = date === today ? [primary, secondary, secondary] : denseItems;
          return { date, is_today: date === today, planned_minutes: items.length * 20, planned_questions: items.length * 10, recommended_questions: 20, completed_items: 0, total_items: items.length, overdue_items: 0, overloaded: false, items };
        });
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            contract_version: "student-agenda-v1",
            generated_at: `${today}T12:00:00Z`,
            status: "complete",
            timezone: "America/Sao_Paulo",
            today,
            date_from: days[0].date,
            date_to: days[days.length - 1].date,
            summary: { completed_items: 0, total_items: 2, overdue_items: 0, questions_done_week: 50, weekly_goal_questions: 100, weekly_progress_pct: 50 },
            overdue: [],
            days,
            missing_sources: [],
          }),
        });
        return;
      }
      await route.fallback();
    });
  });

  test("Hoje renders the primary once and deduplicates the remaining list", async ({ page }) => {
    await page.goto("/hoje");
    await expect(page.getByText("Revisar Pneumonia", { exact: true })).toHaveCount(1);
    await expect(page.getByText("Revisar Asma", { exact: true })).toHaveCount(1);
    await expect(page.locator("[data-agenda-occurrence-id='review_task:primary']")).toHaveCount(0);
    await expect(page.locator("[data-agenda-occurrence-id='review_task:secondary']")).toHaveCount(1);
  });

  test("Cronograma opens in Week, highlights today, and switches to Month", async ({ page }) => {
    await page.goto("/cronograma");
    await expect(page.locator("[data-cronograma-week='true']")).toBeVisible();
    await expect(page.locator("[data-week-strip='true'] [data-week-day]")).toHaveCount(7);
    await expect(page.locator("[data-current-day='true']")).toBeVisible();
    await expect(page.locator("[data-week-detail='true']")).toHaveAttribute("data-detail-date", currentTodayISO());
    // A constância é "N de 7 dias", e não um contador de dias seguidos. Este
    // teste exigia "12 dias seguidos" — a cópia do contador ilimitado que
    // `CronogramaStreakCard` removeu de propósito (um contador que zera na
    // primeira falta tem todo o valor em não ser quebrado, e isso é aversão à
    // perda). O fixture já servia `weekly_study_days: 5` e
    // `weekly_protected_days: 2`; só a asserção ficou para trás.
    //
    // Os protegidos entram na asserção porque são a metade que sustenta a
    // outra: sem eles "5 de 7" lê como duas desistências.
    const constancia = page.locator("[data-streak-mode='active']");
    await expect(constancia).toContainText("5 de 7 dias");
    await expect(constancia).toContainText("2 protegidos");
    await expect(constancia).not.toContainText("seguidos");
    await expect(page.getByRole("link", { name: "Abrir preferências" })).toBeVisible();

    const anotherDay = page.locator("[data-week-day]:not([data-current-day='true'])").first();
    const anotherDate = await anotherDay.getAttribute("data-week-day");
    await anotherDay.click();
    await expect(anotherDay).toHaveAttribute("data-selected-day", "true");
    await expect(page.locator("[data-week-detail='true']")).toHaveAttribute("data-detail-date", anotherDate ?? "");

    await page.getByRole("link", { name: "Mês" }).click();
    await expect(page).toHaveURL(/view=month/);
    await expect(page.locator("[data-calendar-summary-stack='true']")).toBeVisible();
  });

  test("Week dots use area colors and only show count when activities overflow", async ({ page }) => {
    await page.goto("/cronograma");

    const freeDay = page.locator("[data-week-day][data-activity-count='0']").first();
    const singleDay = page.locator("[data-week-day][data-activity-count='1']").first();
    const fiveDay = page.locator("[data-week-day][data-activity-count='5']").first();
    const overflowDay = page.locator("[data-week-day][data-activity-count='6']").first();

    await expect(freeDay).toContainText("livre");
    await expect(singleDay.locator("[data-week-day-dot='true']")).toHaveCount(1);
    await expect(singleDay).not.toContainText("1 ativ.");
    await expect(fiveDay.locator("[data-week-day-dot='true']")).toHaveCount(5);
    await expect(fiveDay.locator("[data-week-day-overflow='true']")).toHaveCount(0);
    await expect(fiveDay).not.toContainText("5 ativ.");
    await expect(overflowDay.locator("[data-week-day-dot='true']")).toHaveCount(4);
    await expect(overflowDay.locator("[data-week-day-overflow='true']")).toHaveText("...");
    await expect(overflowDay).toContainText("6 ativ.");

    const areas = await fiveDay.locator("[data-week-day-dot='true']").evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-area")),
    );
    const colors = await fiveDay.locator("[data-week-day-dot='true']").evaluateAll((nodes) =>
      nodes.map((node) => getComputedStyle(node).backgroundColor),
    );
    expect(areas).toEqual(["GO", "PD", "OU", "CG", "MP"]);
    expect(new Set(colors).size).toBe(5);
  });

  test("Mobile uses compact view icons, switches to today, and hides the Today shortcut", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const today = currentTodayISO();

    await page.goto("/hoje");
    await expect(page.getByRole("link", { name: "Abrir cronograma da semana" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Semana", exact: true })).toBeVisible();

    await page.goto(`/cronograma?view=week&anchor=${shiftISO(today, -7)}&day=${shiftISO(today, -7)}`);
    await expect(page.getByRole("navigation", { name: "Visão do cronograma" })).toHaveCount(0);
    const monthSwitch = page.getByTestId("schedule-view-month");
    await expect(monthSwitch).toBeVisible();
    await monthSwitch.click();
    await expect(page).toHaveURL(new RegExp(`view=month&anchor=${today}&day=${today}`));

    const searchButton = page.getByLabel("Buscar tema");
    await expect(searchButton).toBeVisible();
    const weekSwitch = page.getByTestId("schedule-view-week");
    await expect(weekSwitch).toBeVisible();
    await searchButton.click();
    await expect(page.getByPlaceholder("Buscar tema...")).toBeVisible();
    await page.getByTestId("cronograma-search-action").click();
    await expect(weekSwitch).toBeVisible();
    await weekSwitch.click();
    await expect(page).toHaveURL(new RegExp(`view=week&anchor=${today}&day=${today}`));
  });
});
