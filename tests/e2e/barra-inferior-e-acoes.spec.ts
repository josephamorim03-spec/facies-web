import { expect, test } from "@playwright/test";

import { addHttpOnlySession } from "./support/authCookies";
import { mockApi } from "../../scripts/lib/app-harness.mjs";

/**
 * A BARRA INFERIOR E QUEM FLUTUA POR CIMA DELA.
 *
 * ## Os dois defeitos que este ficheiro prende
 *
 * **1. Num tablet táctil não havia navegação NENHUMA.** Dois portões mediam
 * coisas diferentes: `useDesktopNavigationMode` exige 1024px OU ponteiro fino
 * sem toque, e o CSS escondia a barra de abas a partir de 768px. Entre 768 e
 * 1023px com toque, o JS dizia "mobile" (a sidebar devolve `null`) e o CSS
 * dizia "desktop" (esconde a barra) — e o aluno ficava sem barra e sem rail.
 *
 * **2. Metade de quem flutua sobre o rodapé não conseguia LER a altura da
 * barra.** `--nav-stack-height` vivia só num `<div>` dentro do `AppShell`, e
 * propriedade customizada herda pela árvore: o `<Toast />` e o
 * `<BuildVersionBadge />` são IRMÃOS desse div, e o FAB de análises monta num
 * `Portal` para `document.body`. Os três liam o `0px` de `:root`, assentavam no
 * rodapé e TAPAVAM a navegação — todos têm `z` acima do `z-40` dela.
 *
 * ## ⚠️ Porque este ficheiro mede TOKEN, e não a caixa de um botão
 *
 * `assertNoOverflow` ignora `position: fixed`, então nenhum guard atual vê os
 * botões flutuantes. Por isso este ficheiro mede a CAUSA: o token chegar a
 * `documentElement` é a condição sem a qual `.acima-da-barra-de-abas` não
 * funciona em lado nenhum fora do `<main>`. Prender a causa cobre de uma vez
 * todos os consumidores — incluindo os que este gate não consegue montar.
 *
 * ⚠️ ESTE PARÁGRAFO DIZIA QUE O GATE NÃO CONSEGUE MONTAR OS CARDS, e estava
 * errado: `next.config.js:23` faz `NEXT_PUBLIC_FLASHCARDS ?? "1"` desde
 * 2026-09-10, então o build do e2e tem flashcards LIGADOS mesmo sem a variável.
 * Eu tinha lido a ausência da variável no workflow e concluído "desligado" sem
 * ver o default. É por isso que o bloco do fundo mede a caixa do arranque da
 * revisão de verdade, em vez de se contentar com o token.
 *
 * O `Adicionar` do calendário continua fora daqui: exige um dia selecionado, e
 * `cronograma.smoke` está adiado por depender do backend em `:8000`. Foi
 * verificado à mão (x=16, w=358, h=44, desvio 0, dentro da barra).
 *
 * ⚠️ Montagem copiada do `inicio.smoke.spec.ts`, o vizinho que renderiza ESTA
 * tela e passa no mesmo job: `addHttpOnlySession` primeiro (sem sessão o
 * `AppShell` desvia para `/login`), `mockApi` depois.
 */

const TELEMOVEL = { width: 390, height: 844 };
/** Tablet táctil no meio exato da faixa que ficava sem navegação. */
const TABLET = { width: 820, height: 1180 };

const BARRA = "[data-nav-surface='tabbar']";

/**
 * A ação principal de uma tela vive numa `BottomActionBar`, de largura total e
 * centrada no telemóvel.
 *
 * 🚨 ESTE BLOCO NASCEU DE UMA CORREÇÃO DO OPERADOR. A primeira entrega deixou
 * o arranque da revisão como um `sticky` com caixa própria dentro do cartão do
 * lobby: centrado, sim, mas com outro desenho. Ele apontou o `Pesquisar` do
 * Caderno e disse que os dois deviam ser iguais, e que o padrão se devia
 * repetir em necessidade semelhante.
 *
 * O que se afirma aqui é a REGRA, não a posição: estar dentro de
 * `[data-bottom-action-bar]`. Medir só o centro deixaria passar exatamente o
 * que ele recusou — a coisa certa no sítio certo com a forma errada.
 */
const ACOES_PRINCIPAIS: ReadonlyArray<{ rota: string; testid: string; nome: string }> = [
  { rota: "/cards", testid: "turbo-start", nome: "Iniciar revisão" },
];

test.describe("a navegação inferior aparece onde tem de aparecer", () => {
  // ⚠️ `hasTouch` NAO E OPCIONAL AQUI, e sem ele este ficheiro media o oposto
  // do que quer: `useDesktopNavigationMode` classifica como DESKTOP qualquer
  // aparelho com ponteiro fino e sem toque, em qualquer largura. Sem toque, a
  // 820px o app monta a sidebar e nao a barra de abas -- e o teste falharia a
  // acusar um defeito que nao existe. O buraco real era so em aparelho TACTIL.
  //
  // Fica no `test.use` do bloco porque `hasTouch` e propriedade do CONTEXTO:
  // `setViewportSize` muda a largura no meio do teste, o toque nao.
  test.use({ viewport: TELEMOVEL, hasTouch: true });

  test.beforeEach(async ({ context, page }) => {
    await addHttpOnlySession(context);
    await mockApi(page);
  });

  test("no telemóvel a barra de abas aparece", async ({ page }) => {
    // A metade de controlo do teste do tablet: sem ela, uma barra que sumisse
    // em TODA a largura passaria no teste seguinte por outro motivo.
    await page.setViewportSize(TELEMOVEL);
    await page.goto("/inicio");
    await expect(page.locator(BARRA)).toBeVisible({ timeout: 15_000 });
  });

  test("num tablet TÁCTIL de 820px continua a haver navegação primária", async ({ page }) => {
    // 🚨 O DEFEITO: `md:hidden` (768px) escondia a barra enquanto o portão de
    // JS ainda classificava o aparelho como mobile e não montava a sidebar.
    // Passou a `lg:hidden` (1024px), o mesmo limiar do JS.
    //
    // ⚠️ O CSS NÃO CONSEGUE exprimir `navigator.maxTouchPoints`, então replicar
    // a condição do JS numa media query não fecha. O portão de CSS cobre só o
    // caso em que há CERTEZA (≥1024px); da hidratação em diante manda a
    // montagem em JS, que já estava certa.
    await page.setViewportSize(TABLET);
    await page.goto("/inicio");

    await expect(page.locator(BARRA)).toBeVisible({ timeout: 15_000 });

    // E ela ocupa a largura toda, e não um resto de 1px que "está visível"
    // sem se ver.
    const caixa = await page.locator(BARRA).boundingBox();
    expect(caixa).not.toBeNull();
    expect(caixa!.width).toBeGreaterThan(TABLET.width * 0.9);
  });
});

test.describe("quem flutua sobre o rodapé consegue ler a altura da barra", () => {
  test.use({ viewport: TELEMOVEL, isMobile: true, hasTouch: true });

  test.beforeEach(async ({ context, page }) => {
    await addHttpOnlySession(context);
    await mockApi(page);
  });

  test("`--nav-stack-height` chega ao `documentElement`, e não só ao `<main>`", async ({
    page,
  }) => {
    await page.goto("/inicio");
    await expect(page.locator(BARRA)).toBeVisible({ timeout: 15_000 });

    // ⚠️ Lê-se de `documentElement` DE PROPÓSITO. O wrapper do `AppShell`
    // sempre teve o valor certo; o que faltava era ele alcançar quem não
    // descende dele. Ler do wrapper mediria o que nunca esteve partido.
    const altura = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--nav-stack-height").trim(),
    );
    expect(altura).not.toBe("");
    expect(altura).not.toBe("0px");

    // O valor tem de ser a barra INTEIRA: `min-h-[3.875rem]` = 62px, mais a
    // safe-area. Um token que chegasse com um valor simbólico (`1px`) passaria
    // no `!== "0px"` e continuaria a pôr o botão por cima da navegação.
    const emPixeis = await page.evaluate(() => {
      const sonda = document.createElement("div");
      sonda.style.position = "fixed";
      sonda.style.height = "var(--nav-stack-height)";
      document.body.appendChild(sonda);
      const medida = sonda.getBoundingClientRect().height;
      sonda.remove();
      return medida;
    });
    expect(emPixeis).toBeGreaterThanOrEqual(60);

    // E a altura declarada bate com a que a barra ocupa de facto — é isto que
    // impede o token de envelhecer quando a barra mudar de desenho.
    const caixaDaBarra = await page.locator(BARRA).boundingBox();
    expect(caixaDaBarra).not.toBeNull();
    expect(Math.abs(emPixeis - caixaDaBarra!.height)).toBeLessThanOrEqual(2);
  });

  test("`--nav-stack-shown` vira 0 ao rolar para baixo, e volta no topo", async ({ page }) => {
    // O resto do contrato: a classe multiplica altura por visibilidade, e sem
    // este sinal o botão flutuante fica ancorado a 62px do nada quando a barra
    // se esconde.
    //
    // ⚠️ `/banco`, e a escolha da rota foi MEDIDA, não adivinhada. A 390x844
    // com este fixture:
    //
    //     /inicio ..  844px de conteúdo = a altura da tela. ZERO scroll.
    //     /mapa ....  905px — 61px de folga, e o limiar da barra é 56px.
    //     /mais ....  1235px
    //     /banco ...  1423px — 579px de folga
    //
    // As duas primeiras versões deste teste apontavam para `/inicio` e depois
    // para `/mapa`, e as duas saíram `skipped`: a asserção nunca correu. Um
    // teste que se auto-salta é verde a medir zero — exatamente o que o
    // guard de `podeRolar` abaixo existe para denunciar em vez de esconder.
    await page.goto("/banco");
    await expect(page.locator(BARRA)).toBeVisible({ timeout: 15_000 });

    const lerMostrada = () =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--nav-stack-shown").trim(),
      );

    expect(await lerMostrada()).toBe("1");

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    // ⚠️ Se a página não tiver altura para rolar, o sinal nunca muda e a
    // asserção seria vacuosa. Mede-se primeiro se há o que rolar.
    const podeRolar = await page.evaluate(
      () => document.documentElement.scrollHeight > window.innerHeight + 200,
    );
    test.skip(!podeRolar, "a home coube na tela; não há scroll que esconda a barra");

    await page.waitForFunction(
      () =>
        getComputedStyle(document.documentElement)
          .getPropertyValue("--nav-stack-shown")
          .trim() === "0",
      undefined,
      { timeout: 10_000 },
    );

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForFunction(
      () =>
        getComputedStyle(document.documentElement)
          .getPropertyValue("--nav-stack-shown")
          .trim() === "1",
      undefined,
      { timeout: 10_000 },
    );
  });
});

test.describe("a ação principal segue o padrão do Caderno", () => {
  test.use({ viewport: TELEMOVEL, isMobile: true, hasTouch: true });

  test.beforeEach(async ({ context, page }) => {
    await addHttpOnlySession(context);
    await mockApi(page);
  });

  for (const { rota, testid, nome } of ACOES_PRINCIPAIS) {
    test(`${nome} (${rota}) é uma BottomActionBar de largura total`, async ({ page }) => {
      await page.goto(rota);
      const acao = page.getByTestId(testid);
      await expect(acao).toBeVisible({ timeout: 15_000 });

      // 1. A FORMA: está dentro da barra, e não a imitá-la com caixa própria.
      await expect(
        acao.locator("xpath=ancestor::*[@data-bottom-action-bar][1]"),
      ).toHaveCount(1);

      // 2. A LARGURA e o CENTRO, a 390px.
      const caixa = await acao.boundingBox();
      expect(caixa).not.toBeNull();
      const centro = caixa!.x + caixa!.width / 2;
      expect(Math.abs(centro - TELEMOVEL.width / 2)).toBeLessThanOrEqual(4);
      // Largura total menos as margens da barra (`px-4` de cada lado).
      expect(caixa!.width).toBeGreaterThanOrEqual(TELEMOVEL.width - 40);
      // O piso de alvo de toque do sistema.
      expect(caixa!.height).toBeGreaterThanOrEqual(44);

      // 3. E a barra assenta ACIMA das abas, sem as cobrir.
      const barra = page.locator("[data-bottom-action-bar]").first();
      const caixaDaBarra = await barra.boundingBox();
      const caixaDasAbas = await page.locator(BARRA).boundingBox();
      expect(caixaDaBarra).not.toBeNull();
      expect(caixaDasAbas).not.toBeNull();
      expect(caixaDaBarra!.y + caixaDaBarra!.height).toBeLessThanOrEqual(caixaDasAbas!.y + 2);
    });
  }
});
