/**
 * `token` NUNCA guarda um efeito — ele é string vazia por desenho.
 *
 * `getAuthToken()` devolve `""` de propósito: a sessão vive num cookie httpOnly
 * que o BFF (`/api/[...path]`) lê e converte em `Authorization`. O token não
 * chega ao JavaScript; a função só existe para casar a assinatura de
 * `authHeader()`.
 *
 * Logo, `if (!token) return` — ou `&& token` numa guarda — é um **return
 * incondicional**. A falha não lança: a tela fica idêntica, o clique não faz
 * nada, o console fica limpo.
 *
 * **Já aconteceu duas vezes.** Em 2026-09-05 matou quatro telas (preferências
 * não gravava nada, nota pedia login a quem estava logado, histórico sempre
 * vazio, Semana Final empurrava para `/login`). Em 2026-09-10 matou a busca das
 * edições da prova: medido no log da API, a tela pediu `availability`, `topics`
 * e `facets` para ENARE+2026 e **nenhuma vez** `exam-editions` — e o seletor de
 * ano seguiu mostrando a contagem do treino.
 *
 * A guarda certa é `tokenResolved` ("a auth já se resolveu"), que é booleano de
 * verdade.
 */

import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const RAIZ = new URL("../../src/app/banco/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

function arquivos(dir) {
  const saida = [];
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) saida.push(...arquivos(caminho));
    else if (/\.(ts|tsx)$/.test(nome)) saida.push(caminho);
  }
  return saida;
}

/** Só o código: os comentários desta base citam o defeito para explicá-lo. */
function codigo(fonte) {
  return fonte
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((linha) => linha.replace(/\/\/.*$/, ""))
    .join("\n");
}

const FONTES = arquivos(RAIZ).map((caminho) => [caminho, codigo(readFileSync(caminho, "utf8"))]);

test("o guard varre arquivos de verdade", () => {
  // Guard que itera precisa provar que iterou: com a raiz errada ele passaria
  // verde sem ler nada.
  assert.ok(FONTES.length > 10, `varreu ${FONTES.length} arquivos — a raiz está errada`);
  assert.ok(
    FONTES.some(([c]) => c.endsWith("page.tsx")),
    "não achou a página do banco",
  );
});

test("nenhum efeito do banco é guardado por `token`", () => {
  const culpados = [];
  for (const [caminho, fonte] of FONTES) {
    // `&& token)` ou `&& token &&` numa condição, e `if (!token)`.
    if (/&&\s*token\s*[)&]/.test(fonte) || /if\s*\(\s*!\s*token\s*\)/.test(fonte)) {
      culpados.push(caminho.split(/[\\/]/).slice(-2).join("/"));
    }
  }
  assert.deepEqual(
    culpados,
    [],
    "`token` é sempre \"\": estas guardas nunca deixam o efeito rodar — use `tokenResolved`",
  );
});
