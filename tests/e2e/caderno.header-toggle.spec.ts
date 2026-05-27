import { expect, test } from "@playwright/test";
import { mockCadernoApi } from "./support/cadernoApiMock";
import { addHttpOnlySessionForPage } from "./support/authCookies";
import { forceDesktopNavigation } from "./support/desktopNav";

test.describe("Caderno header toggle", () => {
  test.beforeEach(async ({ page }) => {
    await forceDesktopNavigation(page);
    await mockCadernoApi(page);
    await addHttpOnlySessionForPage(page);
  });

  test("uses single centered header toggle with chevron and caches selected tab", async ({ page }) => {
    await page.goto("/caderno");

    const headerToggle = page.locator("[data-caderno-tab-toggle='true']");
    const tabLabel = page.locator("[data-caderno-tab-label='true']");
    const tabChevron = page.locator("[data-caderno-tab-chevron='true']");
    const headerCenter = page.locator("[data-caderno-tab-center='true']");

    await expect(headerToggle).toBeVisible();
    await expect(headerCenter).toBeVisible();
    await expect(headerToggle).toHaveClass(/inline-flex/);
    await expect(headerToggle).toHaveClass(/justify-center/);
    await expect(tabLabel).toHaveText("REGISTRAR");
    await expect(tabChevron).toBeVisible();
    await expect(tabChevron).toHaveClass(/h-3\.5/);
    await expect(tabChevron).not.toHaveClass(/rotate-180/);
    await expect(page.locator("[data-caderno-registro-layout='true']")).toBeVisible();
    await expect(page.locator("[data-caderno-pesquisar-layout='true']")).toHaveCount(0);

    await headerToggle.click();
    await expect(tabLabel).toHaveText("PESQUISAR");
    await expect(tabChevron).toHaveClass(/rotate-180/);
    await expect(page.locator("[data-caderno-pesquisar-layout='true']")).toBeVisible();
    await expect(page.locator("[data-caderno-registro-layout='true']")).toHaveCount(0);
    await expect.poll(
      () => page.evaluate(() => window.sessionStorage.getItem("caderno_tab")),
    ).toBe("pesquisar");
  });

  test("falls back to default registrar when cached tab is invalid", async ({ page }) => {
    await page.addInitScript(() => {
      window.sessionStorage.setItem("caderno_tab", "invalido");
    });

    await page.goto("/caderno");

    await expect(page.locator("[data-caderno-tab-label='true']")).toHaveText("REGISTRAR");
    await expect(page.locator("[data-caderno-registro-layout='true']")).toBeVisible();
    await expect(page.locator("[data-caderno-pesquisar-layout='true']")).toHaveCount(0);
  });

  test("keeps equal top spacing from title toggle to first selection block in both tabs", async ({ page }) => {
    await page.goto("/caderno");

    const headerToggle = page.locator("[data-caderno-tab-toggle='true']");
    const registroArea = page.locator("[data-caderno-registro-area-picker='true']");
    await expect(headerToggle).toBeVisible();
    await expect(registroArea).toBeVisible();

    const headerBoxRegistro = await headerToggle.boundingBox();
    const registroAreaBox = await registroArea.boundingBox();
    expect(headerBoxRegistro).not.toBeNull();
    expect(registroAreaBox).not.toBeNull();
    if (!headerBoxRegistro || !registroAreaBox) return;

    const registroGap = registroAreaBox.y - (headerBoxRegistro.y + headerBoxRegistro.height);

    await headerToggle.click();
    const pesquisarArea = page.locator("[data-caderno-pesquisar-area-picker='true']");
    await expect(pesquisarArea).toBeVisible();

    const headerBoxPesquisar = await headerToggle.boundingBox();
    const pesquisarAreaBox = await pesquisarArea.boundingBox();
    expect(headerBoxPesquisar).not.toBeNull();
    expect(pesquisarAreaBox).not.toBeNull();
    if (!headerBoxPesquisar || !pesquisarAreaBox) return;

    const pesquisarGap = pesquisarAreaBox.y - (headerBoxPesquisar.y + headerBoxPesquisar.height);
    expect(Math.abs(registroGap - pesquisarGap)).toBeLessThanOrEqual(4);
  });
});

