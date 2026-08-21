import AxeBuilder from "@axe-core/playwright";
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

/**
 * A acao mais frequente da tela ficava embaixo do menu.
 *
 * `TurboCard` reservava `calc(100svh - 5.5rem)` para si — um numero magico que
 * nao corresponde a chrome nenhuma. Em `/cards` a barra inferior tem 3.875rem
 * MAIS a linha de filhos (2.75rem) mais a safe-area: perto de 7rem. O cartao se
 * estendia por baixo dela e levava junto Errei/Dificil/Bom/Facil.
 *
 * A altura agora vem de `--app-content-height`, publicada pelo `AppShell`, que e
 * quem decide o recuo do `<main>`.
 */
test.describe("Revisao turbo no mobile", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test.beforeEach(async ({ context, page }) => {
    await addHttpOnlySession(context);
    await mockTurboApi(page);
  });

  test("os botoes de avaliacao ficam acima da barra de abas", async ({ page }) => {
    await page.goto("/cards");
    await page.getByTestId("turbo-start").click();
    await expect(page.getByTestId("turbo-card")).toBeVisible();
    await page.getByTestId("turbo-reveal").click();

    // Altura real da pilha (linha de filhos + barra), medida no DOM em vez de
    // repetida como constante: e exatamente a duplicacao que causou o defeito.
    const stackHeight = await page.evaluate(() => {
      const bar = document.querySelector("[data-nav-surface='tabbar']");
      const stack = bar?.parentElement as HTMLElement | null;
      return stack?.offsetHeight ?? 0;
    });
    expect(stackHeight).toBeGreaterThan(0);

    const viewport = page.viewportSize();
    const limit = viewport!.height - stackHeight;

    for (const id of ["turbo-rate-again", "turbo-rate-hard", "turbo-rate-good", "turbo-rate-easy"]) {
      const button = page.getByTestId(id);
      await expect(button).toBeVisible();
      const box = await button.boundingBox();
      expect(box, `${id} sem caixa`).not.toBeNull();
      expect(box!.y + box!.height, `${id} entra por baixo da barra`).toBeLessThanOrEqual(limit);
    }
  });

  test("passa no gate automatico de WCAG durante a revisao", async ({ page }) => {
    await page.goto("/cards");
    await page.getByTestId("turbo-start").click();
    await expect(page.getByTestId("turbo-card")).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe("Navegar entre cards", () => {
  test.beforeEach(async ({ context, page }) => {
    await forceDesktopNavigation(page);
    await addHttpOnlySession(context);
    await mockTurboApi(page);
  });

  test("anterior e proximo existem como botao, nao so como gesto", async ({ page }) => {
    // O swipe continua, mas era a UNICA porta: invisivel no desktop e
    // inalcancavel por teclado ou leitor de tela.
    await page.goto("/cards");
    await page.getByTestId("turbo-start").click();
    await expect(page.getByTestId("turbo-card")).toBeVisible();

    const nav = page.getByRole("navigation", { name: "Navegar entre cards" });
    await expect(nav).toBeVisible();
    // No primeiro card nao ha para onde voltar, e o botao diz isso.
    await expect(nav.getByRole("button", { name: /Anterior/ })).toBeDisabled();
    await expect(nav.getByRole("button", { name: /Próximo/ })).toBeVisible();
  });
});
