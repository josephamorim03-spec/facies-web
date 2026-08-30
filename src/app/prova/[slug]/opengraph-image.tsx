import { ImageResponse } from "next/og";
import { provaPorSlug, todasAsProvas } from "@/lib/provas";
import {
  bancaPorSlugCurto,
  bancasComPagina,
  janela,
  nomeCurto,
} from "@/lib/facies";
import { HOST_VISIVEL } from "@/lib/site";
import { encurtar } from "@/lib/encurtar";
import { numerosDaProva, numerosDaBanca, PALETA } from "@/lib/cartao";

/**
 * O print que circula — o mesmo cartão para prova e para banca.
 *
 * ## Por que os dois geradores viraram um
 *
 * Eram dois arquivos, um por rota (`/prova/[slug]` e `/facies/[banca]`), com o
 * MESMO layout copiado: mesma paleta, mesma fileira de três números, mesmo
 * rodapé. Só a fonte dos números diferia. Com as duas famílias na mesma rota,
 * manter duas cópias garantia que a próxima mudança de layout chegasse só numa
 * delas — e a que ninguém olha é a que fica errada.
 *
 * O que continua diferente é só o TRIO de números, e a diferença é a tese:
 *
 *   - **prova nova** (uma edição): profundidade da base e o lift sobre o acaso.
 *     Não dá para afirmar "o que mais cai" com uma aplicação direta.
 *   - **banca com histórico**: o formato em que ela se afasta da média, a
 *     contagem de alternativas, e o assunto que mais cai.
 *
 * ## A imagem é a MESMA nos dois canais
 *
 * O §12.3 pede imagem de Open Graph por prova (para quem cola o link no grupo já
 * receber a informação antes de alguém clicar) e um botão de copiar a imagem
 * (porque o print vai circular de qualquer jeito). São a mesma imagem: o botão
 * busca esta rota e escreve na área de transferência, então o que a pessoa cola
 * é byte a byte o que o WhatsApp mostraria sozinho.
 */

// O `alt` do Next é export estático por rota: não dá para citar a banca nem a
// prova. Então ele descreve o que o cartão CONTÉM — "A fácies da prova" sozinho
// não diz nada que o título do link já não diga, e alt existe justamente para
// quem não vê a imagem.
export const alt =
  "Cartão da fácies da prova: a base de onde a leitura saiu e os três números mais característicos desta prova.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return [
    ...todasAsProvas().map((prova) => ({ slug: prova.slug })),
    ...bancasComPagina().map(({ slug }) => ({ slug })),
  ];
}

// Paleta e trio de números vivem em `lib/cartao.ts` — fonte única com a central
// de mídia. Satori não enxerga custom property, então a paleta é literal lá.
const { PAPEL, TINTA, FRACA, MARCA, LINHA } = PALETA;

function CartaoVazio() {
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

export default async function Imagem({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const prova = provaPorSlug(slug);
  const banca = prova ? null : bancaPorSlugCurto(slug);
  if (!prova && !banca) return CartaoVazio();

  // Título, legenda e trio, resolvidos antes do layout: o desenho do cartão é um
  // só, e é isso que impede as duas famílias de divergirem visualmente.
  const titulo = prova ? prova.sigla : nomeCurto(banca!);
  const tamanhoTitulo = prova ? 60 : 46;
  const legenda = prova
    ? `${prova.profundidade.diretas} questões da própria prova · ${prova.profundidade.correlatas.toLocaleString("pt-BR")} de provas parecidas`
    : `${janela(banca!)} · ${banca!.total.toLocaleString("pt-BR")} questões`;
  const numeros = prova ? numerosDaProva(prova) : numerosDaBanca(banca!);

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

        <div
          style={{
            display: "flex",
            fontSize: tamanhoTitulo,
            fontWeight: 700,
            marginTop: 12,
            lineHeight: 1.15,
            maxWidth: 1000,
          }}
        >
          {encurtar(titulo, 68)}
        </div>

        <div style={{ display: "flex", fontSize: 22, color: FRACA, marginTop: 10 }}>
          {legenda}
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
            <span style={{ marginLeft: 10 }}>· inteligência de prova</span>
          </div>
          <div style={{ display: "flex" }}>
            {HOST_VISIVEL}/prova/{slug}
          </div>
        </div>
      </div>
    ),
    size,
  );
}


