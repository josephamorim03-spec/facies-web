/**
 * A fácies por PROVA — com base composta declarada.
 *
 * Diferente de `facies.ts`, que lê 141 fácies chaveadas por instituição. Uma
 * prova tem uma fonte direta e pode ter fontes correlatas: as aplicações que ela
 * substituiu e que seguem a mesma matriz. O ENAMED absorveu a 1ª fase do ENARE e
 * a 1ª fase do Revalida, e a série dele só faz sentido somando as três.
 *
 * A leitura por instituição continua valendo e vira um caso particular, não o
 * produto inteiro.
 */

import dados from "@/data/facies/provas.json";

export type LinhaSerie = {
  rotulo: string;
  /** A grande área do subtema. As DIRETAS mandam; a correlata só preenche o que
   *  a direta não viu.
   *
   *  Opcional porque um subtema pode não ter especialidade classificada — e
   *  porque até 2026-08-30 ela era `null` em TODAS as linhas: o campo já era
   *  emitido, mas a população que o alimenta não carregava `especialidade`.
   *  Campo que existe e nunca chega preenchido é pior que campo ausente, então
   *  o tipo diz que pode faltar. */
  area?: string | null;
  score: number;
  diretas: number;
  correlatas: number;
  total_serie: number;
  exibivel: boolean;
  serie: number[];
};

export type Prova = {
  slug: string;
  sigla: string;
  exam_key: string;
  nome: string;
  aplicacao_prevista: string;
  cadernos_previstos: string;
  alternativas_declaradas: number;
  questoes_declaradas: number;
  profundidade: {
    questoes_rotuladas: number;
    diretas: number;
    /** Anuladas da fonte direta: contam na dimensão (migration 118) mas não são
     *  servidas. São SUBCONJUNTO de `diretas`, que desde 2026-08-29 mede o que a
     *  prova cobrou — a identidade é `questoes_declaradas === diretas`, não a
     *  soma das duas. Diz quantas das declaradas não dá para praticar. */
    questoes_anuladas: number;
    correlatas: number;
    aplicacoes_na_serie: number;
    aplicacoes_diretas: number;
    subtemas_mapeados: number;
  };
  base: {
    direta: { questoes: number; anos: number[] };
    correlatas: { nome: string; questoes: number; peso: number }[];
  };
  validacao:
    | {
        status: "medido";
        grao: string;
        acertos: number;
        de: number;
        acerto_pct: number;
        piso_pct: number;
        lift: number | null;
        universo: number;
        edicoes_diretas: number;
        /**
         * O mesmo método medido em TODAS as edições anteriores das correlatas,
         * treinando só com o passado de cada uma.
         *
         * Existe porque o lift acima é UMA medição. Publicar um ponto medido
         * uma vez como se fosse o desempenho esperado apresenta o melhor caso
         * como típico — e o histórico mostra que houve edição abaixo do acaso
         * quando a base era pequena.
         *
         * O intervalo é mais forte que o ponto, não mais fraco: duvidar de um
         * número medido uma vez é razoável; duvidar de uma faixa medida em
         * várias exige argumentar contra o método.
         */
        historico:
          | {
              status: "medido";
              medicoes: number;
              mediana: number;
              minimo: number;
              maximo: number;
              recentes: number;
              recentes_mediana: number;
              recentes_minimo: number;
              recentes_maximo: number;
            }
          | { status: "insuficiente"; medicoes: number };
      }
    // União DISCRIMINADA: o segundo membro precisa listar os status possíveis,
    // não `string`. Com `string` o TypeScript não consegue estreitar por
    // `status === "medido"` — e o componente perderia a checagem justamente no
    // painel que declara o n=1.
    | { status: "sem fontes correlatas" | "edicao direta sem rotulo" };
  formato: {
    base: number;
    distribuicao: { codigo: string; qtd: number; pct: number }[];
    alternativas: { n: number; qtd: number; pct: number }[];
  };
  mais_cai: {
    anos_correlatos: number[];
    anos_diretos: number[];
    universo: number;
    cobertura_direta: number;
    linhas: LinhaSerie[];
  };
  areas: { cobertura: number; linhas: { rotulo: string; qtd: number; pct: number }[] };
};

const DATASET = dados as unknown as {
  gerado_em: string;
  peso_correlata: number;
  piso_n_celula: number;
  provas: Prova[];
};

export const PESO_CORRELATA = DATASET.peso_correlata;
export const PISO_N_CELULA = DATASET.piso_n_celula;

export function todasAsProvas(): Prova[] {
  return DATASET.provas;
}

export function provaPorSlug(slug: string): Prova | undefined {
  return DATASET.provas.find((prova) => prova.slug === slug);
}

/** Dias até a aplicação. Negativo depois dela — quem chama decide o que dizer. */
export function diasAte(iso: string): number {
  const alvo = new Date(`${iso}T00:00:00`);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
}

/**
 * Rótulo humano dos formatos de item. Espelha `ROTULO_FORMATO` do gerador do
 * dataset por instituição — os dois leem a mesma allowlist do backend.
 */
export const ROTULO_FORMATO: Record<string, string> = {
  certo_errado: "certo/errado",
  pede_incorreta: "pede a incorreta",
  verdadeiro_falso: "verdadeiro/falso",
  assertivas_numeradas: "assertivas (I, II, III)",
  correlacionar_colunas: "correlacionar colunas",
  direta: "múltipla escolha direta",
};
