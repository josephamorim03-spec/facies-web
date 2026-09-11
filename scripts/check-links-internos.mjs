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

// ── `navConfig` deixa de violar a regra escrita nele mesmo ───────────────────
//
// ⚠️ O arquivo fixa, em letra: *"`matches` só aceita caminho que o navegador
// consegue RENDERIZAR. Um 308 de `next.config.js` resolve antes do roteamento
// de arquivos, então o aluno nunca para nessas URLs e a entrada nunca casaria
// com nada."* E então listava seis caminhos assim — `/today`, `/semana`,
// `/agenda-operacional`, `/desempenho`, `/rotina-e-metas` e `/trilha`.
//
// Regra escrita e não medida é regra que se perde na primeira pressa. Esta é a
// medida.
/**
 * Os caminhos que o `next.config.js` intercepta ANTES do roteamento de arquivos.
 *
 * ⚠️ A primeira versão desta regra media só se existe `page.tsx` no git — e por
 * isso dava verde em `/cards`, que TEM diretório e mesmo assim é 307 para
 * `/hoje` sempre que `NEXT_PUBLIC_FLASHCARDS !== "1"`, que é o padrão de
 * produção. O guard passava exatamente na violação que foi escrito para pegar.
 *
 * Lê o literal `source: "/x"`; um `source` montado por variável escapa, e isso
 * fica dito em vez de fingido.
 */
function caminhosInterceptados() {
  const configPath = path.join(cwd, "next.config.js");
  if (!fs.existsSync(configPath)) return new Set();
  const fonte = fs.readFileSync(configPath, "utf8");
  const achados = new Set();
  for (const m of fonte.matchAll(/source:\s*"([^"]+)"/g)) achados.add(m[1]);
  return achados;
}

/**
 * Caminhos cujo redirect e CONDICIONAL, e por isso nao provam nada.
 *
 * ⚠️ O modelo simples desta regra -- "esta em `source:` do next.config, logo
 * nunca renderiza" -- e FALSO para `/cards`: o redirect so existe enquanto
 * `NEXT_PUBLIC_FLASHCARDS !== "1"`, e com a chave ligada a rota volta a
 * renderizar com o mesmo `page.tsx` que ja esta no git. A entrada em
 * `navConfig` esta certa nos dois mundos.
 *
 * A lista e' curta e nominal de proposito: se crescer, o modelo e que precisa
 * de mudar -- ler a condicao do `next.config` em vez de a assumir ausente.
 */
const REDIRECT_CONDICIONAL = new Set(["/cards", "/cards/registros"]);

const interceptados = caminhosInterceptados();
const navConfigPath = path.join(cwd, "src", "lib", "navConfig.ts");
if (fs.existsSync(navConfigPath)) {
  const fonte = fs.readFileSync(navConfigPath, "utf8");
  const declarados = new Set();
  // `matches: ["/a", "/b"]` e as listas de `LEGACY_PATHS`.
  for (const bloco of fonte.matchAll(/matches:\s*\[([^\]]*)\]/g)) {
    for (const m of bloco[1].matchAll(/"(\/[^"]*)"/g)) declarados.add(m[1]);
  }
  const legacy = fonte.match(/const LEGACY_PATHS[^=]*=\s*\{([\s\S]*?)\n\};/);
  if (legacy) {
    for (const m of legacy[1].matchAll(/"(\/[^"]*)"/g)) declarados.add(m[1]);
  }
  for (const alvo of declarados) {
    conferidos += 1;
    const casaExato = rotas.some(({ re }) => re.test(alvo));
    // ⚠️ `matchLength` casa por PREFIXO, e há uma entrada que só funciona
    // assim: `/estatisticas` é 308 no exato, mas é o prefixo que faz
    // `/estatisticas/graficos` acender a Evolução. Exigir casamento exato
    // reprovaria a única entrada deliberadamente "morta na aparência, viva na
    // função" — e a correção seria apagar o que faz a aba funcionar.
    const ehPrefixoDeAlgoVivo = rotas.some(({ rota }) => rota.startsWith(alvo + "/"));
    if (!casaExato && !ehPrefixoDeAlgoVivo) {
      falhas.push(`src/lib/navConfig.ts -> ${alvo} (nao renderiza: 308 ou rota inexistente)`);
      continue;
    }
    // ⚠️ A ORDEM IMPORTA: o prefixo vem primeiro. `/estatisticas` e' 308 no exato E
    // esta na lista de redirects -- mas e' o prefixo dele que faz
    // `/estatisticas/graficos` acender a aba. Reprova-lo aqui obrigaria a apagar
    // o que faz a navegacao funcionar.
    if (!ehPrefixoDeAlgoVivo && !REDIRECT_CONDICIONAL.has(alvo) && interceptados.has(alvo)) {
      falhas.push(
        `src/lib/navConfig.ts -> ${alvo} (o next.config intercepta: o roteamento de arquivos nunca chega la)`,
      );
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
