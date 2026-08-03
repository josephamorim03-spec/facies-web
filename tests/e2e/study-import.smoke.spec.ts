import { expect, test } from "@playwright/test";

import { addHttpOnlySession } from "./support/authCookies";

test.describe("Importacao de prova legacy routes", () => {
  test.beforeEach(async ({ context }) => {
    await addHttpOnlySession(context);
  });

  // O destino final e' `/banco`, nao `/banco-de-questoes`: este ultimo virou 308
  // para aquele (next.config.js). A rota legada nao redireciona sozinha -- ela
  // reexporta a pagina de importacao, que manda o usuario ao banco quando a
  // sessao nao existe.
  test("redireciona rotas antigas de importação para o banco de questões", async ({ page }) => {
    await page.goto("/agenda-operacional/importar/session_import_e2e");
    await expect(page).toHaveURL(/\/banco$/);
  });
});
