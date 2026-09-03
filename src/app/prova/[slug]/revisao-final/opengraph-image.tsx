import { ImageResponse } from "next/og";

import { PALETA } from "@/lib/cartao";
import { dec } from "@/lib/decimal";
import { encurtar } from "@/lib/encurtar";
import { provaPorSlug, todasAsProvas } from "@/lib/provas";
import { revisaoPorExamKey } from "@/lib/revisao";
import { HOST_VISIVEL } from "@/lib/site";

/**
 * O print da Revisão Final — o cartão que circula quando o link do ebook é colado.
 *
 * ## O que o cartão afirma, e o cuidado que isso exige
 *
 * Uma afirmação renderizada em PNG não se corrige com deploy depois que circula.
 * Por isso os três números aqui são os mesmos que a página publica e que o
 * registro congelado sustenta: a contagem de questões, a contagem de assuntos e
 * o lift medido — este último com a faixa histórica ao lado, porque "3,4× o
 * acaso" sem a faixa seria o melhor caso posando de típico (a `/aposta` recusa
 * exatamente isso).
 *
 * Satori não enxerga custom property, então a paleta é literal — a mesma de
 * `lib/cartao.ts`, fonte única com o cartão da prova e a central de mídia.
 */

export const alt =
  "Cartão da Revisão Final: os 7 assuntos mais prováveis da prova, um por dia, e o ganho medido sobre o acaso.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Só provas COM revisão gerada têm cartão — uma rota viva para as 138 bancas
 *  seria um 404 disfarçado de promessa, o mesmo recorte da página. */
export function generateStaticParams() {
  return todasAsProvas()
    .filter((prova) => revisaoPorExamKey(prova.exam_key) !== undefined)
    .map((prova) => ({ slug: prova.slug }));
}

const { PAPEL, TINTA, FRACA, MARCA, LINHA } = PALETA;

export default async function Imagem({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const prova = provaPorSlug(slug);
  const revisao = prova ? revisaoPorExamKey(prova.exam_key) : undefined;

  if (!prova || !revisao) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: PAPEL,
            color: TINTA,
            fontSize: 56,
          }}
        >
          Fácies
        </div>
      ),
      size,
    );
  }

  const h = revisao.honestidade;
  const total = revisao.estrutura.total_questoes;
  const dias = revisao.dias.length;
  const lift = h.lift !== null ? `${dec(h.lift, 1)}×` : "—";
  const faixa =
    h.historico_minimo !== null && h.historico_maximo !== null
      ? `medido · faixa ${dec(h.historico_minimo, 2)}–${dec(h.historico_maximo, 2)}×`
      : undefined;

  // A manchete é o que a página ENTREGA, e ela mudou em 02/09: o ebook deixou
  // de publicar as 30 questões com gabarito e passou a publicar 7 páginas de
  // revisão (D13). O cartão continuava anunciando "30 questões da própria base
  // da prova" — e é ele que circula no WhatsApp, então quem clicasse chegaria
  // procurando questões numa página que não tem nenhuma.
  //
  // As 30 continuam existindo, no app. Elas ficam no cartão como a terceira
  // coluna, com o destino certo escrito junto.
  const numeros = [
    { valor: String(dias), rotulo: "assuntos mais prováveis, um por dia" },
    { valor: lift, rotulo: "o acaso", nota: faixa },
    { valor: String(total), rotulo: "questões para resolver no app" },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: PAPEL,
          color: TINTA,
          padding: "56px 64px",
        }}
      >
        <div style={{ display: "flex", fontSize: 22, color: FRACA, letterSpacing: 2 }}>
          REVISÃO FINAL · GRÁTIS
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 54,
            fontWeight: 700,
            marginTop: 12,
            lineHeight: 1.15,
            maxWidth: 1020,
          }}
        >
          {encurtar(`A última semana antes do ${prova.sigla}`, 60)}
        </div>

        <div style={{ display: "flex", fontSize: 22, color: FRACA, marginTop: 10 }}>
          Como a sua prova cobra cada assunto, onde se erra e o que conferir na
          véspera.
        </div>

        <div style={{ display: "flex", flex: 1, gap: 28, marginTop: 40 }}>
          {numeros.map((item) => (
            <div
              key={item.rotulo}
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                borderTop: `3px solid ${MARCA}`,
                paddingTop: 20,
              }}
            >
              <div style={{ display: "flex", fontSize: 62, fontWeight: 700, color: MARCA }}>
                {item.valor}
              </div>
              <div style={{ display: "flex", fontSize: 24, marginTop: 10, lineHeight: 1.3 }}>
                {item.rotulo}
              </div>
              {item.nota ? (
                <div style={{ display: "flex", fontSize: 19, color: FRACA, marginTop: 6 }}>
                  {item.nota}
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
            paddingTop: 18,
            fontSize: 21,
            color: FRACA,
          }}
        >
          <div style={{ display: "flex" }}>
            <span style={{ color: TINTA, fontWeight: 700 }}>F</span>
            <span style={{ color: MARCA, fontWeight: 700 }}>á</span>
            <span style={{ color: TINTA, fontWeight: 700 }}>cies</span>
            <span style={{ marginLeft: 10 }}>· a cara da sua prova</span>
          </div>
          <div style={{ display: "flex" }}>
            {HOST_VISIVEL}/prova/{slug}/revisao-final
          </div>
        </div>
      </div>
    ),
    size,
  );
}
