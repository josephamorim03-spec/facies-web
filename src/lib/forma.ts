/**
 * A previsão de FORMA da prova — quantas questões de cada área.
 *
 * ## Por que esta é a única previsão numérica que a página publica
 *
 * Cinco saídas foram medidas contra os alvos do backtest temporal, fora de
 * amostra. Quatro reprovaram: decaimento por recência (ruído), pressão de
 * atualizações clínicas (0,2–0,4% onde o critério exigia 5%), estratificação por
 * área (−7,7%) e probabilidade por assunto (o Brier só bate a taxa-base em 5 de
 * 9 alvos).
 *
 * Esta passou: prever quantas questões cada área terá erra **3,5 pp** em média,
 * medido em quatro alvos seguidos (3,4 / 3,5 / 3,5 / 3,1).
 *
 * A razão é estrutural: a distância de variação total entre anos consecutivos é
 * de **66 pp no subtema** e **16 pp na especialidade**. A prova reamostra o
 * *assunto* e conserva a *forma*.
 *
 * ## O intervalo é por área, e é aí que mora a informação
 *
 * No ENARE, Ginecologia varia 10–11% todo ano (desvio 0,5) e Clínica Médica
 * varia 26–39% (desvio 5,2). Um intervalo único achataria as duas coisas que o
 * aluno precisa distinguir — o que é quase certo e o que é aposta larga.
 *
 * ## Banca sem histórico não vira número
 *
 * Abaixo de 3 edições, "média e desvio" são a própria amostra e o intervalo
 * seria inventado. As 69 bancas nessa situação viajam em
 * `sem_historico_suficiente` **com o motivo** — some da previsão, não do dado.
 */

import dados from "@/data/facies/forma.json";

export type FaixaDeArea = {
  area: string;
  media_pct: number;
  desvio_pct: number;
  /** Já convertido para questões pela prova típica da banca — é assim que o
   *  aluno pensa a prova, e a conversão mora no gerador para não ser refeita. */
  media_questoes: number;
  desvio_questoes: number;
};

export type FormaDaBanca = {
  institution_key: string;
  nome: string;
  edicoes: number;
  anos: number[];
  questoes: number;
  /** Tamanho da ÚLTIMA edição desta banca — a base para converter os pontos
   *  percentuais em questões.
   *
   *  ⚠️ Era a MEDIANA, e a troca vale 2,88 questões (732 alvos, IC 95%
   *  [−4,30, −1,56]). Tamanho de prova muda por decisão administrativa e
   *  PERSISTE; a mediana sobre todo o histórico nunca alcança uma mudança de
   *  formato — PE-Secretaria previa 100 contra 199 reais por quatro anos.
   *
   *  O nome do campo ficou por compatibilidade com o artefato; o rótulo da tela
   *  passou a dizer "a última teve X questões", que é o que o número é. */
  prova_tipica: number;
  areas: FaixaDeArea[];
};

export type SemHistorico = {
  institution_key: string;
  edicoes: number;
  questoes: number;
  motivo: string;
};

export type DadosDaForma = {
  schema_version: string;
  gerado_em: string;
  minimo_de_edicoes: number;
  piso_de_questoes: number;
  metodo: {
    como: string;
    erro_medido_pp: number;
    erro_medido_como: string;
    por_que_a_forma_e_nao_o_assunto: string;
    artefatos: string[];
  };
  bancas: FormaDaBanca[];
  sem_historico_suficiente: SemHistorico[];
};

const DADOS = dados as DadosDaForma;

export const METODO_DA_FORMA = DADOS.metodo;
export const MINIMO_DE_EDICOES = DADOS.minimo_de_edicoes;

/** A forma prevista de uma banca, ou `null` se ela não tem histórico bastante.
 *
 *  Casar por prefixo porque a chave publicada pode carregar sufixo de escopo —
 *  o mesmo cuidado que `lib/facies.ts` já documenta ("casar por prefixo
 *  sobrevive à regeneração da base").
 */
export function formaDaBanca(institutionKey: string): FormaDaBanca | null {
  return (
    DADOS.bancas.find(
      (b) =>
        b.institution_key === institutionKey ||
        b.institution_key.startsWith(institutionKey),
    ) ?? null
  );
}

/** Por que esta banca não tem previsão — para a tela dizer em vez de omitir. */
export function motivoDaAusencia(institutionKey: string): string | null {
  return (
    DADOS.sem_historico_suficiente.find((b) =>
      b.institution_key.startsWith(institutionKey),
    )?.motivo ?? null
  );
}

/** Áreas ordenadas por peso, já sem as que não chegam a meia questão.
 *
 *  Uma área com média 0,3 questão não é informação — é ruído de arredondamento
 *  que ocuparia uma linha na tela e sugeriria precisão que não existe.
 */
export function areasRelevantes(forma: FormaDaBanca): FaixaDeArea[] {
  return forma.areas.filter((a) => a.media_questoes >= 0.5);
}
