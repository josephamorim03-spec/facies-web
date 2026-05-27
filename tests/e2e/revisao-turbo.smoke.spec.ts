import { expect, test } from "@playwright/test";

import { addHttpOnlySession } from "./support/authCookies";
import { forceDesktopNavigation } from "./support/desktopNav";
import { mockTurboApi } from "./support/turboApiMock";

test.describe("Revisao turbo smoke", () => {
  test.beforeEach(async ({ context, page }) => {
    await forceDesktopNavigation(page);
    await addHttpOnlySession(context);
    await mockTurboApi(page);
  });

  test("inicia, revela, avalia um card e mostra relatório final", async ({ page }) => {
    await page.goto("/revisao-turbo");

    await expect(page.getByText("Cards para revisar agora")).toBeVisible();
    await page.getByTestId("turbo-start").click();

    await expect(page.getByTestId("turbo-card")).toBeVisible();
    await expect(page.getByText("Conduta inicial na pneumonia comunitaria ambulatorial?")).toBeVisible();

    await page.getByTestId("turbo-reveal").click();
    await expect(page.getByText(/Amoxicilina em dose adequada/)).toBeVisible();

    await page.getByTestId("turbo-rate-good").click();

    const report = page.getByTestId("turbo-performance-report");
    await expect(report).toBeVisible();
    await expect(report.getByText("cards revisados")).toBeVisible();
    await expect(report.getByText("de acerto")).toBeVisible();
  });
});
