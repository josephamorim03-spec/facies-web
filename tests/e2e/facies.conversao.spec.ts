import { expect, test } from "@playwright/test";

/**
 * Os dois CTAs do funil emitem, e emitem o nome CERTO.
 *
 * O ponto de conversão da home era cego: `diagnostico_clicado` existia no tipo
 * `EventoFacies` e na allowlist do backend, e nenhum componente o emitia — o
 * relatório do funil tinha uma constante `SEM_EMISSOR` registrando isso. Dava
 * para saber quantas pessoas viam a fácies e não quantas seguiam para o
 * produto, que é a única pergunta que decide se a página funciona.
 *
 * O nome importa tanto quanto o disparo: fora da allowlist, `POST /facies/sinal`
 * responde `ok: true` e **descarta em silêncio** (decisão deliberada, para não
 * dar oráculo a quem sonda a rota). Um evento com nome errado parece
 * instrumentado e mede zero — que lê como "não converte" em vez de "não é
 * medido". Por isso o teste confere o corpo, não só que houve requisição.
 */
async function capturarSinais(page: import("@playwright/test").Page) {
  const sinais: Array<{ evento: string; banca: string | null }> = [];
  await page.route("**/api/facies/sinal", async (route) => {
    try {
      sinais.push(JSON.parse(route.request().postData() ?? "{}"));
    } catch {
      /* corpo ilegível também é falha, e a asserção pega */
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
  });
  return sinais;
}

test("o CTA do diagnostico emite diagnostico_clicado com a banca", async ({ page }) => {
  const sinais = await capturarSinais(page);
  await page.goto("/");

  await page.getByRole("link", { name: "Fazer o diagnóstico" }).click();

  await expect
    .poll(() => sinais.map((s) => s.evento))
    .toContain("diagnostico_clicado");

  const sinal = sinais.find((s) => s.evento === "diagnostico_clicado");
  // A banca vai junto porque a taxa agregada esconde o que importa: pode ser
  // que a leitura de uma banca converta e a de outra não, e a diferença aponta
  // para o dado, não para a copy.
  expect(sinal?.banca, "o evento precisa levar a banca que estava na tela").toBeTruthy();
});

test("o CTA da prova em destaque emite destaque_clicado", async ({ page }) => {
  const sinais = await capturarSinais(page);
  await page.goto("/");

  await page.getByRole("link", { name: /Ver a fácies do/ }).click();

  await expect.poll(() => sinais.map((s) => s.evento)).toContain("destaque_clicado");
});
