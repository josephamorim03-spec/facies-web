import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import {
  mockQuestionSession,
  runnerSession,
  RUNNER_SESSION_ID,
} from "./support/questionSessionMock";

/**
 * A barra superior da sessao no celular.
 *
 * `/banco/sessao/*` e imersivo: o `AppShell` esconde a barra de titulo dele, e a
 * unica barra de topo e a que o proprio runner monta. Ela empilhava oito
 * controles num `flex-wrap` sem reservar a safe-area — em 390px quebrava em
 * duas ou tres linhas e nascia por baixo do relogio do sistema.
 */
test.describe("Runner da sessao no mobile", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test.beforeEach(async ({ page }) => {
    await mockQuestionSession(page);
  });

  test("a barra superior cabe em uma linha", async ({ page }) => {
    await page.goto(`/banco/sessao/${RUNNER_SESSION_ID}`);

    const header = page.locator("header").first();
    await expect(header).toBeVisible();

    const exit = header.getByRole("button", { name: /Sair/i }).first();
    const settings = header.getByRole("button", { name: "Preferências" });
    await expect(settings).toBeVisible();

    const [exitBox, settingsBox] = await Promise.all([exit.boundingBox(), settings.boundingBox()]);
    if (!exitBox || !settingsBox) throw new Error("controles da barra sem caixa");

    // Mesma faixa vertical = mesma linha. Com o `flex-wrap` anterior a
    // engrenagem descia para uma segunda fileira e esta diferenca passava de 30px.
    expect(Math.abs(exitBox.y - settingsBox.y)).toBeLessThanOrEqual(4);

    // Uma linha de controles de 44px + respiro. Duas fileiras passavam de 88px.
    const headerBox = await header.boundingBox();
    expect(headerBox!.height).toBeLessThanOrEqual(72);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("some a duplicata, nao o controle", async ({ page }) => {
    await page.goto(`/banco/sessao/${RUNNER_SESSION_ID}`);

    const header = page.locator("header").first();

    // O que saiu do topo no celular foi so' o que ja estava dito em outro lugar:
    // o tipo da sessao aparecia como cartucho a direita E como rotulo ao lado do
    // contador. Um dos dois basta.
    // `.filter({ visible: true })` e obrigatorio aqui: o cartucho continua no
    // DOM (ele volta no desktop), e a contagem crua incluiria o elemento oculto.
    await expect(
      header.getByText("Simulado", { exact: true }).filter({ visible: true }),
    ).toHaveCount(1);

    // O que e' controle continua alcancavel pelo dedo. O modo foco em especial:
    // ele NAO existe dentro de Preferencias, so' como atalho F11 — escondido
    // aqui, sumiria do produto para quem usa celular.
    await expect(header.getByRole("button", { name: "Mapa" })).toBeVisible();
    await expect(header.getByRole("button", { name: /Modo foco/i })).toBeVisible();
    await expect(header.getByRole("button", { name: "Preferências" })).toBeVisible();
  });

  test("a alternativa escolhida e anunciada, nao so pintada", async ({ page }) => {
    await page.goto(`/banco/sessao/${RUNNER_SESSION_ID}`);

    const optionA = page.getByRole("button", { name: /Amoxicilina em dose adequada/ });
    await expect(optionA).toHaveAttribute("aria-pressed", "false");
    await optionA.click();
    await expect(optionA).toHaveAttribute("aria-pressed", "true");
  });

  test("passa no gate automatico de WCAG", async ({ page }) => {
    await page.goto(`/banco/sessao/${RUNNER_SESSION_ID}`);
    await expect(page.getByRole("progressbar", { name: /Progresso da sessão/i })).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});

/**
 * Feedback por questao, ponta a ponta.
 *
 * O modo nao existia: `normalize_session_contract` sobrescrevia `feedback_timing`
 * em toda sessao nova e `reveal_item_feedback` exigia sessao finalizada — tudo
 * isso enquanto o botao do banco anunciava "feedback por questao". Estes testes
 * existem para que o anuncio e o produto nao voltem a divergir.
 */
test.describe("Feedback por questao", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("responder confirma, e o acerto aparece na hora", async ({ page }) => {
    const revealed: number[] = [];
    const attempts: unknown[] = [];
    await mockQuestionSession(page, {
      session: runnerSession({ feedback_timing: "immediate" }),
      onAttempt: (body) => attempts.push(body),
      onReveal: (position) => revealed.push(position),
    });

    await page.goto(`/banco/sessao/${RUNNER_SESSION_ID}`);

    // Antes de escolher nao ha o que confirmar.
    await expect(page.getByRole("button", { name: "Responder" })).toHaveCount(0);

    await page.getByRole("button", { name: /Amoxicilina em dose adequada/ }).click();

    const confirmar = page.getByRole("button", { name: "Responder" });
    await expect(confirmar).toBeVisible();
    await confirmar.click();

    // O efeito visivel primeiro: `toBeVisible` re-tenta, e e ele que espera a
    // ida ao servidor terminar. As duas assercoes abaixo NAO re-tentam — postas
    // antes desta, passavam isoladas e falhavam na suite cheia, onde a maquina
    // esta carregada e a resposta de revelar ainda nao voltou.
    await expect(page.getByText("Correto", { exact: true })).toBeVisible();

    // A confirmacao COMPROMETE a resposta — e o que separa escolher de responder.
    expect(attempts.some((body) => (body as { commit?: boolean }).commit === true)).toBe(true);
    expect(revealed).toEqual([1]);

    // E o passo seguinte volta a ser avancar, no mesmo lugar do rodape.
    await expect(page.getByRole("button", { name: "Próxima" })).toBeVisible();
  });

  test("sem feedback por questao, nao ha o que confirmar", async ({ page }) => {
    // Numa sessao `post_result` a resposta nao trava e o gabarito nao abre: o
    // aluno anda para a proxima e corrige tudo no fim.
    await mockQuestionSession(page, {
      session: runnerSession({ feedback_timing: "post_result" }),
    });

    await page.goto(`/banco/sessao/${RUNNER_SESSION_ID}`);
    await page.getByRole("button", { name: /Amoxicilina em dose adequada/ }).click();

    await expect(page.getByRole("button", { name: "Responder" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Próxima" })).toBeVisible();
    await expect(page.getByText("Correto", { exact: true })).toHaveCount(0);
  });
});
