/**
 * Quando uma proporção desta banca merece a tela.
 *
 * Puro de propósito: nada aqui importa o dataset. A regra é estatística e vale
 * para qualquer par (observado, referência) — o que a torna testável contra
 * números escolhidos à mão, e não só contra o acervo do dia.
 */

/**
 * Distância entre duas proporções — h de Cohen.
 *
 * Diferença em pontos percentuais é a medida errada: 3 pontos sobre uma base de
 * 0,5% e 3 pontos sobre uma base de 50% não são o mesmo fato, porque a variância
 * de uma proporção depende dela mesma. A transformação arco-seno da raiz
 * estabiliza a variância, que é exatamente esse defeito.
 */
export function cohenH(pct: number, pctReferencia: number): number {
  const raiz = (p: number) =>
    Math.asin(Math.sqrt(Math.max(0, Math.min(100, p)) / 100));
  return 2 * raiz(pct) - 2 * raiz(pctReferencia);
}

/**
 * Corte de tamanho de efeito.
 *
 * Cohen sugere 0,2 como "efeito pequeno", mas isso é convenção de pesquisa. Aqui
 * o corte é 0,15, calibrado contra o acervo real: em 0,20 uma banca com 9,7% de
 * certo/errado contra 4,7% nacional (96 questões) sairia da tela, e isso é
 * acionável para quem estuda.
 */
export const H_MINIMO = 0.15;

/**
 * O intervalo de 95% de Wilson da proporção observada exclui a referência?
 *
 * Wilson entra como **decisão**, não como enfeite — mesmo critério que
 * `app/services/homeostasis.py` já aplica à dificuldade. Ele incorpora o tamanho
 * da base nos dois sentidos, e é por isso que substitui um piso de contagem na
 * célula: um piso mataria os desvios **negativos**, que são sinal legítimo. Uma
 * banca com 1.200 questões e apenas 5 que pedem a incorreta (0,4% contra 7,1%)
 * tem célula pequena justamente **porque** essa é a característica dela —
 * confundir raridade com falta de evidência apagaria o achado mais útil.
 */
export function diferencaEhReal(
  qtd: number,
  base: number,
  pctReferencia: number,
): boolean {
  if (!base || base <= 0) return false;
  const z = 1.96;
  const p = Math.max(0, qtd) / base;
  const denom = 1 + (z * z) / base;
  const centro = (p + (z * z) / (2 * base)) / denom;
  const margem =
    (z * Math.sqrt((p * (1 - p)) / base + (z * z) / (4 * base * base))) / denom;
  const baixo = Math.max(0, centro - margem);
  const alto = Math.min(1, centro + margem);
  const referencia = Math.max(0, Math.min(100, pctReferencia)) / 100;
  return referencia < baixo || referencia > alto;
}

/**
 * Base mínima para a pergunta fazer sentido.
 *
 * Wilson incorpora `n`, mas não é suficiente sozinho quando a referência é muito
 * baixa: com base 20 e referência 0,5%, **uma única** ocorrência já produz um
 * intervalo que exclui a referência (medido: `qtd=1, base=20` passa; a mesma
 * ocorrência em `base=120` não passa). O dataset hoje só publica bancas acima de
 * 120 questões recentes, o que mascara o buraco — e depender desse acaso é o
 * tipo de pré-condição implícita que quebra quando a fonte muda.
 */
export const BASE_MINIMA = 100;

/**
 * Duas perguntas, nesta ordem: a diferença é real dado o tamanho da base
 * (Wilson), e ela é grande o bastante para importar (h). Uma sem a outra produz
 * exatamente o que a página exibia — `correlacionar colunas 0% -0`, que são 5
 * questões em 1.486 e nenhuma informação.
 */
export function proporcaoDistintiva(
  qtd: number,
  base: number,
  pct: number,
  pctReferencia: number,
  baseMinima: number = BASE_MINIMA,
): boolean {
  if (base < baseMinima) return false;
  return (
    diferencaEhReal(qtd, base, pctReferencia) &&
    Math.abs(cohenH(pct, pctReferencia)) >= H_MINIMO
  );
}

/**
 * A decisão final, com a precedência certa.
 *
 * O gerador (`build_facies_dataset.py`, no kbank) é a autoridade quando se
 * pronunciou: ele conhece o acervo inteiro e emite `exibivel` por linha, mesmo
 * contrato que `mais_cai` já usava. Quando o campo não vem — dataset anterior à
 * mudança — a regra é recalculada aqui com os mesmos limiares.
 *
 * Essa precedência é parte da regra, não do adaptador: é o que permite regerar
 * o dataset e mudar o que a página exibe **sem novo deploy de código**, e o que
 * garante que as duas pontas nunca discordem.
 */
export function decidirExibicao(
  exibivel: boolean | undefined,
  qtd: number,
  base: number,
  pct: number,
  pctReferencia: number,
): boolean {
  if (typeof exibivel === "boolean") return exibivel;
  return proporcaoDistintiva(qtd, base, pct, pctReferencia);
}
