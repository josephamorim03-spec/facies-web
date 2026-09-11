#!/usr/bin/env node
/**
 * CATRACA DA PISTA DE GRELHA — a coluna do telemóvel que ninguém declara.
 *
 * ## O defeito, medido
 *
 * O operador mandou uma captura do pós-simulado a rolar na horizontal no
 * telemóvel. Eu corrigi, escrevi `md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]`,
 * e dei o assunto por fechado. A CI mediu depois: **430px de estouro a 390px**,
 * no mesmo ecrã, com o conserto já lá dentro.
 *
 * `md:` começa aos 768px. `sm:`, aos 640px. A captura era de telemóvel — o
 * conserto nunca esteve na largura onde o defeito vive.
 *
 * ## A física
 *
 * Um `grid` sem `grid-cols-*` cria a pista **implícita**, que é `auto`. O
 * mínimo de uma pista `auto` é o min-content do conteúdo — e com `truncate`
 * (`white-space: nowrap`) o min-content é a **frase inteira**. Os rótulos de
 * microcompetência são a frase mais longa do produto, então a pista cresce até
 * caber uma delas e leva a página junto.
 *
 * Medido num repro da cadeia real (grelha externa › cartão › grelha interna ›
 * botão), a 390px:
 *
 * | pista | botão | página |
 * | --- | --- | --- |
 * | implícita, nas duas grelhas | 706px | estoura 333px |
 * | só `md:` (o primeiro conserto) | 706px | estoura 333px |
 * | `grid-cols-1` nas duas | 356px | cabe |
 *
 * `grid-cols-1` no Tailwind é `repeat(1, minmax(0, 1fr))`. É exatamente por
 * isso que a faixa de contadores do mesmo ecrã, que já usava `grid-cols-2`,
 * nunca estourou — enquanto as três grelhas vizinhas, todas sem coluna base,
 * estouravam.
 *
 * ⚠️ **`1fr` sozinho tem o mesmo defeito.** `1fr` é `minmax(auto, 1fr)`, e a
 * função mínima continua a ser `auto`. Só `minmax(0, …)` corta o mínimo — e é
 * também por isso que um `min-w-0` no item não substitui isto: o mínimo
 * automático do item só se aplica quando a função mínima da pista é `auto`.
 *
 * ## Por que catraca, e não teto zero
 *
 * São 82 na árvore, 50 fora do admin. A esmagadora maioria é inofensiva hoje —
 * só estoura quando o conteúdo é `nowrap` —, mas nenhuma delas está protegida:
 * basta alguém pôr um `truncate` lá dentro. Converter as 82 num só diff seria
 * uma varredura cega, e esta base já pagou por uma dessas.
 *
 * Isto congela a dívida no tamanho de hoje e cobra só a direção: **encolher
 * passa, crescer reprova**. Baixou? Baixe o número aqui — o guard imprime o
 * valor novo.
 *
 * ## O que ele NÃO é
 *
 * Não proíbe `grid`. Um `grid` sem breakpoint nenhum (uma pilha simples) não é
 * apanhado: sem coluna declarada em lado nenhum, a intenção é uma pilha e o
 * autor nunca prometeu duas colunas. O que ele procura é a FORMA que mente —
 * quem declarou coluna no ecrã grande e esqueceu o pequeno.
 */

import fs from "node:fs";
import path from "node:path";

const RAIZ = "src";

/**
 * O teto. Só desce.
 *
 * 2026-09-10: nasce na contagem MEDIDA da árvore, depois de converter as seis
 * grelhas de `PostExamReview.tsx` — o ecrã que o operador fotografou.
 *
 * São **69** grelhas sem coluna no telemóvel e **13** pistas arbitrárias com
 * `1fr` cru. 32 das 82 estão no admin, 50 em telas do aluno.
 */
const TETO = 82;

/**
 * Fora da varredura, com o motivo.
 *
 * Nada isento hoje. ⚠️ Se algum dia entrar aqui um caminho, confira que ele
 * EXISTE: isenção a apontar para ficheiro apagado é buraco que imprime verde.
 */
const ISENTOS = new Map();

/** Um `grid-cols-*` que NÃO corta o mínimo da pista. */
function pistaSemMinimoCortado(classe) {
  // `grid-cols-1`..`grid-cols-12` e `grid-cols-none` são seguros: o Tailwind
  // gera `repeat(N, minmax(0, 1fr))`.
  if (/^grid-cols-(?:\d+|none|subgrid)$/.test(classe)) return false;
  const arbitraria = classe.match(/^grid-cols-\[(.+)\]$/);
  if (!arbitraria) return false;
  // Só é seguro se TODA pista flexível vier de um `minmax(0,…)`. Retirar as
  // seguras e ver se sobra `fr` é mais fiável que um lookbehind — a primeira
  // versão usava um, e o autoteste apanhou-a a reprovar
  // `md:grid-cols-[minmax(0,1fr)_auto]`, que está certo.
  //
  // ⚠️ Uma pista `auto` NÃO conta como dívida, apesar de o mínimo dela ser o
  // min-content: `[minmax(0,1fr)_auto]` é a forma certa de "texto que encolhe +
  // seta que não". Marcar `auto` marcaria o desenho correto.
  const semSeguras = arbitraria[1].replace(/minmax\(\s*0[^)]*\)/g, "");
  return /[\d.]*fr/.test(semSeguras);
}

const FORMAS = [
  {
    nome: "grelha sem coluna no telemóvel (só em breakpoint)",
    /**
     * Casa um `className` que tem `grid` solto, tem `<bp>:grid-cols-*` e NÃO
     * tem `grid-cols-*` base. É um predicado sobre a lista de classes, e não
     * uma regex só, porque "tem X e NÃO tem Y" numa regex fica ilegível.
     */
    seleciona: (classes) =>
      classes.includes("grid") &&
      classes.some((c) => /^(?:sm|md|lg|xl|2xl):grid-cols-/.test(c)) &&
      !classes.some((c) => /^grid-cols-/.test(c)) &&
      // `grid-flow-col` e `auto-cols-*` dimensionam por outro caminho: pôr
      // `grid-cols-1` neles MUDA o desenho, então não são dívida desta catraca.
      !classes.some((c) => /^(?:grid-flow-col|auto-cols-)/.test(c)),
  },
  {
    nome: "pista arbitrária com mínimo `auto` (`1fr` em vez de `minmax(0,1fr)`)",
    seleciona: (classes) =>
      classes.includes("grid") &&
      classes.some((c) => pistaSemMinimoCortado(c.replace(/^(?:sm|md|lg|xl|2xl):/, ""))),
  },
];

/** Todo literal de `className`/`class` do ficheiro, com a linha. */
function classNamesDe(fonte) {
  const encontrados = [];
  for (const casamento of fonte.matchAll(/class(?:Name)?\s*=\s*"([^"]*)"/g)) {
    encontrados.push({
      classes: casamento[1].split(/\s+/).filter(Boolean),
      linha: fonte.slice(0, casamento.index).split("\n").length,
    });
  }
  // Também os literais soltos (`cx("grid gap-2 md:grid-cols-2", …)`), que é
  // como metade do app compõe classe condicional.
  for (const casamento of fonte.matchAll(/["'`]([^"'`\n]*\bgrid\b[^"'`\n]*)["'`]/g)) {
    encontrados.push({
      classes: casamento[1].split(/\s+/).filter(Boolean),
      linha: fonte.slice(0, casamento.index).split("\n").length,
    });
  }
  return encontrados;
}

function ficheirosDe(raiz) {
  if (!fs.existsSync(raiz)) return [];
  return fs.readdirSync(raiz, { withFileTypes: true }).flatMap((entrada) => {
    const alvo = path.join(raiz, entrada.name).split(path.sep).join("/");
    if ([...ISENTOS.keys()].some((isento) => alvo === isento || alvo.startsWith(`${isento}/`))) {
      return [];
    }
    if (entrada.isDirectory()) return ficheirosDe(alvo);
    return /\.tsx$/.test(entrada.name) ? [alvo] : [];
  });
}

export function varrer(raiz = RAIZ) {
  const achados = [];
  const vistos = new Set();
  for (const ficheiro of ficheirosDe(raiz)) {
    const fonte = fs.readFileSync(ficheiro, "utf8");
    for (const { classes, linha } of classNamesDe(fonte)) {
      for (const forma of FORMAS) {
        if (!forma.seleciona(classes)) continue;
        // O mesmo literal é apanhado pelas duas passagens de `classNamesDe`;
        // contar duas vezes inflaria o teto e escondia dívida futura.
        const chave = `${ficheiro}:${linha}:${forma.nome}`;
        if (vistos.has(chave)) continue;
        vistos.add(chave);
        achados.push({ ficheiro, linha, forma: forma.nome });
      }
    }
  }
  return achados;
}

function principal() {
  const achados = varrer();
  const total = achados.length;

  if (total > TETO) {
    console.error(
      `Pista de grelha sem mínimo cortado: ${total} (teto ${TETO}, +${total - TETO}).\n` +
        "O teto SÓ DESCE. Declare a coluna do telemóvel — `grid-cols-1` — ou use\n" +
        "`minmax(0,1fr)` na pista arbitrária. `1fr` sozinho é `minmax(auto,1fr)`.\n",
    );
    for (const achado of achados) {
      console.error(`  ${achado.ficheiro}:${achado.linha} — ${achado.forma}`);
    }
    process.exit(1);
  }

  if (total < TETO) {
    console.log(
      `Pista de grelha: ${total} sem mínimo cortado (teto ${TETO}).\n` +
        `  ✔ encolheu — baixe o TETO para ${total} em scripts/check-pista-de-grelha.mjs`,
    );
    return;
  }

  console.log(`Pista de grelha: ${total} sem mínimo cortado, no teto (${TETO}).`);
}

// ⚠️ AUTOTESTE OBRIGATÓRIO. Guard que itera precisa provar que iterou: um regex
// que deixa de casar, um diretório renomeado ou uma varredura vazia imprimem
// exatamente o mesmo verde que "está tudo certo".
if (process.argv.includes("--autoteste")) {
  const tmp = fs.mkdtempSync(path.join(process.env.TEMP || "/tmp", "pista-"));
  const casos = [
    // Reprovam: prometeram coluna no ecrã grande e esqueceram o pequeno.
    ["a.tsx", '<div className="grid gap-6 md:grid-cols-2" />', true],
    ["b.tsx", '<div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" />', true],
    // Reprova: pista arbitrária com `1fr` cru, cujo mínimo continua `auto`.
    ["c.tsx", '<div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_auto]" />', true],
    // Liberam: coluna declarada no telemóvel, e `minmax(0,…)` na arbitrária.
    ["d.tsx", '<div className="grid grid-cols-1 gap-6 md:grid-cols-2" />', false],
    ["e.tsx", '<div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_auto]" />', false],
    // Libera: pilha simples, sem breakpoint nenhum — ninguém prometeu coluna.
    ["f.tsx", '<div className="grid gap-3" />', false],
    // Libera: `grid-flow-col` dimensiona por outro caminho.
    ["g.tsx", '<div className="grid grid-flow-col gap-2 md:grid-cols-3" />', false],
  ];
  for (const [nome, fonte] of casos) fs.writeFileSync(path.join(tmp, nome), fonte);
  const achados = varrer(tmp);
  let falhas = 0;
  for (const [nome, , deveCasar] of casos) {
    const casou = achados.some((a) => a.ficheiro.endsWith(nome));
    if (casou !== deveCasar) {
      console.error(`  ✖ ${nome}: esperado ${deveCasar ? "casar" : "NÃO casar"}, obteve ${casou}`);
      falhas += 1;
    }
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  if (falhas > 0) {
    console.error(`Autoteste do guard: ${falhas} caso(s) errado(s) — o guard não vê o que diz ver.`);
    process.exit(1);
  }
  const reprovados = casos.filter(([, , d]) => d).length;
  console.log(
    `Autoteste da pista: ${casos.length} casos, ${reprovados} reprovados e ` +
      `${casos.length - reprovados} liberados como esperado.`,
  );
} else {
  principal();
}
