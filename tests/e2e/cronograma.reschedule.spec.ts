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

/**
 * ⚠️ ESTE SPEC MEDIA A SEMANA E COBRAVA ELEMENTOS DO MES.
 *
 * Ele ia a `/cronograma` e procurava `[data-dot-kind='pending']` e o botao
 * "Reagendar", que vivem em `calendar/CalendarGrid.tsx` e `CalendarSections.tsx`
 * — a grade do MES. A semana (`CronogramaWeekView`) usa `data-week-day-dot`, um
 * marcador diferente, e nao monta nenhum dos dois.
 *
 * A causa e' a separacao de rotas de `efabd321` (2026-09-08): `/cronograma`
 * passou a ser a SEMANA e o mes ganhou `/cronograma/mes`. Antes disso a mesma
 * URL servia as duas leituras e o spec estava certo. Ele nao foi atualizado, e
 * as duas provas passaram a morrer sem chegar ao que medem — reagendamento.
 *
 * O irmao `cronograma.mobile-ux.spec.ts` nao tem este defeito porque usa
 * `?view=month`, que o `next.config.js` encaminha para a rota nova.
 *
 * ⚠️ CONSERTA UMA DAS DUAS. Medido depois da troca de rota, com servidor
 * proprio e vivo no fim: "reagenda atividade por seletor de data" passa; "modal
 * mostra aceite por item" continua vermelha, e por OUTRA causa — o botao
 * "Reagendar" das atrasadas e' encontrado e clicado, mas o dialogo nao abre.
 * `handleAutoReschedule` faz `POST /api/schedule/suggest`, e o mock devolve
 * `null` quando `buildSuggestionItems(db)` vem vazio. E' defeito de fixture, nao
 * de rota, e fica declarado em vez de escondido.
 */
test.describe("Cronograma reschedule suggestions", () => {
  test.beforeEach(async ({ page }) => {
    await addHttpOnlySessionForPage(page);
  });

  test("modal mostra aceite por item e aceite em lote", async ({ page }) => {
    const { db } = await mockCronogramaApi(page);
    const today = currentTodayISO();
    markTaskOverdue(db.pendingTasks[0], plusDays(today, -2));
    await mockBrowserClock(page, `${today}T20:30:00-03:00`);

    await page.goto("/cronograma/mes");

    await page.getByRole("button", { name: "Reagendar" }).click();

    const dialog = page.getByRole("dialog", { name: "Reagendamento sugerido" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/Pneumonia/i);
    await expect(dialog.getByRole("button", { name: "Aceitar todas" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Aceitar", exact: true })).toBeVisible();
  });

  test("reagenda atividade por seletor de data e permite desfazer", async ({ page }) => {
    const { db } = await mockCronogramaApi(page);
    const today = currentTodayISO();
    const targetDate = plusDays(today, 2);

    await page.goto("/cronograma/mes");

    await page.locator("[data-dot-kind='pending']").first().click();
    await page.getByRole("button", { name: "Reagendar" }).click();

    const dialog = page.getByRole("dialog", { name: "Reagendar atividade" });
    await expect(dialog).toBeVisible();
    await dialog.locator("input[type='date']").fill(targetDate);
    await dialog.getByRole("button", { name: "Confirmar reagendamento" }).click();

    await expect.poll(() => db.pendingTasks.find((task) => task.task_id === "task_pending_1")?.due_date).toBe(targetDate);
    await expect(page.getByText(/Atividade reagendada para/i)).toBeVisible();

    await page.getByRole("button", { name: "Desfazer" }).click();
    await expect.poll(() => db.pendingTasks.find((task) => task.task_id === "task_pending_1")?.due_date).toBe(today);
  });
});
