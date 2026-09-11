#!/usr/bin/env node
/**
 * Quantas decisões visuais cada tela de aluno pede.
 *
 * ## Porque isto existe
 *
 * "Cozy" e "minimalista" são adjetivos, e adjetivo não regride nem melhora — ele
 * só se discute. O primeiro princípio do Calm Tech ("require the smallest
 * possible amount of attention") tem um proxy que se conta: **quantas decisões
 * visuais distintas a tela carrega**. Tamanhos de fonte diferentes, superfícies
 * diferentes, degraus de espaçamento diferentes, preenchimentos primários
 * competindo.
 *
 * Não é uma nota de qualidade. É a medida que motivou a rodada de 2026-09-06 e
 * que permite dizer se ela funcionou — e o mesmo número que denuncia a tela que
 * voltou a crescer.
 *
 * ## O que ele NÃO mede
 *
 * Nada sobre beleza, hierarquia ou se a tela resolve o problema do aluno. Um
 * ecrã com um só tamanho de fonte pode ser péssimo. Isto conta a DISPERSÃO do
 * vocabulário, que é o que faz o olho trabalhar sem receber informação.
 *
 * ⚠️ **Dois limites que o número não confessa sozinho.**
 *
 * 1. Ele lê CÓDIGO, não ecrã. Dois preenchimentos primários no mesmo arquivo
 *    podem ser dois ESTADOS que nunca coexistem — o Hoje tem a ação principal
 *    e o "continuar", e quando um aparece o outro cede; o Mapa tem "Escolher a
 *    prova" (sem prova declarada) e "Praticar" (com ela). A contagem >1 é um
 *    convite a olhar, não um veredito.
 * 2. Ele só vê classe ESCRITA na tela. O botão do Banco é
 *    `<Button variant="primary">`, e as classes moram no primitivo — por isso
 *    o Banco marca zero sem estar errado.
 *
 * Uso: `node scripts/medir-carga-visual.mjs`
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";

const RAIZ = process.cwd();

/** As cinco telas, com tudo o que elas montam de próprio. */
const TELAS = [
  ["Hoje", ["src/app/hoje"]],
  ["Banco", ["src/app/banco/page.tsx", "src/app/banco/_components"]],
  ["Mapa", ["src/app/mapa"]],
  ["Evolução", ["src/app/evolucao"]],
  ["Você", ["src/app/voce"]],
];

const TAMANHO = /\b(?:[a-z0-9]+:)?text-(xs|sm|base|lg|[2-9]?xl|micro|nota|dado|dado-menor)\b/g;
const SUPERFICIE = /\b(?:bg-(paper|surface|surfaceMuted)|paper-surface|km-card|surface-hero|paper-dashed)\b/g;
const ESPACO = /\b(?:[a-z0-9]+:)?(?:space-y|gap|p|px|py|pt|pb|mt|mb)-([0-9.]+)\b/g;
const PREENCHIMENTO = /bg-primary\b/;
const TINTA_INVERTIDA = /text-primaryInk\b/;

function arquivosDe(alvo) {
  const completo = join(RAIZ, alvo);
  try {
    if (statSync(completo).isFile()) return [completo];
  } catch {
    return [];
  }
  const achados = [];
  const pilha = [completo];
  while (pilha.length) {
    const dir = pilha.pop();
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) pilha.push(p);
      else if ([".tsx", ".ts"].includes(extname(e.name))) achados.push(p);
    }
  }
  return achados;
}

function medir(alvos) {
  const tamanhos = new Set();
  const superficies = new Set();
  const espacos = new Set();
  const preenchimentos = [];
  let linhas = 0;

  for (const alvo of alvos) {
    for (const arq of arquivosDe(alvo)) {
      const fonte = readFileSync(arq, "utf8");
      linhas += fonte.split("\n").length;
      for (const m of fonte.matchAll(TAMANHO)) tamanhos.add(m[1]);
      for (const m of fonte.matchAll(SUPERFICIE)) superficies.add(m[0]);
      for (const m of fonte.matchAll(ESPACO)) espacos.add(m[1]);
      // Preenchimento primário: as duas classes na MESMA linha, que é o que
      // define o botão cheio. `bg-primary` sozinho pinta barra e mosaico.
      fonte.split("\n").forEach((linha, i) => {
        if (PREENCHIMENTO.test(linha) && TINTA_INVERTIDA.test(linha)) {
          preenchimentos.push(`${relative(RAIZ, arq).split(sep).join("/")}:${i + 1}`);
        }
      });
    }
  }
  return { tamanhos, superficies, espacos, preenchimentos, linhas };
}

const colunas = ["tela", "fontes", "superfícies", "espaços", "teal cheio", "linhas"];
const linhasDaTabela = [];

for (const [nome, alvos] of TELAS) {
  const m = medir(alvos);
  linhasDaTabela.push([
    nome,
    String(m.tamanhos.size),
    String(m.superficies.size),
    String(m.espacos.size),
    String(m.preenchimentos.length),
    String(m.linhas),
  ]);
  if (m.preenchimentos.length > 1) {
    console.error(
      `⚠️ ${nome}: ${m.preenchimentos.length} preenchimentos primários no código.` +
        " Confira se são estados que nunca coexistem — se coexistirem, um deles cede.",
    );
    for (const p of m.preenchimentos) console.error(`   ${p}`);
  }
}

const larguras = colunas.map((c, i) =>
  Math.max(c.length, ...linhasDaTabela.map((l) => l[i].length)),
);
const linha = (celulas) => celulas.map((c, i) => c.padEnd(larguras[i])).join("  ");

console.log("\nCarga visual por tela — quantas decisões distintas cada uma pede\n");
console.log(linha(colunas));
console.log(larguras.map((w) => "─".repeat(w)).join("  "));
for (const l of linhasDaTabela) console.log(linha(l));
console.log(
  "\nfontes/superfícies/espaços = valores DISTINTOS no código da tela." +
    "\nteal cheio = `bg-primary` + `text-primaryInk` na mesma linha (a ação).\n",
);
