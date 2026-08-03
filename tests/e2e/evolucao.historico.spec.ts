import { expect, test, type Page } from "@playwright/test";

import { addHttpOnlySession } from "./support/authCookies";
import { forceDesktopNavigation } from "./support/desktopNav";

// Sucessor de `revisoes.sessions.spec.ts`.
//
// O histórico de sessões deixou de ser a página `/revisoes` e virou uma aba de
// `/evolucao`, com contrato diferente: a lista traz apenas sessões FINALIZADAS,
// identificadas por `session_kind`, sem as abas por tipo, sem CTA de retomar e
// sem deep-link `?tipo=`. Retomar sessão inacabada vive hoje na /hoje, como
// próxima ação.
//
// O spec antigo descrevia a página morta inteira e falhava em todos os casos.

function makeItem(isCorrect: boolean, excluded = false) {
  return { is_correct: isCorrect, excluded_from_scoring: excluded };
}

const SESSIONS = [
  {
    session_id: "sess-banco",
    session_kind: "bank_topic",
    status: "finalized",
    theme: "Placenta prévia",
    full_exam_name: null,
    finalized_at: "2026-06-30T12:00:00+00:00",
    updated_at: "2026-06-30T12:00:00+00:00",
    items: [makeItem(true), makeItem(true), makeItem(false), makeItem(true)],
  },
  {
    session_id: "sess-prova",
    session_kind: "institutional_exam",
    status: "finalized",
    theme: null,
    full_exam_name: "ENARE",
    finalized_at: "2026-06-28T12:00:00+00:00",
    updated_at: "2026-06-28T12:00:00+00:00",
    // O item excluido nao entra no placar: 1/2, nao 1/3.
    items: [makeItem(true), makeItem(false), makeItem(true, true)],
  },
];

async function mockEvolucaoApi(page: Page) {
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;

    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

    if (path === "/api/profile") {
      return json({
        user_id: "user_evolucao_e2e",
        weekly_goal_questions: 300,
        timezone: "America/Sao_Paulo",
        reschedule_mode: "suggest",
        display_name: "E2E User",
        access_status: "active",
        has_completed_initial_goal_setup: true,
      });
    }
    if (path === "/api/me") return json({ user_id: "user_evolucao_e2e", display_name: "E2E User" });
    if (path === "/api/question-bank/sessions") return json(SESSIONS);
    if (path === "/api/question-bank/performance") {
      return json({ first_attempt_accuracy: null, post_review_accuracy: null, areas: [] });
    }
    if (path === "/api/reviews/tasks") return json([]);

    return json({});
  });
}

test.describe("Histórico de sessões (aba de /evolucao)", () => {
  test.beforeEach(async ({ context, page }) => {
    await forceDesktopNavigation(page);
    await addHttpOnlySession(context);
    await mockEvolucaoApi(page);
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  test("lista as sessões finalizadas com placar", async ({ page }) => {
    await page.goto("/evolucao");
    await page.getByRole("tab", { name: "Histórico" }).click();

    const historico = page.getByRole("tabpanel");
    await expect(historico.getByText("Placenta prévia")).toBeVisible();
    await expect(historico.getByText("ENARE")).toBeVisible();

    await expect(historico.getByText("3/4 questões")).toBeVisible();
    // Item marcado como fora do placar nao conta no denominador.
    await expect(historico.getByText("1/2 questões")).toBeVisible();
  });

  test("distingue prova de sessão de banco pelo rótulo", async ({ page }) => {
    await page.goto("/evolucao");
    await page.getByRole("tab", { name: "Histórico" }).click();

    const historico = page.getByRole("tabpanel");
    await expect(historico.getByText("Banco", { exact: true })).toBeVisible();
    await expect(historico.getByText("Prova", { exact: true })).toBeVisible();
  });

  test("os aliases antigos continuam levando ao histórico", async ({ page }) => {
    // `/revisoes` e `/provas` sobreviveram em links, favoritos e no proprio
    // produto. `/provas` prometia cair no historico "filtrado em Simulados" e
    // apontava para a pagina morta -- aterrissava na aba Graficos, calado.
    await page.goto("/revisoes");
    await expect(page).toHaveURL(/\/evolucao$/);

    await page.goto("/provas");
    await expect(page).toHaveURL(/\/evolucao$/);
  });
});
