import { resolveDisplayArea } from "@/lib/areaDisplay";
import { AREA_FULL_LABELS, AREA_VAR } from "@/lib/areaIdentity";

/**
 * A assinatura da prova numa faixa só — a `.strip` do protótipo.
 *
 * Uma barra dividida em segmentos cuja largura é o peso de cada grande área.
 * Ela não substitui o painel de distribuição: não traz número, não traz a média
 * nacional, e é pequena demais para rótulo. O que ela faz, e nenhum outro
 * elemento da página faz, é permitir COMPARAR provas antes de abrir qualquer
 * uma — o chip deixa de ser um nome e passa a ter forma própria.
 *
 * Duas provas com fácies diferentes ficam visivelmente diferentes aqui, e é
 * essa diferença que a página inteira afirma existir. Antes ela só aparecia
 * depois de dois cliques.
 *
 * Puramente decorativa para o leitor de tela (`aria-hidden`): o nome da banca
 * já está no botão que a contém, e ler sete percentuais em sequência antes de
 * cada chip tornaria a lista impraticável. Quem quiser o número abre a prova.
 */
/**
 * ORDEM FIXA, e ela é o que faz a faixa servir para alguma coisa.
 *
 * `areas.linhas` chega ordenada por incidência, que muda de banca para banca. A
 * primeira renderização mostrou o efeito: o ENAMED abria em azul-cinza-rosa e a
 * USP em azul-laranja-rosa, então comparar duas faixas exigia LER a legenda de
 * cada uma — e a faixa existe justamente para dispensar leitura.
 *
 * Com a sequência fixa, a mesma posição é sempre a mesma área e a diferença
 * entre duas provas salta: a USP tem o bloco de Cirurgia visivelmente maior que
 * o de qualquer outra, e isso se vê sem nome nenhum na tela.
 *
 * O resto ("Outras") vai para o fim de propósito: ele não é uma área, e no meio
 * da sequência quebraria a leitura de vizinhança entre as áreas de verdade.
 */
const ORDEM: string[] = ["CM", "CG", "PD", "GO", "OB", "MP", "OU"];

export function FaixaAreas({
  linhas,
  className = "",
}: {
  linhas: { rotulo: string; pct: number }[];
  className?: string;
}) {
  const segmentos = linhas
    .filter((linha) => linha.pct > 0)
    .map((linha) => ({ ...linha, area: resolveDisplayArea(null, linha.rotulo) }))
    .sort((a, b) => ORDEM.indexOf(a.area) - ORDEM.indexOf(b.area));
  if (segmentos.length === 0) return null;

  const total = segmentos.reduce((soma, linha) => soma + linha.pct, 0);
  if (total <= 0) return null;

  return (
    <span
      aria-hidden="true"
      // `gap` de 1px sobre o fundo da régua: separa segmentos de matiz vizinha
      // sem introduzir borda nem cor nova.
      className={`flex h-6 w-full overflow-hidden rounded-control bg-rule gap-px ${className}`.trim()}
    >
      {segmentos.map(({ area, ...linha }) => {
        return (
          <span
            key={linha.rotulo}
            title={`${AREA_FULL_LABELS[area]} ${linha.pct.toFixed(0)}%`}
            style={{
              // `flexBasis` proporcional em vez de `width`: com o `gap` de 1px
              // entre sete segmentos, larguras em porcentagem somariam mais que
              // 100% e o último seria cortado.
              flex: `${linha.pct} 1 0%`,
              background: AREA_VAR[area] ?? AREA_VAR.OU,
            }}
          />
        );
      })}
    </span>
  );
}
