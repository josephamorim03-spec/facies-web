import { expect, test } from "@playwright/test";

import { addHttpOnlySession } from "./support/authCookies";
// O harness é o conjunto de fixtures mais completo do repositório, e já serve a
// taxonomia com forma de árvore. Duplicá-la aqui criaria uma segunda verdade
// sobre o que a API devolve — e é sempre a cópia velha que passa a ser testada.
import { mockApi } from "../../scripts/lib/app-harness.mjs";

/**
 * O mapa é um instrumento de ORIENTAÇÃO, e não uma lista desenhada em grade.
 *
 * ⚠️ Ele mostrava quinze assuntos — o corte editorial de `TOP_SUBTEMAS = 15` no
 * gerador da fácies — ordenados por posto. O operador apontou que isso não serve
 * para o que o nome promete: um mapa mostra o território todo, a posição
 * significa alguma coisa, e dá para aproximar sem perder onde se está.
 *
 * Estes testes prendem as três propriedades. Nenhum deles passaria antes.
 */
test.describe("o mapa navegável", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test.beforeEach(async ({ context, page }) => {
    await addHttpOnlySession(context);
    await mockApi(page);
  });

  test("o território tem níveis, e dá para aproximar e voltar", async ({ page }) => {
    await page.goto("/mapa");

    const mapa = page.getByRole("region", { name: "Mapa navegável da prova" });
    await expect(mapa).toBeVisible({ timeout: 15_000 });

    // NÍVEL 0: as especialidades. Mais de uma — se fosse uma lista achatada,
    // a árvore inteira viria num nível só.
    const celulas = mapa.locator("[data-mapa-pecas] li button");
    const raizes = await celulas.count();
    expect(raizes).toBeGreaterThan(1);

    const rastro = page.getByRole("navigation", { name: "Onde você está" });
    await expect(rastro).toBeVisible();
    const passosNoInicio = await rastro.locator("button").count();

    // APROXIMAR: o nível muda e o rastro cresce.
    await celulas.first().click();
    await expect.poll(() => rastro.locator("button").count()).toBe(passosNoInicio + 1);
    const dentro = await celulas.count();
    expect(dentro).toBeGreaterThan(0);

    // VOLTAR pelo rastro: é isto que separa um mapa de um zoom sem orientação.
    await rastro.locator("button").first().click();
    await expect.poll(() => rastro.locator("button").count()).toBe(passosNoInicio);
    await expect.poll(() => celulas.count()).toBe(raizes);
  });

  test("nenhuma peça fica abaixo do polegar, e elas ladrilham o palco", async ({ page }) => {
    // ⚠️ ESTE TESTE MEDIA UMA GRADE CSS — "a célula órfã com contagem ímpar",
    // que era o defeito da v1. O mapa deixou de ser grade: agora é treemap, onde
    // as peças têm tamanhos diferentes de propósito e "linha" não existe. Medir
    // alinhamento de linha aqui não falharia nunca, e não diria nada.
    //
    // O que importa no treemap é outro par de propriedades, e as duas foram
    // reprovadas em produção antes de existirem aqui: peça pequena demais para o
    // dedo e para o texto ("os textos quase inelegíveis"), e peça que se sobrepõe
    // ou deixa buraco.
    await page.goto("/mapa");
    const mapa = page.getByRole("region", { name: "Mapa navegável da prova" });
    await expect(mapa).toBeVisible({ timeout: 15_000 });

    for (const nivel of ["raiz", "dentro"]) {
      if (nivel === "dentro") {
        await mapa.locator("[data-mapa-pecas] li button").first().click();
        await expect.poll(() => mapa.locator("[data-mapa-pecas] li").count()).toBeGreaterThan(0);
      }

      const caixas = [];
      for (const celula of await mapa.locator("[data-mapa-pecas] li").all()) {
        const caixa = await celula.boundingBox();
        if (caixa) caixas.push(caixa);
      }
      expect(caixas.length).toBeGreaterThan(0);

      // 1) O PISO DO POLEGAR. `dobrarCauda` existe para garantir isto: a cauda
      //    longa vira uma peça "+ N", em vez de trinta tiras de 3px.
      for (const c of caixas) {
        expect(c.height, `altura no nível ${nivel}`).toBeGreaterThanOrEqual(40);
        expect(c.width, `largura no nível ${nivel}`).toBeGreaterThanOrEqual(52);
      }

      // 2) LADRILHAM: cobrem o palco sem se sobrepor. Um treemap que deixa
      //    buraco mente sobre a proporção, que é a única coisa que ele encoda.
      for (let i = 0; i < caixas.length; i++) {
        for (let j = i + 1; j < caixas.length; j++) {
          const a = caixas[i];
          const b = caixas[j];
          const cruza =
            a.x < b.x + b.width - 1 &&
            b.x < a.x + a.width - 1 &&
            a.y < b.y + b.height - 1 &&
            b.y < a.y + a.height - 1;
          expect(cruza, `peças ${i} e ${j} se sobrepõem no nível ${nivel}`).toBe(false);
        }
      }
    }

    // 3) E nada escapa da tela.
    const estouro = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(estouro).toBeLessThanOrEqual(1);
  });

  test("a cauda abre EXATAMENTE o que prometeu, e nao gera outra cauda", async ({ page }) => {
    // ⚠️ O LOOP QUE O OPERADOR ENCONTROU, preso aqui.
    //
    // `disporNivel` devolve `desde` relativo à lista que recebeu, e essa lista já
    // é uma FATIA quando o nível corrente é uma cauda. `filhosDoPasso` aplicava o
    // `desde` à lista COMPLETA do pai, então os dois discordavam:
    //
    //   raiz  → 4 peças + cauda (desde=4)
    //   cauda → slice(4) = 1 peça + cauda (desde=1)   ← relativo
    //   cauda → slice(1) = 5 peças                    ← voltou, e roda para sempre
    //
    // Efeito colateral: "Outros" ficava INALCANÇÁVEL, porque a navegação da
    // cauda nunca chegava ao fim da lista.
    await page.goto("/mapa");
    const mapa = page.getByRole("region", { name: "Mapa navegável da prova" });
    await expect(mapa).toBeVisible({ timeout: 15_000 });

    const nomes = async () =>
      (await mapa.locator("[data-mapa-pecas] li button").allTextContents()).map((t) => t.replace(/\s+/g, " ").trim());

    const anterior = await nomes();

    const cauda = mapa.locator("[data-mapa-pecas] li button").filter({ hasText: /^Mais / }).first();
    expect(await cauda.count(), "o fixture precisa produzir uma cauda").toBe(1);

    // ⚠️ A CONTA TEM DE FECHAR — foi a segunda queixa do operador: *"aparece
    // 'Mais 4 temas menores', mas ao clicar só aparece Oftalmologia"*.
    //
    // Acontecia porque o nível da cauda voltava a ser treemap, e treemap
    // RE-DOBRA: a cauda prometia o total escondido e mostrava só o que coubesse.
    // Agora ela abre em LISTA, que mostra todos.
    const promessa = ((await cauda.textContent()) ?? "").match(/Mais\s+(\d+)/);
    expect(promessa, "a cauda tem de dizer quantos esconde").not.toBeNull();
    const prometidos = Number(promessa![1]);

    await cauda.click();
    await expect.poll(async () => (await nomes()).join("|")).not.toBe(anterior.join("|"));
    const abertos = await nomes();

    expect(
      abertos.length,
      `prometeu ${prometidos} e abriu ${abertos.length}: a conta não fecha`,
    ).toBe(prometidos);

    // E o que abriu não tem cauda nenhuma: a lista mostra tudo, então não há
    // segundo degrau para prometer outra coisa.
    expect(
      await mapa.locator("[data-mapa-pecas] li button").filter({ hasText: /^Mais / }).count(),
      "a lista da cauda não pode gerar outra cauda",
    ).toBe(0);
  });

  test("Atenção reordena e diz o PORQUÊ, sem mexer no tamanho da peça", async ({ page }) => {
    // O botão faz três coisas, e a terceira é a que o operador pediu: "ao clicar
    // ver uma justificativa do porque é um tema prioritário, de forma direta e
    // objetiva". A frase vem PRONTA do backend (`recommendation_explanation`,
    // gerada por `topic_explanation.py`) — o frontend não a remonta.
    await page.goto("/mapa");
    const mapa = page.getByRole("region", { name: "Mapa navegável da prova" });
    await expect(mapa).toBeVisible({ timeout: 15_000 });

    // `exact`: os rotulos acessiveis das pecas marcadas comecam com "pede
    // atencao, ...", entao o nome nao-exato casa tres botoes.
    const botao = page.getByRole("button", { name: "Atenção", exact: true });
    await expect(botao).toBeVisible();
    await expect(botao).toHaveAttribute("aria-pressed", "false");

    /**
     * ⚠️ A ÁREA CONTINUA SIGNIFICANDO QUANTIDADE nos dois estados.
     *
     * O invariante NÃO é "as mesmas áreas" — a primeira versão deste teste
     * assertava isso e falhou com razão: ligar a atenção muda o CONJUNTO
     * visível (Cirurgia sobe da cauda e ocupa o lugar de Pediatria), então
     * áreas diferentes são o comportamento correto.
     *
     * O que não pode mudar é o SIGNIFICADO: quem tem mais questões continua
     * ocupando mais espaço. Reponderar a área com prioridade repete o defeito
     * pelo qual a v2 foi reprovada — a mesma grade passaria a codificar duas
     * coisas conforme um botão.
     */
    const areaSegueQuantidade = async (estado: string) => {
      const medidas: Array<{ n: number; area: number }> = [];
      for (const li of await mapa.locator("[data-mapa-pecas] li").all()) {
        const caixa = await li.boundingBox();
        const rotulo = (await li.locator("button").getAttribute("aria-label")) ?? "";
        // 🚨 A REGEX PRENDIA O RÓTULO, e o rótulo mudou DE PROPÓSITO.
        //
        // Ela exigia "no acervo". Em 2026-09-10 a árvore passou a vir de
        // `population: "exam"` e a frase virou "N questões cobradas pela X" —
        // mudança correta e documentada em `CelulaDoMapa.tsx`, porque
        // `question_count` deixou de ser o acervo e passou a ser o que a prova
        // COBROU (inclui anulada, duplicata e desatualizada).
        //
        // A regex deixou de casar, `medidas` ficava vazia, e a `main` ficou
        // VERMELHA por 1h30 e seis commits sem que o mapa tivesse defeito
        // nenhum. O gate de PR não tem e2e, então a quebra só aparece DEPOIS do
        // merge — e ninguém olha para o vermelho pós-merge.
        //
        // Agora extrai só a CONTAGEM, que é o que este teste precisa: ele
        // afirma "área segue quantidade", não "o rótulo diz tal frase". Continua
        // a ignorar as peças agregadas ("Mais 4 assuntos menores"), que não têm
        // "questão" logo a seguir ao número.
        const n = Number((rotulo.match(/(\d+)\s+quest(?:ão|ões)/) ?? [])[1] ?? NaN);
        if (caixa && Number.isFinite(n)) medidas.push({ n, area: caixa.width * caixa.height });
      }
      expect(medidas.length, `${estado}: precisa de peças medíveis`).toBeGreaterThan(1);
      const porArea = [...medidas].sort((a, b) => b.area - a.area).map((m) => m.n);
      const porQuantidade = [...medidas].sort((a, b) => b.n - a.n).map((m) => m.n);
      expect(porArea, `${estado}: a maior peça tem de ser a de mais questões`).toEqual(
        porQuantidade,
      );
    };

    await areaSegueQuantidade("desligada");
    await botao.click();
    await expect(botao).toHaveAttribute("aria-pressed", "true");
    await areaSegueQuantidade("ligada");

    // A lista aparece, com o porquê ESCRITO — sem exigir um toque por item.
    const itens = page.locator("section ul:not([data-mapa-pecas]) li button");
    await expect.poll(() => itens.count()).toBeGreaterThan(0);
    const primeiro = (await itens.first().innerText()).replace(/\s+/g, " ").trim();
    expect(primeiro, "cada item da atenção precisa trazer a justificativa").toMatch(
      /(perde ponto|praticou|responde|cronograma|incidência)/i,
    );

    // ⚠️ E NUNCA os fatores crus. `question_bank.py` documenta o ataque: com
    // `deficit`/`mastery` à vista o aluno infere a função de score por regressão
    // e passa a responder de um jeito que infla a própria maestria.
    const tudo = await page.locator("section").first().innerText();
    for (const proibido of ["deficit", "mastery", "target_difficulty", "under_coverage"]) {
      expect(tudo.toLowerCase(), `"${proibido}" nao pode vazar para a tela`).not.toContain(
        proibido,
      );
    }

    // Desligar devolve o estado anterior.
    await botao.click();
    await expect(botao).toHaveAttribute("aria-pressed", "false");
    await expect.poll(() => itens.count()).toBe(0);
  });

  test("a peça diz o que tem dentro, e nunca imprime um score como se fosse contagem", async ({
    page,
  }) => {
    // ⚠️ O DEFEITO QUE O OPERADOR RELATOU, preso em teste.
    //
    // `target_bank_demand_score` é um score em [0,1]; a v2 o imprimia com
    // `Math.round`, então a célula e o leitor de tela diziam "0" ou "1". Aqui a
    // célula só escreve contagem de TÓPICOS com o substantivo colado, e o número
    // de questões vive no nome acessível, sempre com o denominador.
    await page.goto("/mapa");
    const mapa = page.getByRole("region", { name: "Mapa navegável da prova" });
    await expect(mapa).toBeVisible({ timeout: 15_000 });

    const primeira = mapa.locator("[data-mapa-pecas] li button").first();
    const rotulo = (await primeira.getAttribute("aria-label")) ?? "";
    // ⚠️ A PROPRIEDADE É "o número vem com DENOMINADOR", e não uma frase
    // literal. Esta linha exigia "no acervo da" e ficou vencida quando o rótulo
    // passou a dizer "cobradas pela" — a mesma mudança de população que já
    // partira a regex acima. Duas asserções presas à mesma frase, e eu só vi a
    // primeira: procurei a regex de extração em vez de procurar a frase.
    //
    // Casa o singular ("1 questão cobrada pela") e o plural, e continua a
    // reprovar um número solto sem quem o denomine.
    expect(rotulo).toMatch(/quest(ão|ões) cobradas? pela /);
    expect(rotulo, "o nome acessível não pode ser um score arredondado").not.toMatch(
      /,\s*[01],\s*(praticar|aproximar)/,
    );

    // O texto visível da célula não pode conter um número solto sem substantivo.
    const visivel = (await primeira.innerText()).trim();
    for (const linha of visivel.split("\n")) {
      expect(linha.trim(), `"${linha}" é um número sem unidade`).not.toMatch(/^\d+$/);
    }
  });
});
