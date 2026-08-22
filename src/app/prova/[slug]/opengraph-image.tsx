import { ImageResponse } from "next/og";
import { provaPorSlug, todasAsProvas } from "@/lib/provas";
import { HOST_VISIVEL } from "@/lib/site";

/**
 * O print que circula da página de uma prova.
 *
 * Existe porque a página do ENAMED — a que seis dígitos de candidatos vão abrir —
 * não tinha imagem própria. O botão de copiar buscava a rota de `/facies/[banca]`,
 * que aceita qualquer slug e devolvia o cartão genérico: **HTTP 200 com uma
 * imagem em branco**. Não quebrava, o que é pior: quem compartilhasse mandaria um
 * cartão da marca sem um número dentro.
 *
 * Os três números aqui não são os mesmos da página por banca, e a diferença é a
 * tese: numa prova NOVA, o que convence não é "o que mais cai" — é profundidade
 * da base e o lift sobre o acaso. Uma prova de uma edição precisa mostrar que tem
 * coisa por baixo antes de afirmar qualquer coisa sobre o que cai.
 */

export const alt = "A fácies da prova";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return todasAsProvas().map((prova) => ({ slug: prova.slug }));
}

const PAPEL = "#F6F6F4";
const TINTA = "#16191C";
const FRACA = "#5A6067";
const MARCA = "#0D4F4A";
const LINHA = "#D8DAD4";

export default async function Imagem({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const prova = provaPorSlug(slug);

  if (!prova) {
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

  const val = prova.validacao;
  const topo = prova.mais_cai.linhas[0];

  const numeros: { valor: string; rotulo: string; nota?: string }[] = [
    {
      valor: prova.profundidade.questoes_rotuladas.toLocaleString("pt-BR"),
      rotulo: "questões rotuladas",
      nota: `${prova.profundidade.aplicacoes_na_serie} aplicações na série`,
    },
  ];

  if (val.status === "medido" && val.lift) {
    numeros.push({
      valor: `${val.lift.toFixed(1)}x`,
      rotulo: "melhor que o acaso",
      // O `n` vai na imagem, não só na página: o print circula sozinho e sem ele
      // o número viaja sem a ressalva que o torna honesto.
      nota: `sobre ${val.edicoes_diretas} aplicação direta`,
    });
  }

  if (topo) {
    numeros.push({
      valor: String(topo.total_serie),
      rotulo:
        topo.rotulo.length > 30 ? `${topo.rotulo.slice(0, 28)}…` : topo.rotulo,
      nota: "assunto que mais aparece",
    });
  }

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
          A FÁCIES DA PROVA
        </div>

        <div style={{ display: "flex", fontSize: 60, fontWeight: 700, marginTop: 12 }}>
          {prova.sigla}
        </div>

        <div style={{ display: "flex", fontSize: 22, color: FRACA, marginTop: 10 }}>
          {prova.profundidade.diretas} questões da própria prova ·{" "}
          {prova.profundidade.correlatas.toLocaleString("pt-BR")} de provas correlatas
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
            <span style={{ color: MARCA, fontWeight: 700 }}>Fácies</span>
            <span style={{ marginLeft: 10 }}>· inteligência de prova</span>
          </div>
          <div style={{ display: "flex" }}>
            {HOST_VISIVEL}/prova/{prova.slug}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
