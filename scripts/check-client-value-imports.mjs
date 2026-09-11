#!/usr/bin/env node
/**
 * Servidor não importa VALOR de módulo `"use client"`.
 *
 * ## O bug que originou este guard
 *
 * `TOTAL_DE_MARCAS` era exportado de `QuestaoAnotada.tsx` (`"use client"`) e
 * importado por `SecaoNoveMedidas.tsx`, que é server component. O Next
 * substitui exports não-componentes de um módulo cliente por um proxy que lança
 * ao ser CHAMADO — mas `String(proxy)` não chama: serializa. O painel de
 * números da landing foi renderizado com
 *
 *     function(){throw Error("Attempted to call TOTAL_DE_MARCAS() from the
 *     server but TOTAL_DE_MARCAS is on the client…")}
 *
 * em 40px, no lugar do "7". `tsc` passou (o tipo está certo — o que muda é o
 * módulo que o runtime entrega), o lint passou, os 138 testes passaram e o
 * `next build` saiu com exit 0 e 320 páginas geradas.
 *
 * Nenhuma ferramenta da cadeia vê isso. Por isso existe este arquivo.
 *
 * ## A regra
 *
 * De um módulo `"use client"`, o servidor pode importar:
 *   - TIPOS (`import type`, ou o membro marcado `type` dentro das chaves) —
 *     são apagados na compilação, não existem em runtime;
 *   - COMPONENTES (nome em PascalCase) — é exatamente para isso que a
 *     fronteira existe.
 *
 * Não pode importar constante, função utilitária nem objeto de configuração. O
 * conserto é sempre o mesmo: mover o valor para um módulo SEM `"use client"`,
 * que os dois lados importam.
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(RAIZ, "src");

/** O arquivo declara `"use client"` nas primeiras linhas? */
export function ehModuloCliente(fonte) {
  // Só as primeiras linhas: `"use client"` no meio do arquivo não é diretiva, e
  // a string pode aparecer dentro de comentário ou de outro literal.
  const inicio = fonte.split("\n").slice(0, 5).join("\n");
  return /^\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*["']use client["']/.test(inicio);
}

/**
 * Os exports que NÃO podem cruzar para o servidor.
 *
 * PascalCase é tratado como componente e liberado — é o caso que a fronteira
 * existe para servir. `export type` e `export interface` nunca entram: são
 * apagados na compilação.
 */
export function valoresExportados(fonte) {
  const nomes = new Set();
  const declaracao = /^\s*export\s+(?:async\s+)?(const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm;
  for (const achado of fonte.matchAll(declaracao)) {
    const nome = achado[2];
    // Componente: começa em maiúscula e NÃO é uma constante em caixa alta.
    //
    // ⚠️ A REGRA ERA `/^[A-Z][a-z]/`, e ela exigia minúscula na SEGUNDA letra —
    // o que reprova todo componente cujo nome começa com duas maiúsculas. Em
    // português isso não é raro: `OQueOAppFaz` (o artigo "O" + "Que") foi
    // acusado de ser valor cruzando a fronteira, e o `npm run lint` inteiro
    // ficou vermelho por um componente perfeitamente legítimo.
    //
    // O que distingue componente de constante não é a segunda letra: é haver
    // minúscula em algum lugar. `TOTAL_DE_MARCAS` e `X` não têm; `OQueOAppFaz`
    // e `QuestaoAnotada` têm. `marcasDaProva` cai pela primeira letra.
    const ehComponente = /^[A-Z]/.test(nome) && !/^[A-Z0-9_]+$/.test(nome);
    if (ehComponente) continue;
    nomes.add(nome);
  }
  return nomes;
}

/**
 * O que este arquivo importa de cada módulo, ignorando o que é tipo.
 *
 * Cobre as três formas que aparecem no repo: `import type { X } from`,
 * `import { type X, Y } from` e `import { Y } from`.
 */
export function importacoesDeValor(fonte) {
  const porModulo = new Map();
  const importacao = /import\s+(type\s+)?\{([^}]*)\}\s*from\s*["']([^"']+)["']/g;
  for (const achado of fonte.matchAll(importacao)) {
    if (achado[1]) continue; // `import type { … }` inteiro é apagado
    const modulo = achado[3];
    const nomes = achado[2]
      .split(",")
      .map((parte) => parte.trim())
      .filter(Boolean)
      // `{ type Chave }` — membro marcado como tipo, também apagado.
      .filter((parte) => !/^type\s/.test(parte))
      // `{ X as Y }` — o que importa é o nome de origem.
      .map((parte) => parte.split(/\s+as\s+/)[0].trim());
    if (nomes.length === 0) continue;
    porModulo.set(modulo, [...(porModulo.get(modulo) ?? []), ...nomes]);
  }
  return porModulo;
}

function listarArquivos(dir) {
  const saida = [];
  for (const entrada of readdirSync(dir)) {
    if (entrada === "node_modules" || entrada === ".next") continue;
    const caminho = join(dir, entrada);
    if (statSync(caminho).isDirectory()) saida.push(...listarArquivos(caminho));
    else if (/\.tsx?$/.test(entrada) && !/\.d\.ts$/.test(entrada)) saida.push(caminho);
  }
  return saida;
}

/** Resolve `./x`, `../x` e `@/x` para um arquivo real. */
function resolverModulo(especificador, deArquivo) {
  let base;
  if (especificador.startsWith("@/")) base = join(SRC, especificador.slice(2));
  else if (especificador.startsWith(".")) base = resolve(dirname(deArquivo), especificador);
  else return null; // pacote externo: nunca é módulo nosso
  for (const sufixo of [".tsx", ".ts", "/index.tsx", "/index.ts"]) {
    const tentativa = base + sufixo;
    if (existsSync(tentativa)) return tentativa;
  }
  return existsSync(base) && statSync(base).isFile() ? base : null;
}

/**
 * As entradas do servidor: `page`, `layout`, `route` e companhia.
 *
 * ⚠️ A CLASSE PRECISA DA BARRA INVERTIDA. Aqui já esteve escrito `[\/]`, sem
 * ela, depois de a expressão passar por um `node -e` no shell. No Windows os
 * caminhos vêm com `\`, então nenhuma entrada casava, o grafo do servidor saía
 * VAZIO e o guard imprimia verde para qualquer coisa.
 *
 * Fica declarada AQUI, acima do auto-teste, porque o auto-teste a exercita — e
 * `const` em TDZ lança se a ordem inverter.
 */
const ENTRADA = /(?:^|[\\/])(page|layout|route|template|default|error|not-found|loading)\.tsx?$/;

// ── Auto-teste ────────────────────────────────────────────────────────────
// Guard sem auto-teste já imprimiu verde neste repositório com a regra quebrada
// por uma barra invertida comida pelo heredoc. Cada regra leva um caso que ela
// PEGA e um que ela IGNORA, e os dois rodam antes da varredura de verdade.
const CASOS = [
  {
    nome: "pega constante exportada de modulo cliente",
    fonte: `"use client";\nexport const TOTAL_DE_MARCAS = 7;\n`,
    esperaValor: ["TOTAL_DE_MARCAS"],
    cliente: true,
  },
  {
    nome: "pega funcao utilitaria",
    fonte: `"use client";\nexport function marcasDaProva(x) { return x; }\n`,
    esperaValor: ["marcasDaProva"],
    cliente: true,
  },
  {
    nome: "ignora componente PascalCase",
    fonte: `"use client";\nexport function QuestaoAnotada() { return null; }\n`,
    esperaValor: [],
    cliente: true,
  },
  {
    // ⚠️ REGRESSÃO MEDIDA: a regra antiga (`/^[A-Z][a-z]/`) reprovava este
    // nome, porque a segunda letra é maiúscula. É o artigo "O" do português,
    // e ele derrubou o `npm run lint` inteiro por um componente legítimo.
    nome: "ignora componente que comeca com DUAS maiusculas",
    fonte: `"use client";\nexport function OQueOAppFaz() { return null; }\n`,
    esperaValor: [],
    cliente: true,
  },
  {
    // A contraparte: uma letra maiuscula sozinha continua sendo constante.
    nome: "constante de uma letra ainda e valor",
    fonte: `"use client";\nexport const X = 1;\n`,
    esperaValor: ["X"],
    cliente: true,
  },
  {
    nome: "ignora tipo exportado",
    fonte: `"use client";\nexport type DadosDaProva = { a: number };\n`,
    esperaValor: [],
    cliente: true,
  },
  {
    nome: "diretiva depois de comentario ainda conta",
    fonte: `// nota\n"use client";\nexport const X = 1;\n`,
    esperaValor: ["X"],
    cliente: true,
  },
  {
    nome: "arquivo sem diretiva nao e cliente",
    fonte: `export const X = 1;\n`,
    esperaValor: ["X"],
    cliente: false,
  },
];

const IMPORTS = [
  { fonte: `import { A, B } from "./m";`, espera: ["A", "B"] },
  { fonte: `import type { A } from "./m";`, espera: [] },
  { fonte: `import { type A, B } from "./m";`, espera: ["B"] },
  { fonte: `import { A as C } from "./m";`, espera: ["A"] },
];

/**
 * ⚠️ AS DUAS EXPRESSÕES ABAIXO JÁ QUEBRARAM, e o guard seguiu verde.
 *
 * `ENTRADA` perdeu a barra invertida da classe (`[\/]` em vez de `[\\/]`) ao
 * passar por um `node -e` no shell. No Windows os caminhos vêm com `\`, então
 * NENHUMA entrada casou, o grafo do servidor saiu vazio, e a varredura passou a
 * aprovar qualquer coisa. Na mesma passagem, `\s` virou `s` no seguidor de
 * imports.
 *
 * Os dois casos são regressões silenciosas do tipo "o guard não olha mais nada,
 * e diz que está tudo bem". Estes testes não deixam.
 */
const REGEX = [
  { nome: "ENTRADA casa caminho com barra do Windows", vale: ENTRADA.test("src\\app\\page.tsx") },
  { nome: "ENTRADA casa caminho com barra unix", vale: ENTRADA.test("src/app/layout.tsx") },
  { nome: "ENTRADA ignora componente comum", vale: !ENTRADA.test("src/components/Pagina.tsx") },
  {
    nome: "ENTRADA nao casa page.ts falso (o ponto e literal)",
    vale: !ENTRADA.test("src/app/pageXtsx"),
  },
  {
    nome: "seguidor de import acha o especificador",
    vale: [...'import { A } from "./m";'.matchAll(/from\s*["']([^"']+)["']/g)].length === 1,
  },
];

function autoTeste() {
  const falhas = [];
  for (const caso of REGEX) {
    if (!caso.vale) falhas.push(`${caso.nome}: FALHOU`);
  }
  for (const caso of CASOS) {
    const cliente = ehModuloCliente(caso.fonte);
    if (cliente !== caso.cliente) falhas.push(`${caso.nome}: diretiva lida errado`);
    const valores = [...valoresExportados(caso.fonte)].sort();
    const espera = [...caso.esperaValor].sort();
    if (valores.join(",") !== espera.join(","))
      falhas.push(`${caso.nome}: esperava [${espera}], veio [${valores}]`);
  }
  for (const caso of IMPORTS) {
    const veio = (importacoesDeValor(caso.fonte).get("./m") ?? []).sort();
    if (veio.join(",") !== [...caso.espera].sort().join(","))
      falhas.push(`import "${caso.fonte}": esperava [${caso.espera}], veio [${veio}]`);
  }
  return falhas;
}

const falhasDoAutoTeste = autoTeste();
if (falhasDoAutoTeste.length > 0) {
  console.error("Fronteira cliente/servidor: o AUTO-TESTE do guard falhou.");
  for (const falha of falhasDoAutoTeste) console.error(`  - ${falha}`);
  console.error("  A regra está quebrada — a varredura abaixo não vale nada.");
  process.exit(1);
}

// ── Varredura ─────────────────────────────────────────────────────────────
//
// ⚠️ "Arquivo sem `use client`" NÃO é "arquivo do servidor". A primeira versão
// deste guard partiu dessa premissa e acusou 9 casos — entre eles
// `useCadernoPageState.ts`, um hook que só existe dentro do grafo do cliente e
// para quem a diretiva é herdada de quem o importa. Um módulo sem diretiva vive
// no ambiente de quem o carrega.
//
// O risco real é outro e mais estreito: módulo ALCANÇÁVEL a partir de uma
// entrada de servidor (page/layout/route sem `use client`), seguindo imports e
// PARANDO em toda fronteira `use client`. Só quem está nesse grafo pode receber
// o proxy.
const arquivos = listarArquivos(SRC);
const fontes = new Map(arquivos.map((caminho) => [caminho, readFileSync(caminho, "utf8")]));

/** Todo módulo que o servidor de fato carrega. */
function grafoDoServidor() {
  const dentro = new Set();
  const fila = arquivos.filter(
    (caminho) => ENTRADA.test(caminho) && !ehModuloCliente(fontes.get(caminho)),
  );
  for (const inicio of fila) dentro.add(inicio);
  while (fila.length > 0) {
    const atual = fila.pop();
    const fonte = fontes.get(atual);
    if (!fonte) continue;
    // Aqui seguimos TODO import, não só os de valor: um módulo do servidor
    // alcançado por `import type` sozinho não executa, mas seguir a mais custa
    // um falso positivo improvável e perder um caminho custa o bug de volta.
    for (const especificador of fonte.matchAll(/from\s*["']([^"']+)["']/g)) {
      const alvo = resolverModulo(especificador[1], atual);
      if (!alvo || dentro.has(alvo)) continue;
      const fonteAlvo = fontes.get(alvo);
      if (!fonteAlvo) continue;
      // A fronteira do cliente é onde a travessia PARA: o que está dentro dela
      // roda no navegador, e lá o valor é o valor.
      if (ehModuloCliente(fonteAlvo)) continue;
      dentro.add(alvo);
      fila.push(alvo);
    }
  }
  return dentro;
}

const noServidor = grafoDoServidor();

const problemas = [];
for (const caminho of noServidor) {
  const fonte = fontes.get(caminho);
  for (const [especificador, nomes] of importacoesDeValor(fonte)) {
    const alvo = resolverModulo(especificador, caminho);
    if (!alvo) continue;
    const fonteAlvo = fontes.get(alvo);
    if (!fonteAlvo || !ehModuloCliente(fonteAlvo)) continue;
    const proibidos = valoresExportados(fonteAlvo);
    for (const nome of nomes) {
      if (!proibidos.has(nome)) continue;
      problemas.push(
        `${relative(RAIZ, caminho)} importa o valor ${nome} de ` +
          `${relative(RAIZ, alvo)}, que é "use client".`,
      );
    }
  }
}

if (problemas.length > 0) {
  console.error("Fronteira cliente/servidor: valor cruzando onde só tipo pode.");
  for (const problema of problemas) console.error(`  - ${problema}`);
  console.error(
    "\n  Em runtime o servidor recebe um proxy, não o valor. Chamado, ele lança;" +
      "\n  interpolado em texto, ele se SERIALIZA — e vai para a tela como código." +
      "\n  Conserto: mover o valor para um módulo sem \"use client\".",
  );
  process.exit(1);
}

console.log(
  `Fronteira cliente/servidor: ${arquivos.length} arquivos, nenhum valor cruzando indevidamente.`,
);
