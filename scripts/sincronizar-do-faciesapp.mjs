#!/usr/bin/env node
/**
 * Traz o frontend do monorepo privado (`faciesapp/krosmed/web`) para cá.
 *
 * ## Por que isto é um script, e não um procedimento
 *
 * A primeira sincronização foi feita à mão, em 11/09/2026, e falhou **duas
 * vezes** na CI — pelo mesmo desenho de erro, em dois níveis:
 *
 * 1. Classifiquei como "andaime deste repo" apenas o que existia **só** aqui.
 *    Mas andaime que existe nos **dois** lados, porque foi adaptado à
 *    separação, é invisível a um diff de "só existe em X". Perderam-se o
 *    script `check:tamanho` do `package.json` e três testes de contrato.
 * 2. Um **quarto** teste de contrato chegou novo do monorepo, escrito lá com
 *    caminho cru para `app/**`, e rebentou aqui com `ENOENT`.
 *
 * A lista abaixo é a resposta: enquanto ela viver na cabeça de quem sincroniza,
 * a próxima vez esquece outro item. Aqui ela é revisável, e o diff de a mudar
 * aparece na PR.
 *
 * ## Quando isto deixa de ser preciso
 *
 * Quando a Vercel apontar para este repositório e `krosmed/web` sair do
 * faciesapp. Até lá, o frontend vive em dois sítios e alguém tem de os manter
 * iguais.
 *
 * ## Uso
 *
 *     node scripts/sincronizar-do-faciesapp.mjs ../faciesapp/krosmed/web
 *
 * Depois: `npm ci && npm run lint && npm run typecheck && npm run test:unit &&
 * npm run check:tamanho && npm run build` — e a CI daqui, que é gratuita.
 */

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/**
 * O que é DESTE repositório e nunca vem do monorepo.
 *
 * ⚠️ Cada linha aqui é uma coisa que a sincronização já partiu ou partiria.
 */
const ANDAIME = [
  // A CI própria — é ela que torna este repo público útil: Actions grátis.
  ".github",
  // Explica por que o repo é separado; o monorepo não tem equivalente.
  "README.md",
  // A catraca de tamanho em JS. A do monorepo é Python e mede `web/src` com
  // outro prefixo de caminho — as duas tabelas divergem enquanto coexistirem.
  "scripts/check-tamanho-de-modulo.mjs",
  // ⚠️ ELE PRÓPRIO. `scripts/` é apagado e reposto pelo do monorepo, que não
  // tem este arquivo — sem esta linha, a primeira execução apagaria o script
  // que a está a correr, e a segunda não existiria.
  "scripts/sincronizar-do-faciesapp.mjs",
];

/**
 * Chaves de `package.json` que são deste repo, e não do monorepo.
 *
 * ⚠️ `package.json` é o caso que ensinou a lição: ele existe nos DOIS lados,
 * então não aparece como "só existe aqui" — mas metade dele é local.
 */
const SCRIPTS_DAQUI = {
  "check:tamanho": "node scripts/check-tamanho-de-modulo.mjs",
};

/**
 * Scripts do monorepo que NÃO podem vir: eles não conseguem funcionar aqui.
 *
 * `publicar` exige `HEAD == facies/main` (remote que não existe neste repo) e
 * o `.vercel` do checkout do faciesapp. Script que não funciona é armadilha.
 */
const SCRIPTS_DE_LA = ["publicar"];

const NAO_COPIAR = new Set([
  "node_modules",
  ".next",
  ".git",
  ".vercel",
  "test-results",
  "playwright-report",
  "tsconfig.tsbuildinfo",
]);

const fonte = resolve(process.argv[2] ?? "");
const alvo = resolve(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");

if (!fonte || !existsSync(join(fonte, "package.json"))) {
  console.error("uso: node scripts/sincronizar-do-faciesapp.mjs <caminho de faciesapp/krosmed/web>");
  process.exit(1);
}
if (!existsSync(join(alvo, ".git"))) {
  console.error(`o alvo não é um clone git: ${alvo}`);
  process.exit(1);
}

// 1. Guarda o andaime. Falta aqui é erro duro: significa que o repo mudou de
//    forma e esta lista ficou para trás — exatamente o que não pode passar
//    despercebido.
const guardado = join(alvo, ".andaime-temporario");
rmSync(guardado, { recursive: true, force: true });
for (const rel of ANDAIME) {
  const de = join(alvo, rel);
  if (!existsSync(de)) {
    console.error(`andaime declarado mas ausente: ${rel} — a lista está desatualizada`);
    process.exit(1);
  }
  mkdirSync(dirname(join(guardado, rel)), { recursive: true });
  cpSync(de, join(guardado, rel), { recursive: true });
}
const pacoteAntigo = JSON.parse(readFileSync(join(alvo, "package.json"), "utf8"));

// 2. Esvazia, menos `.git` e o que acabámos de guardar.
for (const nome of readdirSync(alvo)) {
  if (nome === ".git" || nome === ".andaime-temporario") continue;
  rmSync(join(alvo, nome), { recursive: true, force: true });
}

// 3. Copia a fonte.
for (const nome of readdirSync(fonte)) {
  if (NAO_COPIAR.has(nome)) continue;
  cpSync(join(fonte, nome), join(alvo, nome), {
    recursive: true,
    filter: (caminho) => !NAO_COPIAR.has(caminho.split(/[\\/]/).pop()),
  });
}

// 4. Repõe o andaime por cima.
for (const rel of ANDAIME) {
  rmSync(join(alvo, rel), { recursive: true, force: true });
  mkdirSync(dirname(join(alvo, rel)), { recursive: true });
  cpSync(join(guardado, rel), join(alvo, rel), { recursive: true });
}
rmSync(guardado, { recursive: true, force: true });

// 5. `package.json`: o do monorepo, com as chaves daqui repostas.
//
//    O `lint` fica o DE LÁ de propósito: ele é superset — traz guards de
//    conteúdo que este repo não tinha e não perde nenhum.
const pacote = JSON.parse(readFileSync(join(alvo, "package.json"), "utf8"));
for (const [chave, valor] of Object.entries(SCRIPTS_DAQUI)) {
  pacote.scripts[chave] = pacoteAntigo.scripts?.[chave] ?? valor;
}
for (const chave of SCRIPTS_DE_LA) delete pacote.scripts[chave];
writeFileSync(join(alvo, "package.json"), `${JSON.stringify(pacote, null, 2)}\n`, "utf8");
rmSync(join(alvo, "scripts", "publicar.mjs"), { force: true });

// 6. Os TETOS da catraca: espelhados da tabela do monorepo.
//
// ⚠️ Existem DUAS catracas a medir os mesmos arquivos: `_LINE_CEILINGS`, em
// `krosmed/scripts/check_architecture_invariants.py`, e `TETOS` aqui. Elas
// divergiram na primeira sincronização — a de lá andou, esta ficou —, e a
// catraca reprova nos DOIS sentidos: um arquivo que ENCOLHE sem o teto descer
// também é vermelho. Foi o que aconteceu, duas vezes no mesmo dia.
//
// A do monorepo é a autoridade: é ela que corre em toda PR do faciesapp. Aqui
// só se copiam os números; os comentários de cada linha ficam, porque são a
// justificativa e não o valor.
const catracaPy = join(fonte, "..", "scripts", "check_architecture_invariants.py");
if (existsSync(catracaPy)) {
  const py = readFileSync(catracaPy, "utf8");
  const daAutoridade = new Map();
  for (const [, caminho, valor] of py.matchAll(/"web\/(src\/[^"]+)":\s*(\d+),/g)) {
    daAutoridade.set(caminho, Number(valor));
  }
  const arquivoJs = join(alvo, "scripts", "check-tamanho-de-modulo.mjs");
  let js = readFileSync(arquivoJs, "utf8");
  const mudados = [];
  js = js.replace(/^(\s*)"(src\/[^"]+)":\s*(\d+),$/gm, (linha, espaco, caminho, atual) => {
    const novo = daAutoridade.get(caminho);
    if (novo === undefined || novo === Number(atual)) return linha;
    mudados.push(`${caminho}: ${atual} -> ${novo}`);
    return `${espaco}"${caminho}": ${novo},`;
  });
  if (mudados.length) {
    writeFileSync(arquivoJs, js, "utf8");
    console.log(`  tetos espelhados:   ${mudados.length}`);
    for (const m of mudados) console.log(`    ${m}`);
  }
  const soLa = [...daAutoridade.keys()].filter((c) => !js.includes(`"${c}":`));
  if (soLa.length) {
    console.log(`  ⚠️ na catraca de lá e não aqui (adicione à mão): ${soLa.join(", ")}`);
  }
}

console.log(`sincronizado de ${fonte}`);
console.log(`  andaime preservado: ${ANDAIME.join(", ")}`);
console.log(`  scripts repostos:   ${Object.keys(SCRIPTS_DAQUI).join(", ")}`);
console.log(`  scripts removidos:  ${SCRIPTS_DE_LA.join(", ")}`);
console.log("\n⚠️ Agora rode os portões: lint, typecheck, test:unit, check:tamanho, build.");
