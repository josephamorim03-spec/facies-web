import { expect, test, type Page } from "@playwright/test";
import { mockCronogramaApi } from "./support/cronogramaApiMock";
import { addHttpOnlySession } from "./support/authCookies";

const FIXED_TODAY = "2026-04-24";

function plusDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function expectGoalStatusAndRiskBottomAligned(page: Page) {
  const goalStatus = page.locator("[data-weekly-goal-status='true']");
  const riskStatus = page.locator("[data-weekly-risk-inline='true']");

  await expect(goalStatus).toBeVisible();
  await expect(riskStatus).toBeVisible();

  const goalBox = await goalStatus.boundingBox();
  const riskBox = await riskStatus.boundingBox();

  expect(goalBox).not.toBeNull();
  expect(riskBox).not.toBeNull();

  if (goalBox && riskBox) {
    const goalBottom = Math.round(goalBox.y + goalBox.height);
    const riskBottom = Math.round(riskBox.y + riskBox.height);
    expect(goalBottom).toBe(riskBottom);
  }
}

test.describe("Today weekly goal warning", () => {
  test.beforeEach(async ({ context, page }) => {
    await addHttpOnlySession(context);
    await page.addInitScript((fixedToday) => {
      const RealDate = Date;
      const fixedNow = new RealDate(`${fixedToday}T21:00:00-03:00`).getTime();
      class MockDate extends RealDate {
        constructor(...args: ConstructorParameters<typeof Date>) {
          const argCount = (args as unknown[]).length;
          if (argCount === 0) {
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
    }, FIXED_TODAY);
  });

  test("shows strong warning and popup when delay is high", async ({ page }) => {
    const { db } = await mockCronogramaApi(page);
    const today = FIXED_TODAY;
    const overdueDate = plusDays(today, -3);

    for (let i = 0; i < 8; i += 1) {
      db.pendingTasks.push({
        task_id: `task_overdue_${i}`,
        user_id: "user_e2e",
        area: "CM",
        theme: `Tema atrasado ${i}`,
        source_study_id: `study_source_${i}`,
        due_date: overdueDate,
        ideal_due_date: overdueDate,
        due_at: `${overdueDate}T12:00:00Z`,
        ideal_due_at: `${overdueDate}T12:00:00Z`,
        is_critical: false,
        is_overdue: true,
        status: "pending",
        expected_questions: 6,
        priority_score: 50,
      });
    }

    db.studies = [
      {
        ...db.studies[0],
        study_id: "study_high_lag",
        total_questions: 12,
        performed_at: today,
      },
    ];

    await page.goto("/hoje");

    const weeklyHeader = page.locator("[data-weekly-header='true']");
    await expect(weeklyHeader).toBeVisible();
    await expect(weeklyHeader).toContainText(/\d{2}\/\d{2}\s*-\s*\d{2}\/\d{2}/);
    await expect(weeklyHeader).not.toContainText(/Risco/i);

    await expect(page.getByText("Progresso")).toBeVisible();
    await expect(page.getByText("Atividades da semana")).toBeVisible();
    const adaptiveCardsSection = page.locator("section").filter({ hasText: "Cards adaptativos" }).filter({ hasText: "~2 min" });
    await expect(adaptiveCardsSection).toBeVisible();
    await expect(page.getByRole("link", { name: "Revisar" })).toHaveAttribute("href", "/cards-adaptativos");
    await expect(page.locator("[data-weekly-meta-divider='true']")).toBeVisible();
    await expect(page.getByText("Atraso alto")).toBeVisible();
    await expect(page.locator("[data-weekly-risk-inline='true']")).toContainText(/Risco/i);
    await expectGoalStatusAndRiskBottomAligned(page);

    const warningTrigger = page.getByLabel("Detalhes da meta semanal");
    await warningTrigger.click();

    const popup = page.getByRole("dialog", { name: "Status da meta semanal" });
    await expect(popup).toBeVisible();
    await expect(popup.getByText(/q\/dia/i)).toBeVisible();

    const box = await popup.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();
    if (box && viewport) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    }

    await page.keyboard.press("Escape");
    await expect(popup).not.toBeVisible();

    await warningTrigger.click();
    await expect(popup).toBeVisible();
    await page.mouse.click(2, 2);
    await expect(popup).not.toBeVisible();
  });

  test("shows pace warning even without high overdue risk", async ({ page }) => {
    const { db } = await mockCronogramaApi(page);
    const today = FIXED_TODAY;

    db.pendingTasks = db.pendingTasks.map((task) => ({
      ...task,
      is_overdue: false,
      due_date: plusDays(today, 1),
      due_at: `${plusDays(today, 1)}T12:00:00Z`,
      ideal_due_date: plusDays(today, 1),
      ideal_due_at: `${plusDays(today, 1)}T12:00:00Z`,
    }));

    db.studies = [
      {
        ...db.studies[0],
        study_id: "study_pace_warning",
        total_questions: 110,
        performed_at: today,
      },
    ];

    await page.goto("/hoje");

    await expect(page.locator("[data-weekly-goal-status='true']")).toContainText(/Abaixo do ritmo|Atraso alto/);
    const warningTrigger = page.getByLabel("Detalhes da meta semanal");
    await expect(warningTrigger).toBeVisible();
    await expectGoalStatusAndRiskBottomAligned(page);

    await warningTrigger.click();
    const popup = page.getByRole("dialog", { name: "Status da meta semanal" });
    await expect(popup).toBeVisible();
    await expect(popup.getByText(/esperado/i)).toBeVisible();
  });

  test("does not show warning trigger when pace is on track", async ({ page }) => {
    const { db } = await mockCronogramaApi(page);
    db.studies = [
      {
        ...db.studies[0],
        study_id: "study_on_track",
        total_questions: 40,
        performed_at: FIXED_TODAY,
      },
    ];

    await page.route("**/api/profile", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user_id: "user_e2e",
          weekly_goal_questions: 40,
          timezone: "America/Fortaleza",
          reschedule_mode: "suggest",
          shift_12h_capacity: 40,
          shift_24h_capacity: 20,
          display_name: "E2E User",
          access_status: "active",
          has_completed_initial_goal_setup: true,
        }),
      });
    });

    await page.goto("/hoje");

    await expect(page.getByLabel("Detalhes da meta semanal")).toHaveCount(0);
    await expect(page.locator("[data-weekly-risk-inline='true']")).toContainText(/Risco/i);
    await expect(page.getByText("Em acompanhamento")).toBeVisible();
    await expectGoalStatusAndRiskBottomAligned(page);
  });
});




