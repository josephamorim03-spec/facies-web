/**
 * As atualizações clínicas datadas — o que mudou na medicina, com procedência.
 *
 * ## Por que isto NÃO é previsão, e o tipo diz isso
 *
 * O termo de pressão foi medido contra 14 aplicações fora de amostra e
 * **reprovado**: ganho de 0,2–0,4% no lift onde o critério, escrito antes de
 * medir, exigia 5%; e melhora em 5–8 dos 14 alvos onde exigia 10. A causa é
 * estrutural — os subtemas tocados caem nas posições 39 a 281 do ranking, e um
 * termo aditivo limitado não fecha um vão desses.
 *
 * Por isso `metodo.entra_no_score` é `false` no dado, e não uma convenção de
 * código: quem ler o JSON sozinho descobre a mesma coisa. Se algum dia o termo
 * passar, o campo vira `true` no gerador, não numa flag espalhada pela UI.
 *
 * ## O que a tela pode afirmar
 *
 * Fato verificável: a data de vigência, a distância até a prova, a fonte
 * primária e o subtema ligado. **Não** pode afirmar que aquilo vai cair, nem que
 * uma mudança recente "não influenciou" a prova — a janela de elaboração foi
 * varrida no backtest e nenhum valor dela passou nos critérios.
 */

import dados from "@/data/facies/atualizacoes.json";

export type FonteAtualizacao = {
  url: string;
  /** `primaria` ancora a linha. `gatilho_nacional` é o que autoriza um evento
   *  internacional a existir — sem ele o banco recusa a aprovação. */
  papel: string;
  titulo: string | null;
};

export type Atualizacao = {
  slug: string;
  titulo: string;
  resumo: string | null;
  /** `normativa` (o Estado mudou a regra) ou `epidemiologica` (mudou o que está
   *  acontecendo). Pesos separados no motor, porque as duas se comportam
   *  diferente — e o backtest reprovou as duas, separadamente. */
  classe: string;
  /** A forma do DOCUMENTO, não o assunto: `pcdt`, `portaria`, `incorporacao_conitec`,
   *  `exclusao_conitec`, `calendario_vacinal`, `alerta_epidemiologico`… */
  nivel: string;
  ambito: string;
  vigencia: string;
  relevancia: number;
  subtemas: string[];
  fontes: FonteAtualizacao[];
  /** Positivo = a mudança é anterior à prova. Negativo = posterior.
   *  É distância, não causalidade. */
  dias_antes_da_prova: number;
};

export type CoberturaFonte = {
  fonte: string;
  nome: string;
  papel: string;
  /** `null` = nunca varrida. A tela precisa mostrar isso: fonte esquecida tem de
   *  virar buraco visível, não silêncio. */
  varrido_ate: string | null;
};

export type DadosAtualizacoes = {
  gerado_em: string;
  aplicacao_referencia: string;
  cobertura_das_fontes: CoberturaFonte[];
  fontes_nunca_varridas: string[];
  metodo: { entra_no_score: boolean; por_que: string; artefato: string };
  atualizacoes: Atualizacao[];
};

const DADOS = dados as DadosAtualizacoes;

export const ATUALIZACOES: Atualizacao[] = DADOS.atualizacoes;
export const COBERTURA_FONTES: CoberturaFonte[] = DADOS.cobertura_das_fontes;
export const FONTES_NUNCA_VARRIDAS: string[] = DADOS.fontes_nunca_varridas;
export const METODO_ATUALIZACOES = DADOS.metodo;
export const APLICACAO_REFERENCIA = DADOS.aplicacao_referencia;

/** Rótulo curto do nível, para quem não é do ramo. O código é do documento; o
 *  aluno não precisa saber que "SECTICS" existe. */
export const ROTULO_NIVEL: Record<string, string> = {
  pcdt: "Protocolo do Ministério",
  portaria: "Portaria",
  nota_tecnica: "Nota técnica",
  incorporacao_conitec: "Entrou no SUS",
  exclusao_conitec: "Saiu do SUS",
  calendario_vacinal: "Calendário vacinal",
  alerta_sanitario: "Alerta da Anvisa",
  diretriz_sociedade: "Diretriz de sociedade",
  alerta_epidemiologico: "Alerta epidemiológico",
  boletim_mudanca_patamar: "Mudança de patamar",
  emergencia_declarada: "Emergência declarada",
};

/** As que tocam algum dos assuntos da lista. Usada para cruzar o radar com a
 *  fácies da prova — sem afirmar que o cruzamento prevê coisa alguma. */
export function atualizacoesDeSubtemas(rotulos: string[]): Atualizacao[] {
  const alvo = new Set(rotulos);
  return ATUALIZACOES.filter((a) => a.subtemas.some((s) => alvo.has(s)));
}

/** A fonte primária, que é a que pode ser citada. `gatilho_nacional` serve para
 *  justificar âmbito internacional, não para ancorar. */
export function fontePrimaria(a: Atualizacao): FonteAtualizacao | null {
  return a.fontes.find((f) => f.papel === "primaria") ?? null;
}
