/**
 * A superfície do catálogo da central de mídia é um contrato de operação.
 *
 * ## O que este guard cobre que `check-slugs-facies.mjs` não cobre
 *
 * `check-slugs` garante que toda banca tem URL e que nenhuma colide. O que ele
 * não vê é a PEÇA: a central de mídia enumera cada prova e banca × peça ×
 * formato, e renderiza um cartão com três números. Dois modos de falha novos,
 * ambos silenciosos no build:
 *
 *   1. **Catálogo esvaziado.** Se uma regeração de `provas.json`/`facies.json`
 *      zerar os assuntos, `/admin/midia` continua no ar — vazio, sem erro.
 *   2. **Peça sem dado.** Uma banca sem formato, sem alternativa e sem assunto
 *      exibível não tem de onde o cartão tirar número. O filtro estatístico fino
 *      (uma linha presente, mas descartada por `formatosDistintivos`) fica de
 *      fora de propósito — quem vê o render final é a prova de píxel.
 *
 * Nenhum dos dois quebra o build. O primeiro mata a operação de mídia em
 * silêncio; o segundo publica uma imagem vazia.
 *
 * ## Autoteste antes de olhar o dado real
 *
 * Mesma disciplina do `check-slugs-facies.mjs`: cada regra carrega um `pega`
 * (dado que DEVE reprovar) e um `ignora` (dado que DEVE aceitar), rodados antes
 * do arquivo de verdade. Guard inerte imprime verde igual a guard satisfeito.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const AQUI = dirname(fileURLToPath(import.meta.url));
const DADOS = join(AQUI, "..", "src", "data", "facies");

/** Piso de assuntos. Hoje: 1 prova + 138 bancas com slug. Abaixo disto o
 *  catálogo encolheu a ponto de ser irreconhecível — sinal de regen quebrada. */
const PISO_DE_ASSUNTOS = 100;

/**
 * A banca tem FONTE DE DADO para o cartão? (condição necessária, não a render).
 *
 * Este guard detecta o caso GROSSO — nenhum formato, nenhuma alternativa e
 * nenhum assunto exibível: aí o cartão fica vazio com certeza. O caso FINO —
 * uma linha de formato presente, mas que o filtro estatístico de
 * `formatosDistintivos`/`decidirExibicao` descarta — fica de fora de propósito:
 * replicar Wilson + h de Cohen aqui duplicaria `lib/distintividade.ts` e
 * divergiria na primeira calibração. Quem vê o render final é a prova de píxel.
 */
function temFonteDeDado(banca) {
  const alternativas = (banca.formato?.alternativas ?? []).length > 0;
  const distribuicao = (banca.formato?.distribuicao ?? []).length > 0;
  const maisCai = (banca.mais_cai?.linhas ?? []).some((l) => l.exibivel);
  return alternativas || distribuicao || maisCai;
}

const REGRAS = [
  {
    nome: "o catalogo nao esta vazio",
    checar: ({ slugs, bancas, provas }) => {
      const n = provas.length + bancas.filter((b) => slugs[b.institution_key]).length;
      return n >= PISO_DE_ASSUNTOS
        ? []
        : [`catalogo com ${n} assuntos — esperava >= ${PISO_DE_ASSUNTOS} (regen esvaziou o dataset?)`];
    },
    pega: { slugs: {}, bancas: [], provas: [] },
    ignora: {
      slugs: Object.fromEntries(Array.from({ length: PISO_DE_ASSUNTOS }, (_, i) => [`K${i}`, `b${i}`])),
      bancas: Array.from({ length: PISO_DE_ASSUNTOS }, (_, i) => ({ institution_key: `K${i}`, nome: `B${i}` })),
      provas: [],
    },
  },
  {
    nome: "todo assunto tem nome para o titulo da peca",
    checar: ({ slugs, bancas, provas }) => {
      const problemas = [];
      for (const p of provas) {
        if (!p.sigla || !String(p.sigla).trim()) problemas.push(`prova sem sigla: ${p.slug}`);
      }
      for (const b of bancas) {
        if (slugs[b.institution_key] && !b.nome) problemas.push(`banca sem nome: ${b.institution_key}`);
      }
      return problemas;
    },
    pega: { slugs: {}, bancas: [], provas: [{ slug: "x", sigla: "" }] },
    ignora: { slugs: {}, bancas: [], provas: [{ slug: "x", sigla: "ENAMED" }] },
  },
  {
    nome: "toda banca tem fonte de dado para o cartao",
    checar: ({ slugs, bancas }) =>
      bancas
        .filter((b) => slugs[b.institution_key])
        .filter((b) => !temFonteDeDado(b))
        .map((b) => `banca sem fonte de dado para a peca: ${b.institution_key} (${b.nome})`),
    pega: {
      slugs: { X: "x" },
      bancas: [
        {
          institution_key: "X",
          nome: "X",
          formato: { alternativas: [], distribuicao: [] },
          mais_cai: { linhas: [{ exibivel: false }] },
        },
      ],
      provas: [],
    },
    ignora: {
      slugs: { X: "x" },
      bancas: [
        {
          institution_key: "X",
          nome: "X",
          formato: { alternativas: [], distribuicao: [] },
          mais_cai: { linhas: [{ exibivel: true }] },
        },
      ],
      provas: [],
    },
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
const slugs = JSON.parse(readFileSync(join(DADOS, "slugs.json"), "utf8"));
const bancas = JSON.parse(readFileSync(join(DADOS, "facies.json"), "utf8")).bancas;
const provas = JSON.parse(readFileSync(join(DADOS, "provas.json"), "utf8")).provas;

const problemas = REGRAS.flatMap((regra) => regra.checar({ slugs, bancas, provas }));

if (problemas.length > 0) {
  console.error("Superficie do catalogo de midia quebrada:\n");
  for (const p of problemas) console.error(`- ${p}`);
  process.exit(1);
}

const assuntos = provas.length + bancas.filter((b) => slugs[b.institution_key]).length;
console.log(
  `Midia: ${assuntos} assuntos geraveis, ${REGRAS.length} regras conferidas, nenhuma peca sem dado.`,
);
