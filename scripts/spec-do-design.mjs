/**
 * A especificação vem do design RENDERIZADO, não da leitura do CSS dele.
 *
 * ## Por que este arquivo existe
 *
 * A landing foi portada transcrevendo à mão o CSS de `facies-landing-v7.html`.
 * Duas classes de erro saíram disso, e as duas só apareceram quando foi
 * possível renderizar:
 *
 *   - **Transcrição erra calada.** O `h2` lido no texto era 46px; o valor
 *     COMPUTADO em 1040px é 54px — havia um ponto de quebra que o grep não
 *     pegou. Mesma coisa no contêiner (1080, não 1024) e no `h3` (fixo em 17,
 *     não 19→21).
 *   - **Regra escrita contra a marcação ERRADA.** `.paper-page h2 {…}` copiado
 *     do desenho, que nunca põe classe de rótulo num heading; a nossa põe, e o
 *     seletor de elemento (0,1,1) venceu `.paper-eyebrow` (0,1,0). O rótulo
 *     saiu em 28px versal, em produção, passando por 6 guards e 138 testes.
 *
 * Nenhum guard desta base lê pixel. `getComputedStyle` lê.
 *
 * ## O que ele NÃO é
 *
 * Não é captura para alguém olhar — para isso o `capture-design-redesign.mjs`
 * já existe. Aqui a saída é uma TABELA DE DIFERENÇAS, e o critério de pronto é
 * ela sair vazia. "Parece certo" não é critério.
 *
 * ## Uso
 *
 *   node scripts/spec-do-design.mjs --alvo=http://127.0.0.1:3000/
 *   node scripts/spec-do-design.mjs --so-design      # só imprime a spec lida
 *
 * Sai com código 1 quando há diferença, para poder virar portão depois.
 */
import { chromium } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";

/**
 * Os pontos de quebra são os DA v7, e não uma escolha nossa.
 *
 * 1040 está aqui porque foi exatamente onde os dois erros de transcrição se
 * escondiam: o `h2` sobe para 54 e o contêiner para 1040 só a partir dali.
 * Medir em 390/1280 — as larguras "óbvias" — passava por cima dos dois.
 */
const QUEBRAS = [390, 760, 1040, 1440];

const DESIGN_PADRAO =
  "C:/Users/josep/Downloads/Fácies design handoff/uploads/facies-landing-v7.html";

/**
 * O mapa de aspectos.
 *
 * Cada linha casa um seletor DO DESENHO com o seletor equivalente NOSSO — eles
 * não são os mesmos, e fingir que são é como o rótulo virou `h2` gigante. O par
 * explícito obriga a dizer "isto aqui corresponde àquilo lá".
 *
 * `:not(.paper-eyebrow)` do nosso lado não é defensivo: o rótulo de seção é um
 * heading por razão estrutural, e sem o filtro o extrator mediria o rótulo
 * achando que mede o título.
 */
const ASPECTOS = [
  { nome: "contêiner", design: ".cont", nosso: "main > div", prop: "largura" },
  { nome: "h1 tamanho", design: "h1", nosso: "h1:not(.paper-eyebrow)", prop: "font-size" },
  { nome: "h1 entrelinha", design: "h1", nosso: "h1:not(.paper-eyebrow)", prop: "line-height" },
  { nome: "h1 tracking", design: "h1", nosso: "h1:not(.paper-eyebrow)", prop: "letter-spacing" },
  { nome: "h2 tamanho", design: ".sec--sup h2", nosso: "h2:not(.paper-eyebrow)", prop: "font-size" },
  { nome: "h3 tamanho", design: "h3", nosso: "h3:not(.paper-eyebrow)", prop: "font-size" },
  { nome: "rótulo tamanho", design: ".label", nosso: ".paper-eyebrow", prop: "font-size" },
  { nome: "rótulo tracking", design: ".label", nosso: ".paper-eyebrow", prop: "letter-spacing" },
  // ⚠️ `faixa altura` e `lede` SAIRAM desta lista, e a razao e' que a v7 nao e'
  // a referencia deles.
  //
  // A v7 desenha o heroi da linhagem `1a`: h1 primeiro, faixa como PREVIA
  // (`.strip--previa`, 76px) e lede de 19px sustentando o titulo. A direcao
  // escolhida foi a `1b`, onde a faixa ABRE a pagina (64px em 390) e a lede vem
  // depois do titulo explicando o que se acabou de ver (15px).
  //
  // Sao composicoes diferentes com os mesmos nomes de elemento. Comparar as
  // duas aqui era o que produzia a desproporcao: eu media a nossa faixa contra
  // a previa da v7 e concluia que estava certa.
  //
  // Quem cobre esses dois e' o modo `--ritmo`, contra o artboard `1b`.
];

function argumento(nome, padrao) {
  const achado = process.argv.find((a) => a.startsWith(`--${nome}=`));
  return achado ? achado.slice(nome.length + 3) : padrao;
}

async function medir(pagina, lado) {
  return pagina.evaluate(
    ([aspectos, lado_]) => {
      const saida = {};
      for (const aspecto of aspectos) {
        const seletor = aspecto[lado_];
        let elemento = null;
        try {
          elemento = document.querySelector(seletor);
        } catch {
          saida[aspecto.nome] = "seletor inválido";
          continue;
        }
        if (!elemento) {
          // AUSENTE é um resultado, e precisa aparecer. Tratar "não achei" como
          // "não precisa" é o modo de falha que esta base já pagou caro.
          saida[aspecto.nome] = "ausente";
          continue;
        }
        if (aspecto.prop === "largura" || aspecto.prop === "altura") {
          const caixa = elemento.getBoundingClientRect();
          saida[aspecto.nome] = String(
            Math.round(aspecto.prop === "largura" ? caixa.width : caixa.height),
          );
          continue;
        }
        saida[aspecto.nome] = getComputedStyle(elemento).getPropertyValue(aspecto.prop).trim();
      }
      return saida;
    },
    [ASPECTOS, lado],
  );
}

/**
 * Colisão de tinta — e a referência é o PRÓPRIO DESENHO.
 *
 * A primeira versão disto media sobreposição de CAIXA DE LINHA e acusava a
 * v7 de colidir consigo mesma: com entrelinha 1,02 as caixas sempre se
 * cruzam, e cruzar caixa não é encostar tinta. O detector reprovava o alvo.
 *
 * A pergunta certa não é "há sobreposição?" e sim "há MAIS do que no
 * desenho?". O desenho é a referência por decisão; a folga que ele aceita,
 * nós aceitamos. O que não pode é a nossa manchete apertar mais que a dele —
 * e isso acontece quando a frase é outra e quebra em outro ponto.
 *
 * ⚠️ Limite conhecido: isto compara PROPORÇÃO de sobreposição, não pixel de
 * tinta. Uma frase nossa com acento exatamente sob uma descendente, na mesma
 * proporção do desenho, passa aqui. Para essa, o que pega é o olho — ou uma
 * comparação de imagem, que é a camada seguinte.
 */
async function sobreposicao(pagina) {
  return pagina.evaluate(() => {
    const medidas = [];
    for (const titulo of document.querySelectorAll("h1, h2")) {
      if (titulo.classList.contains("paper-eyebrow")) continue;
      const faixa = document.createRange();
      faixa.selectNodeContents(titulo);
      const linhas = [...faixa.getClientRects()].filter((r) => r.height > 4);
      let pior = 0;
      for (let i = 0; i < linhas.length - 1; i += 1) {
        const razao = (linhas[i].bottom - linhas[i + 1].top) / linhas[i].height;
        if (razao > pior) pior = razao;
      }
      medidas.push({ texto: (titulo.textContent || "").trim().slice(0, 40), pior });
    }
    return medidas;
  });
}

/**
 * Modo ARTBOARD — a especificação das telas do app, medida e não lida.
 *
 * `Webapp - telas.dc.html` é HTML de verdade: cada tela é um elemento com `id`
 * (`8b`, `13a`, …) e renderiza. Isso torna as 22 telas tratáveis pelo mesmo
 * método da landing, em vez de eu transcrever CSS 22 vezes — que é como
 * nasceram o `h2` em 46, o contêiner em 1024 e o `h3` crescente.
 *
 * ⚠️ A CAIXA VEM ESCALADA, O ESTILO NÃO. O conteúdo é 390×844 dentro de um
 * `transform: scale(0.88)`. `getComputedStyle` ignora transform, então
 * `font-size` e cor saem verdadeiros; `getBoundingClientRect` não ignora, e sai
 * multiplicado. Sem dividir pela escala, toda medida de caixa sai 12% menor —
 * e 12% é pouco o bastante para parecer certo e errado o bastante para
 * desalinhar tudo.
 */
async function specDoArtboard(pagina, id) {
  return pagina.evaluate((idAlvo) => {
    const raiz = document.getElementById(idAlvo);
    if (!raiz) return { erro: `artboard ${idAlvo} nao existe` };

    const escalado = [...raiz.querySelectorAll("*")].find(
      (e) => getComputedStyle(e).transform !== "none",
    );
    const matriz = escalado ? getComputedStyle(escalado).transform : "none";
    const escala = matriz === "none" ? 1 : Number(matriz.split("(")[1].split(",")[0]) || 1;
    const tela = escalado ?? raiz;

    const familias = new Map();
    const tamanhos = new Map();
    const cores = new Map();
    for (const elemento of tela.querySelectorAll("*")) {
      const estilo = getComputedStyle(elemento);
      const temTexto = [...elemento.childNodes].some(
        (n) => n.nodeType === 3 && n.textContent.trim(),
      );
      if (!temTexto) continue;
      const conta = (mapa, chave) => mapa.set(chave, (mapa.get(chave) ?? 0) + 1);
      conta(familias, estilo.fontFamily.split(",")[0].replace(/["']/g, ""));
      conta(tamanhos, `${estilo.fontSize}/${estilo.fontWeight}`);
      conta(cores, estilo.color);
    }
    const top = (mapa) =>
      [...mapa.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} (${n})`);

    return {
      escala,
      largura_desenho: Math.round(tela.getBoundingClientRect().width / escala),
      altura_desenho: Math.round(tela.getBoundingClientRect().height / escala),
      familias: top(familias),
      tamanhos: top(tamanhos).slice(0, 12),
      cores: top(cores).slice(0, 10),
    };
  }, id);
}

/**
 * O RITMO VERTICAL — a dimensão que este extrator não media, e por isso
 * autorizava.
 *
 * O diff saiu VAZIO enquanto a página tinha espaço morto no topo. Não foi
 * defeito de medição: era ausência dela. `ASPECTOS` só tinha tamanho de fonte e
 * largura de contêiner, então todo espaçamento passava livre — e guard que não
 * mede uma dimensão é guard que a autoriza.
 *
 * Medir espaço por SELETOR não funciona aqui: os artboards não têm classe
 * nenhuma, só `div` com estilo inline. O que funciona é comparar a SEQUÊNCIA
 * de vãos entre elementos de texto consecutivos, que é justamente o que o olho
 * lê como ritmo.
 *
 * ⚠️ A escala do artboard entra na conta. O conteúdo vive dentro de um
 * `transform: scale(0.88)`; sem dividir, todo vão sai 12% menor.
 */
async function ritmoVertical(pagina, seletorRaiz, escalaConhecida = null) {
  return pagina.evaluate(
    ([raizSel, escalaDada]) => {
      // ⚠️ `#1b` NAO e seletor CSS valido — identificador nao pode comecar com
      // digito. `getElementById` aceita; `querySelector` levanta. Os artboards
      // do design sao todos assim (`8b`, `13a`, `1b`), entao a excecao e a
      // regra aqui.
      const codigo = raizSel.charCodeAt(1);
      const idNumerico = raizSel[0] === "#" && codigo >= 48 && codigo <= 57;
      const raiz = idNumerico
        ? document.getElementById(raizSel.slice(1))
        : document.querySelector(raizSel);
      if (!raiz) return { erro: `raiz ${raizSel} nao encontrada` };

      let escala = escalaDada;
      if (escala == null) {
        const escalado = [...raiz.querySelectorAll("*")].find(
          (e) => getComputedStyle(e).transform !== "none",
        );
        const m = escalado ? getComputedStyle(escalado).transform : "none";
        escala = m === "none" ? 1 : Number(m.split("(")[1].split(",")[0]) || 1;
      }

      // Só elementos que CARREGAM texto proprio, na ordem em que aparecem na
      // tela. Contêiner nao entra: o vao que importa e' entre o que se le.
      const blocos = [];
      for (const elemento of raiz.querySelectorAll("*")) {
        const proprio = [...elemento.childNodes].some(
          (n) => n.nodeType === 3 && n.textContent.trim(),
        );
        // INLINE NAO CONTA. Um `span` dentro do paragrafo tem texto proprio e
        // caixa menor que a linha que o contem, entao ele mede o vao a partir
        // do lugar errado — e infla o resultado com a entrelinha que sobra.
        // Foi assim que a lede aparecia a 50px da busca quando a distancia
        // real era outra.
        if (getComputedStyle(elemento).display.startsWith("inline")) continue;
        const caixa = elemento.getBoundingClientRect();
        if (caixa.height < 2) continue;
        const ehFaixa = elemento.getAttribute("role") === "img" || caixa.height > 40;
        if (!proprio && !ehFaixa) continue;
        blocos.push({
          topo: caixa.top,
          base: caixa.bottom,
          texto: (elemento.textContent || "").trim().replace(/\s+/g, " ").slice(0, 26) || "[faixa]",
        });
      }
      blocos.sort((a, b) => a.topo - b.topo);

      // Aninhados produzem vao negativo (o filho comeca dentro do pai). Só
      // interessam os irmaos visuais, entao o vao negativo e' descartado.
      const vaos = [];
      for (let i = 0; i < blocos.length - 1; i += 1) {
        const vao = (blocos[i + 1].topo - blocos[i].base) / escala;
        if (vao < -1) continue;
        vaos.push({ de: blocos[i].texto, para: blocos[i + 1].texto, vao: Math.round(vao) });
      }
      return { escala, vaos: vaos.slice(0, 12) };
    },
    [seletorRaiz, escalaConhecida],
  );
}

const design = argumento("design", DESIGN_PADRAO);
const alvo = argumento("alvo", "https://facies.app/");
const soDesign = process.argv.includes("--so-design");
const artboard = argumento("artboard", null);
const ritmo = process.argv.includes("--ritmo");

if (!existsSync(design)) {
  console.error(`Arquivo do design nao encontrado: ${design}`);
  process.exit(2);
}

const navegador = await chromium.launch();

/**
 * Modo RITMO — a abertura contra o artboard `1b`, em 390px.
 *
 * ⚠️ A referência do herói NÃO é o herói da v7. Você escolheu a direção `1b`
 * (a faixa abre a página), e a v7 desenha a outra composição — h1 primeiro,
 * faixa como prévia. Eu misturei as duas: peguei a composição do `1b` e a
 * escala de desktop da v7, e o resultado é uma combinação que não existe em
 * lugar nenhum do design.
 *
 * O `1b` só existe em 390px, então é ali que a comparação vale. Acima disso o
 * alvo é a PROPORÇÃO (faixa ÷ h1 ≈ 1,6), não o número.
 */
if (ritmo) {
  const contexto = await navegador.newContext({ viewport: { width: 390, height: 1200 } });
  const pagina = await contexto.newPage();

  await pagina.goto(pathToFileURL(design).href, { waitUntil: "domcontentloaded" });
  await pagina.waitForTimeout(2500);
  const alvoArtboard = artboard ? `#${artboard}` : ".cont";
  const doDesign = await ritmoVertical(pagina, alvoArtboard);

  await pagina.goto(alvo, { waitUntil: "networkidle" });
  await pagina.evaluate(() => document.fonts.ready);
  const nosso = await ritmoVertical(pagina, "main", 1);

  console.log(`\nRITMO @390  — design: ${alvoArtboard}`);
  console.log("\n  DESENHO");
  for (const v of doDesign.vaos ?? []) {
    console.log(`    ${String(v.vao).padStart(4)}px   ${v.de} -> ${v.para}`);
  }
  console.log("\n  NOSSO");
  for (const v of nosso.vaos ?? []) {
    console.log(`    ${String(v.vao).padStart(4)}px   ${v.de} -> ${v.para}`);
  }
  const maiorDesign = Math.max(0, ...(doDesign.vaos ?? []).map((v) => v.vao));
  const maiorNosso = Math.max(0, ...(nosso.vaos ?? []).map((v) => v.vao));
  console.log(`\n  maior vao — desenho ${maiorDesign}px · nosso ${maiorNosso}px`);
  await navegador.close();
  process.exit(maiorNosso > maiorDesign * 1.3 ? 1 : 0);
}

// Modo artboard: uma tela do app, e nada de comparar — aqui a saida E a
// especificacao, para eu construir a partir dela em vez de ler o CSS.
if (artboard) {
  const contexto = await navegador.newContext({ viewport: { width: 1400, height: 1000 } });
  const pagina = await contexto.newPage();
  await pagina.goto(pathToFileURL(design).href, { waitUntil: "domcontentloaded" });
  await pagina.waitForTimeout(2500);
  const spec = await specDoArtboard(pagina, artboard);
  console.log(`
artboard ${artboard}`);
  console.log(JSON.stringify(spec, null, 2));
  await navegador.close();
  process.exit(spec.erro ? 2 : 0);
}

let diferencas = 0;

for (const largura of QUEBRAS) {
  const contexto = await navegador.newContext({ viewport: { width: largura, height: 900 } });
  const pagina = await contexto.newPage();

  await pagina.goto(pathToFileURL(design).href, { waitUntil: "networkidle" });
  await pagina.evaluate(() => document.fonts.ready);
  const doDesign = await medir(pagina, "design");
  const sobreDesign = await sobreposicao(pagina);

  if (soDesign) {
    console.log(`\n@${largura}px  ${JSON.stringify(doDesign)}`);
    await contexto.close();
    continue;
  }

  await pagina.goto(alvo, { waitUntil: "networkidle" });
  await pagina.evaluate(() => document.fonts.ready);
  const nosso = await medir(pagina, "nosso");
  const sobreNosso = await sobreposicao(pagina);

  const linhas = ASPECTOS.map((a) => a.nome).filter(
    (nome) => String(doDesign[nome]) !== String(nosso[nome]),
  );

  console.log(`\n@${largura}px`);
  if (linhas.length === 0) {
    console.log("  sem diferenca");
  } else {
    for (const nome of linhas) {
      diferencas += 1;
      console.log(
        `  DIF  ${nome.padEnd(16)} design=${String(doDesign[nome]).padEnd(12)} nosso=${nosso[nome]}`,
      );
    }
  }
  // A folga que o desenho aceita, nós aceitamos. O que se persegue e a nossa
  // manchete apertar MAIS que a dele — 3 pontos percentuais de tolerancia,
  // porque quebra de linha em fonte proporcional nao da numero identico.
  const piorDesign = Math.max(0, ...sobreDesign.map((m) => m.pior));
  for (const m of sobreNosso) {
    if (m.pior > piorDesign + 0.03) {
      diferencas += 1;
      console.log(
        `  APERTA MAIS QUE O DESENHO  "${m.texto}"  nossa=${(m.pior * 100).toFixed(0)}%  desenho=${(piorDesign * 100).toFixed(0)}%`,
      );
    }
  }

  await contexto.close();
}

await navegador.close();

if (soDesign) process.exit(0);

if (diferencas > 0) {
  console.log(`\n${diferencas} diferencas.`);
  process.exit(1);
}
console.log("\nSem diferencas: a pagina bate com o desenho nos 4 pontos de quebra.");
