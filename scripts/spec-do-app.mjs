/**
 * O DESENHO DO APP, medido — o que `spec-do-design.mjs` faz pela landing.
 *
 * ## O buraco que este arquivo fecha
 *
 * A landing tem comparador: `spec-do-design.mjs` mede quatro pontos de quebra
 * contra a v7 e reprova diferença não declarada. O app tinha só o modo
 * `--artboard`, e o próprio código dele diz o que ele é: *"uma tela do app, e
 * nada de comparar — aqui a saída E a especificacao"*.
 *
 * Ou seja: as telas que o aluno usa todos os dias podiam derivar do desenho sem
 * que nada percebesse. É a frase que este repositório já escreveu sobre si
 * mesmo — guard que não mede uma dimensão é guard que a autoriza.
 *
 * ## Por que VOCABULÁRIO, e não par tela↔artboard
 *
 * A tentação é parear `/hoje` com o artboard `8b` e comparar aspecto a aspecto,
 * como a landing faz. Não funciona aqui, por duas razões medidas:
 *
 *   1. **Não há bijeção.** São 22 artboards para 5 telas capturáveis: a sessão
 *      de questões sozinha ocupa `8c`,`8d`,`8e`,`8f`,`13a`,`13b`,`10b`, e
 *      `/preferencias` aparece repartida entre `12c` e `14c`. Todo pareamento
 *      que eu escrevesse seria julgamento meu, e envelheceria na primeira tela
 *      nova — exatamente como a lista de arquivos do guard de "menos de 5"
 *      envelheceu duas vezes.
 *   2. **O que deriva é o SISTEMA, não a tela.** Um `11px/500` que aparece em
 *      quatro telas não é um defeito de `/hoje`: é um degrau que o desenho não
 *      tem e que alguém introduziu. Medir por tela reportaria o mesmo defeito
 *      quatro vezes e ainda deixaria passar a quinta.
 *
 * Então a regra é de conjunto, e ela não apodrece: **o app não pode pintar um
 * tamanho/peso, uma cor ou uma família que o desenho nunca usa.** Artboard novo
 * amplia o vocabulário sozinho; tela nova é medida sem ninguém cadastrar nada.
 *
 * ## Uso
 *
 *   node scripts/spec-do-app.mjs --alvo=http://127.0.0.1:3107
 *   node scripts/spec-do-app.mjs --so-desenho     # imprime só o vocabulário
 *
 * Sai com 1 quando há divergência não declarada.
 */
import { chromium } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";

import { addSession, mockApi, ready } from "./lib/app-harness.mjs";

const DESIGN_PADRAO =
  "C:/Users/josep/Downloads/Fácies design handoff/Webapp - telas.dc.html";

/**
 * As telas VIVAS do app, na viewport das artboards.
 *
 * 390×844 não é uma escolha: é a caixa em que as 22 artboards foram desenhadas
 * (medida, não lida — elas vivem dentro de um `transform: scale(0.88)`, e o
 * extrator divide pela escala). Medir noutra largura compararia a nossa tela
 * com um desenho que não existe.
 *
 * A lista espelha a do `capture-design-redesign.mjs`, e pelo mesmo motivo: as
 * duas telas de flashcard saíram enquanto `NEXT_PUBLIC_FLASHCARDS` está em 0,
 * porque elas redirecionam para `/hoje` e mediriam a mesma tela duas vezes.
 */
const TELAS = [
  "/hoje",
  "/mapa",
  "/banco",
  // A colecao do aluno (`bookmarked`). Fora da lista, a tela nova nasceria
  // sem medida nenhuma -- que foi como o Banco chegou a 16% de mono.
  "/banco/guardadas",
  "/evolucao",
  // A tela dos GRÁFICOS. Ela é o segundo olhar da Evolução e nunca foi medida:
  // ficou com `h2` em 22/500, contagem em sans e texto de SVG em 9px e 700 —
  // três degraus que as 22 artboards não têm — enquanto as cinco telas ao lado
  // eram vigiadas. Tela fora da lista é tela autorizada a divergir.
  "/estatisticas/graficos",
  "/cronograma",
  "/preferencias",
  // A leitura do plano (artboard `9c`). `/cronograma` fica na lista porque
  // continua servindo o calendario, que e' outra tela e outro vocabulario.
  "/plano",
  // A Conta voltou a ser destino da barra e passou a guardar o estado do
  // acesso (`12c`); fora da lista, ela ficava sem medida nenhuma.
  "/conta",
  // O quinto destino. Fora da lista, a tela que a barra inteira aponta
  // nasceria sem medida nenhuma.
  "/voce",
];

/**
 * A FATIA DE MONO POR TELA — o guard que faltava.
 *
 * O resto deste script reprova o que o app PINTA e o desenho nunca usa. Ele
 * nunca olhou para a PROPORCAO, e a identidade mora ali: medido no artboard
 * `8b`, o desenho poe **20 dos 31 nos de texto em mono (65%)**, e o `/hoje`
 * estava em **28%** — sans-dominante, com quase o dobro de nos na tela. Os
 * tokens batiam um a um, e mesmo assim a tela nao lembrava o desenho.
 *
 * ⚠️ Estes numeros sao MEDIDA, e nao meta. Cada um foi lido da tela renderizada
 * a 390px depois de ela ser levada ao desenho; o guard existe para impedir a
 * REGRESSAO, nao para perseguir um alvo. Tela que sobe, sobe o piso junto.
 *
 * A tolerancia de 8 pontos absorve variacao de fixture (um bloco a mais na
 * agenda muda a conta) sem deixar passar uma inversao de familia.
 */
const MONO_MINIMO = {
  "/hoje": 40,
  "/evolucao": 60,
  "/mapa": 28,
  // 84% medido em 2026-09-08, a fatia mais alta do app — e nao e' merito, e'
  // a natureza da tela: quase todo o texto dela e' tick de eixo, sigla de area
  // e percentual, que sao dado. O piso fica em 78 pela mesma razao que o do
  // /mapa fica abaixo da medida: prosa nova (um estado vazio, uma nota) deve
  // caber sem reprovar, mas inverter a familia nao.
  "/estatisticas/graficos": 78,
  "/plano": 20,
  // 16% antes desta branch. O resumo da sessao, a disponibilidade e a linha de
  // tema passaram a mono; os chips de filtro (12/500) sao o que ainda falta.
  // 28 -> 27 ao tirar a barra de acao: o rotulo dela ("Começar 20 questões ·
  // com gabarito") era mono e contava. O botao nao sumiu -- ele deixou de ser
  // DUPLICADO, e a copia que ficou vive no painel Resumo.
  "/banco": 27,
  "/banco/guardadas": 41,
  "/cronograma": 0,
  "/preferencias": 0,
  "/conta": 0,
  "/voce": 0,
};

/**
 * DESVIOS APROVADOS — diferença que é decisão, não defeito.
 *
 * Mesma mecânica do guard da landing: o desvio continua sendo IMPRESSO, com o
 * motivo ao lado, mas não reprova. Sem esta lista sobrariam duas saídas ruins —
 * conviver com um guard permanentemente vermelho, que em uma semana ninguém mais
 * lê, ou parar de medir o aspecto, que é perder a medida junto com o alerta.
 *
 * `chave` casa por igualdade exata com o que o extrator emite.
 */
const APROVADOS = [
  {
    tipo: "familia",
    chave: "Azeret Mono",
    motivo:
      "o handoff pede DM Mono; a Azeret aplica o MESMO criterio com mais rigor " +
      "(o zero da DM Mono e cortado por barra, que e a mesma classe de enfeite " +
      "que tirou a IBM Plex daqui). Ver o comentario da fonte em layout.tsx.",
  },
  /**
   * ══ OS TEAIS E OS ÂMBARES ════════════════════════════════════════════════
   *
   * Nenhum é defeito, e a prova está na MATIZ. Medido:
   *
   *   desenho  #0D4F4A  H175 S72 L18   8,69:1     #12786E  H174 S74 L27  4,93:1
   *   nosso    #075349  H172 S84 L18   8,28:1     #117269  H174 S74 L26  5,34:1
   *   nosso    #096F63  H173 S85 L24   5,60:1  <- degrau que o desenho nao tem
   *
   *   desenho  #B26A00  H36 S100 L35   3,92:1     #8A4E00  H34 S100 L27  6,12:1
   *   nosso    #915500  H35 S100 L28   5,54:1     #8A5200  H36 S100 L27  5,90:1
   *
   * Duas coisas, e as duas ja estao registradas nesta base:
   *
   *   1. **Recalibração de contraste que preserva a matiz.** O âmbar do desenho
   *      reprova como texto (3,92:1) e o nosso passa. A matiz e' a mesma em
   *      todos os pares; o que muda e' saturacao e luz, sempre na direcao do
   *      contraste.
   *   2. **O app tem MAIS superficies que a landing** (5 contra 2), entao ele
   *      precisa de um degrau intermediario que o desenho nao desenhou:
   *      `--color-primary`. Ausencia no desenho aqui e' falta de superficie
   *      desenhada, nao proibicao.
   *
   * Repintar para o valor do desenho seria trocar contraste medido por
   * fidelidade de hex — e o hex nao e' o que o desenho esta dizendo.
   */
  {
    tipo: "cor",
    chave: "rgb(9, 111, 99)",
    motivo:
      "`--color-primary` (#096F63, H173, 5,60:1). Degrau intermediario entre os " +
      "dois teais do desenho (#0D4F4A 8,69 e #12786E 4,93); existe porque o app " +
      "tem 5 superficies e a landing tem 2. Matiz preservada.",
  },
  {
    tipo: "cor",
    chave: "rgb(17, 114, 105)",
    motivo:
      "`--color-marca-viva` (#117269) e o #12786E do desenho recalibrado: mesma " +
      "matiz (H174) e mesma saturacao, luz um ponto abaixo para subir o " +
      "contraste de 4,93 para 5,34 sobre a superficie.",
  },
  {
    tipo: "cor",
    chave: "rgb(138, 82, 0)",
    motivo:
      "`--color-warning` (#8A5200) e o #8A4E00 do desenho com a mesma matiz " +
      "(H36 contra H34) e o mesmo papel. O ambar CLARO do desenho (#B26A00) " +
      "reprova como texto a 3,92:1; o nosso par passa nos dois tons.",
  },
  {
    tipo: "cor",
    chave: "rgb(179, 38, 30)",
    motivo:
      "`--color-danger`. O desenho do webapp nao tem NENHUMA cor de erro porque " +
      "nao tem nenhuma tela de erro: as 22 artboards desenham o caminho feliz. " +
      "Ausencia no desenho aqui e falta de cena desenhada, nao proibicao — e o " +
      "app precisa dizer que uma taxa caiu.",
  },
  {
    tipo: "cor",
    chave: "rgb(237, 238, 234)",
    motivo:
      "`--color-paper` usado como TINTA, sobre superficie preenchida (o dia " +
      "selecionado no cronograma). O desenho faz o mesmo com `#F6F6F4`, que e o " +
      "papel DELE — a cor difere porque o par papel/superficie do app e outro, " +
      "e o que se preserva e a relacao, nao o valor.",
  },
];

function argumento(nome, padrao = null) {
  const achado = process.argv.find((a) => a.startsWith(`--${nome}=`));
  return achado ? achado.split("=").slice(1).join("=") : padrao;
}

const design = argumento("design", DESIGN_PADRAO);
const alvo = argumento("alvo", "http://127.0.0.1:3107");
const soDesenho = process.argv.includes("--so-desenho");

if (!existsSync(design)) {
  console.error(`Desenho nao encontrado: ${design}`);
  console.error("Use --design=<caminho para Webapp - telas.dc.html>");
  process.exit(2);
}

/**
 * O que um elemento com texto PINTA — a unidade de comparação dos dois lados.
 *
 * Só conta elemento que tem nó de texto próprio: sem isso, cada `div` de
 * layout herdaria o estilo do filho e o histograma viraria ruído. É a mesma
 * regra que `specDoArtboard` já usa, e ela precisa ser a mesma nos dois lados
 * ou a comparação mede a diferença entre dois extratores.
 */
function extrator() {
  const visiveis = [];
  for (const el of document.body.querySelectorAll("*")) {
    const st = getComputedStyle(el);
    if (st.display === "none" || st.visibility === "hidden") continue;
    const temTexto = [...el.childNodes].some(
      (n) => n.nodeType === 3 && n.textContent.trim(),
    );
    if (!temTexto) continue;
    visiveis.push({
      passo: `${Math.round(parseFloat(st.fontSize))}/${st.fontWeight}`,
      cor: st.color,
      familia: st.fontFamily.split(",")[0].replace(/["']/g, ""),
      texto: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40),
    });
  }
  return visiveis;
}

const navegador = await chromium.launch();

// ── 1. o vocabulário do desenho ──────────────────────────────────────────────
const paginaDesign = await navegador.newPage({ viewport: { width: 1400, height: 1000 } });
await paginaDesign.goto(pathToFileURL(design).href, { waitUntil: "domcontentloaded" });
await paginaDesign.waitForTimeout(3000);

const vocabulario = await paginaDesign.evaluate(() => {
  const passos = new Map();
  const cores = new Map();
  const familias = new Map();
  const artboards = [...document.querySelectorAll("[id]")]
    .map((e) => e.id)
    .filter((i) => /^[0-9]/.test(i));
  for (const id of artboards) {
    const raiz = document.getElementById(id);
    // ⚠️ O conteudo vive dentro de um `transform: scale(0.88)`. `getComputedStyle`
    // ignora transform, entao font-size e cor saem VERDADEIROS — e sao esses os
    // dois aspectos que este guard compara. A caixa nao entra na conta aqui.
    const escalado = [...raiz.querySelectorAll("*")].find(
      (e) => getComputedStyle(e).transform !== "none",
    );
    for (const el of (escalado ?? raiz).querySelectorAll("*")) {
      const st = getComputedStyle(el);
      if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
      const passo = `${Math.round(parseFloat(st.fontSize))}/${st.fontWeight}`;
      passos.set(passo, (passos.get(passo) ?? 0) + 1);
      cores.set(st.color, (cores.get(st.color) ?? 0) + 1);
      const f = st.fontFamily.split(",")[0].replace(/["']/g, "");
      familias.set(f, (familias.get(f) ?? 0) + 1);
    }
  }
  return {
    artboards: artboards.length,
    passos: [...passos.entries()],
    cores: [...cores.entries()],
    familias: [...familias.entries()],
  };
});
await paginaDesign.close();

const ordena = (pares) => [...pares].sort((a, b) => b[1] - a[1]);

if (soDesenho) {
  console.log(`\nVocabulario do desenho — ${vocabulario.artboards} artboards\n`);
  console.log("tamanho/peso:");
  for (const [k, n] of ordena(vocabulario.passos)) console.log(`   ${k.padEnd(9)} ${n}x`);
  console.log("\ncores:");
  for (const [k, n] of ordena(vocabulario.cores)) console.log(`   ${k.padEnd(24)} ${n}x`);
  console.log("\nfamilias:");
  for (const [k, n] of ordena(vocabulario.familias)) console.log(`   ${k.padEnd(18)} ${n}x`);
  await navegador.close();
  process.exit(0);
}

// ── 2. o que o app pinta ─────────────────────────────────────────────────────
const contexto = await navegador.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 3,
  baseURL: alvo,
});
await addSession(contexto, alvo);
const pagina = await contexto.newPage();
await mockApi(pagina);

const passosApp = new Map();
const coresApp = new Map();
const familiasApp = new Map();
/** Onde cada divergência apareceu primeiro — sem isto o relatório diz o QUE
 *  está errado e não onde mexer. */
const origem = new Map();
const monoPorTela = new Map();
let telasLidas = 0;

for (const tela of TELAS) {
  try {
    await pagina.goto(`${alvo}${tela}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await ready(pagina);
    await pagina.waitForTimeout(500);
    const pintado = await pagina.evaluate(extrator);

    /**
     * ⚠️ TELA EM CARREGAMENTO OU ERRO NAO PODE SER MEDIDA — e este guard
     * quase mediu.
     *
     * A primeira versao so recusava tela com menos de 5 elementos de texto. As
     * telas travadas rendiam 7 a 9 ("CARREGANDO" mais a barra de abas, ou
     * "Algo deu errado" mais a barra), passavam pelo piso, e o relatorio
     * imprimia com confianca a tipografia do ESTADO DE ERRO como se fosse a do
     * produto. Um guard que mede a coisa errada e' pior que guard nenhum: ele
     * produz um numero em que alguem vai acreditar.
     *
     * O sinal e o TEXTO, nao a contagem: os dois estados tem copy propria e
     * estavel. E o piso sobe para 20 — nenhuma tela real deste app cabe em
     * menos que isso, e `/preferencias` (a unica que carregou de verdade na
     * primeira rodada) rendeu 74.
     */
    const corpo = await pagina.evaluate(() =>
      (document.body.innerText || "").replace(/\s+/g, " ").toLowerCase(),
    );
    const travada = ["carregando", "algo deu errado", "tentar novamente"].find((s) =>
      corpo.includes(s),
    );
    if (travada || pintado.length < 20) {
      console.error(
        `\n${tela}: a tela nao renderizou o conteudo` +
          (travada ? ` — parou em "${travada}"` : ` — so ${pintado.length} elementos com texto`),
      );
      console.error(`  corpo: ${corpo.slice(0, 160)}`);
      console.error(
        "\n  Causa quase sempre e' fixture faltando em scripts/lib/app-harness.mjs:\n" +
          "  o fallback do mock e' `{}`, entao endpoint desconhecido nao da erro — da\n" +
          "  tela vazia. Para descobrir qual: observe `page.on(\"request\")` e compare\n" +
          "  com os `path ===` do mock.",
      );
      await navegador.close();
      process.exit(2);
    }
    telasLidas += 1;
    // A fatia de mono DESTA tela, para o guard de proporcao mais abaixo.
    const monoDaTela = pintado.filter((item) => /mono/i.test(item.familia)).length;
    monoPorTela.set(tela, Math.round((monoDaTela / pintado.length) * 100));
    for (const item of pintado) {
      passosApp.set(item.passo, (passosApp.get(item.passo) ?? 0) + 1);
      coresApp.set(item.cor, (coresApp.get(item.cor) ?? 0) + 1);
      familiasApp.set(item.familia, (familiasApp.get(item.familia) ?? 0) + 1);
      for (const chave of [item.passo, item.cor, item.familia]) {
        if (!origem.has(chave)) origem.set(chave, `${tela} — "${item.texto}"`);
      }
    }
    console.log(`  ${tela.padEnd(15)} ${pintado.length} elementos com texto`);
  } catch (erro) {
    console.error(`\n${tela}: ${erro.message.split("\n")[0]}`);
    await navegador.close();
    process.exit(2);
  }
}
await navegador.close();

// ── PROPORCAO DE MONO ───────────────────────────────────────────────────────
const TOLERANCIA = 8;
const abaixoDoPiso = [];
console.log("");
for (const [tela, pct] of monoPorTela) {
  const piso = MONO_MINIMO[tela];
  if (piso === undefined || piso === 0) continue;
  const marca = pct + TOLERANCIA < piso ? "REPROVA" : "ok     ";
  console.log(`  ${marca} mono ${String(pct).padStart(3)}%  (piso ${piso}%)  ${tela}`);
  if (pct + TOLERANCIA < piso) abaixoDoPiso.push({ tela, pct, piso });
}
if (abaixoDoPiso.length) {
  console.error(
    "\nA IDENTIDADE INVERTEU: estas telas passaram a ser sans-dominantes.\n" +
      "Rotulo, contagem, tempo, sigla de area e meta vao em MONO 400; sans e para\n" +
      "frase corrida e serifa para manchete e enunciado. E dessa proporcao que vem\n" +
      "a textura de prontuario do desenho.",
  );
  for (const { tela, pct, piso } of abaixoDoPiso) {
    console.error(`  ${tela}: ${pct}% contra piso de ${piso}%`);
  }
}

// ── 3. o diff ────────────────────────────────────────────────────────────────
const noDesenho = {
  passo: new Set(vocabulario.passos.map(([k]) => k)),
  cor: new Set(vocabulario.cores.map(([k]) => k)),
  familia: new Set(vocabulario.familias.map(([k]) => k)),
};

const aprovado = (tipo, chave) =>
  APROVADOS.find((a) => a.tipo === tipo && a.chave === chave);

const secoes = [
  ["passo", "TAMANHO/PESO", passosApp],
  ["cor", "COR", coresApp],
  ["familia", "FAMILIA", familiasApp],
];

console.log(
  `\n${telasLidas} telas medidas a 390x844, contra ${vocabulario.artboards} artboards.\n`,
);

let reprovas = 0;
for (const [tipo, rotulo, mapa] of secoes) {
  const fora = ordena([...mapa.entries()]).filter(([k]) => !noDesenho[tipo].has(k));
  if (fora.length === 0) {
    console.log(`${rotulo}: nenhum valor fora do desenho.`);
    continue;
  }
  console.log(`${rotulo} — o app pinta, o desenho nunca usa:`);
  for (const [chave, n] of fora) {
    const ok = aprovado(tipo, chave);
    if (ok) {
      console.log(`   aprovado  ${chave.padEnd(22)} ${String(n).padStart(4)}x  — ${ok.motivo}`);
    } else {
      reprovas += 1;
      console.log(`   DESVIO    ${chave.padEnd(22)} ${String(n).padStart(4)}x`);
      console.log(`             visto em ${origem.get(chave)}`);
    }
  }
  console.log("");
}

if (reprovas > 0) {
  console.error(
    `${reprovas} valor(es) que o desenho nao contem. Ou o app volta ao passo do ` +
      `desenho, ou o desvio entra em APROVADOS com o motivo escrito.`,
  );
}

// ⚠️ AS DUAS REPROVACOES SAO INDEPENDENTES, e as duas derrubam o guard.
// Vocabulario responde "o app pinta algo que o desenho nao tem?"; proporcao
// responde "o app usa as familias na mesma medida?". Foi por so a primeira
// existir que nove commits passaram verdes com a identidade invertida.
if (reprovas > 0 || abaixoDoPiso.length > 0) {
  process.exit(1);
}

console.log(
  "Sem divergencia: o app so pinta o que o desenho do webapp contem, e na mesma medida.",
);
