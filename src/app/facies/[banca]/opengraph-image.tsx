import { ImageResponse } from "next/og";
import {
  bancaPorSlug,
  formatosDistintivos,
  janela,
  NACIONAL,
  todasAsBancas,
} from "@/lib/facies";
import { HOST_VISIVEL } from "@/lib/site";
import { encurtar } from "@/lib/encurtar";
import { dec } from "@/lib/decimal";

/**
 * A imagem que circula — e ela é a MESMA nos dois canais.
 *
 * O §12.3 pede duas coisas que pareciam separadas: imagem de Open Graph por
 * banca (para quem cola o link no grupo já entregar a informação antes de
 * alguém clicar) e um botão de copiar a imagem (porque o print vai circular de
 * qualquer jeito, então melhor produzir você o print, com atribuição).
 *
 * São a mesma imagem. O botão de copiar busca este arquivo e escreve na área de
 * transferência, então o que a pessoa cola é byte a byte o que o WhatsApp
 * mostraria sozinho. Duas renderizações divergiriam na primeira mudança de
 * layout, e a que ninguém olha é a que fica errada.
 *
 * Três números, conforme o §12.3 — os mais característicos daquela prova, não os
 * mais fáceis de calcular.
 */

// O `alt` do Next é export estático por rota: não dá para citar a banca nem a
// prova. Então ele descreve o que o cartão CONTÉM — "A fácies da prova" sozinho
// não diz nada que o título do link já não diga, e alt existe justamente para
// quem não vê a imagem.
export const alt =
  "Cartão da fácies da banca: janela de anos, total de questões e os três números mais característicos — formato do item, assunto que mais cai e distribuição por área.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return todasAsBancas().map((banca) => ({ banca: banca.slug }));
}

// Paleta da marca, literal: `ImageResponse` roda no Satori e não enxerga CSS
// custom property nenhuma. Se os tokens mudarem, estes quatro valores mudam
// junto — é o único lugar do projeto onde a cor é escrita à mão de propósito.
const PAPEL = "#F6F6F4";
const TINTA = "#16191C";
const FRACA = "#5A6067";
const MARCA = "#0D4F4A";
const LINHA = "#D8DAD4";

export default async function Imagem({ params }: { params: Promise<{ banca: string }> }) {
  const { banca: slug } = await params;
  const banca = bancaPorSlug(slug);

  if (!banca) {
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

  const destaques = tresNumeros(banca);

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
            fontSize: 46,
            fontWeight: 700,
            marginTop: 14,
            lineHeight: 1.15,
            maxWidth: 1000,
          }}
        >
          {encurtar(banca.nome, 68)}
        </div>

        <div style={{ display: "flex", fontSize: 22, color: FRACA, marginTop: 10 }}>
          {janela(banca)} · {banca.total.toLocaleString("pt-BR")} questões
        </div>

        <div style={{ display: "flex", flex: 1, gap: 28, marginTop: 40 }}>
          {destaques.map((item) => (
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
              <div style={{ display: "flex", fontSize: 66, fontWeight: 700, color: MARCA }}>
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
          <div style={{ display: "flex" }}>{HOST_VISIVEL}</div>
        </div>
      </div>
    ),
    size,
  );
}

/**
 * Os três números MAIS CARACTERÍSTICOS, não os três primeiros.
 *
 * "Característico" aqui tem definição operacional: o formato que mais se afasta
 * da média nacional. Uma banca 100% múltipla escolha direta não tem desvio de
 * formato, e nesse caso o que a distingue é a contagem de alternativas ou o
 * assunto que ela mais cobra — a função cai para esses, nessa ordem.
 *
 * Sem isso, metade das imagens sairia dizendo "86% múltipla escolha direta", que
 * é verdade e não é notícia.
 */
function tresNumeros(banca: ReturnType<typeof bancaPorSlug>) {
  if (!banca) return [];
  const saida: { valor: string; rotulo: string; nota?: string }[] = [];

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
      rotulo:
        alternativa.n === 2 ? "certo/errado" : `com ${alternativa.n} alternativas`,
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
