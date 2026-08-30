/**
 * As medidas da questão anotada — dado e contrato, sem UI.
 *
 * ## Por que este arquivo existe separado de `QuestaoAnotada.tsx`
 *
 * Ele nasceu de um bug que passou por typecheck, lint, 138 testes e build.
 *
 * `TOTAL_DE_MARCAS` estava exportado de `QuestaoAnotada.tsx`, que é
 * `"use client"`, e `SecaoNoveMedidas` (server component) o importava para o
 * painel de números. O Next substitui exports NÃO-componentes de um módulo
 * cliente por um proxy que lança ao ser chamado — e `String(proxy)` não lança:
 * serializa a função. O painel foi para produção com
 * `function(){throw Error("Attempted to call TOTAL_DE_MARCAS() from the
 * server…")}` no lugar do número, em 40px.
 *
 * Nenhuma ferramenta pegou. Tipo de **valor** cruzando a fronteira
 * servidor↔cliente é invisível para o `tsc` (o tipo está certo; o que muda é o
 * módulo que o runtime entrega) e invisível para o build (a página compila e
 * renderiza). Só aparece lendo o HTML servido.
 *
 * A regra que sobra: **valor compartilhado entre servidor e cliente mora em
 * módulo sem `"use client"`**. Tipo pode cruzar — ele é apagado. Valor não.
 */

/**
 * As medidas, na ordem do artboard `3a`.
 *
 * Ela não é arbitrária: começa no que se vê primeiro lendo a questão (tamanho,
 * comando, negações, imagem), passa para o que se pede, e fecha no grão fino
 * (formato, assunto exato). É a ordem em que um leitor humano encontraria cada
 * coisa.
 *
 * ## As duas que voltaram, e por que sair foi certo e voltar também
 *
 * "Quantos dados clínicos" e "Alternativas parecidas" foram REMOVIDAS daqui
 * porque não eram computadas em lugar nenhum do faciesbank. Estava certo: a
 * página anunciava nove e entregava sete.
 *
 * Voltaram porque passaram a existir. `scripts/backfill_medidas_de_forma.py`
 * (commit `c881b01`, "as medidas de forma passam a existir no acervo") grava
 * `n_dados_clinicos`, `densidade_dados_clinicos` e `paralelismo_alternativas`
 * em `metadata->'charge_profile'`, com as funções em `charge_heuristics.py`.
 *
 * ⚠️ A SEGUNDA MUDOU DE NOME, e a mudança é do faciesbank, não minha.
 * "Alternativas parecidas" sugere proximidade DIAGNÓSTICA — e o campo mede
 * proximidade TEXTUAL (`difflib.SequenceMatcher`). "Dengue" e "Chikungunya" são
 * textualmente distantes e clinicamente vizinhas; "Amoxicilina 500 mg 8/8h" e
 * "Amoxicilina 875 mg 12/12h" são o inverso. O que a medida vê bem é
 * PARALELISMO: alternativas que repetem a estrutura e mudam num detalhe — a
 * questão discrimina por detalhe, não por conceito. É informação útil, e é a
 * única que o número sustenta.
 *
 * ⚠️ Nenhuma das duas tem valor de PROVA, como cinco das outras: o gerador do
 * dataset (`build_facies_dataset.py`) recalcula o formato na hora e não lê
 * `charge_profile`. Medida existe, valor não é publicado — que é exatamente o
 * que a linha "medida, ainda não publicada" diz.
 *
 * Ainda ficam de fora medidas que o acervo já computa e o desenho não lista:
 * `n_alternatives`, `reasoning_type` (eixo pedagógico) e `trap_pattern`.
 *
 * ## ESTA LISTA É A FONTE ÚNICA, e isso conserta um defeito que já aconteceu
 *
 * `ORDEM` define quais medidas existem; `Chave` é derivada dela; o número (01,
 * 02…) é a POSIÇÃO, calculada na hora.
 *
 * Antes, o número era escrito à mão em duas listas — a das medidas e a das
 * âncoras dentro do enunciado. Duas medidas foram removidas, a numeração andou,
 * e as âncoras passaram a apontar para o lugar errado em silêncio: "conduta
 * inicial" apontava para uma marca `08` que tinha deixado de existir, e o
 * trecho do caso clínico acendia "Formato da resposta". Nada quebrou, nada
 * avisou — a demonstração central da seção só passou a mentir.
 *
 * Agora não compila. Tirar uma medida daqui encolhe `Chave`, e toda âncora órfã
 * no enunciado vira erro de tipo; `Record<Chave, …>` obriga cada medida a ter
 * nome e leitura. O `typecheck` é o guard, sem script novo.
 */
export const ORDEM = [
  "tamanho",
  "incorreta",
  "negacoes",
  "imagem",
  "dados",
  "formato",
  "paralelismo",
  "pede",
  "assunto",
] as const;

export type Chave = (typeof ORDEM)[number];

/** Quantas medidas a seção tem. Derivado, para o painel de números nunca
 *  discordar da lista que está logo abaixo dele. */
export const TOTAL_DE_MARCAS = ORDEM.length;

/** Uma leitura do acervo: o valor, sobre o que ele foi medido, e a régua. */
export type ValorDoAcervo = {
  valor: string;
  /** O denominador, sempre. Número sem base é o que gerou a confusão. */
  base: string;
  /** O extremo do acervo, para um número do meio poder ser lido. */
  regua?: string;
};

export type Marca = {
  chave: Chave;
  /** Posição na lista, não identidade. A identidade é a `chave`. */
  n: string;
  nome: string;
  porque: string;
  /** O que esta questão marca. Sempre existe: a questão é nossa e é curta. */
  naQuestao: string;
  /** O que o ACERVO marca. `null` quando a medida não chega ao dataset público. */
  noAcervo: ValorDoAcervo | null;
};

/**
 * ══ A MEDIDA AQUI É DO ACERVO INTEIRO, e não de uma prova ════════════════════
 *
 * Esta seção mostrava os números do ENAMED — "100% múltipla escolha direta em 90
 * questões de 2026", "291 assuntos em 1.717 questões da série". Estava no meio
 * de uma home que NÃO é sobre o ENAMED, e cujo argumento é o oposto: que cada
 * prova tem cara própria e a média não serve para ninguém.
 *
 * Um laudo de uma prova específica ali fazia a seção contradizer a página. Aqui
 * a afirmação é outra e é a certa para o lugar: **isto é medido em todo o
 * acervo, questão por questão**. A prova de que a medida existe é a régua; a
 * fácies de cada prova é o que as páginas de destino entregam.
 *
 * ## Por que a comparação com a média é legítima AQUI
 *
 * O projeto de design proibiu comparar com a média nacional, e tinha razão no
 * caso que examinou: o peso por área depende da classificação por assunto, cuja
 * cobertura é mediana de 72,7% — comparar bancas em cima disso é comparar
 * quanto cada uma foi rotulada, não quanto ela cobra.
 *
 * Formato é outro caso: os dois lados são a mesma coisa — proporção entre as
 * questões cujo formato foi lido — e a cobertura é alta e uniforme. Medido em
 * 2026-08-28: mediana de 97,9% por banca, mínimo 90,7%. A base viaja com o
 * número na tela, então quem duvidar tem o denominador à vista.
 */
export type DadosDoAcervo = {
  /**
   * Questões com o formato lido — `NACIONAL.total`. É o denominador de TODA
   * medida de formato desta seção, e ele aparece na tela junto com o número.
   */
  base: number;
  /** Quantas bancas o acervo cobre. */
  bancas: number;
  /**
   * "Pede a incorreta" no acervo, e o extremo.
   *
   * O extremo não é enfeite: ele é o que torna a média legível. "7,3%" sozinho
   * não diz se as provas variam muito ou pouco — com "até 29,2% numa banca" ao
   * lado, a frase da seção ("cada prova tem cara própria") deixa de ser
   * afirmação e vira medida.
   */
  incorreta: { pct: number; extremo: number | null };
  /** O formato mais frequente do acervo. */
  dominante: { rotulo: string; pct: number } | null;
};

const pct = (valor: number) =>
  `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

/** O que cada medida é, e o que ESTA questão marca nela. Não depende da prova. */
const MEDIDA: Record<Chave, { nome: string; porque: string; naQuestao: string }> = {
  tamanho: {
    nome: "Tamanho do enunciado",
    porque: "Caso longo exige raciocínio; enunciado curto exige leitura rápida do comando.",
    naQuestao: "47 palavras",
  },
  incorreta: {
    nome: "Pede a alternativa errada?",
    porque: "“Assinale a incorreta” muda completamente o que vale treinar.",
    naQuestao: "não — pede a mais adequada",
  },
  negacoes: {
    nome: "Quantidade de negações",
    porque: "“Não”, “sem”, “exceto” — o maior produtor de erro por leitura apressada.",
    naQuestao: "2 — “sem sangramento”, “sem dor”",
  },
  imagem: {
    nome: "Tem imagem?",
    porque: "Foto, traçado, exame. Estudar só por texto prepara mal para prova de imagem.",
    naQuestao: "não",
  },
  dados: {
    nome: "Quantos dados clínicos",
    // ⚠️ A metade "e quantas existem só para confundir" NÃO entra na frase.
    // Contar achados com valor é uma coisa; saber quais restringem o
    // diagnóstico é outra, e a contagem não sabe. Prometer a segunda com o
    // número da primeira é a classe de afirmação que esta seção existe para não
    // fazer.
    porque: "Quantas informações com valor a questão dá — idade, sinal vital, exame.",
    naQuestao: "6 — idade, atraso, náusea, PA, teste, ausências",
  },
  formato: {
    nome: "Formato da resposta",
    porque: "Alternativa direta, combinação de assertivas, verdadeiro ou falso.",
    naQuestao: "alternativa direta",
  },
  paralelismo: {
    nome: "Paralelismo entre alternativas",
    porque: "Alternativas que repetem a estrutura e mudam num detalhe: discrimina por detalhe, não por conceito.",
    naQuestao: "alto — A e B repetem “iniciar o pré-natal”",
  },
  pede: {
    nome: "O que a questão pede",
    porque: "Diagnóstico, conduta, rastreio — e se cobra primeira, segunda ou terceira linha.",
    naQuestao: "conduta inicial",
  },
  assunto: {
    nome: "O assunto exato",
    porque: "Não “SOP”, mas “SOP em quem quer engravidar”. É esse nível que muda o estudo.",
    naQuestao: "pré-natal de baixo risco · rotina",
  },
};

export function marcasDoAcervo(dados: DadosDoAcervo): Marca[] {
  // UM denominador para as duas medidas publicadas, e ele é o mesmo que a prosa
  // da seção cita. Duas frases para a mesma base foi o que já fez esta página
  // exibir 90 e 1.717 sob nomes quase idênticos, e ser lida como erro.
  const noAcervo = `${dados.base.toLocaleString("pt-BR")} questões com o formato lido · ${dados.bancas} bancas`;

  const leitura: Record<Chave, ValorDoAcervo | null> = {
    tamanho: null,
    incorreta: {
      valor: pct(dados.incorreta.pct),
      base: noAcervo,
      regua: dados.incorreta.extremo
        ? `até ${pct(dados.incorreta.extremo)} numa banca`
        : undefined,
    },
    negacoes: null,
    imagem: null,
    dados: null,
    paralelismo: null,
    formato: dados.dominante
      ? { valor: `${pct(dados.dominante.pct)} ${dados.dominante.rotulo}`, base: noAcervo }
      : null,
    pede: null,
    /**
     * ⚠️ O ASSUNTO NÃO GANHA NÚMERO, e a ausência é deliberada.
     *
     * A tentação é publicar a união dos rótulos de `mais_cai` das bancas — dá
     * 191. Mas `mais_cai` traz os QUINZE mais cobrados de cada banca, então 191
     * é o tamanho do topo somado, não o número de assuntos distintos do acervo:
     * só o ENAMED mapeia 291 sozinho. Publicar 191 como "assuntos distintos"
     * seria um número errado numa seção cujo argumento inteiro é medir bem.
     *
     * Fica no device que a própria seção já tem ("medida, ainda não publicada"),
     * que é honesto: a medida existe questão a questão no faciesbank, e o
     * dataset público não a agrega. Um número nacional de verdade exige o
     * `build_facies_dataset.py` emiti-lo.
     */
    assunto: null,
  };

  return ORDEM.map((chave, indice) => ({
    chave,
    n: String(indice + 1).padStart(2, "0"),
    ...MEDIDA[chave],
    noAcervo: leitura[chave],
  }));
}
