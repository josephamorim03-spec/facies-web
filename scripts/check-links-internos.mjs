/**
 * Todo `href` interno do funil público leva a uma rota que EXISTE?
 *
 * ## O QUE ISTO PEGA
 *
 * `app/page.tsx` linkava `/prova/<slug>/revisao-final` — e a rota
 * `app/prova/[slug]/revisao-final/` nunca tinha sido commitada. O link foi para
 * produção, a página não, e a landing passou a oferecer um 404 ao visitante.
 *
 * Nada acusava: o TypeScript não sabe o que é rota, o `next build` não reclama
 * de link para rota inexistente, e o lint olha código e não topologia. O defeito
 * só apareceu numa varredura que buscou cada link da página publicada.
 *
 * A assimetria é o ponto: o link mora num arquivo RASTREADO e a rota mora num
 * diretório NÃO RASTREADO. Quem roda `git status` vê a rota como novidade sua e
 * segue, sem saber que já existe alguém apontando para ela lá fora.
 *
 * ## COMO RESOLVE
 *
 * Lê os `href` literais dos componentes públicos, transforma cada rota do App
 * Router num padrão (`[slug]` e `[...x]` viram curinga) e exige casamento. Um
 * `href` com interpolação (`/prova/${slug}/x`) vira curinga na parte
 * interpolada — o que se verifica é a FORMA da rota, que é o que quebra.
 *
 * ⚠️ A rota tem de estar no GIT, não só no disco: é `git ls-files` que decide,
 * porque é isso que vai para produção. Foi exatamente essa a diferença.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const APP = path.join(cwd, "src", "app");

const RAIZES = [
  path.join(cwd, "src", "app", "page.tsx"),
  path.join(cwd, "src", "app", "_components"),
  path.join(cwd, "src", "components", "facies"),
];

/** Rotas que o git conhece — as que realmente sobem. */
function rotasPublicadas() {
  const saida = execFileSync("git", ["ls-files", "src/app"], { cwd, encoding: "utf8" });
  const rotas = new Set();
  for (const arquivo of saida.split("\n")) {
    const m = arquivo.match(/^src\/app\/(.*)\/?page\.tsx$/);
    if (!m) continue;
    let rota = "/" + m[1].replace(/\/?$/, "").replace(/\/$/, "");
    // Grupos `(publico)` não entram na URL.
    rota = rota.replace(/\/\([^/]+\)/g, "");
    rotas.add(rota === "" ? "/" : rota);
  }
  // `route.ts` também serve URL (og-image, sitemap, redirecionamentos).
  for (const arquivo of saida.split("\n")) {
    const m = arquivo.match(/^src\/app\/(.*)\/route\.tsx?$/);
    if (m) rotas.add("/" + m[1].replace(/\/\([^/]+\)/g, ""));
  }
  return [...rotas];
}

function paraRegex(rota) {
  const corpo = rota
    .split("/")
    .map((seg) => {
      if (/^\[\.\.\..+\]$/.test(seg)) return ".+";
      if (/^\[.+\]$/.test(seg)) return "[^/]+";
      return seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");
  return new RegExp(`^${corpo}/?$`);
}

function arquivos(alvo) {
  if (!fs.existsSync(alvo)) return [];
  const st = fs.statSync(alvo);
  if (st.isFile()) return [alvo];
  return fs.readdirSync(alvo, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(alvo, e.name);
    if (e.isDirectory()) return arquivos(p);
    return /\.tsx?$/.test(e.name) ? [p] : [];
  });
}

// `href="/x"` e href={`/prova/${slug}/y`} — as duas formas que a base usa.
const HREF_LITERAL = /href=["'](\/[^"'#?]*)/g;
const HREF_TEMPLATE = /href=\{`(\/[^`]*)`/g;

const rotas = rotasPublicadas().map((r) => ({ rota: r, re: paraRegex(r) }));
const falhas = [];
let conferidos = 0;

for (const arquivo of RAIZES.flatMap(arquivos)) {
  const texto = fs.readFileSync(arquivo, "utf8");
  const linhas = texto.split("\n");
  for (const [regex, interpolado] of [[HREF_LITERAL, false], [HREF_TEMPLATE, true]]) {
    regex.lastIndex = 0;
    let m;
    while ((m = regex.exec(texto)) !== null) {
      // Interpolação vira curinga: o que se confere é a forma.
      const alvo = interpolado ? m[1].replace(/\$\{[^}]*\}/g, "coringa") : m[1];
      if (alvo.startsWith("//") || /^https?:/.test(alvo)) continue;
      conferidos++;
      if (!rotas.some(({ re }) => re.test(alvo))) {
        const linha = linhas.findIndex((l) => l.includes(m[1].slice(0, 30))) + 1;
        falhas.push(`${path.relative(cwd, arquivo)}:${linha || "?"} -> ${alvo}`);
      }
    }
  }
}

// AUTOTESTE: sem ele a regra pode nascer inerte e o gate imprime verde.
const pegaria = !rotas.some(({ re }) => re.test("/rota/que/nao/existe"));
const ignoraria = rotas.some(({ re }) => re.test("/"));
if (!pegaria || !ignoraria) {
  console.error("check-links-internos: a REGRA nao se comporta como escrita.");
  console.error(`  pega rota inexistente: ${pegaria}   aceita a raiz: ${ignoraria}`);
  process.exit(1);
}

if (falhas.length) {
  console.error("Link interno para rota que NAO esta no git:");
  for (const f of falhas) console.error("  - " + f);
  console.error("\nA rota existe no seu disco mas nao foi commitada? Entao o link vai");
  console.error("para producao sozinho e vira 404. Commite a rota ou tire o link.");
  process.exit(1);
}

console.log(`Links internos: ${conferidos} conferidos contra ${rotas.length} rotas publicadas, nenhum quebrado.`);
