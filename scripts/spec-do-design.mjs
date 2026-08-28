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
  { nome: "faixa altura", design: ".strip--previa", nosso: "[role='img']", prop: "altura" },
  { nome: "lede", design: ".chamada", nosso: "h1:not(.paper-eyebrow) + p", prop: "font-size" },
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

const design = argumento("design", DESIGN_PADRAO);
const alvo = argumento("alvo", "https://facies.app/");
const soDesign = process.argv.includes("--so-design");
const artboard = argumento("artboard", null);

if (!existsSync(design)) {
  console.error(`Arquivo do design nao encontrado: ${design}`);
  process.exit(2);
}

const navegador = await chromium.launch();

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
