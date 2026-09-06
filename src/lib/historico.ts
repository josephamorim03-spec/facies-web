import dados from "@/data/facies/historico.json";

import { previsaoPorExamKey } from "./previsao";

/**
 * Em quantas provas anteriores cada assunto da lista apareceu.
 *
 * ## O que isto conserta
 *
 * A lista publicada renderiza `posição + rótulo`, e nada mais. A posição 1 e a
 * 42 chegam ao aluno **iguais** — e o plano do motor chama isso pelo nome:
 * "mentira de formato", apresentar N itens como equivalentes quando não são.
 *
 * ⚠️ **A correção óbvia foi medida e reprovada.** A faixa qualitativa
 * (`recorrente`/`ocasional`/`raro`) separa bem na população inteira — 364/959/569
 * observações, critério C5 aprovado —, mas **dentro da lista publicada ela
 * colapsa**: 38 dos 42 são `recorrente` e nenhum é `raro`. É esperado, não
 * surpresa: o topo do ranking *é*, por construção, o que recorre. Uma coluna que
 * repete a mesma palavra 38 vezes em 42 não informa; parece informar, que é pior.
 *
 * O que varia é a contagem crua: 9/9, 8/9, 7/9, 6/9 e 5/9, com 5, 9, 16, 8 e 4
 * assuntos. E ela **não é redundante com a ordem** — a correlação entre posição e
 * presença é −0,51. A posição 38 esteve em 8 das 9 provas; a posição 8, em 6.
 *
 * São dois eixos, e o par é o que permite priorizar:
 *
 * | | |
 * |---|---|
 * | ordem | **peso** — quantas questões o assunto rende |
 * | presença | **constância** — em quantas provas ele apareceu |
 *
 * Um assunto pode ser "sempre lá, pequeno" ou "às vezes, grande". Sem o segundo
 * eixo os dois se parecem.
 *
 * ## Isto é passado, não previsão
 *
 * `presenca` é contagem do que já aconteceu, não probabilidade do que vai
 * acontecer. A distinção não é preciosismo: a probabilidade calibrada foi medida
 * e **reprovada** (Brier bate a taxa-base em 5 de 9 alvos), e publicar um número
 * preditivo aqui seria vender o que a medição negou.
 */
export type Historico = {
  grao: string;
  /** O sha da previsão a que esta medição pertence — ver `historicoDaLista`. */
  previsao_sha256: string;
  /** Quantas edições formam o denominador. */
  edicoes: number;
  /**
   * Rótulo → em quantas edições apareceu.
   *
   * ⚠️ `null` quando o assunto não tem histórico nas correlatas — ele pode ter
   * entrado na lista pela prova direta. Ausência de medida não é medida de
   * ausência, e `0` diria a segunda coisa.
   */
  presenca: Record<string, number | null>;
};

const HISTORICO = dados as Historico;

/**
 * O histórico, **apenas se ele descrever a lista que está publicada**.
 *
 * 🚨 O par tem de estar casado. `previsao.json` é a aposta registrada, com hash
 * conferido contra a tabela append-only — por isso o histórico viaja num arquivo
 * ao lado em vez de virar campo dela: um campo novo mudaria o sha e destruiria a
 * prova de que a lista não foi tocada depois da prova.
 *
 * O preço disso é que os dois podem divergir. Devolver `null` faz a coluna sumir
 * em vez de descrever outra lista — a mesma escolha de `coberturaDaListaPublicada`.
 */
export function historicoDaLista(examKey: string): Historico | null {
  const previsao = previsaoPorExamKey(examKey);
  if (!previsao) return null;
  if (previsao.content_sha256 !== HISTORICO.previsao_sha256) return null;
  if (previsao.headline_grain !== HISTORICO.grao) return null;
  return HISTORICO;
}
