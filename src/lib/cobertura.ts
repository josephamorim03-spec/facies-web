import dados from "@/data/facies/cobertura.json";

import { previsaoPorExamKey } from "./previsao";

/**
 * O que a lista publicada COBRE da prova.
 *
 * A página mostra os assuntos, a data e o hash — e até agora não dizia quanto
 * deles cai. É a única coisa que o aluno precisa saber antes de decidir estudar
 * por eles, e o número existe: medido fora de amostra em 14 alvos das séries
 * ENARE e Revalida.
 *
 * ## Duas afirmações, e publicar só a primeira promete demais
 *
 * `coberturaMediaPct` é o ano típico; `coberturaMinimaPct` é o piso que se
 * sustenta em 90% das edições. Uma página que diga apenas "cobre 32%" estará
 * errada em metade dos anos — o mesmo defeito de publicar a mediana do tamanho
 * da prova em vez da última edição, que já custou 2,88 questões de erro.
 *
 * ⚠️ ESTE ARQUIVO NÃO CALCULA NADA. O artefato vem de
 * `scripts/build_cobertura_dataset.py`, que lê a curva medida e recusa
 * interpolar: se o tamanho publicado não estiver entre os medidos, ele aborta
 * em vez de inventar um ponto. Um número interpolado apareceria na tela com a
 * mesma autoridade dos medidos.
 */
export type PontoDaCurva = {
  n: number;
  cobertura_media_pct: number;
  cobertura_minima_pct: number;
  lift: number;
};

export type Cobertura = {
  /** Quantos assuntos a lista publica. Tem de bater com `base_composition.top_n`. */
  top_n: number;
  grao: string;
  /** O sha da previsão a que esta medição pertence — ver `coberturaDaListaPublicada`. */
  previsao_sha256: string;
  /** Quanto da prova a lista cobre num ano típico. */
  cobertura_media_pct: number;
  /** O piso que se sustenta em `confianca_pct` das edições. */
  cobertura_minima_pct: number;
  confianca_pct: number;
  /** Quantas vezes melhor que uma lista do MESMO tamanho tirada ao acaso. */
  lift: number;
  /** Alvos do backtest que sustentam os números. */
  alvos: number;
  series: string[];
  curva: PontoDaCurva[];
};

const COBERTURA = dados as Cobertura;

/**
 * A cobertura, **apenas se ela descrever a lista que está publicada**.
 *
 * 🚨 O PAR TEM DE ESTAR CASADO. `cobertura.json` carrega o `previsao_sha256` da
 * lista que foi medida. Se alguém reexportar a previsão e esquecer de regerar a
 * cobertura, os dois arquivos passam a descrever listas diferentes — e a página
 * anunciaria a cobertura de uma lista que não está na tela, sem nada quebrar.
 *
 * Devolver `null` faz o bloco sumir em vez de mentir. É a mesma escolha do
 * `previsao` ausente: silêncio é honesto, número errado não.
 */
export function coberturaDaListaPublicada(examKey: string): Cobertura | null {
  const previsao = previsaoPorExamKey(examKey);
  if (!previsao) return null;
  if (previsao.content_sha256 !== COBERTURA.previsao_sha256) return null;
  if (previsao.base_composition.top_n !== COBERTURA.top_n) return null;
  return COBERTURA;
}
