import { expect, test } from "@playwright/test";

import { mockFinalizedSession, RUNNER_SESSION_ID } from "./support/questionSessionMock";

/**
 * Navegar na correção depois da prova.
 *
 * Cada aba despejava TODAS as questões do conjunto, com enunciado e alternativas
 * abertos. Numa prova de 60 questões, revisar 25 erros era uma rolagem sem
 * índice, sem anterior/próxima e sem saber quantas faltavam. Agora é uma questão
 * por vez, com a mesma grade numerada do mapa da prova.
 */
test.describe("Correcao pos-prova", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test.beforeEach(async ({ page }) => {
    await mockFinalizedSession(page);
  });

  test("mostra uma questao por vez, com indice e anterior/proxima", async ({ page }) => {
    await page.goto(`/banco/sessao/${RUNNER_SESSION_ID}`);

    await page.getByRole("button", { name: /^Erros/ }).click();

    // Tres erros no fixture: a aba conta, e a grade oferece os tres.
    const contador = page.getByText(/^\d+ de 3$/);
    await expect(contador).toHaveText("1 de 3");

    const enunciados = page.getByText(/^Questão \d+: paciente com quadro/);
    await expect(enunciados).toHaveCount(1);

    const anterior = page.getByRole("button", { name: "Anterior" });
    await expect(anterior).toBeDisabled();

    await page.getByRole("button", { name: "Próxima" }).click();
    await expect(contador).toHaveText("2 de 3");
    await expect(anterior).toBeEnabled();

    // A grade leva direto, sem passar pelas do meio — era o que faltava para
    // voltar a uma questao especifica.
    await page.getByRole("button", { name: /^Questão 5, errou$/ }).click();
    await expect(contador).toHaveText("3 de 3");
    await expect(page.getByRole("button", { name: "Próxima" })).toBeDisabled();
  });

  test("trocar de filtro recomeca no primeiro item dele", async ({ page }) => {
    await page.goto(`/banco/sessao/${RUNNER_SESSION_ID}`);

    await page.getByRole("button", { name: /^Erros/ }).click();
    await page.getByRole("button", { name: "Próxima" }).click();
    await expect(page.getByText(/^\d+ de 3$/)).toHaveText("2 de 3");

    // Sem zerar o cursor, abrir "Acertos" mostraria a segunda questao dele — ou
    // uma posicao que nem existe no conjunto novo.
    await page.getByRole("button", { name: /^Acertos/ }).click();
    await expect(page.getByText(/^\d+ de 2$/)).toHaveText("1 de 2");
  });
});
