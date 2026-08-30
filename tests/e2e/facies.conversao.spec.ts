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

/**
 * ⚠️ OS DOIS TESTES ABAIXO APONTAVAM PARA UI QUE NÃO EXISTE MAIS, e ficaram
 * vermelhos em silêncio desde `a46aae40`.
 *
 *   - `"Fazer o diagnóstico"` era o CTA do `PonteDiagnostico`, que saiu do fluxo
 *     da home (o `FunilHome` registra a remoção por escrito). O componente
 *     continua no repositório sem nenhum call site, então o link nunca renderiza
 *     e o seletor nunca casa.
 *   - `/Ver a fácies do/` nunca casou com o rótulo real, que é "Ver a fácies
 *     **completa** do ENAMED".
 *
 * Conferido com `git show HEAD`: as duas divergências são anteriores à mudança
 * de URL de `/facies/<longo>` para `/prova/<curto>`.
 *
 * O que os testes PROTEGEM continua válido e é o que sobrevive aqui: o ponto de
 * conversão da home dispara, dispara com o nome que a allowlist aceita, e leva a
 * chave do que estava na tela. O que mudou foi qual elemento é esse ponto.
 */
test("o CTA que abre a fácies emite facies_pagina_aberta com a chave", async ({ page }) => {
  const sinais = await capturarSinais(page);
  await page.goto("/");

  await page.getByRole("link", { name: /Ver a fácies completa/ }).click();

  await expect.poll(() => sinais.map((s) => s.evento)).toContain("facies_pagina_aberta");

  const sinal = sinais.find((s) => s.evento === "facies_pagina_aberta");
  // A chave vai junto porque a taxa agregada esconde o que importa: pode ser
  // que a leitura de uma banca converta e a de outra não, e a diferença aponta
  // para o dado, não para a copy.
  expect(sinal?.banca, "o evento precisa levar a chave que estava na tela").toBeTruthy();
});

test("o chip da prova em destaque emite destaque_clicado", async ({ page }) => {
  const sinais = await capturarSinais(page);
  await page.goto("/");

  // `destaque_clicado` sai do CHIP da prova nacional, não do link do CTA — quem
  // emite é o `onClick` do botão em `FaciesPicker`. O teste antigo clicava no
  // link e esperava este evento, o que nunca poderia acontecer.
  await page.getByRole("button", { name: "ENAMED", exact: true }).click();

  await expect.poll(() => sinais.map((s) => s.evento)).toContain("destaque_clicado");
});
