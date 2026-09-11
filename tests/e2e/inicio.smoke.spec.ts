import { expect, test } from "@playwright/test";

import { addHttpOnlySession } from "./support/authCookies";
import { assertNoOverflow, mockApi } from "../../scripts/lib/app-harness.mjs";

/**
 * A HOME NOVA, E A BARRA QUE A CONTÉM — a tela que TODO login abre.
 *
 * ## 🚨 Por que este ficheiro existe
 *
 * `/inicio` virou a home em 2026-09-10, e é o valor de
 * `DEFAULT_AUTHENTICATED_ROUTE`: é para lá que vão o login, o fim do
 * onboarding, o fallback do `RedirectIfAuthenticated` e o `start_url` do app
 * instalado. Cinco caminhos de entrada, uma tela.
 *
 * E ela nasceu **sem nenhuma cobertura que executasse**. Os dois specs que a
 * mencionavam — `navigation.shell` e `promessas-do-laco` — estão em
 * `SPECS_ADIADOS` e não correm em lado nenhum. Uma regressão aqui quebraria
 * todo login, em silêncio, e o primeiro a saber seria o aluno.
 *
 * ## O que ele prende, e por que só isto
 *
 * A tela é deliberadamente variável: os blocos entram e saem conforme o estado
 * (ver `_lib/ordem.ts`, que tem as suas próprias 13 provas unitárias). Afirmar
 * sobre um bloco específico prenderia o teste ao fixture, não à tela.
 *
 * Então prende o que NÃO pode variar: a tela monta, a barra tem os cinco
 * destinos certos, e nada estoura a 390px. É o mínimo que separa "a home
 * existe" de "o login leva a lugar nenhum".
 *
 * ⚠️ Montagem copiada do `mapa.navegavel.spec.ts`, que renderiza uma tela de
 * aluno no mesmo job e passa: `addHttpOnlySession` primeiro (sem sessão o
 * `AppShell` desvia para `/login`), `mockApi` depois. Errar isto já custou
 * três corridas nesta base.
 */

const TELEMOVEL = { width: 390, height: 844 };

/** Os cinco destinos, na ordem da barra. */
const ABAS = [
  { href: "/inicio", rotulo: "Início" },
  { href: "/cards", rotulo: "Cards" },
  { href: "/banco", rotulo: "Banco" },
  { href: "/mapa", rotulo: "Mapa" },
  { href: "/mais", rotulo: "Mais" },
];

test.describe("a home nova e a barra que a contem", () => {
  test.use({ viewport: TELEMOVEL, isMobile: true, hasTouch: true });

  test.beforeEach(async ({ context, page }) => {
    await addHttpOnlySession(context);
    await mockApi(page);
  });

  test("`/inicio` monta, e é para onde o login manda", async ({ page }) => {
    await page.goto("/inicio");

    // O cabeçalho cumprimenta pelo nome quando há perfil, e diz "Início"
    // quando não há. Os dois são estados válidos; o que não é válido é não
    // haver `<h1>` nenhum — foi assim que `/voce` ficou sem título por meses.
    const titulo = page.getByRole("heading", { level: 1 });
    await expect(titulo).toBeVisible({ timeout: 15_000 });
    await expect(titulo).toHaveText(/Olá|Início/, { timeout: 15_000 });

    await assertNoOverflow(page);
  });

  test("a barra tem os CINCO destinos, e a do Início está acesa", async ({ page }) => {
    await page.goto("/inicio");

    const barra = page.locator("[data-nav-surface='tabbar']");
    await expect(barra).toBeVisible({ timeout: 15_000 });

    const abas = barra.locator("[data-nav-item-href]");
    await expect(abas).toHaveCount(ABAS.length);

    for (const { href, rotulo } of ABAS) {
      const aba = barra.locator(`[data-nav-item-href='${href}']`);
      await expect(aba).toHaveCount(1);
      await expect(aba.getByText(rotulo, { exact: true })).toBeVisible();
    }

    // ⚠️ UMA acesa, e a certa. `toHaveCount(1)` sozinho passaria com a aba
    // errada acesa; `data-nav-item-href` no elemento ativo diz qual é.
    const acesas = barra.locator("[data-nav-active='true']");
    await expect(acesas).toHaveCount(1);
    await expect(acesas).toHaveAttribute("data-nav-item-href", "/inicio");
  });

  test("`/mais` abre a lista, com a Conta no topo", async ({ page }) => {
    await page.goto("/mais");

    // A Conta é a linha que carrega o rosto — foi onde o operador pediu que a
    // foto morasse ("aqui sim com sua foto"), depois de sair da barra.
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("link", { name: /Conta/ }).first()).toBeVisible({
      timeout: 15_000,
    });

    // A Evolução saiu da barra e tem de continuar alcançável: sair da barra não
    // pode virar sumir.
    await expect(page.getByRole("link", { name: /Evolução/ })).toBeVisible();

    // E a aba acesa é a do "Mais", não a do Início.
    const acesas = page.locator("[data-nav-surface='tabbar'] [data-nav-active='true']");
    await expect(acesas).toHaveAttribute("data-nav-item-href", "/mais");

    await assertNoOverflow(page);
  });

  test("`/hoje` continua VIVO, e acende a aba Início", async ({ page }) => {
    // ⚠️ `/hoje` não virou redirect: ele é a agenda do dia inteira, e o Início
    // só a resume. Quem tem link antigo tem de aterrar numa tela real, com a
    // aba certa acesa — o defeito medido de `/voce` era exatamente este.
    await page.goto("/hoje");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15_000 });
    const acesas = page.locator("[data-nav-surface='tabbar'] [data-nav-active='true']");
    await expect(acesas).toHaveAttribute("data-nav-item-href", "/inicio");
  });
});
