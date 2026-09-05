#!/usr/bin/env node
/**
 * As palavras que a marca proibiu — e que nenhum guard vigiava.
 *
 * `uploads/facies-copy.md:140` e a lista mais explicita e mais antiga do
 * handoff:
 *
 * > **Nunca:** aprovacao garantida · sua vaga · o segredo da banca · gabarite ·
 * > destrave · simplesmente · basta · apenas · facil · revolucionario ·
 * > disruptivo · potencialize · a IA que · ultima chance · vagas limitadas ·
 * > so hoje.
 *
 * E `:142` acrescenta o "cuidado redobrado": personalizado, inteligente,
 * metodo, aprovados.
 *
 * Auditado em 2026-09-04: **nenhuma delas estava em guard nenhum.** A estetica
 * do repositorio esta mecanizada com forca — `check-retro-geometry` reprova
 * pilula clicavel, sombra e `animate-spin` — mas a VOZ, que e o que distingue o
 * produto de um cursinho, nao tinha uma linha de verificacao.
 *
 * ## Duas classes, e a diferenca importa
 *
 * **PROIBIDA** e promessa: "aprovacao garantida", "sua vaga", "vagas
 * limitadas". Reprova sempre, porque nenhuma delas tem uso legitimo num produto
 * que "vende medida, nao esperanca" (`facies-copy.md:5`).
 *
 * **VIGIADA** e a palavra comum que o handoff pede para evitar: "apenas",
 * "basta", "facil", "simplesmente", "metodo", "personalizado". Elas tem uso
 * legitimo em prosa, e proibi-las de vez faria este guard nascer vermelho — e
 * guard permanentemente vermelho ninguem le, que e a licao ja escrita em
 * `spec-do-app.mjs`. Entao elas andam por CATRACA: a contagem so pode descer, e
 * baixar a linha de base e decisao explicita (`--gravar-baseline`).
 *
 * ## Comentario nao conta
 *
 * O texto e extraido antes de casar: comentario de bloco e de linha saem, e so
 * literal de string e texto JSX entram. Sem isso o proprio paragrafo acima
 * reprovaria o repositorio — e foi exatamente o que aconteceu duas vezes com o
 * `check-portuguese-ui-copy`, que nao pula comentario JSX.
 */

import fs from "node:fs";
import path from "node:path";

const RAIZES = ["src/app", "src/components", "src/lib"];
const EXTENSOES = new Set([".ts", ".tsx"]);
const IGNORAR = new Set(["node_modules", ".next", "generated"]);
const BASELINE = "scripts/baseline-palavras-vigiadas.json";

/** Promessa. Sem uso legitimo — reprova sempre. */
const PROIBIDAS = [
  [/aprova(?:ç|c)(?:ã|a)o garantida/giu, "o produto vende medida, nao esperanca"],
  [/\bsua vaga\b/giu, "nao prometemos vaga a ninguem"],
  [/o segredo da banca/giu, "o que existe e medida publicada, nao segredo"],
  [/\bgabarite\b/giu, "promessa de desempenho"],
  [/\bdestrave\b/giu, "vocabulario de infoproduto"],
  [/(?:ú|u)ltima chance/giu, "urgencia fabricada"],
  [/vagas limitadas/giu, "urgencia fabricada"],
  [/\bs(?:ó|o) hoje\b/giu, "urgencia fabricada"],
  [/revolucion(?:á|a)ri[oa]/giu, "superlativo sem medida"],
  [/\bdisruptiv[oa]\b/giu, "superlativo sem medida"],
  [/\bpotencialize\b/giu, "verbo de folheto"],
  [/\ba IA que\b/giu, "a IA nao e o argumento; o resultado dela e"],
];

/** Palavra comum que o handoff pede para evitar. Anda por catraca. */
const VIGIADAS = [
  [/\bsimplesmente\b/giu, "simplesmente"],
  [/\bbasta\b/giu, "basta"],
  [/\bapenas\b/giu, "apenas"],
  [/\bf(?:á|a)cil\b/giu, "facil"],
  [/\bpersonalizad[oa]s?\b/giu, "personalizado"],
  [/\bm(?:é|e)todo\b/giu, "metodo"],
];

/**
 * O texto que o aluno pode ler, isolado do codigo.
 *
 * ⚠️ Limite conhecido: uma string que CONTENHA `/*` ou ` // ` e cortada cedo.
 * Nenhuma existe hoje no repositorio, e a alternativa — um parser de TypeScript
 * so para isto — custa mais do que o caso que ela evita.
 */
function textoVisivel(fonte) {
  const semBloco = fonte.replace(/\/\*[\s\S]*?\*\//g, " ");
  const semLinha = semBloco.replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  const achados = [];
  const literal = /(["'`])((?:\\.|(?!\1).)*?)\1/g;
  let casa;
  while ((casa = literal.exec(semLinha)) !== null) achados.push(casa[2]);
  const jsx = />([^<>{}][^<]*?)</g;
  while ((casa = jsx.exec(semLinha)) !== null) achados.push(casa[1]);
  return achados.join("\n");
}

function arquivosSob(raiz) {
  if (!fs.existsSync(raiz)) return [];
  return fs.readdirSync(raiz, { withFileTypes: true }).flatMap((entrada) => {
    const alvo = path.join(raiz, entrada.name);
    if (entrada.isDirectory()) return IGNORAR.has(entrada.name) ? [] : arquivosSob(alvo);
    return EXTENSOES.has(path.extname(entrada.name)) ? [alvo] : [];
  });
}

const arquivos = RAIZES.flatMap(arquivosSob);
const reprovas = [];
const vigiadas = new Map();

for (const arquivo of arquivos) {
  const visivel = textoVisivel(fs.readFileSync(arquivo, "utf8"));
  if (!visivel) continue;
  for (const [padrao, motivo] of PROIBIDAS) {
    padrao.lastIndex = 0;
    const casa = padrao.exec(visivel);
    if (casa) reprovas.push(`${arquivo}: "${casa[0]}" — ${motivo}`);
  }
  for (const [padrao, nome] of VIGIADAS) {
    padrao.lastIndex = 0;
    const quantas = (visivel.match(padrao) ?? []).length;
    if (quantas > 0) vigiadas.set(nome, (vigiadas.get(nome) ?? 0) + quantas);
  }
}

const total = [...vigiadas.values()].reduce((soma, n) => soma + n, 0);

if (process.argv.includes("--gravar-baseline")) {
  fs.writeFileSync(BASELINE, `${JSON.stringify({ total, por_palavra: Object.fromEntries(vigiadas) }, null, 2)}\n`);
  console.log(`Baseline gravada: ${total} ocorrencia(s) vigiada(s).`);
  process.exit(0);
}

if (reprovas.length) {
  console.error(`Palavras que a marca proibiu (facies-copy.md:140):\n${reprovas.join("\n")}`);
  process.exit(1);
}

const anterior = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, "utf8")).total : null;
if (anterior !== null && total > anterior) {
  console.error(
    `Palavras vigiadas subiram: ${anterior} -> ${total}.\n`
      + `${[...vigiadas].map(([nome, n]) => `  ${nome}: ${n}`).join("\n")}\n`
      + "A catraca so anda para baixo. Baixar a linha de base e decisao explicita (--gravar-baseline).",
  );
  process.exit(1);
}

console.log(
  `Voz da marca: 0 proibidas, ${total} vigiada(s)${anterior !== null ? ` (baseline ${anterior})` : ""}.`,
);
