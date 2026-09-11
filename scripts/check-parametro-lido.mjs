#!/usr/bin/env node
/**
 * Parâmetro de query que ninguém lê é um rótulo sem mecanismo.
 *
 * ## O que isto custou, medido em 2026-09-06
 *
 * `PostExamReview` montava `/banco?answer_status=wrong&knowledge_node_ids=…` —
 * o botão "Revisar os erros desta sessão", que é o momento de maior intenção do
 * produto inteiro. O Banco não lia nenhum dos dois: `answerStatus` nascia
 * `"unanswered"` e o efeito de reset por URL não o tocava. **O aluno pedia o
 * que errou e recebia o que nunca tinha visto** — o oposto exato do rótulo.
 *
 * `knowledge_node_ids` falhava por um `s`: o parser lia `knowledge_node_id`.
 * E `?limit=10`, que `TodayEmptyState` mandava, também não era lido — funcionava
 * por coincidência, porque o padrão já era 10.
 *
 * Nada disso lança. A tela abre, o botão navega, e o resultado está errado em
 * silêncio. Nenhum teste pegava, porque cada metade estava certa sozinha.
 *
 * ## O que este guard mede
 *
 * Junta duas listas do `src/`:
 *
 * 1. os parâmetros ENVIADOS — todo caminho interno com `?a=1&b=2` num literal;
 * 2. os parâmetros LIDOS — `.get("nome")` no cliente, e `params?.nome` /
 *    `searchParams.nome` no servidor, que são os dois idiomas deste app.
 *    `/cronograma` usa o segundo: lê `anchor` e `day` pela prop `searchParams`
 *    da página de servidor, sem tocar em `URLSearchParams`.
 *
 * Enviado sem estar em lido reprova.
 *
 * ⚠️ **A medida é GLOBAL, não por rota.** Um parâmetro lido pela rota A e
 * enviado para a rota B passa. É um piso deliberado: casar remetente e
 * destinatário exige resolver o roteamento de arquivos e os `_lib` que cada
 * rota importa, e a versão global já teria pego os três defeitos acima. Quem
 * apertar isto depois, aperte para cima.
 */

import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";

import { semComentarios } from "./lib/fonte-visivel.mjs";

const RAIZ = join(process.cwd(), "src");

/** Nomes que nunca são lidos pelo app: quem os consome é o navegador ou o Next. */
const ISENTOS = new Set([
  // O Next resolve sozinho, antes de qualquer código nosso.
  "next",
  // Não são estado de tela.
  "utm_source",
  "utm_medium",
  "utm_campaign",
]);

/**
 * Rota de TELA, e não chamada de API nem asset.
 *
 * `/api/*` é lida pelo backend, que não entra nesta varredura; e
 * `/icon-192.png?v=3` é cache-busting que o navegador consome.
 */
function ehRotaDeTela(rota) {
  if (rota.startsWith("/api/")) return false;
  const ultimo = rota.split("/").pop() ?? "";
  return !/\.[a-z0-9]+$/i.test(ultimo);
}

function varrer(dir, achados = []) {
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const completo = join(dir, entrada.name);
    if (entrada.isDirectory()) {
      if (entrada.name === "generated") continue;
      varrer(completo, achados);
    } else if ([".ts", ".tsx"].includes(extname(entrada.name))) {
      achados.push([relative(process.cwd(), completo), readFileSync(completo, "utf8")]);
    }
  }
  return achados;
}

const arquivos = varrer(RAIZ);

// ── Os parâmetros que alguém LÊ ──────────────────────────────────────────────
const lidos = new Set();
for (const [caminhoAtual, bruto] of arquivos) {
  const fonte = semComentarios(bruto);
  // Cliente: `searchParams.get("area")`.
  for (const casa of fonte.matchAll(/\.get\(\s*["'`]([A-Za-z0-9_]+)["'`]\s*\)/g)) {
    lidos.add(casa[1]);
  }
  // Servidor: `params?.anchor` numa PÁGINA que recebe a prop `searchParams`.
  //
  // ⚠️ O escopo é o que faz esta regra valer alguma coisa. Sem ele, qualquer
  // objeto chamado `params` contava — e `lib/api/domains/question-bank` monta
  // os pedidos num objeto com esse nome, então `params.answer_status` ali
  // dentro dava o parâmetro por lido. Medido: quebrando de propósito a leitura
  // no `sessionBuilder`, o guard continuava verde.
  const ehPaginaDeServidor =
    /[\\/]page\.tsx$/.test(caminhoAtual) && fonte.includes("searchParams");
  if (ehPaginaDeServidor) {
    for (const casa of fonte.matchAll(/\b(?:params|searchParams)\??\.([A-Za-z0-9_]+)\b/g)) {
      lidos.add(casa[1]);
    }
  }
}

// ── Os parâmetros que alguém ENVIA ───────────────────────────────────────────
// Caminho interno com query: `/rota?a=1&b=2`. Aceita template literal, e por
// isso o valor pode ser `${...}` — só o NOME importa aqui.
const ENVIO = /["'`](\/[A-Za-z0-9\-_/[\]${}.]*)\?([A-Za-z0-9_]+=[^"'`]*)["'`]/g;

const faltando = [];
for (const [caminho, bruto] of arquivos) {
  const fonte = semComentarios(bruto);
  for (const casa of fonte.matchAll(ENVIO)) {
    const rota = casa[1];
    const query = casa[2];
    if (!ehRotaDeTela(rota)) continue;
    for (const par of query.split("&")) {
      const nome = par.split("=")[0];
      if (!nome || ISENTOS.has(nome) || lidos.has(nome)) continue;
      const linha = fonte.slice(0, casa.index).split("\n").length;
      faltando.push({ caminho, linha, rota, nome });
    }
  }
}

if (faltando.length > 0) {
  console.error("Parâmetro de query enviado que ninguém lê:");
  for (const item of faltando) {
    console.error(`- ${item.caminho}:${item.linha} manda \`${item.nome}\` para ${item.rota}`);
  }
  console.error(
    '\nOu a rota passa a lê-lo (um `.get("nome")`), ou ele sai da URL. ' +
      "Parâmetro que viaja e não chega é um botão que promete e não cumpre.",
  );
  process.exit(1);
}

console.log(
  `Parâmetros de URL: ${lidos.size} lidos, nenhum enviado sem leitor (${arquivos.length} arquivos).`,
);
