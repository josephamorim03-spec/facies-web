import { resolveDisplayArea } from "@/lib/areaDisplay";
import { AREA_FULL_LABELS, AREA_SHORT_LABELS, AREA_VAR } from "@/lib/areaIdentity";

/**
 * A distribuição por área como MOSAICO, e não como sete barrinhas.
 *
 * ## Por que trocar
 *
 * O painel era uma lista de barras finas, todas em petróleo. Isso desperdiça a
 * única informação da página que é genuinamente de ÁREA: "41% de Clínica" não é
 * um comprimento, é um pedaço do todo — e o olho lê pedaço de área muito mais
 * rápido que comprimento de barra. Sete barras iguais na mesma cor também não
 * têm hierarquia: a maior e a menor pedem o mesmo esforço de leitura.
 *
 * Aqui o tamanho do retângulo É a incidência e a cor é a da grande área. As duas
 * coisas que o aluno quer saber ("o que mais cai" e "de que área") ficam legíveis
 * de relance, e o bloco vira a peça que se compartilha em print.
 *
 * ## Squarified, e não fatiado
 *
 * Fatiar o retângulo sempre no mesmo eixo dá tiras compridas: uma área de 3%
 * vira um risco de 1px de largura, ilegível e feio. O algoritmo abaixo é o
 * *squarified treemap* clássico — ele empilha em faixas e escolhe a direção pelo
 * lado mais curto, mantendo cada célula perto do quadrado. É o que permite
 * rotular a célula de 3% em vez de escondê-la.
 *
 * ## A cor não é fundo de texto — e isso é regra medida
 *
 * `lib/areaIdentity.ts` proíbe escrever texto NA cor da área: como texto o piso
 * é 4,5:1 e a Okabe-Ito reprova 29 pares nessa exigência. A regra vale igual ao
 * contrário: encher a célula com a cor cheia e pôr rótulo em cima cairia no
 * mesmo problema pelo outro lado.
 *
 * Então a célula recebe um LAVADO da cor (que continua identificando a área) e
 * o rótulo fica em tinta. A cor cheia aparece só na barra sólida da borda, onde
 * ela é limite gráfico e o piso é 3:1 — que é exatamente o que a paleta
 * recalibrada entrega com folga.
 */

/** Percentual da mistura da cor da área no fundo da célula. */
const LAVADO = 22;

type Linha = { rotulo: string; n: number; pct: number };

type Caixa = Linha & { x: number; y: number; w: number; h: number };

/**
 * Squarified treemap em coordenadas de 0 a 100 (percentuais, para o CSS).
 *
 * Mantido puro e sem dependência para poder ser testado sozinho e para rodar no
 * servidor — este painel é conteúdo estático e não deve ir para o bundle do
 * cliente.
 */
export function mosaico(linhas: Linha[], largura = 100, altura = 100): Caixa[] {
  const positivas = linhas.filter((l) => l.pct > 0);
  if (positivas.length === 0) return [];

  const total = positivas.reduce((s, l) => s + l.pct, 0);
  const escala = (largura * altura) / total;
  const fila = positivas
    .map((l) => ({ ...l, area: l.pct * escala }))
    .sort((a, b) => b.area - a.area);

  const saida: Caixa[] = [];
  let x = 0, y = 0, w = largura, h = altura;
  let faixa: typeof fila = [];

  /** Pior razão de aspecto da faixa, se assentada ao longo de `lado`. */
  const pior = (itens: typeof fila, lado: number) => {
    if (itens.length === 0 || lado <= 0) return Infinity;
    const soma = itens.reduce((s, i) => s + i.area, 0);
    if (soma <= 0) return Infinity;
    const maior = Math.max(...itens.map((i) => i.area));
    const menor = Math.min(...itens.map((i) => i.area));
    return Math.max((lado * lado * maior) / (soma * soma), (soma * soma) / (lado * lado * menor));
  };

  function assentar() {
    const soma = faixa.reduce((s, i) => s + i.area, 0);
    if (soma <= 0) { faixa = []; return; }
    // A faixa cresce ao longo do lado CURTO, que é o que mantém as células
    // perto do quadrado.
    const vertical = w >= h;
    const espessura = soma / (vertical ? h : w);
    let deslocamento = 0;
    for (const item of faixa) {
      const comprimento = item.area / espessura;
      saida.push({
        rotulo: item.rotulo, n: item.n, pct: item.pct,
        x: vertical ? x : x + deslocamento,
        y: vertical ? y + deslocamento : y,
        w: vertical ? espessura : comprimento,
        h: vertical ? comprimento : espessura,
      });
      deslocamento += comprimento;
    }
    if (vertical) { x += espessura; w -= espessura; }
    else { y += espessura; h -= espessura; }
    faixa = [];
  }

  for (const item of fila) {
    const lado = Math.min(w, h);
    if (faixa.length > 0 && pior([...faixa, item], lado) > pior(faixa, lado)) assentar();
    faixa.push(item);
  }
  assentar();
  return saida;
}

export function MosaicoAreas({ linhas }: { linhas: Linha[] }) {
  const caixas = mosaico(linhas);
  if (caixas.length === 0) return null;

  return (
    <ul
      // `aspect` em vez de altura fixa: o mosaico tem de manter proporção para
      // as áreas continuarem comparáveis entre si em qualquer largura.
      // No celular o mosaico fica em RETRATO. Com 4/3 numa tela de 390px as
      // celulas pequenas ficavam com ~50px de altura e o "6%" era cortado no
      // meio do glifo — pior que nao mostrar, porque parece defeito. Em 3/4 a
      // mesma celula ganha 93px e cabe inteira. No desktop sobra largura, entao
      // a proporcao deita.
      className="relative w-full list-none aspect-[3/4] sm:aspect-[2/1] lg:aspect-[5/2]"
    >
      {caixas.map((caixa) => {
        // `resolveDisplayArea` trata o PRIMEIRO argumento como codigo de area
        // ("GO", "CM") e so infere pelos seguintes. Passar o rotulo na primeira
        // posicao fazia "Ginecologia" cair em OU — e as sete celulas saiam com a
        // mesma cor cinza, que foi exatamente o que a primeira renderizacao
        // mostrou. O rotulo e TEXTO, entao vai na posicao de texto.
        const area = resolveDisplayArea(null, caixa.rotulo);
        const cor = AREA_VAR[area] ?? AREA_VAR.OU;
        // TRÊS FORMAS, escolhidas por largura E altura separadas — nunca pela
        // área do produto. Área não diz se o texto cabe: uma tira de 40x5 tem a
        // mesma área de uma de 14x14 e não comporta uma linha sequer.
        //
        // A altura de cada forma foi MEDIDA no navegador, não estimada. O bloco
        // completo pede ~103px (nome + percentual grande + contagem + respiro);
        // com o corte anterior em h>=16 as células de Ginecologia e Outros
        // entravam nele com 75px e 65px de altura real e o texto era serrado.
        //
        // O comprimento do rótulo entra na conta porque a largura sozinha
        // engana: "Medicina Preventiva" em 57px quebra em quatro linhas e
        // estoura mesmo numa célula alta.
        const nome = caixa.rotulo.length;
        const formaCompleta = caixa.w >= 22 && caixa.h >= 24 && nome <= 16;
        const formaCurta = !formaCompleta && caixa.w >= 15 && caixa.h >= 11 && nome <= 12;
        const cabeSigla = caixa.w >= 8 && caixa.h >= 6;
        return (
          <li
            key={caixa.rotulo}
            className="absolute overflow-hidden p-2 lg:p-3"
            style={{
              left: `${caixa.x}%`,
              top: `${caixa.y}%`,
              width: `${caixa.w}%`,
              height: `${caixa.h}%`,
              // A cor cheia só como limite gráfico (piso 3:1); o preenchimento é
              // lavado para o rótulo poder ficar em tinta.
              background: `color-mix(in srgb, ${cor} ${LAVADO}%, var(--color-surface))`,
              borderLeft: `3px solid ${cor}`,
              // O filete separa células vizinhas de matiz parecida sem
              // introduzir nova cor.
              outline: "1px solid var(--color-surface)",
            }}
          >
            {formaCurta ? (
              // Forma intermediária: o nome cabe, a contagem não. Numa linha só,
              // porque empilhar é o que estourava a célula — e o nome vale mais
              // que o "n", que continua no leitor de tela.
              <>
                <span className="flex flex-wrap items-baseline gap-x-1.5">
                  {/* `min-w-0` não é enfeite: item de flex nasce com
                      `min-width: auto`, que o impede de encolher abaixo da
                      palavra mais longa — e aí `break-words` fica inerte.
                      "Ginecologia" é uma palavra só e vazava 7px da célula a
                      360px mesmo com a classe de quebra aplicada. */}
                  {/* `line-clamp-1` é o piso: a 320px "Ginecologia" quebra em
                      duas linhas e passa a estourar a célula na ALTURA — o
                      conserto da largura criou o problema vizinho. Uma linha
                      só resolve os dois, e acima de 360px o nome cabe inteiro
                      de qualquer jeito, então nada muda onde já estava bom.
                      O nome completo continua no `title` e no leitor de tela. */}
                  <span
                    className="line-clamp-1 min-w-0 break-words font-serif text-sm font-semibold leading-tight text-ink"
                    title={caixa.rotulo}
                  >
                    {caixa.rotulo}
                  </span>
                  <span className="font-mono text-base tabular-nums text-ink">
                    {caixa.pct.toFixed(0)}%
                  </span>
                </span>
                <span className="sr-only">
                  {caixa.n.toLocaleString("pt-BR")} questões
                </span>
              </>
            ) : formaCompleta ? (
              <>
                <span className="block break-words font-serif text-base font-semibold leading-tight text-ink lg:text-lg">
                  {caixa.rotulo}
                </span>
                <span className="mt-0.5 block font-mono text-xl tabular-nums text-ink lg:text-2xl">
                  {caixa.pct.toFixed(0)}%
                </span>
                {/* ⚠️ TUDO EM `text-ink` DENTRO DA CÉLULA, e isso é medido.
                    Sobre o lavado de 22%, `text-muted` reprova nos SETE:
                    4,07 a 4,49 no claro e 3,79 a 4,89 no escuro, contra o piso
                    de 4,5. A tinta passa com folga enorme (8,0 a 12,4), então a
                    hierarquia aqui vem de TAMANHO e peso, nunca de cor — que é
                    a mesma regra que `areaIdentity.ts` já aplica à sigla. */}
                <span className="mt-0.5 block font-mono text-micro text-ink">
                  {caixa.n.toLocaleString("pt-BR")} questões
                </span>
              </>
            ) : cabeSigla ? (
              <>
                {/* UMA LINHA SÓ, e isso é o conserto do corte.
                    Empilhado, sigla + percentual pedem ~50px de altura e a
                    célula de 3% não tem tanto — o glifo saía serrado ao meio.
                    Lado a lado a exigência cai para ~20px, que qualquer célula
                    acima do piso comporta.

                    `.paper-eyebrow` em vez de reescrever versal e tracking à
                    mão: é o mesmo 11px mono da identidade e é a única forma que
                    o guard de versal aceita. `text-ink` porque aqui a sigla é o
                    rótulo da célula, não uma legenda. */}
                <span className="flex flex-wrap items-baseline gap-x-1.5">
                  <span className="paper-eyebrow text-ink" title={AREA_FULL_LABELS[area]}>
                    {AREA_SHORT_LABELS[area]}
                  </span>
                  <span className="font-mono text-sm tabular-nums text-ink">
                    {caixa.pct.toFixed(0)}%
                  </span>
                </span>
                {/* O nome por extenso não some do documento só porque não coube
                    na tela: quem lê por leitor de tela recebe a linha inteira. */}
                <span className="sr-only">
                  {caixa.rotulo}, {caixa.n.toLocaleString("pt-BR")} questões
                </span>
              </>
            ) : (
              <span className="sr-only">
                {caixa.rotulo}, {caixa.pct.toFixed(0)}%, {caixa.n.toLocaleString("pt-BR")} questões
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
