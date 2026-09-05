import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { join } from "node:path";

import { addHttpOnlySessionForPage } from "./support/authCookies";

const weeklyTimeline = {
  weeks: [
    { week_label: "S1", week_start: "2026-06-01", total: 32, correct: 20, accuracy_pct: 63, areas: { GO: { total: 10, correct: 6, accuracy_pct: 60 }, PD: { total: 8, correct: 5, accuracy_pct: 63 }, MP: { total: 14, correct: 9, accuracy_pct: 64 } } },
    { week_label: "S2", week_start: "2026-06-08", total: 41, correct: 30, accuracy_pct: 73, areas: { GO: { total: 13, correct: 10, accuracy_pct: 77 }, PD: { total: 10, correct: 6, accuracy_pct: 60 }, MP: { total: 18, correct: 14, accuracy_pct: 78 } } },
    { week_label: "S3", week_start: "2026-06-15", total: 46, correct: 35, accuracy_pct: 76, areas: { GO: { total: 15, correct: 12, accuracy_pct: 80 }, PD: { total: 12, correct: 8, accuracy_pct: 67 }, MP: { total: 19, correct: 15, accuracy_pct: 79 } } },
  ],
  delta_by_area: { GO: 20, PD: 4, MP: 15, CG: null, CM: null, OU: null },
};

async function mockEvolutionApi(page: Page) {
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const body =
      pathname === "/api/profile" ? {
        user_id: "user_e2e", weekly_goal_questions: 300, timezone: "America/Sao_Paulo",
        reschedule_mode: "suggest",
        display_name: "E2E User", access_status: "active", has_completed_initial_goal_setup: true,
      }
      : pathname === "/api/question-bank/performance" ? {
        areas: [
          { area: "GO", label: "Ginecologia e Obstetrícia", questions_seen: 38, accuracy: 0.76, wrong_count: 9, practice_count: 38, readiness: 76, level: "consolidando", next_action: "Mantenha o ritmo." },
          { area: "PD", label: "Pediatria", questions_seen: 30, accuracy: 0.63, wrong_count: 11, practice_count: 30, readiness: 63, level: "atencao", next_action: "Revise os pontos errados." },
          { area: "MP", label: "Medicina Preventiva", questions_seen: 51, accuracy: 0.75, wrong_count: 13, practice_count: 51, readiness: 75, level: "consolidando", next_action: "Mantenha o ritmo." },
        ],
        exam: { simulation_count: 2, accuracy: 0.7, avg_time_ms: 45000, slow_rate: 0.1 },
        generated_at: "2026-06-22T12:00:00Z", unique_questions: 119, total_attempts: 145,
        first_attempt_correct: 86, first_attempt_accuracy: 0.72, repeat_attempts: 26,
        repeat_correct: 22, repeat_accuracy: 0.85, corrected_questions: 17,
      }
      : pathname === "/api/question-bank/sessions" ? []
      : pathname === "/api/studies/weekly-timeline" ? weeklyTimeline
      : pathname === "/api/notes/operational/turbo/area-stats" ? {
        total_reviews: 18, total_notes: 9, total_correct: 14,
        by_area: [
          { area: "GO", notes_count: 3, reviews_total: 7, reviews_correct: 6, reviews_incorrect: 1 },
          { area: "PD", notes_count: 2, reviews_total: 5, reviews_correct: 3, reviews_incorrect: 2 },
          { area: "MP", notes_count: 4, reviews_total: 6, reviews_correct: 5, reviews_incorrect: 1 },
        ],
      }
      : {};

    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
}

for (const viewport of [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`Evolução restaura a leitura analítica no ${viewport.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await addHttpOnlySessionForPage(page);
    await mockEvolutionApi(page);

    await page.goto("/evolucao");
    // O titulo que este teste esperava nao existe no produto ha tempos, e a
    // pagina nao ganha um: o nome dela ja esta na navegacao e na barra de
    // titulo, e repeti-lo dentro do conteudo e a redundancia que o resto desta
    // rodada foi remover. O primeiro conteudo real e o resumo.
    await expect(page.getByText("Resumo do desempenho")).toBeVisible();
    await expect(page.getByTestId("chart-weekly-accuracy")).toBeVisible();
    await expect(page.getByTestId("chart-area-lines")).toBeVisible();
    await expect(page.getByTestId("chart-weekly-volume")).toBeVisible();
    await expect(page.getByTestId("chart-area-slope")).toBeVisible();
    await expect(page.getByTestId("chart-cards-analysis")).toBeVisible();

    await page.getByRole("button", { name: "Entenda esta métrica" }).first().click();
    await expect(page.getByLabel("Explicação da métrica")).toContainText("Usa somente a primeira resposta");

    await page.getByTestId("accuracy-interaction-overlay").click({ position: { x: 45, y: 70 } });
    await expect(page.getByTestId("accuracy-overlay-percent-label")).toHaveText(/\d+%/);
    const pageWidth = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(pageWidth.scrollWidth).toBeLessThanOrEqual(pageWidth.clientWidth);
    await page.evaluate(() => window.scrollTo(0, 0));

    // A tela perdeu duas abas e virou uma leitura so: o gate automatico entra
    // agora porque e quando a estrutura acabou de mudar que ele vale alguma coisa.
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
      .analyze();
    expect(axe.violations).toEqual([]);

    const captureDir = process.env.EVOLUTION_CAPTURE_DIR;
    await page.screenshot({
      path: captureDir
        ? join(captureDir, `evolucao-${viewport.name}.png`)
        : testInfo.outputPath(`evolucao-${viewport.name}.png`),
      fullPage: true,
    });
  });
}
