import { expect, test } from "@playwright/test";

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

test.describe("Semana bulk reschedule flow", () => {
  test.beforeEach(async ({ page }) => {
    await addHttpOnlySessionForPage(page);
  });

  test("remove atalhos rapidos e abre sugestao em massa para atrasadas", async ({ page }) => {
    const { db } = await mockCronogramaApi(page);
    const today = currentTodayISO();
    markTaskOverdue(db.pendingTasks[0], plusDays(today, -2));

    await page.goto("/semana");

    await expect(page.getByRole("heading", { name: /Acesso rápido/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Reagendar$/ })).toHaveCount(0);

    const bulkButton = page.getByRole("button", { name: /Reagendar atrasada/i });
    await expect(bulkButton).toBeVisible();
    await bulkButton.click();

    const dialog = page.getByRole("dialog", { name: "Reagendar atrasadas" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/Pneumonia/i);
    await expect(dialog.getByRole("button", { name: "Aceitar todas" })).toBeVisible();
  });

  test("aceitar todas faz refetch completo e limpa o bloco de atrasadas", async ({ page }) => {
    const { db } = await mockCronogramaApi(page);
    const today = currentTodayISO();
    markTaskOverdue(db.pendingTasks[0], plusDays(today, -2));
    markTaskOverdue(db.pendingTasks[1], plusDays(today, -1));

    await page.goto("/semana");
    await expect(page.getByText(/Atrasadas - 2/i)).toBeVisible();
    const initialListReviewHits = db.apiHits.listReviewTasks;

    await page.getByRole("button", { name: "Reagendar todas" }).click();
    const dialog = page.getByRole("dialog", { name: "Reagendar atrasadas" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Aceitar todas" }).click();

    await expect.poll(() => db.apiHits.listReviewTasks).toBeGreaterThanOrEqual(initialListReviewHits + 2);
    await expect.poll(() => db.pendingTasks.filter((task) => task.is_overdue && task.due_date < currentTodayISO()).length).toBe(0);
    await expect(page.getByRole("dialog", { name: "Reagendar atrasadas" })).toHaveCount(0);
    await expect(page.getByText(/Atrasadas -/i)).toHaveCount(0);
  });
});
