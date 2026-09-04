import dados from "@/data/facies/previsao.json";

/**
 * A aposta registrada — a lista congelada ANTES da prova.
 *
 * ## Por que este dataset existe separado de `provas.json`
 *
 * `provas.json` é uma MEDIÇÃO: ele é regerado sempre que o acervo muda, e é isso
 * que se espera dele. Esta previsão é o oposto — ela vale exatamente por não
 * poder mudar. O arquivo é a cópia byte-a-byte do artefato registrado em
 * `artifacts/raio-x/previsao-<prova>-<carimbo>.json`, que por sua vez é o
 * espelho de uma linha APPEND-ONLY em `facies_prediction_registry`.
 *
 * Misturá-lo ao dataset de medição faria a próxima regeração reescrever a
 * aposta, que é precisamente o que o registro existe para impedir.
 *
 * ## O hash é verificável de fora, e é por isso que ele é publicado
 *
 * `content_sha256` cobre oito campos — `exam_key`, `application_year`,
 * `predictions`, `headline_grain`, `headline_metric`, `base_composition`,
 * `taxonomy_signature` e `method_version` — serializados com `sort_keys` e
 * separadores compactos (`json.dumps(..., sort_keys=True,
 * separators=(",", ":"), ensure_ascii=False)`).
 *
 * Quem duvidar recalcula. `tests/unit/previsao-hash.test.mjs` recalcula a cada
 * build: se alguém editar um rótulo da lista, o teste quebra antes de a página
 * ir ao ar afirmando um hash que não corresponde ao conteúdo.
 *
 * ⚠️ O `headline_grain` está DENTRO do hash de propósito. Congelar a lista sem
 * congelar o grão deixaria a escolha do número para depois de ver o resultado —
 * no grão `theme` a mesma lista cobre metade da taxonomia (42 de 65) e o
 * lift infla sozinho. A regra de decisão é registrada junto com a previsão.
 */

export type ItemPrevisto = {
  posicao: number;
  rotulo: string;
  /** Soma ponderada: diretas + 0,4 × correlatas. Não é contagem de questões. */
  score: number;
  /** Questões da edição direta já lida que caíram neste rótulo. */
  diretas: number;
};

export type ListaPorGrao = {
  grao: string;
  universo: number;
  /** Quantos por cento uma lista do MESMO tamanho, tirada ao acaso, cobriria.
   *  Ele sobe com `top_n`: uma lista maior cobre mais por ser maior, e sem o
   *  piso ao lado o lift de uma lista grande pareceria bom só por tamanho. */
  piso_pct: number;
  /** Empates na fronteira do corte: > 0 significa que o ÚLTIMO lugar foi
   *  sorteio entre iguais. Medido ao escolher o tamanho: 40 dava 2 empates e
   *  42 dá 0 — foi isso que decidiu o corte publicado. */
  empates_na_fronteira: number;
  fontes: Record<string, { questoes: number; unidades: number }>;
  lista: ItemPrevisto[];
};

export type Previsao = {
  id: string;
  exam_key: string;
  exam_label: string;
  application_year: number;
  method_version: string;
  headline_grain: string;
  headline_metric: string;
  content_sha256: string;
  taxonomy_signature: string;
  registered_at: string;
  base_composition: {
    direta: { questoes: number };
    correlatas: { nome: string; questoes: number; peso: number }[];
    top_n: number;
  };
  predictions: Record<string, ListaPorGrao>;
};

/**
 * UMA previsão por arquivo, e não um array.
 *
 * O registrador grava um artefato por prova e por ciclo. Quando a segunda prova
 * ganhar aposta, isto vira um mapa por `exam_key` — e é por isso que o acesso
 * abaixo já é por chave, e não uma exportação direta do objeto: o call site não
 * muda quando a forma mudar.
 */
const PREVISAO = dados as unknown as Previsao;

export function previsaoPorExamKey(examKey: string): Previsao | undefined {
  return PREVISAO.exam_key === examKey ? PREVISAO : undefined;
}

export function todasAsPrevisoes(): Previsao[] {
  return [PREVISAO];
}

/**
 * A lista da manchete — a que o `headline_grain` congelado manda mostrar.
 *
 * Devolve `undefined` em vez de cair para outro grão: um grão ausente é defeito
 * do dataset, e mostrar o grão errado silenciosamente é exatamente a troca de
 * número que o hash existe para impedir.
 */
export function listaDaManchete(previsao: Previsao): ListaPorGrao | undefined {
  return previsao.predictions[previsao.headline_grain];
}

/** `2026-08-30 02:49:14.757037+00` → `30/08/2026`. Determinístico: `toLocale*`
 *  varia com o locale do build e viraria uma segunda verdade na tela. */
export function dataDoRegistro(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

/** As primeiras 12 casas do sha256. O hash inteiro tem 64 e não cabe numa peça
 *  de Instagram nem numa linha de celular; a página publica os 64. */
export function hashCurto(sha: string): string {
  return sha.slice(0, 12);
}
