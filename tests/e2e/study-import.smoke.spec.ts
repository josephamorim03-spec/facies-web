import { expect, test } from "@playwright/test";

import { addHttpOnlySession } from "./support/authCookies";
import {
  mockStudyImportApi,
  STUDY_IMPORT_E2E_SESSION_ID,
} from "./support/studyImportApiMock";

test.describe("Importacao de prova smoke", () => {
  test.beforeEach(async ({ context, page }) => {
    await addHttpOnlySession(context);
    await mockStudyImportApi(page);
  });

  test("responde prova importada, finaliza e abre correcao", async ({ page }) => {
    await page.goto(`/agenda-operacional/importar/${STUDY_IMPORT_E2E_SESSION_ID}`);

    await expect(page.getByTestId("study-import-question-1")).toBeVisible();
    await Promise.all([
      page.waitForResponse((response) =>
        response.url().includes(`/questions/1/state`) && response.request().method() === "PUT",
      ),
      page.getByTestId("study-import-option-1-A").click(),
    ]);
    await expect(page.getByTestId("study-import-next-page")).toBeEnabled();

    await page.getByTestId("study-import-next-page").click();
    await expect(page.getByTestId("study-import-question-2")).toBeVisible();
    await Promise.all([
      page.waitForResponse((response) =>
        response.url().includes(`/questions/2/state`) && response.request().method() === "PUT",
      ),
      page.getByTestId("study-import-option-2-B").click(),
    ]);
    await expect(page.getByTestId("study-import-finalize")).toBeEnabled();

    await Promise.all([
      page.waitForResponse((response) =>
        response.url().includes(`/finalize?`) && response.request().method() === "POST",
      ),
      page.getByTestId("study-import-finalize").click(),
    ]);
    await expect(page).toHaveURL(new RegExp(`/agenda-operacional/importar/${STUDY_IMPORT_E2E_SESSION_ID}/resultados$`));
    await expect(page.getByTestId("study-import-results-summary")).toContainText("50%");
    await expect(page.getByTestId("study-import-results-summary")).toContainText("1/2 acertos");
    await expect(page.getByTestId("study-import-result-question-1")).toContainText("Certa");
    await expect(page.getByTestId("study-import-result-question-2")).toContainText("Errada");
  });
});
