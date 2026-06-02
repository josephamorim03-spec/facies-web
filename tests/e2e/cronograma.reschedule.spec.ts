import { expect, test, type Page } from "@playwright/test";

import { addHttpOnlySessionForPage } from "./support/authCookies";
import { currentTodayISO, mockCronogramaApi } from "./support/cronogramaApiMock";

function plusDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function markTaskOverdue(task: { due_date: string; ideal_due_date: string; due_at: string; ideal_due_at: string; is_overdue: boolean }, dueDate: string) {
  task.due_date = dueDate;
  task.ideal_due_date = dueDate;
  task.due_at = `${dueDate}T12:00:00Z`;
  task.ideal_due_at = `${dueDate}T12:00:00Z`;
  task.is_overdue = true;
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

test.describe("Cronograma reschedule suggestions", () => {
  test.beforeEach(async ({ page }) => {
    await addHttpOnlySessionForPage(page);
  });

  test("modal mostra aceite por item e aceite em lote", async ({ page }) => {
    const { db } = await mockCronogramaApi(page);
    const today = currentTodayISO();
    markTaskOverdue(db.pendingTasks[0], plusDays(today, -2));
    await mockBrowserClock(page, `${today}T20:30:00-03:00`);

    await page.goto("/cronograma");

    await page.getByRole("button", { name: "Reagendar atrasadas" }).click();

    const dialog = page.getByRole("dialog", { name: "Reagendamento sugerido" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/Pneumonia/i);
    await expect(dialog.getByRole("button", { name: "Aceitar todas" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Aceitar", exact: true })).toBeVisible();
  });
});
