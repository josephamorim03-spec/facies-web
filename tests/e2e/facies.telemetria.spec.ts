import { expect, test } from "@playwright/test";

/**
 * A visita da página pública chega a ser contada.
 *
 * Por que isto é um e2e e não um teste unitário: o modo de falha que importa não
 * é "a função monta o corpo certo" — é o componente não montar, montar depois da
 * hidratação e perder a visita, ou o evento sair e o proxy recusar. Nenhum
 * desses aparece num teste de unidade, e todos deixam o funil em zero com o
 * build verde.
 *
 * Sem este número não existe denominador: "12 e-mails capturados" não é taxa
 * nenhuma se ninguém sabe quantas pessoas abriram a página.
 *
 * A requisição é INTERCEPTADA, não entregue. O que está sob teste é a página
 * pública, e ela não deve depender do backend estar de pé para ser verificada.
 */

type SinalRecebido = { evento: string; banca: string | null };

async function capturarSinais(
  page: import("@playwright/test").Page,
): Promise<SinalRecebido[]> {
  const recebidos: SinalRecebido[] = [];
  await page.route("**/api/facies/sinal", async (route) => {
    try {
      recebidos.push(JSON.parse(route.request().postData() ?? "{}"));
    } catch {
      /* corpo ilegível é falha do teste abaixo, não exceção aqui */
    }
    await route.fulfill({ status: 200, body: '{"ok":true}' });
  });
  return recebidos;
}

test("a pagina da prova conta a visita, com a prova identificada", async ({ page }) => {
  const sinais = await capturarSinais(page);

  await page.goto("/prova/enamed");
  // A URL final, e nao so' o status: redirect para o login devolve 200 e ja'
  // enganou esta verificacao antes.
  await expect(page).toHaveURL(/\/prova\/enamed$/);

  await expect.poll(() => sinais.length, { timeout: 10_000 }).toBeGreaterThan(0);

  const aberturas = sinais.filter((s) => s.evento === "facies_pagina_aberta");
  expect(aberturas.length, "a visita da pagina da prova nao foi contada").toBe(1);
  expect(aberturas[0]?.banca, "a visita foi contada sem dizer de qual prova").toBe(
    "ENAMED",
  );
});

test("a pagina de banca conta a visita com a chave da instituicao", async ({ page }) => {
  const sinais = await capturarSinais(page);

  await page.goto("/facies");
  const primeira = page.locator('a[href^="/facies/"]').first();
  await primeira.waitFor({ state: "visible", timeout: 15_000 });
  const destino = await primeira.getAttribute("href");
  expect(destino).toBeTruthy();

  sinais.length = 0;
  await page.goto(destino!);

  await expect.poll(() => sinais.length, { timeout: 10_000 }).toBeGreaterThan(0);
  const aberturas = sinais.filter((s) => s.evento === "facies_pagina_aberta");
  expect(aberturas.length).toBe(1);
  expect(aberturas[0]?.banca, "visita de banca sem chave nao agrega").toBeTruthy();
});

test("a visita conta UMA vez, nao uma por render", async ({ page }) => {
  const sinais = await capturarSinais(page);
  await page.goto("/prova/enamed");
  await expect.poll(() => sinais.length, { timeout: 10_000 }).toBeGreaterThan(0);

  // Denominador inflado e' pior que ausente: ausente a gente percebe, inflado
  // faz toda taxa de conversao parecer menor do que e'.
  await page.waitForTimeout(1_500);
  expect(sinais.filter((s) => s.evento === "facies_pagina_aberta").length).toBe(1);
});

test("a home NAO emite a visita de pagina — o controle negativo", async ({ page }) => {
  // Metade que falta em todo guard: provar que a assercao discrimina. A home
  // usa `FaciesPicker` e emite `facies_vista`, nao `facies_pagina_aberta`. Se
  // ela tambem contasse, os tres testes acima passariam sem medir nada — e o
  // denominador contaria a mesma pessoa duas vezes no caminho home -> prova.
  const sinais = await capturarSinais(page);
  await page.goto("/");
  await expect.poll(() => sinais.length, { timeout: 10_000 }).toBeGreaterThan(0);
  await page.waitForTimeout(1_000);

  expect(sinais.some((s) => s.evento === "facies_vista")).toBe(true);
  expect(
    sinais.filter((s) => s.evento === "facies_pagina_aberta").length,
    "a home contou visita de pagina e infla o denominador",
  ).toBe(0);
});
