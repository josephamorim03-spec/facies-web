/**
 * A URL pública de cada banca é um contrato. Este guard protege os invariantes.
 *
 * ## O que pode dar errado, e por que nada avisaria
 *
 * `src/data/facies/slugs.json` mapeia `institution_key` → slug curto, e é ele
 * que decide `/prova/usp-sp`. O arquivo é CONGELADO de propósito (ver
 * `gerar-slugs-facies.mjs`): a derivação do nome curto desempata olhando o
 * dataset inteiro, então uma banca nova pode virar a URL de outra.
 *
 * Os quatro modos de falha, todos silenciosos:
 *
 *   1. Banca no dataset SEM entrada aqui  → `generateStaticParams` não emite a
 *      página, e a banca some do site sem erro nenhum.
 *   2. Duas entradas com o MESMO slug     → uma sobrescreve a outra na rota.
 *   3. Slug colidindo com uma PROVA       → `/prova/enamed` deixaria de ser o
 *      ENAMED, ou a banca ficaria inalcançável.
 *   4. Entrada órfã (chave que sumiu)     → o redirect de `next.config.js` passa
 *      a apontar para uma página que não existe mais.
 *
 * Nenhum deles quebra o build. Todos quebram links já colados em grupo.
 *
 * ## Autoteste antes de olhar o dado real
 *
 * Guard que não checa nada imprime a mesma linha verde de um guard que checou
 * tudo. Cada regra abaixo carrega um `pega` (dado que ela DEVE reprovar) e um
 * `ignora` (dado que ela DEVE aceitar), e os dois rodam antes do arquivo de
 * verdade. É a mesma disciplina do `check-retro-geometry.mjs`, e existe pelo
 * mesmo motivo: já houve regra inerte nesta base.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const AQUI = dirname(fileURLToPath(import.meta.url));
const DADOS = join(AQUI, "..", "src", "data", "facies");

/**
 * Cada regra recebe `{ slugs, bancas, provas }` e devolve a lista de problemas.
 * Lista vazia = passou.
 */
const REGRAS = [
  {
    nome: "toda banca do dataset tem slug fixado",
    checar: ({ slugs, bancas }) =>
      bancas
        .filter((b) => !slugs[b.institution_key])
        .map((b) => `sem slug: ${b.institution_key} (${b.nome})`),
    pega: {
      slugs: {},
      bancas: [{ institution_key: "X", nome: "X", slug: "x" }],
      provas: [],
    },
    ignora: {
      slugs: { X: "x" },
      bancas: [{ institution_key: "X", nome: "X", slug: "x" }],
      provas: [],
    },
  },
  {
    nome: "nenhum slug repetido entre bancas",
    checar: ({ slugs }) => {
      const vistos = new Map();
      const problemas = [];
      for (const [chave, slug] of Object.entries(slugs)) {
        if (vistos.has(slug)) {
          problemas.push(`slug repetido "${slug}": ${vistos.get(slug)} e ${chave}`);
        }
        vistos.set(slug, chave);
      }
      return problemas;
    },
    pega: { slugs: { A: "usp-sp", B: "usp-sp" }, bancas: [], provas: [] },
    ignora: { slugs: { A: "usp-sp", B: "usp-rp" }, bancas: [], provas: [] },
  },
  {
    nome: "nenhum slug de banca colide com prova",
    checar: ({ slugs, provas }) => {
      const deProva = new Set(provas.map((p) => p.slug));
      return Object.entries(slugs)
        .filter(([, slug]) => deProva.has(slug))
        .map(([chave, slug]) => `"${slug}" ja e' slug de prova (banca ${chave})`);
    },
    pega: { slugs: { A: "enamed" }, bancas: [], provas: [{ slug: "enamed" }] },
    ignora: { slugs: { A: "usp-sp" }, bancas: [], provas: [{ slug: "enamed" }] },
  },
  {
    nome: "nenhuma entrada orfa",
    checar: ({ slugs, bancas }) => {
      const vivas = new Set(bancas.map((b) => b.institution_key));
      return Object.keys(slugs)
        .filter((chave) => !vivas.has(chave))
        .map((chave) => `entrada orfa: ${chave} nao existe mais no facies.json`);
    },
    pega: {
      slugs: { SUMIU: "x" },
      bancas: [{ institution_key: "VIVA", nome: "V", slug: "v" }],
      provas: [],
    },
    ignora: {
      slugs: { VIVA: "v" },
      bancas: [{ institution_key: "VIVA", nome: "V", slug: "v" }],
      provas: [],
    },
  },
  {
    nome: "slug e' minusculo, sem acento e sem barra",
    checar: ({ slugs }) =>
      Object.entries(slugs)
        .filter(([, slug]) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
        .map(([chave, slug]) => `slug invalido "${slug}" (${chave})`),
    pega: { slugs: { A: "USP/SP" }, bancas: [], provas: [] },
    ignora: { slugs: { A: "usp-sp" }, bancas: [], provas: [] },
  },
];

// ── Autoteste ────────────────────────────────────────────────────────────────
for (const regra of REGRAS) {
  if (regra.checar(regra.pega).length === 0) {
    console.error(`Regra inerte: nao reprova o proprio exemplo — ${regra.nome}`);
    process.exit(1);
  }
  if (regra.checar(regra.ignora).length > 0) {
    console.error(`Regra larga demais: reprova o contraexemplo — ${regra.nome}`);
    process.exit(1);
  }
}

// ── O dado real ──────────────────────────────────────────────────────────────
let slugs;
try {
  slugs = JSON.parse(readFileSync(join(DADOS, "slugs.json"), "utf8"));
} catch {
  console.error("src/data/facies/slugs.json nao existe ou nao e' JSON valido.");
  console.error("Rode: node scripts/gerar-slugs-facies.mjs");
  process.exit(1);
}

const bancas = JSON.parse(readFileSync(join(DADOS, "facies.json"), "utf8")).bancas;
const provas = JSON.parse(readFileSync(join(DADOS, "provas.json"), "utf8")).provas;

const problemas = REGRAS.flatMap((regra) => regra.checar({ slugs, bancas, provas }));

if (problemas.length > 0) {
  console.error("URL publica quebrada em slugs.json:\n");
  for (const p of problemas) console.error(`- ${p}`);
  console.error("\nPara acrescentar banca nova: node scripts/gerar-slugs-facies.mjs");
  console.error("NUNCA edite um slug ja existente: a URL dele ja circula.");
  process.exit(1);
}

console.log(
  `Slugs: ${Object.keys(slugs).length} bancas + ${provas.length} prova(s), ` +
    `${REGRAS.length} regras conferidas, nenhuma colisao.`,
);
