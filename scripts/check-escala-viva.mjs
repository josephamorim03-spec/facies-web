#!/usr/bin/env node
/**
 * Classe de tamanho num heading do app não pinta nada — e por isso não pode ficar.
 *
 * ## A medida
 *
 * `globals.css:577` declara `.tela-app h1:not(.paper-eyebrow)`, especificidade
 * **(0,2,1)**. Uma classe utilitária como `text-xl` é **(0,1,0)**. O Tailwind
 * 3.4 emite `@layer` como diretiva de build — ordem de origem, não cascade layer
 * nativa — portanto **a especificidade decide e a regra CSS ganha sempre**.
 *
 * Resultado medido em 2026-09-06: **77 classes** em 46 arquivos que o
 * desenvolvedor escreveu e o navegador ignorou. `TodayEmptyState` pedia
 * `text-2xl` (24px) e renderizava 22px; `TodayBackupActions` pedia `text-sm`
 * num `<h3>` e renderizava 16px em peso 500.
 *
 * É o mesmo defeito que a PR #37 caçou no laço — o rótulo escrito antes do
 * mecanismo — só que aqui em CSS, onde nem o typecheck nem o lint olhavam.
 *
 * ## Duas exceções REAIS, e as duas medidas
 *
 * 1. **`Portal`.** Conteúdo em `components/Portal.tsx` vai para `document.body`,
 *    ou seja **sai de dentro** de `.tela-app`. Ali o heading cai no preflight
 *    (1em = 16px) e a classe é a única escala que ele tem.
 * 2. **A casca de landing.** As rotas que montam `_landing/Pagina` ancoram em
 *    `.paper-page`, cujas regras vivem em `globals.css:605` — depois das de
 *    `.tela-app`, com a mesma especificidade. Outra âncora, outra conversa:
 *    ficam fora até alguém as medir.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { semComentarios } from "./lib/fonte-visivel.mjs";

/**
 * ⚠️ `src/components` ENTRA, e ficar de fora era um buraco.
 *
 * `.tela-app` é posto no `<main>` pelo `AppShell`, e alcança TUDO que a tela
 * monta — inclusive os primitivos. A primeira versão deste guard varria só
 * `src/app` e imprimia "nenhuma classe morta" enquanto `ui/Sheet.tsx` mantinha
 * um `text-xl` num `<h2>` que o CSS anulava, numa folha que quatro telas de
 * aluno abrem.
 */
const RAIZES = [join(process.cwd(), "src", "app"), join(process.cwd(), "src", "components")];

/** Utilitários de TAMANHO. `text-ink` e `text-muted` são cor e não entram. */
const CLASSE_DE_TAMANHO =
  /\b(?:[a-z0-9]+:)?text-(?:xs|sm|base|lg|[2-9]?xl|micro|nota|dado|dado-menor)\b/;

/** Rotas com casca de landing — ver a exceção 2 no topo. */
const LANDING = [
  "src/app/page.tsx",
  "src/app/facies",
  "src/app/prova",
  "src/app/revisao-final",
  // ⚠️ Estes componentes são montados pelas rotas acima, dentro de
  // `_landing/Pagina` — ancoram em `.paper-page`, não em `.tela-app`. Um deles
  // (`MapaDaProva`) é usado também pelo `/mapa`, e por isso a pasta inteira
  // fica fora: decidir por arquivo exigiria resolver quem monta quem, e
  // adivinhar aqui seria pior que não medir.
  "src/components/facies",
];

/** Arquivos cujo conteúdo é portalizado, e por isso precisam da classe. */
const PORTALIZADOS = ["src/app/banco/sessao/[sessionId]/_components/SaidaDaSessao.tsx"];

function varrer(dir, achados = []) {
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const completo = join(dir, entrada.name);
    if (entrada.isDirectory()) {
      if (entrada.name !== "admin" && entrada.name !== "api") varrer(completo, achados);
    } else if (entrada.name.endsWith(".tsx")) {
      achados.push(completo);
    }
  }
  return achados;
}

/**
 * A tag de abertura, do `<hN` até o `>` que a fecha.
 *
 * Um `[^>]*` não serve: `className={cx(a, b > c)}` e as setas `=>` têm `>`
 * dentro das chaves, e a tag seria cortada no meio.
 */
function tagDeAbertura(fonte, inicio) {
  let profundidade = 0;
  for (let i = inicio; i < fonte.length; i += 1) {
    const c = fonte[i];
    if (c === "{") profundidade += 1;
    else if (c === "}") profundidade -= 1;
    else if (c === ">" && profundidade === 0) return fonte.slice(inicio, i + 1);
  }
  return fonte.slice(inicio);
}

const mortas = [];
let conferidos = 0;

for (const arq of RAIZES.flatMap((raiz) => varrer(raiz))) {
  const rel = relative(process.cwd(), arq).split(sep).join("/");
  if (LANDING.some((l) => rel === l || rel.startsWith(`${l}/`))) continue;
  if (PORTALIZADOS.includes(rel)) continue;

  // Comentário que REGISTA a correção não pode reprovar quem a registou.
  const fonte = semComentarios(readFileSync(arq, "utf8"));
  for (const nivel of ["h1", "h2", "h3"]) {
    let i = fonte.indexOf(`<${nivel}`);
    while (i !== -1) {
      const proximo = fonte[i + nivel.length + 1];
      if (proximo === " " || proximo === "\n" || proximo === ">") {
        conferidos += 1;
        const tag = tagDeAbertura(fonte, i);
        // `.paper-eyebrow` está fora do seletor por `:not()` — ali a classe vale.
        if (!tag.includes("paper-eyebrow") && CLASSE_DE_TAMANHO.test(tag)) {
          mortas.push({
            caminho: rel,
            linha: fonte.slice(0, i).split("\n").length,
            nivel,
            classe: tag.match(CLASSE_DE_TAMANHO)[0],
          });
        }
      }
      i = fonte.indexOf(`<${nivel}`, i + 1);
    }
  }
}

if (mortas.length > 0) {
  console.error("Classe de tamanho que o CSS anula:");
  for (const m of mortas) {
    console.error(`- ${m.caminho}:${m.linha} <${m.nivel}> tem \`${m.classe}\``);
  }
  console.error(
    "\n`.tela-app hN` é (0,2,1) e vence qualquer `text-*` (0,1,0): a classe não " +
      "pinta nada.\nTire-a — o tamanho já vem do sistema. Se este heading precisa " +
      "de outro tamanho,\no lugar de mudar é `globals.css`, não a marcação.",
  );
  process.exit(1);
}

console.log(`Escala viva: ${conferidos} heading(s) do app, nenhuma classe de tamanho morta.`);
