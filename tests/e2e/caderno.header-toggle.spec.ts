import { expect, test } from "@playwright/test";
import { mockCadernoApi } from "./support/cadernoApiMock";
import { addHttpOnlySessionForPage } from "./support/authCookies";
import { forceDesktopNavigation } from "./support/desktopNav";

test.describe("Registros header toggle", () => {
  test.beforeEach(async ({ page }) => {
    await forceDesktopNavigation(page);
    await mockCadernoApi(page);
    await addHttpOnlySessionForPage(page);
  });

  test("keeps both modes visible and caches the selected tab", async ({ page }) => {
    await page.goto("/cards/registros");

    const novoRegistro = page.getByRole("button", { name: "Novo registro" });
    const pesquisar = page.getByRole("button", { name: "Pesquisar registros" });

    // Os dois rotulos ficam sempre visiveis -- nada de modo escondido atras de icone.
    await expect(novoRegistro).toBeVisible();
    await expect(pesquisar).toBeVisible();
    await expect(novoRegistro).toHaveAttribute("aria-pressed", "true");
    await expect(pesquisar).toHaveAttribute("aria-pressed", "false");

    await expect(page.locator("[data-caderno-registro-layout='true']")).toBeVisible();
    await expect(page.locator("[data-caderno-pesquisar-layout='true']")).toHaveCount(0);

    await pesquisar.click();

    await expect(pesquisar).toHaveAttribute("aria-pressed", "true");
    await expect(novoRegistro).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("[data-caderno-pesquisar-layout='true']")).toBeVisible();
    await expect(page.locator("[data-caderno-registro-layout='true']")).toHaveCount(0);
    await expect
      .poll(() => page.evaluate(() => window.sessionStorage.getItem("caderno_tab")))
      .toBe("pesquisar");

    // O caminho de volta tem rotulo proprio, e nao uma seta generica.
    await novoRegistro.click();
    await expect(page.locator("[data-caderno-registro-layout='true']")).toBeVisible();
  });

  test("falls back to novo registro when the cached tab is invalid", async ({ page }) => {
    await page.addInitScript(() => {
      window.sessionStorage.setItem("caderno_tab", "invalido");
    });

    await page.goto("/cards/registros");

    await expect(page.getByRole("button", { name: "Novo registro" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.locator("[data-caderno-registro-layout='true']")).toBeVisible();
    await expect(page.locator("[data-caderno-pesquisar-layout='true']")).toHaveCount(0);
  });

  test("keeps equal top spacing from the toggle to the first selection block in both tabs", async ({
    page,
  }) => {
    await page.goto("/cards/registros");

    const toggle = page.getByRole("group", { name: "Modo dos registros" });
    const registroArea = page.locator("[data-caderno-registro-area-picker='true']");
    await expect(toggle).toBeVisible();
    await expect(registroArea).toBeVisible();

    const toggleBoxRegistro = await toggle.boundingBox();
    const registroAreaBox = await registroArea.boundingBox();
    expect(toggleBoxRegistro).not.toBeNull();
    expect(registroAreaBox).not.toBeNull();
    if (!toggleBoxRegistro || !registroAreaBox) return;

    const registroGap = registroAreaBox.y - (toggleBoxRegistro.y + toggleBoxRegistro.height);

    await page.getByRole("button", { name: "Pesquisar registros" }).click();
    const pesquisarArea = page.locator("[data-caderno-pesquisar-area-picker='true']");
    await expect(pesquisarArea).toBeVisible();

    const toggleBoxPesquisar = await toggle.boundingBox();
    const pesquisarAreaBox = await pesquisarArea.boundingBox();
    expect(toggleBoxPesquisar).not.toBeNull();
    expect(pesquisarAreaBox).not.toBeNull();
    if (!toggleBoxPesquisar || !pesquisarAreaBox) return;

    const pesquisarGap = pesquisarAreaBox.y - (toggleBoxPesquisar.y + toggleBoxPesquisar.height);
    expect(Math.abs(registroGap - pesquisarGap)).toBeLessThanOrEqual(4);
  });
});
