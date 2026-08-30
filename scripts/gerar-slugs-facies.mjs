/**
 * Gera (e só ACRESCENTA a) `src/data/facies/slugs.json` — a URL de cada banca.
 *
 * ## Por que a URL precisa ser fixada num arquivo, e não derivada a cada build
 *
 * O nome curto de uma banca (`nomeCurto` em `src/lib/facies.ts`) desempata
 * consultando o dataset INTEIRO: quando duas bancas produzem o mesmo curto, a UF
 * entra junto; quando ainda empatam, volta o nome limpo. Isso significa que
 * **entrar uma banca nova pode virar o nome curto de outra** — e a URL dela
 * mudaria sozinha, na regeração seguinte, sem ninguém escrever uma linha.
 *
 * O canal deste produto é o link colado em grupo de WhatsApp e a página
 * indexada. URL que muda em silêncio é link morto em silêncio.
 *
 * Então a regra é: derivar UMA vez, congelar, e nunca reescrever.
 *
 * ## A chave é `institution_key`, e não o slug longo
 *
 * `institution_key` vem do vocabulário de instituições do banco de questões — é
 * a mesma chave que o objetivo do aluno guarda e que o onboarding valida. O slug
 * longo é derivado dela e truncado em 80 caracteres pelo gerador do kbank, ou
 * seja: é um artefato de apresentação, e artefato de apresentação não serve de
 * chave primária.
 *
 * ## A duplicação da regra é DELIBERADA
 *
 * A derivação abaixo repete a lógica de `nomeCurto`. Isso é de propósito e não é
 * dívida: depois da primeira geração o arquivo é a autoridade, e o rótulo
 * exibido pode evoluir (curadoria editorial, nome que a banca passou a usar) sem
 * arrastar a URL junto. Divergir é o comportamento desejado, não o defeito.
 *
 * O que NÃO pode divergir são os invariantes — toda banca tem slug, slug é
 * único, e nenhum colide com prova. Quem garante isso é `check-slugs-facies.mjs`,
 * no `npm run lint`.
 *
 * ## Uso
 *
 *   node scripts/gerar-slugs-facies.mjs            # acrescenta o que falta
 *   node scripts/gerar-slugs-facies.mjs --dry-run  # só mostra o que faria
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const AQUI = dirname(fileURLToPath(import.meta.url));
const DADOS = join(AQUI, "..", "src", "data", "facies");
const ARQUIVO_SLUGS = join(DADOS, "slugs.json");

const DRY_RUN = process.argv.includes("--dry-run");

/**
 * Nomes que a estrutura do rótulo do edital não resolve.
 * Espelha `NOME_CURTO_FIXO` de `src/lib/facies.ts`.
 */
const FIXOS = [
  { prefixo: "exame-nacional-de-residencia-medica-ebserh", nome: "ENARE" },
  { prefixo: "revalida-nacional-instituto-nacional", nome: "Revalida" },
];

function limparNome(nome) {
  return nome
    .replace(/^\s*[A-Za-zÀ-ÿ]{2,10}\s*-\s*/, "")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .trim();
}

function extrairNomeCurto(nome) {
  const limpo = limparNome(nome);
  const partes = limpo
    .split(/\s+-\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (partes.length >= 2) {
    const cauda = partes.slice(1).join("-");
    if (cauda.length <= 24) return cauda.replace(/\s+/g, "-");
  }
  return partes[0] || limpo;
}

function slugificar(texto) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function derivar(bancas) {
  const porCurto = new Map();
  const porCurtoUf = new Map();
  for (const banca of bancas) {
    const curto = extrairNomeCurto(banca.nome);
    porCurto.set(curto, (porCurto.get(curto) ?? 0) + 1);
    const comUf = banca.uf ? `${curto}-${banca.uf}` : curto;
    porCurtoUf.set(comUf, (porCurtoUf.get(comUf) ?? 0) + 1);
  }

  return (banca) => {
    const fixo = FIXOS.find((n) => banca.slug.startsWith(n.prefixo));
    if (fixo) return slugificar(fixo.nome);
    const curto = extrairNomeCurto(banca.nome);
    if (porCurto.get(curto) === 1) return slugificar(curto);
    const comUf = banca.uf ? `${curto}-${banca.uf}` : curto;
    if (porCurtoUf.get(comUf) === 1) return slugificar(comUf);
    return slugificar(limparNome(banca.nome));
  };
}

const facies = JSON.parse(readFileSync(join(DADOS, "facies.json"), "utf8"));
const provas = JSON.parse(readFileSync(join(DADOS, "provas.json"), "utf8"));

let existentes = {};
try {
  existentes = JSON.parse(readFileSync(ARQUIVO_SLUGS, "utf8"));
} catch {
  // Primeira geração: o arquivo ainda não existe.
}

// Reservado: nenhum slug de banca pode ocupar o endereço de uma prova.
const reservados = new Set(provas.provas.map((prova) => prova.slug));
const usados = new Set(Object.values(existentes));

const curto = derivar(facies.bancas);
const novos = [];

for (const banca of facies.bancas) {
  if (existentes[banca.institution_key]) continue;

  let candidato = curto(banca);
  // Desempate de último recurso. Não deveria acontecer — a derivação já resolve
  // as 138 sem colisão — mas o arquivo é congelado e uma banca nova pode chegar
  // com o nome de uma que já tem URL. Sufixo numérico é feio e é honesto; o
  // conserto certo é uma linha curada aqui dentro.
  if (reservados.has(candidato) || usados.has(candidato)) {
    let n = 2;
    while (reservados.has(`${candidato}-${n}`) || usados.has(`${candidato}-${n}`)) n += 1;
    candidato = `${candidato}-${n}`;
  }

  existentes[banca.institution_key] = candidato;
  usados.add(candidato);
  novos.push({ chave: banca.institution_key, slug: candidato, nome: banca.nome });
}

// Ordenado por slug para o diff do git ser legível: sem isso a ordem seria a do
// dataset, que muda a cada regeração e faria o arquivo inteiro aparecer como
// alterado quando só uma linha entrou.
const ordenado = Object.fromEntries(
  Object.entries(existentes).sort((a, b) => a[1].localeCompare(b[1], "pt-BR")),
);

if (novos.length === 0) {
  console.log(
    `Nada a fazer: as ${facies.bancas.length} bancas ja tem slug fixado em slugs.json.`,
  );
} else {
  console.log(`${novos.length} banca(s) sem slug fixado:`);
  for (const n of novos) console.log(`  + ${n.slug.padEnd(28)} ${n.nome}`);
  if (DRY_RUN) {
    console.log("\n--dry-run: nada foi escrito.");
  } else {
    writeFileSync(ARQUIVO_SLUGS, `${JSON.stringify(ordenado, null, 2)}\n`, "utf8");
    console.log(`\nEscrito: ${ARQUIVO_SLUGS}`);
  }
}
