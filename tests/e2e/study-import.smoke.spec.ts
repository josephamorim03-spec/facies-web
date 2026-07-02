import { expect, test } from "@playwright/test";

import { addHttpOnlySession } from "./support/authCookies";

test.describe("Importacao de prova legacy routes", () => {
  test.beforeEach(async ({ context }) => {
    await addHttpOnlySession(context);
  });

  test("redireciona rotas antigas de importacao para o banco de questoes", async ({ page }) => {
    await page.goto("/agenda-operacional/importar/session_import_e2e");
    await expect(page).toHaveURL(/\/banco-de-questoes$/);
  });
});
