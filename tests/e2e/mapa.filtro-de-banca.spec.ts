import { test, expect } from "@playwright/test";

import { assertNoOverflow, mockApi } from "../../scripts/lib/app-harness.mjs";
import { addHttpOnlySession } from "./support/authCookies";

/**
 * O MAPA É DE UMA BANCA — E AGORA DÁ PARA DIZER QUAL.
 *
 * ## A pergunta que virou este ficheiro
 *
 * O operador perguntou: *"esse mapa é só do ENAMED ou de todas bancas
 * prioritárias?"*, depois de ver o título dizer uma banca e a lista de Atenção
 * citar outra. A resposta medida foi **as duas coisas**, e é esse o defeito:
 *
 * | elemento | escopo |
 * | --- | --- |
 * | título, questões, anos, área das peças | UMA banca (a de maior prioridade) |
 * | Atenção: ordem e frase | TODAS as ≤3 declaradas ("vence a maior") |
 *
 * ## ⚠️ Por que este spec existe separado do `mapa.navegavel`
 *
 * O fixture do harness declara **UMA** prova (UNIFESP). Com uma só, o seletor
 * não renderiza de propósito — um seletor de um item ensina que há escolha onde
 * não há. Ou seja: o spec que já está no gate **não tem como ver** este
 * comportamento, e acrescentar a asserção lá mediria zero.
 *
 * Aqui o `page.route` sobrepõe-se ao catch-all do harness para declarar DUAS.
 * No Playwright a rota registada por último ganha, e é por isso que o
 * `mockApi` vem primeiro.
 *
 * ## ⚠️ ERA UM `radiogroup`, E AGORA É UM `<select>`
 *
 * O seletor eram três chips `BotaoDeEscolha` com `aria-checked`. O operador
 * apontou-os: como os rótulos são nomes institucionais longos, os chips
 * renderizavam como três caixas de largura total empilhadas por cima do mapa.
 * O lugar que já mostra o nome da prova passou a ser ele próprio o botão.
 *
 * O que este ficheiro afirma mudou com isso, e não por gosto:
 *
 * - o estado escolhido é o **valor** do `<select>`, e não `aria-checked`;
 * - o nome visível tem âncora própria (`mapa-prova-escolhida`) porque o
 *   `<select>` vive DENTRO do `<h1>`, e o `textContent` de um `<select>`
 *   inclui o rótulo de todas as opções — asserir sobre o texto do título
 *   diria que a UNIFESP continua lá mesmo com o ecrã correto.
 */

/**
 * Duas bancas REAIS do dataset — as duas com fácies publicada.
 *
 * 🚨 A SEGUNDA ERA A USP, e o teste falhava por causa disso — corretamente.
 *
 * O mock de fácies do harness tem DUAS formas: se a chave contém `ENARE`/`ENAMED`
 * devolve uma banca, senão devolve a UNIFESP. Com a chave da USP, escolher a
 * segunda opção trocava a chave, refazia o pedido, e o mock respondia "UNIFESP"
 * — o título não mudava, e o app estava certo.
 *
 * Isto não se conserta no spec sozinho: seria escrever um `Banca` inteiro à
 * mão aqui, uma segunda verdade sobre o que a API devolve, que é o que o
 * próprio harness avisa para não fazer. Usa-se a banca que ele sabe distinguir.
 */
const UNIFESP = "SP-UNIVERSIDADE-FEDERAL-DE-SAO-PAULO-UNIFESP-HOSPITAL-UNIVERSITARIO-DA-UNIFESP";
const ENARE =
  "EXAME-NACIONAL-DE-RESIDENCIA-MEDICA-EBSERH-ENARE-E-EXAME-NACIONAL-DE-AVALIACAO-DA-FORMACAO-MEDICA-ENAMED";

const NOME_DO_SELETOR = "Qual das suas provas o mapa mostra";

test.describe("o mapa diz de qual prova está a falar", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test.beforeEach(async ({ context, page }) => {
    // 🚨 `addHttpOnlySession` PRIMEIRO, e faltava. Sem a sessão o `AppShell`
    // desvia para `/login`, não existe `<h1>` nenhum, e as duas provas falham
    // por "element(s) not found" — que não diz que o problema é autenticação.
    //
    // ⚠️ Errei isto MEDINDO O VIZINHO ERRADO, e é a segunda vez nesta rodada.
    // O `sem-estouro-horizontal` tinha acabado de me ensinar que `mockApi` era
    // peso morto lá, porque o `mockFinalizedSession` já instala a sessão. Eu
    // trouxe a conclusão para cá em vez de trazer o método: o vizinho que passa
    // NESTA tela é o `mapa.navegavel`, e ele monta os dois — sessão e `mockApi`.
    await addHttpOnlySession(context);
    await mockApi(page);
    // ⚠️ `priority` EXPLÍCITO nos dois. A tela ordena por ele
    // (`porPrioridade`), e sem o campo a subtração dá `NaN` — a ordenação
    // passaria a depender da ordem de chegada do array, que é precisamente o
    // defeito que `provaAlvoPrincipal` existe para não ter.
    await page.route("**/api/objectives/target-exam", async (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [
            { institution_key: UNIFESP, label: "UNIFESP", is_primary: true, priority: 1 },
            { institution_key: ENARE, label: "ENARE", is_primary: false, priority: 2 },
          ],
        }),
      }),
    );
  });

  test("com duas provas declaradas, dá para trocar qual o mapa mostra", async ({ page }) => {
    await page.goto("/mapa");

    const nomeVisivel = page.getByTestId("mapa-prova-escolhida");
    // A de maior prioridade abre primeiro, e o título diz o nome dela.
    await expect(nomeVisivel).toHaveText("UNIFESP", { timeout: 15_000 });

    const seletor = page.getByLabel(NOME_DO_SELETOR);
    await expect(seletor).toHaveValue(UNIFESP);

    // ⚠️ O SELETOR VIVE DENTRO DO `<h1>`, e é isso que o torna o pedido do
    // operador: o lugar que exibe o nome da prova É o botão que a troca. Se
    // algum dia ele voltar a ser um controlo à parte, esta asserção cai — e é
    // para cair.
    await expect(page.getByRole("heading", { level: 1 }).getByLabel(NOME_DO_SELETOR)).toHaveCount(1);

    // ⚠️ O ALVO DE TOQUE É O NOME INTEIRO, e não uma área menor escondida atrás
    // dele: o `<select>` é `absolute inset-0` sobre o nome e a seta. Medir a
    // caixa dos dois prova que a sobreposição não escorregou.
    const caixaDoNome = await nomeVisivel.boundingBox();
    const caixaDoSeletor = await seletor.boundingBox();
    expect(caixaDoNome).not.toBeNull();
    expect(caixaDoSeletor).not.toBeNull();
    expect(caixaDoSeletor!.width).toBeGreaterThanOrEqual(caixaDoNome!.width);
    // O piso de alvo de toque do sistema.
    expect(caixaDoSeletor!.height).toBeGreaterThanOrEqual(44);

    await seletor.selectOption(ENARE);

    // A tela inteira passa a falar da outra prova — não só o seletor muda.
    //
    // ⚠️ "ENARE" É A STRING QUE O ALUNO VÊ, e isso só é verdade desde que o
    // slug do harness foi corrigido. Ele era inventado
    // (`exame-nacional-de-residencia-enamed`) e não casava com o prefixo de
    // `NOME_CURTO_FIXO`, então `nomeCurto` caía na derivação pelo nome e
    // produzia "Exame Nacional de Residencia" — uma string que produção nunca
    // mostra. Afirmar aquilo seria prender o teste ao defeito do fixture.
    await expect(nomeVisivel).toHaveText("ENARE", { timeout: 15_000 });
    // E deixou de falar da primeira: sem isto, um nome que somasse as duas
    // passaria. Repare que isto é possível PORQUE a âncora é o nome visível —
    // no texto do `<h1>` a palavra "UNIFESP" continua presente, como opção.
    await expect(nomeVisivel).not.toHaveText(/UNIFESP/);
    await expect(seletor).toHaveValue(ENARE);

    // E o mapa continua a caber no telemóvel com o seletor em cima.
    await assertNoOverflow(page);
  });

  test("com UMA prova declarada, o seletor não aparece", async ({ page }) => {
    // ⚠️ ESTA METADE É QUE FAZ A OUTRA SIGNIFICAR ALGUMA COISA. Sem ela, um
    // seletor que aparecesse sempre — inclusive com uma prova só — passaria no
    // teste de cima e ensinaria ao aluno que há escolha onde não há.
    await page.route("**/api/objectives/target-exam", async (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [{ institution_key: UNIFESP, label: "UNIFESP", is_primary: true, priority: 1 }],
        }),
      }),
    );

    await page.goto("/mapa");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("UNIFESP", {
      timeout: 15_000,
    });
    await expect(page.getByLabel(NOME_DO_SELETOR)).toHaveCount(0);
    // Nem o nome ganha a decoração de "isto abre": com uma prova só o título é
    // texto simples, e o `data-testid` é do seletor, não do nome.
    await expect(page.getByTestId("mapa-prova-escolhida")).toHaveCount(0);
  });
});
