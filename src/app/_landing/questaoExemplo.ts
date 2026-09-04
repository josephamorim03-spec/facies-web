/**
 * A questão de demonstração das nove medidas.
 *
 * ## ⚠️ ELA É SINTÉTICA, E A TELA DIZ ISSO
 *
 * Escrita para a peça, não extraída de prova. O motivo é de licenciamento, não
 * de conveniência: as 30 questões reais do ebook vêm do lote de captura
 * `estrategia-med-2016-2026-…`, e `artifacts/raio-x/raio-x-readiness-*.json`
 * marca **8.157 questões (6,06%)** com procedência de agregador e
 * `bloqueia_publicacao: true`. A migration 101 ainda proíbe redistribuir o texto
 * editorial de terceiro.
 *
 * ## Trocar por uma real é UMA LINHA
 *
 * O tipo abaixo é o contrato. Confirmada a procedência — caderno oficial do INEP
 * é documento público —, basta substituir este objeto por outro do mesmo
 * formato. Nenhum componente muda.
 *
 * O perfil foi construído com o que o dataset MEDE do ENAMED: formato direto,
 * quatro alternativas, sem pegadinha de comando. Uma questão de exemplo que
 * contradissesse a fácies da prova ensinaria a coisa errada.
 */
export type Medida = {
  id: string;
  rotulo: string;
  /** O que a medida procura em QUALQUER questão — nunca o que acontece nesta.
   *  A versão anterior trazia exemplos embutidos ("SOP em quem quer engravidar")
   *  que brigavam com o enunciado ao lado. */
  descricao: string;
  /** O valor NESTA questão. */
  valor: string;
  /** Os trechos do enunciado que esta medida enxerga, por índice de fragmento. */
  realca: number[];
};

export type QuestaoExemplo = {
  sintetica: true;
  /** O enunciado quebrado em fragmentos, para as medidas poderem realçar trechos
   *  sem `dangerouslySetInnerHTML` — que `web/CLAUDE.md` proíbe. */
  fragmentos: string[];
  alternativas: { letra: string; texto: string; proxima: boolean }[];
  gabarito: string;
  comentario: string;
  medidas: Medida[];
};

const FRAGMENTOS = [
  "Mulher de 58 anos", // 0
  ", com ",
  "diabetes mellitus tipo 2", // 2
  " ",
  "há 8 anos", // 4
  ", em uso de ",
  "metformina 2 g/dia", // 6
  ", comparece para consulta de rotina. Refere boa adesão. ",
  "IMC 31 kg/m²", // 8
  ". Exames: ",
  "HbA1c 8,4%", // 10
  ", ",
  "filtração glomerular 68 mL/min/1,73 m²", // 12
  ", ",
  "albuminúria 180 mg/g", // 14
  ". ",
  "Nega", // 16
  " hipoglicemias. ",
  "Qual é a conduta mais adequada?", // 18
];

/** Contado, não afirmado: a medida de tamanho não pode divergir do texto ao lado. */
const PALAVRAS = FRAGMENTOS.join("").trim().split(/\s+/).length;

export const QUESTAO_EXEMPLO: QuestaoExemplo = {
  sintetica: true,
  fragmentos: FRAGMENTOS,
  alternativas: [
    { letra: "A", texto: "Associar sulfonilureia.", proxima: true },
    { letra: "B", texto: "Associar inibidor de SGLT2.", proxima: true },
    { letra: "C", texto: "Substituir a metformina por insulina NPH noturna.", proxima: true },
    { letra: "D", texto: "Manter a conduta e reavaliar em 6 meses.", proxima: false },
  ],
  gabarito: "B",
  comentario:
    "Albuminúria com filtração preservada em DM2 põe o inibidor de SGLT2 à frente das outras opções.",
  medidas: [
    {
      id: "tamanho",
      rotulo: "Tamanho do enunciado",
      descricao: "Quantas palavras o caso traz antes do comando.",
      valor: `${PALAVRAS} palavras`,
      realca: [],
    },
    {
      id: "incorreta",
      rotulo: "Pede a alternativa errada?",
      descricao: "Se o comando inverte a lógica e pede a incorreta.",
      valor: "não",
      realca: [18],
    },
    {
      id: "negacoes",
      rotulo: "Quantidade de negações",
      descricao: "Quantos “não”, “sem” e “exceto” aparecem no caminho.",
      valor: "1",
      realca: [16],
    },
    {
      id: "imagem",
      rotulo: "Tem imagem?",
      descricao: "Se a resposta depende de foto, traçado ou exame.",
      valor: "não",
      realca: [],
    },
    {
      id: "dados",
      rotulo: "Quantos dados clínicos",
      descricao: "Quantas informações o caso oferece para decidir.",
      valor: "7",
      realca: [0, 4, 6, 8, 10, 12, 14],
    },
    {
      id: "proximas",
      rotulo: "Alternativas parecidas",
      descricao: "Quantas opções disputam entre si por proximidade.",
      valor: "3 de 4",
      realca: [],
    },
    {
      id: "formato",
      rotulo: "Formato da resposta",
      descricao: "Alternativa única, combinação de assertivas ou certo e errado.",
      valor: "direta · 4",
      realca: [],
    },
    {
      id: "pede",
      rotulo: "O que a questão pede",
      descricao: "Diagnóstico, conduta ou rastreio — e em que linha.",
      valor: "conduta · 2.ª linha",
      realca: [18],
    },
    {
      id: "assunto",
      rotulo: "O assunto exato",
      descricao: "O recorte do tema, no nível que muda o que estudar.",
      valor: "DM2 com doença renal",
      realca: [2, 14],
    },
  ],
};
