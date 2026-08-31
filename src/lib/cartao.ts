import { encurtar } from "@/lib/encurtar";
import { dec } from "@/lib/decimal";
import {
  formatosDistintivos,
  NACIONAL,
  type Banca,
} from "@/lib/facies";
import type { Prova } from "@/lib/provas";

/**
 * A lógica do CARTÃO da fácies — o trio de números e a paleta.
 *
 * ## Por que existe separado de `opengraph-image.tsx`
 *
 * A central de mídia renderiza a MESMA fácies que já está no ar, só que nos
 * formatos do Instagram. Se a rota de peça copiasse `numerosDaProva`/`numerosDaBanca`
 * para si, a próxima mudança no cartão chegaria só num dos dois — e o que
 * ninguém olha é o que fica errado. É exatamente o defeito que `formatosDistintivos`
 * já registra ter acontecido entre a página e o cartão de Open Graph.
 *
 * Aqui vive a FONTE ÚNICA do cartão: a paleta literal (Satori não enxerga CSS
 * custom property) e a escolha dos três números. Os dois renderizadores —
 * `opengraph-image.tsx` (1200×630, prévia de link) e `midia/[peca]/[slug]`
 * (1080×1080/1350/1920, peça de Instagram) — consomem este módulo.
 */

/**
 * Paleta da marca, literal.
 *
 * `ImageResponse` roda no Satori e não enxerga CSS custom property nenhuma. Se
 * os tokens mudarem, estes valores mudam junto — é o único lugar do projeto onde
 * a cor é escrita à mão de propósito.
 */
export const PALETA = {
  PAPEL: "#F6F6F4",
  TINTA: "#16191C",
  FRACA: "#5A6067",
  MARCA: "#0C8F7F",
  LINHA: "#D8DAD4",
} as const;

export type Numero = { valor: string; rotulo: string; nota?: string };

/**
 * O trio de uma PROVA nova.
 *
 * Numa prova de uma edição, o que convence não é "o que mais cai" — é
 * profundidade da base e o lift sobre o acaso. Ela precisa mostrar que tem coisa
 * por baixo antes de afirmar qualquer coisa sobre o que cai.
 */
export function numerosDaProva(prova: Prova): Numero[] {
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
    // medição — a melhor de várias. Uma imagem que leva só o melhor caso é a
    // forma mais eficiente de exagerar que existe, porque viaja sem nada que a
    // corrija.
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
export function numerosDaBanca(banca: Banca): Numero[] {
  const saida: Numero[] = [];

  // Mesmo critério da página, de propósito — e o ponto único de decisão MUDOU:
  // é `assinatura`, do gerador, que combina os dois motores. Deixar o cartão em
  // `formatosDistintivos` faria circular no WhatsApp 33 afirmações que a página
  // deixou de fazer (a composição as explicava) e esconderia 65 que ela passou a
  // fazer. É o mesmo defeito que motivou o comentário original, invertido.
  if (banca.assinatura) {
    for (const linha of banca.assinatura) {
      if (saida.length >= 2) break;
      const atribuida = linha.confianca !== "bruta";
      saida.push({
        valor: `${dec(atribuida ? (linha.pct_estrato ?? 0) : (linha.pct ?? 0))}%`,
        rotulo: linha.rotulo,
        // A nota carrega o denominador da MESMA fonte do valor. Trocar de
        // referência entre o número e a legenda é o erro que a imagem não
        // deixa ninguém conferir.
        nota: atribuida
          ? `esperado pelos assuntos ${dec(linha.pct_esperado ?? 0)}%`
          : `média nacional ${dec(linha.media_nacional ?? 0)}%`,
      });
    }
  } else {
    for (const linha of formatosDistintivos(banca)) {
      if (saida.length >= 2) break;
      saida.push({
        valor: `${dec(linha.pct)}%`,
        rotulo: linha.rotulo,
        nota: `média nacional ${dec(NACIONAL.formato_pct[linha.codigo] ?? 0)}%`,
      });
    }
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
