import dados from "@/data/facies/revisao_final.json";

/**
 * A Semana Final de Revisão — a seleção única que o ebook e o app compartilham.
 *
 * ## Por que este módulo só lê, e nunca calcula
 *
 * As 30 questões foram escolhidas UMA vez, no kbank
 * (`scripts/build_revisao_final_dataset.py`), a partir da previsão CONGELADA e da
 * base real da prova. Se esta camada recalculasse qualquer coisa — reordenar um
 * dia, trocar uma questão — o ebook publicado e a revisão no app divergiriam, e
 * a promessa "as mesmas 30 questões" quebraria em silêncio. Aqui dentro só há
 * tipos e acesso: a decisão já foi tomada e viajou dentro do arquivo.
 *
 * ## O comentário pode faltar, e isso é dito na cara
 *
 * `comentario` é `null` quando não há diagnóstico NOSSO para a questão — nunca
 * texto inventado nem editorial de terceiro (migration 101). A página renderiza
 * gabarito sempre e comentário quando houver, e `cobertura_comentario` diz
 * quantos dos 30 ficaram sem. Um V1 com 0/30 não é defeito do dataset: é a
 * decisão editorial (D10 da spec) ainda não executada.
 */

export type QuestaoRevisao = {
  question_id: string;
  enunciado: string;
  /** Mapa letra → texto: `{"A": "...", "B": "..."}`. */
  alternativas: Record<string, string>;
  /** A letra da alternativa correta. */
  gabarito: string;
  ano: number | null;
  fonte: string | null;
  acesso: string | null;
  /** Diagnóstico por distrator da Fácies, ou `null` quando não há. */
  comentario: Record<string, string> | null;
  padrao_cobranca: Record<string, unknown> | null;
};

export type DiaRevisao = {
  dia: number;
  subtema: string;
  posicao_previsao: number;
  score_previsao: number | null;
  questoes: QuestaoRevisao[];
};

export type FonteAtualizacao = { url: string; papel: string; titulo: string };

export type AtualizacaoRevisao = {
  slug: string;
  titulo: string;
  resumo: string;
  classe: string;
  nivel: string;
  ambito: string;
  vigencia: string;
  relevancia: number;
  dias_antes_da_prova: number;
  subtemas: string[];
  fontes: FonteAtualizacao[];
};

export type RevisaoFinal = {
  schema_version: string;
  exam_key: string;
  exam_label: string;
  gerado_em: string;
  aplicacao_prevista: string | null;
  estrutura: {
    grao: string;
    carga_por_dia: number[];
    total_questoes: number;
    dias_livres_ate_prova: number;
  };
  fonte_previsao: {
    content_sha256: string;
    method_version: string;
    registered_at: string;
  };
  dias: DiaRevisao[];
  atualizacoes: AtualizacaoRevisao[];
  modelo_prova: {
    questoes_declaradas: number;
    alternativas_declaradas: number;
    formato: {
      base: number;
      distribuicao: { codigo: string; qtd: number; pct: number }[];
      alternativas: { n: number; qtd: number; pct: number }[];
    };
    areas: { cobertura: number; linhas: { rotulo: string; qtd: number; pct: number }[] };
  };
  honestidade: {
    lift: number | null;
    acerto_pct: number | null;
    piso_pct: number | null;
    historico_mediana: number | null;
    historico_minimo: number | null;
    historico_maximo: number | null;
    nota_previsao: string;
    nota_atualizacoes: string;
  };
  cobertura_comentario: { total: number; com_comentario: number; sem_comentario: number };
};

/**
 * UMA revisão por arquivo, e não um array — o mesmo padrão de `previsao.ts`.
 * Quando uma segunda prova ganhar revisão, isto vira um mapa por `exam_key`, e o
 * acesso por chave abaixo já não muda o call site.
 */
const REVISAO = dados as unknown as RevisaoFinal;

export function revisaoPorExamKey(examKey: string): RevisaoFinal | undefined {
  return REVISAO.exam_key === examKey ? REVISAO : undefined;
}

export function revisaoFinal(): RevisaoFinal {
  return REVISAO;
}

export function diasDaRevisao(revisao: RevisaoFinal): DiaRevisao[] {
  return [...revisao.dias].sort((a, b) => a.dia - b.dia);
}

/** `2026-09-13` → `13/09/2026`. Determinístico: `toLocale*` varia com o locale
 *  do build e viraria uma segunda verdade na tela. */
export function dataCurta(iso: string | null): string {
  if (!iso) return "";
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}
