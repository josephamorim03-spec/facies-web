import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";

import { PALETA, numerosDaBanca, numerosDaProva, type Numero } from "@/lib/cartao";
import { encurtar } from "@/lib/encurtar";
import { bancaPorSlugCurto, janela, nomeCurto } from "@/lib/facies";
import { FORMATOS, resolverPeca, type FormatoId } from "@/lib/midia";
import { provaPorSlug } from "@/lib/provas";
import { HOST_VISIVEL, SITE_QUALIFICADOR } from "@/lib/site";

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

const { PAPEL, TINTA, FRACA, MARCA, LINHA } = PALETA;

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
  const numeros: Numero[] = prova
    ? numerosDaProva(prova)
    : banca
      ? numerosDaBanca(banca)
      : [];

  const vertical = dim.altura > dim.largura;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: PAPEL,
        color: TINTA,
        padding: vertical ? "88px 72px" : "56px 64px",
      }}
    >
      <div style={{ display: "flex", fontSize: vertical ? 24 : 20, color: FRACA, letterSpacing: 2 }}>
        A FÁCIES DA PROVA
      </div>

      <div
        style={{
          display: "flex",
          fontSize: vertical ? 68 : 56,
          fontWeight: 700,
          marginTop: 14,
          lineHeight: 1.15,
          maxWidth: "100%",
        }}
      >
        {titulo}
      </div>

      <div style={{ display: "flex", fontSize: vertical ? 24 : 20, color: FRACA, marginTop: 12 }}>
        {legenda}
      </div>

      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: vertical ? "column" : "row",
          gap: vertical ? 40 : 28,
          marginTop: vertical ? 64 : 44,
        }}
      >
        {numeros.map((numero) => (
          <div
            key={numero.rotulo}
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              ...(vertical
                ? { borderLeft: `3px solid ${MARCA}`, paddingLeft: 32 }
                : { borderTop: `3px solid ${MARCA}`, paddingTop: 22 }),
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: vertical ? 88 : 58,
                fontWeight: 700,
                color: MARCA,
                lineHeight: 1,
              }}
            >
              {numero.valor}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: vertical ? 30 : 22,
                fontWeight: 600,
                marginTop: 16,
                lineHeight: 1.3,
              }}
            >
              {numero.rotulo}
            </div>
            {numero.nota ? (
              <div
                style={{
                  display: "flex",
                  fontSize: vertical ? 24 : 18,
                  color: FRACA,
                  marginTop: 8,
                  lineHeight: 1.35,
                }}
              >
                {numero.nota}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          borderTop: `1px solid ${LINHA}`,
          paddingTop: 20,
          fontSize: vertical ? 22 : 19,
          color: FRACA,
        }}
      >
        <div style={{ display: "flex" }}>
          <span style={{ color: TINTA, fontWeight: 700 }}>F</span>
          <span style={{ color: MARCA, fontWeight: 700 }}>á</span>
          <span style={{ color: TINTA, fontWeight: 700 }}>cies</span>
          <span style={{ marginLeft: 10 }}>· {SITE_QUALIFICADOR}</span>
        </div>
        <div style={{ display: "flex" }}>
          {HOST_VISIVEL}
          {assunto.caminho}
        </div>
      </div>
    </div>,
    { width: dim.largura, height: dim.altura },
  );
}
