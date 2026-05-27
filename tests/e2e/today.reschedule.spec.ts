import { expect, test } from "@playwright/test";
import { currentTodayISO, mockCronogramaApi } from "./support/cronogramaApiMock";
import { addHttpOnlySessionForPage } from "./support/authCookies";

function plusDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

test.describe("Semana reschedule flow", () => {
  test.beforeEach(async ({ page }) => {
    await addHttpOnlySessionForPage(page);
  });

  test("abre sugestao de reagendamento no primeiro clique", async ({ page }) => {
    const { db } = await mockCronogramaApi(page);
    const today = currentTodayISO();
    const overdueDate = plusDays(today, -2);
    const overdueTask = db.pendingTasks[0];
    overdueTask.due_date = overdueDate;
    overdueTask.ideal_due_date = overdueDate;
    overdueTask.due_at = `${overdueDate}T12:00:00Z`;
    overdueTask.ideal_due_at = `${overdueDate}T12:00:00Z`;
    overdueTask.is_overdue = true;

    await page.goto("/semana");

    await page.getByRole("button", { name: "Reagendar" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Reagendar tarefa" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/Deseja confirmar o reagendamento/i);
    await expect(dialog.getByRole("button", { name: "Reagendar" })).toBeVisible();
  });

  test("quando nao ha data melhor mostra mensagem de sem alteracao", async ({ page }) => {
    const { db } = await mockCronogramaApi(page);
    const today = currentTodayISO();
    const overdueDate = plusDays(today, -3);
    const overdueTask = db.pendingTasks[0];
    overdueTask.due_date = overdueDate;
    overdueTask.ideal_due_date = overdueDate;
    overdueTask.due_at = `${overdueDate}T12:00:00Z`;
    overdueTask.ideal_due_at = `${overdueDate}T12:00:00Z`;
    overdueTask.is_overdue = true;
    db.autoReschedule.noBetterDateTaskIds.push(overdueTask.task_id);

    await page.goto("/semana");

    await page.getByRole("button", { name: "Reagendar" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Reagendar tarefa" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/data melhor/i);
    await expect(page.getByRole("button", { name: "OK" })).toBeVisible();

    await page.getByRole("button", { name: "OK" }).click();
    await expect(dialog).toHaveCount(0);
    expect(db.apiHits.autoRescheduleApply).toBe(0);
  });

  test("confirmar reagendamento faz refetch completo e remove item das atrasadas", async ({ page }) => {
    const { db } = await mockCronogramaApi(page);
    const today = currentTodayISO();
    const overdueDate = plusDays(today, -1);
    const overdueTask = db.pendingTasks[0];
    overdueTask.due_date = overdueDate;
    overdueTask.ideal_due_date = overdueDate;
    overdueTask.due_at = `${overdueDate}T12:00:00Z`;
    overdueTask.ideal_due_at = `${overdueDate}T12:00:00Z`;
    overdueTask.is_overdue = true;

    await page.goto("/semana");
    await expect(page.getByText(/Atrasadas - 1/i)).toBeVisible();
    const initialListReviewHits = db.apiHits.listReviewTasks;

    await page.getByRole("button", { name: "Reagendar" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Reagendar tarefa" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Reagendar" }).click();

    await expect.poll(() => db.apiHits.autoRescheduleApply).toBe(1);
    await expect.poll(() => db.apiHits.listReviewTasks).toBeGreaterThanOrEqual(initialListReviewHits + 2);
    await expect(page.getByRole("dialog", { name: "Reagendar tarefa" })).toHaveCount(0);
    await expect(page.getByText(/Atrasadas -/i)).toHaveCount(0);
  });
});

