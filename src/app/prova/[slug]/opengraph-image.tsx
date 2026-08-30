import { ImageResponse } from "next/og";
import { provaPorSlug, todasAsProvas } from "@/lib/provas";
import {
  bancaPorSlugCurto,
  bancasComPagina,
  formatosDistintivos,
  janela,
  nomeCurto,
  NACIONAL,
  type Banca,
} from "@/lib/facies";
import { HOST_VISIVEL } from "@/lib/site";
import { encurtar } from "@/lib/encurtar";
import { dec } from "@/lib/decimal";

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

// Paleta da marca, literal: `ImageResponse` roda no Satori e não enxerga CSS
// custom property nenhuma. Se os tokens mudarem, estes quatro valores mudam
// junto — é o único lugar do projeto onde a cor é escrita à mão de propósito.
const PAPEL = "#F6F6F4";
const TINTA = "#16191C";
const FRACA = "#5A6067";
const MARCA = "#0C8F7F";
const LINHA = "#D8DAD4";

type Numero = { valor: string; rotulo: string; nota?: string };

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

/**
 * O trio de uma PROVA nova.
 *
 * Numa prova de uma edição, o que convence não é "o que mais cai" — é
 * profundidade da base e o lift sobre o acaso. Ela precisa mostrar que tem coisa
 * por baixo antes de afirmar qualquer coisa sobre o que cai.
 */
function numerosDaProva(prova: NonNullable<ReturnType<typeof provaPorSlug>>): Numero[] {
  const val = prova.validacao;
  const topo = prova.mais_cai.linhas[0];

  const numeros: Numero[] = [
    {
      valor: prova.profundidade.questoes_rotuladas.toLocaleString("pt-BR"),
      rotulo: "questões rotuladas",
      nota: `${prova.profundidade.aplicacoes_na_serie} aplicações na série`,
    },
  ];

  if (val.status === "medido" && val.lift) {
    const serieHistorica = val.historico;
    // O `n` vai na imagem, não só na página: o print circula sozinho e sem ele o
    // número viaja sem a ressalva que o torna honesto.
    //
    // E a FAIXA vai junto pelo mesmo motivo, que é mais forte: 4,0x é UMA
    // medição — a melhor de várias. Na página dá para explicar isso em duas
    // frases; aqui não dá, e é aqui que o número circula. Uma imagem que leva só
    // o melhor caso é a forma mais eficiente de exagerar que existe, porque
    // viaja sem nada que a corrija.
    const faixa =
      serieHistorica.status === "medido"
        ? ` · ${dec(serieHistorica.recentes_minimo)}–${dec(serieHistorica.recentes_maximo)}x nas ${serieHistorica.recentes} anteriores`
        : "";
    numeros.push({
      valor: `${dec(val.lift)}x`,
      rotulo: "melhor que o acaso",
      nota: `sobre ${val.edicoes_diretas} aplicação direta${faixa}`,
    });
  }

  if (topo) {
    numeros.push({
      valor: String(topo.total_serie),
      rotulo: encurtar(topo.rotulo, 30),
      nota: "assunto que mais aparece",
    });
  }

  return numeros;
}

/**
 * Os três números MAIS CARACTERÍSTICOS de uma banca, não os três primeiros.
 *
 * "Característico" aqui tem definição operacional: o formato que mais se afasta
 * da média nacional. Uma banca 100% múltipla escolha direta não tem desvio de
 * formato, e nesse caso o que a distingue é a contagem de alternativas ou o
 * assunto que ela mais cobra — a função cai para esses, nessa ordem.
 *
 * Sem isso, metade das imagens sairia dizendo "86% múltipla escolha direta", que
 * é verdade e não é notícia.
 */
function numerosDaBanca(banca: Banca): Numero[] {
  const saida: Numero[] = [];

  // Mesmo critério da página, de propósito: `formatosDistintivos` é o ponto
  // único de decisão. Antes esta imagem filtrava por |desvio| >= 3 e a página
  // não filtrava nada — a versão que circula no WhatsApp era mais criteriosa
  // que a que o aluno lia.
  for (const linha of formatosDistintivos(banca)) {
    if (saida.length >= 2) break;
    saida.push({
      valor: `${dec(linha.pct)}%`,
      rotulo: linha.rotulo,
      nota: `média nacional ${dec(NACIONAL.formato_pct[linha.codigo] ?? 0)}%`,
    });
  }

  // `certo_errado` como FORMATO e "2 alternativas" como CONTAGEM sao a mesma
  // medicao por dois caminhos -- a banca do DF saia com "93% certo/errado" duas
  // vezes na mesma imagem, gastando um dos tres numeros para repetir o anterior.
  const jaMostrouCertoErrado = saida.some((item) => item.rotulo === "certo/errado");
  const alternativa = [...banca.formato.alternativas].sort((a, b) => b.pct - a.pct)[0];
  if (alternativa && saida.length < 3 && !(alternativa.n === 2 && jaMostrouCertoErrado)) {
    saida.push({
      valor: `${alternativa.pct.toFixed(0)}%`,
      rotulo: alternativa.n === 2 ? "certo/errado" : `com ${alternativa.n} alternativas`,
      nota:
        alternativa.n === 2
          ? undefined
          : `média nacional ${(NACIONAL.alternativas_pct[String(alternativa.n)] ?? 0).toFixed(0)}%`,
    });
  }

  // A posicao entra na legenda. O segundo assunto da lista nao e "o assunto que
  // mais cai" -- dizer isso e' um rotulo que mente por pouco, que e' o jeito
  // mais facil de perder a credibilidade que a pagina inteira esta vendendo.
  let posicao = 0;
  for (const linha of banca.mais_cai.linhas) {
    posicao += 1;
    if (saida.length >= 3) break;
    if (!linha.exibivel) continue;
    saida.push({
      valor: String(linha.n),
      rotulo: encurtar(linha.rotulo, 34),
      nota:
        posicao === 1
          ? "questões no assunto que mais cai"
          : `questões · ${posicao}º assunto mais cobrado`,
    });
  }

  return saida.slice(0, 3);
}
