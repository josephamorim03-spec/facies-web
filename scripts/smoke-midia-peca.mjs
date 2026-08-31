/**
 * Smoke da central de mídia: a peça renderiza e o PNG sai válido.
 *
 * ## Por que isto existe
 *
 * O `next dev`/Playwright não rodam em todo ambiente (aqui o sandbox bloqueia
 * `spawn`). Sem nenhuma prova de render, a peça pode quebrar em silêncio — o
 * dataset regera, `numerosDaProva`/`numerosDaBanca` devolvem vazio ou o Satori
 * falha — e nada acusa. Este smoke renderiza a peça com as funções REAIS
 * (via `lib/alias-loader.mjs`, que resolve `@/`) e confere que o PNG tem a
 * assinatura, a dimensão e o volume certos.
 *
 * Ele NÃO substitui a prova de píxel visual (o olho na composição): ele pega a
 * quebra ESTRUTURAL — PNG inválido, dimensão errada, peça vazia.
 *
 * Uso:
 *
 *   node --experimental-strip-types --loader ./scripts/lib/alias-loader.mjs scripts/smoke-midia-peca.mjs
 */
import { ImageResponse } from "next/og.js";

import { numerosDaBanca, numerosDaProva } from "@/lib/cartao";
import { encurtar } from "@/lib/encurtar";
import { bancaPorSlugCurto, janela, nomeCurto } from "@/lib/facies";
import { renderCara } from "@/lib/midia/cara";
import { provaPorSlug } from "@/lib/provas";

const ASSINATURA_PNG = "89504e470d0a1a0a";
const PISO_BYTES = 10_000;

const falhas = [];
let renderizadas = 0;

function acusa(condicao, mensagem) {
  if (!condicao) falhas.push(mensagem);
}

async function renderiza(props) {
  const resposta = new ImageResponse(renderCara(props), {
    width: props.largura,
    height: props.altura,
  });
  return Buffer.from(await resposta.arrayBuffer());
}

function conferePng(buf, largura, altura, rotulo) {
  const assinatura = buf.subarray(0, 8).toString("hex");
  acusa(assinatura === ASSINATURA_PNG, `${rotulo}: assinatura PNG invalida (${assinatura})`);
  if (buf.length < 24) {
    acusa(false, `${rotulo}: PNG curto demais (${buf.length} bytes)`);
    return;
  }
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  acusa(w === largura && h === altura, `${rotulo}: dimensao ${w}x${h}, esperava ${largura}x${altura}`);
  acusa(buf.length > PISO_BYTES, `${rotulo}: PNG pequeno demais (${buf.length} bytes) — suspeito de vazio`);
  renderizadas += 1;
}

// ── os dados reais ──────────────────────────────────────────────────────────
const enamed = provaPorSlug("enamed");
acusa(Boolean(enamed), "prova ENAMED ausente em provas.json");
const usp = bancaPorSlugCurto("usp-sp");
acusa(Boolean(usp), "banca usp-sp ausente em facies.json");

const numerosEnamed = enamed ? numerosDaProva(enamed) : [];
const numerosUsp = usp ? numerosDaBanca(usp) : [];
acusa(numerosEnamed.length > 0, "ENAMED sem numeros — numerosDaProva vazio");
acusa(numerosUsp.length > 0, "usp-sp sem numeros — numerosDaBanca vazio");

// ── renderiza (feed horizontal + story vertical) ─────────────────────────────
if (enamed) {
  const legenda = `${enamed.profundidade.diretas} questões da própria prova · ${enamed.profundidade.correlatas.toLocaleString("pt-BR")} de provas parecidas`;
  conferePng(
    await renderiza({ titulo: enamed.sigla, legenda, numeros: numerosEnamed, caminho: "/prova/enamed", largura: 1080, altura: 1080 }),
    1080,
    1080,
    "enamed-feed",
  );
  conferePng(
    await renderiza({ titulo: enamed.sigla, legenda, numeros: numerosEnamed, caminho: "/prova/enamed", largura: 1080, altura: 1920 }),
    1080,
    1920,
    "enamed-story",
  );
}

if (usp) {
  const legenda = `${janela(usp)} · ${usp.total.toLocaleString("pt-BR")} questões`;
  conferePng(
    await renderiza({ titulo: encurtar(nomeCurto(usp), 40), legenda, numeros: numerosUsp, caminho: "/prova/usp-sp", largura: 1080, altura: 1080 }),
    1080,
    1080,
    "usp-sp-feed",
  );
}

if (falhas.length > 0) {
  console.error("Midia smoke FALHOU:\n- " + falhas.join("\n- "));
  process.exit(1);
}

console.log(`Midia smoke: ${renderizadas} pecas renderizadas em PNG valido.`);
