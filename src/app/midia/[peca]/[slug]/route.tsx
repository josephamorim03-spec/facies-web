import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";

import { numerosDaBanca, numerosDaProva } from "@/lib/cartao";
import { encurtar } from "@/lib/encurtar";
import { bancaPorSlugCurto, janela, nomeCurto } from "@/lib/facies";
import { FORMATOS, resolverPeca, type FormatoId } from "@/lib/midia";
import { renderCara } from "@/lib/midia/cara";
import { provaPorSlug } from "@/lib/provas";

/**
 * Uma peça da central de mídia — a fácies pública, nos formatos do Instagram.
 *
 * ## Por que `force-dynamic`
 *
 * O tráfego desta rota é o operador abrindo o catálogo, não um pico de WhatsApp.
 * Pré-renderizar 143 assuntos × 3 formatos = ~429 ImageResponse em build, sobre
 * um dataset de 600 KB — exatamente o tipo de pressão de memória que
 * `next.config.js` já documenta ter derrubado builds desta máquina. Renderizar
 * sob demanda custa dezenas de milissegundos por imagem e não toca o disco.
 *
 * ## Por que `formato` via query, e não segmento de rota
 *
 * O formato não identifica a peça; ele é uma variação dela. Um segmento
 * `/[formato]` obrigaria `generateStaticParams` a enumerar a tripla e criaria a
 * ilusão de três páginas distintas quando é uma só, redimensionada.
 */

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ peca: string; slug: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { peca, slug } = await params;
  const pedido = request.nextUrl.searchParams.get("formato") ?? "feed";
  const formato: FormatoId = FORMATOS[pedido as FormatoId] ? (pedido as FormatoId) : "feed";
  const dim = FORMATOS[formato];

  const peça = resolverPeca(peca, slug);
  if (!peça) {
    return new Response("Peça não encontrada", { status: 404 });
  }

  const assunto = peça.assunto;
  const prova = assunto.tipo === "prova" ? provaPorSlug(slug) : undefined;
  const banca = assunto.tipo === "banca" ? bancaPorSlugCurto(slug) : undefined;

  // O que a peça mostra: para prova, base composta + lift; para banca, janela +
  // total. O trio de números vem da FONTE ÚNICA em `lib/cartao.ts`.
  const titulo = prova ? prova.sigla : banca ? encurtar(nomeCurto(banca), 40) : "";
  const legenda = prova
    ? `${prova.profundidade.diretas} questões da própria prova · ${prova.profundidade.correlatas.toLocaleString("pt-BR")} de provas parecidas`
    : banca
      ? `${janela(banca)} · ${banca.total.toLocaleString("pt-BR")} questões`
      : "";
  const numeros = prova
    ? numerosDaProva(prova)
    : banca
      ? numerosDaBanca(banca)
      : [];

  return new ImageResponse(
    renderCara({
      titulo,
      legenda,
      numeros,
      caminho: assunto.caminho,
      largura: dim.largura,
      altura: dim.altura,
    }),
    { width: dim.largura, height: dim.altura },
  );
}
