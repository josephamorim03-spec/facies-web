#!/usr/bin/env node
/**
 * PUBLICAR O FRONT — o caminho seguro, com o commit carimbado e conferido.
 *
 * ## Por que este script existe
 *
 * O front do Fácies **não tem auto-deploy**. Medido em 2026-09-09: o PR #60
 * entrou em `main` às 02:14Z e treze horas depois não existia deployment
 * nenhum — em estado nenhum. Publicar é um `vercel --prod` à mão, e o caminho
 * tem três armadilhas que já custaram uma sessão inteira:
 *
 * 1. **O diretório decide o projeto.** `krosmed/web/.vercel` aponta para
 *    `facies` (facies.app, o vivo) e a RAIZ do repo aponta para `krosmed`, um
 *    projeto antigo que ainda responde. Publicar da raiz manda o trabalho para
 *    um domínio que ninguém usa, com sucesso aparente.
 * 2. **Duas árvores, um projeto.** `facies-web/.vercel` tem o MESMO
 *    `projectId`. Quem corre `vercel --prod` por último ganha, e não há aviso.
 * 3. **`/api/version` não sabia responder.** Sem metadados de Git (que só a
 *    integração injeta), ele devolvia `{"commit_sha":"unknown"}` — o endpoint
 *    que existe para dizer o que está no ar não dizia. Verificar um deploy
 *    virava adivinhação por hash de HTML, que é ruído: o `buildId` do Next
 *    muda entre builds do MESMO commit.
 *
 * Este script fecha os três: confere o projeto antes de subir, carimba o commit
 * no build, e só declara sucesso depois de `facies.app/api/version` devolver
 * esse commit.
 *
 * ## Uso
 *
 *     npm run publicar              # exige árvore limpa e HEAD == facies/main
 *     npm run publicar -- --sujo    # permite árvore suja (diz o que vai junto)
 *     npm run publicar -- --fora-da-main
 *
 * ⚠️ Os dois escapes existem para emergência e IMPRIMEM o que estão a permitir.
 * Publicar de branch não fundida põe em produção código que ninguém revisou —
 * o que já aconteceu aqui, e sem o carimbo era indetectável.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const WEB = dirname(dirname(fileURLToPath(import.meta.url)));

/** O projeto que responde por `facies.app`. Conferido antes de publicar. */
const PROJETO_VIVO = "prj_NaMDSbMaYwh0BPOVvHbk5uzVKWCf";
const DOMINIO = "https://facies.app";
const BRANCH_DE_PRODUCAO = "facies/main";

const args = new Set(process.argv.slice(2));
const permitirSujo = args.has("--sujo");
const permitirForaDaMain = args.has("--fora-da-main");

function git(...argv) {
  return execFileSync("git", argv, { cwd: WEB, encoding: "utf8" }).trim();
}

function morrer(mensagem, comoResolver) {
  console.error(`\n✖ ${mensagem}`);
  if (comoResolver) console.error(`  ${comoResolver}`);
  process.exit(1);
}

// ── 1. O diretório certo ────────────────────────────────────────────────────
const linkPath = join(WEB, ".vercel", "project.json");
if (!existsSync(linkPath)) {
  morrer(
    "não há `.vercel/project.json` neste diretório.",
    "Copie o de `kmed/krosmed/web/.vercel` — publicar sem ele pergunta o projeto e é fácil escolher o errado.",
  );
}
const link = JSON.parse(readFileSync(linkPath, "utf8"));
if (link.projectId !== PROJETO_VIVO) {
  morrer(
    `este diretório aponta para o projeto ${link.projectName} (${link.projectId}), não para o vivo.`,
    `facies.app é ${PROJETO_VIVO}. Publicar daqui não chega ao aluno.`,
  );
}

// ── 2. O commit certo ───────────────────────────────────────────────────────
const sha = git("rev-parse", "HEAD");
const sujo = git("status", "--porcelain");
if (sujo && !permitirSujo) {
  morrer(
    "a árvore tem alterações por commitar — o que subir não corresponde a nenhum commit.",
    "Commite, ou repita com `--sujo` (ele lista o que vai junto).",
  );
}
if (sujo) {
  console.warn("⚠ árvore suja, a publicar mesmo assim. Vai junto:");
  for (const linha of sujo.split("\n")) console.warn(`    ${linha}`);
}

let naMain = false;
try {
  naMain = git("rev-parse", BRANCH_DE_PRODUCAO) === sha;
} catch {
  morrer(
    `não consegui resolver ${BRANCH_DE_PRODUCAO}.`,
    "Corra `git fetch facies` primeiro — comparar com uma referência velha é pior que não comparar.",
  );
}
if (!naMain && !permitirForaDaMain) {
  morrer(
    `HEAD (${sha.slice(0, 8)}) não é ${BRANCH_DE_PRODUCAO}.`,
    "Publicar daqui põe no ar código que não está em main. Repita com `--fora-da-main` se for mesmo isso.",
  );
}
if (!naMain) console.warn(`⚠ a publicar ${sha.slice(0, 8)}, que NÃO é ${BRANCH_DE_PRODUCAO}.`);

// ── 3. Publicar, com o carimbo ──────────────────────────────────────────────
const agora = new Date().toISOString();
console.log(`\n▲ a publicar ${sha.slice(0, 8)} em ${DOMINIO}`);
execFileSync(
  "vercel",
  [
    "--prod",
    "--yes",
    // ⚠️ `NEXT_PUBLIC_*` é o único prefixo que sobrevive ao build: o Next inlina
    // o literal. Sem o prefixo, a variável existe durante o build e some no
    // runtime — ver o comentário em `src/app/api/version/route.ts`.
    "--build-env",
    `NEXT_PUBLIC_GIT_COMMIT_SHA=${sha}`,
    "--build-env",
    `NEXT_PUBLIC_BUILD_TIME_UTC=${agora}`,
  ],
  { cwd: WEB, stdio: "inherit", shell: process.platform === "win32" },
);

// ── 4. Conferir o RESULTADO, não que o comando correu ───────────────────────
//
// O alias leva alguns segundos a mover. Perguntar uma vez e desistir daria um
// falso negativo; perguntar para sempre esconderia um deploy que não pegou.
const LIMITE_MS = 120_000;
const inicio = Date.now();
process.stdout.write("\n… a confirmar o que o domínio serve");
for (;;) {
  let servido = null;
  try {
    const resposta = await fetch(`${DOMINIO}/api/version`, { cache: "no-store" });
    servido = await resposta.json();
  } catch {
    // Rede a oscilar durante a troca de alias: tenta de novo até ao limite.
  }
  if (servido?.commit_sha === sha) {
    console.log(`\n✔ ${DOMINIO} serve ${sha.slice(0, 8)} (build ${servido.build_time_utc}).`);
    process.exit(0);
  }
  if (Date.now() - inicio > LIMITE_MS) {
    console.error(
      `\n✖ passaram ${Math.round(LIMITE_MS / 1000)}s e ${DOMINIO} ainda serve ` +
        `\`${servido?.commit_sha ?? "sem resposta"}\`, não ${sha.slice(0, 8)}.`,
    );
    console.error(
      "  O deploy pode ter ficado sem alias, ou outra árvore publicou por cima — " +
        "as duas coisas já aconteceram. Confira com `vercel ls facies`.",
    );
    process.exit(1);
  }
  process.stdout.write(".");
  await new Promise((r) => setTimeout(r, 4000));
}
