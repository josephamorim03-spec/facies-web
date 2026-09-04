import { expect, test, type Locator } from "@playwright/test";

import { mockQuestionSession, RUNNER_SESSION_ID } from "./support/questionSessionMock";

/**
 * Deslizar entre questoes — e o botao que continua lá.
 *
 * ## O que este arquivo protege
 *
 * O desenho decidiu o gesto, e decidiu com uma condicao
 * (`Webapp - telas.dc.html:2181`):
 *
 * > "O deslizar existe por cima disso, como atalho para quem ja sabe, **nunca
 * > como unico caminho** [...] **Toda acao de gesto tem um botao equivalente na
 * > tela.**"
 *
 * A WCAG 2.5.1 (Pointer Gestures, nivel A) pede o mesmo: gesto de percurso
 * precisa de alternativa de ponteiro unico.
 *
 * Nenhum guard do repositorio verificava isso. Um refactor que trocasse o botao
 * "Próxima" pelo gesto passaria em typecheck, em lint e nos 248 testes de
 * unidade — e sairia para producao tendo removido o unico caminho que funciona
 * para quem usa teclado, leitor de tela, ou uma mao so.
 *
 * As tres asseveracoes, entao, sao: **o gesto anda**, **o botao anda**, e
 * **desligar o gesto nao tira o botao**.
 */

/**
 * Um deslize de toque, em passos.
 *
 * Passo unico nao serve: a trava de eixo do hook (`useDeslizeLateral`) so decide
 * a direcao depois de 12px de movimento, e um salto direto do inicio ao fim
 * entrega um `pointermove` so — que ela le como eixo indefinido e descarta.
 */
async function deslizar(alvo: Locator, deltaX: number) {
  const caixa = await alvo.boundingBox();
  if (!caixa) throw new Error("o alvo do deslize nao tem caixa");
  const y = caixa.y + caixa.height / 2;
  const inicioX = caixa.x + caixa.width / 2;
  const comum = { pointerId: 1, pointerType: "touch", isPrimary: true, bubbles: true };

  await alvo.dispatchEvent("pointerdown", { ...comum, clientX: inicioX, clientY: y });
  for (const fracao of [0.25, 0.5, 0.75, 1]) {
    await alvo.dispatchEvent("pointermove", {
      ...comum,
      clientX: inicioX + deltaX * fracao,
      clientY: y,
    });
  }
  await alvo.dispatchEvent("pointerup", { ...comum, clientX: inicioX + deltaX, clientY: y });
}

async function abrirPreferencias(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Preferências" }).click();
  return page.getByRole("dialog", { name: "Resolver sem ruido" });
}

test.describe("O deslize entre questoes", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test.beforeEach(async ({ page }) => {
    await mockQuestionSession(page);
    await page.goto(`/banco/sessao/${RUNNER_SESSION_ID}`);
    await expect(page.getByText(/Questão 1:/)).toBeVisible();
  });

  test("desliza para a esquerda e avanca; o botao continua na tela", async ({ page }) => {
    const conteudo = page.locator("[data-allow-horizontal-swipe]");

    // −120px passa com folga o limiar de 60px do hook.
    await deslizar(conteudo, -120);
    await expect(page.getByText(/Questão 2:/)).toBeVisible();

    // ⚠️ A METADE QUE IMPORTA. O gesto ter funcionado nao autoriza o botao a
    // sumir: e' ele que existe para o teclado, para o leitor de tela e para
    // quem segura o telefone com uma mao so.
    const proxima = page.getByRole("button", { name: "Próxima", exact: true });
    await expect(proxima).toBeVisible();
    await proxima.click();
    await expect(page.getByText(/Questão 3:/)).toBeVisible();
  });

  test("desliza para a direita e volta", async ({ page }) => {
    await page.getByRole("button", { name: "Próxima", exact: true }).click();
    await expect(page.getByText(/Questão 2:/)).toBeVisible();

    await deslizar(page.locator("[data-allow-horizontal-swipe]"), 120);
    await expect(page.getByText(/Questão 1:/)).toBeVisible();
  });

  test("um movimento curto nao conta como deslize", async ({ page }) => {
    // 30px fica abaixo do limiar de disparo. Sem isto, o dedo que apenas
    // encosta ao rolar viraria uma questao — e o aluno perderia o lugar sem
    // ter pedido nada.
    await deslizar(page.locator("[data-allow-horizontal-swipe]"), -30);
    await expect(page.getByText(/Questão 1:/)).toBeVisible();
  });

  test("desligado nas preferencias, o gesto para e o botao fica", async ({ page }) => {
    const folha = await abrirPreferencias(page);
    const interruptor = folha.getByRole("checkbox", { name: /Deslizar entre questões/ });

    // Ligado por padrao — a condicao literal do artboard `8f`.
    await expect(interruptor).toBeChecked();
    await interruptor.uncheck();
    await folha.getByRole("button", { name: "Fechar" }).click();
    await expect(folha).toBeHidden();

    await deslizar(page.locator("[data-allow-horizontal-swipe]"), -120);
    await expect(page.getByText(/Questão 1:/)).toBeVisible();

    // E o caminho que sempre existiu continua existindo.
    await page.getByRole("button", { name: "Próxima", exact: true }).click();
    await expect(page.getByText(/Questão 2:/)).toBeVisible();
  });

  test("a acao de avancar nao muda de lugar quando a correcao abre", async ({ page }) => {
    // O rodape sumia inteiro ao revelar o gabarito, e o avancar reaparecia
    // dentro do cartao de correcao — onde ainda podia perder a primazia para
    // "Salvar regra". Botao que se muda destroi a memoria motora, que e o
    // ativo que este trabalho inteiro tenta explorar.
    const proximaAntes = await page
      .getByRole("button", { name: "Próxima", exact: true })
      .boundingBox();
    if (!proximaAntes) throw new Error("o avancar nao existe antes de responder");

    // A alternativa nao tem rotulo proprio: o nome acessivel dela e a letra
    // mais o texto inteiro da opcao. `aria-pressed` e o unico atributo que so
    // as cinco alternativas carregam.
    await page.locator("[data-allow-horizontal-swipe] button[aria-pressed]").first().click();
    const responder = page.getByRole("button", { name: "Responder", exact: true });
    if (await responder.isVisible()) await responder.click();

    const proximaDepois = page.getByRole("button", { name: "Próxima", exact: true });
    await expect(proximaDepois).toBeVisible();
    const caixaDepois = await proximaDepois.boundingBox();
    if (!caixaDepois) throw new Error("o avancar sumiu depois da correcao");

    // Mesma faixa vertical: o botao nao migrou para dentro do cartao.
    expect(Math.abs(caixaDepois.y - proximaAntes.y)).toBeLessThanOrEqual(4);

    // E "Marcar" volta junto: ela sumia exatamente na hora em que o aluno
    // decide se guarda a questao.
    await expect(page.getByRole("button", { name: /^Marcar|^Marcada/ })).toBeVisible();
  });
});
