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

/**
 * Um assunto do dia, com as questões que ele oferece.
 *
 * ⚠️ Isto era `DiaRevisao`, com `subtema` e `questoes` direto no dia — porque a
 * estrutura antiga tinha UM assunto por dia. Com seis por dia, o dia virou
 * contêiner e o assunto virou esta entidade. A separação importa além do
 * formato do JSON: enquanto o dia carregava as questões, existiam dois tipos de
 * assunto (o que tinha questões e o que não tinha), e essa assimetria vazava
 * para o layout.
 */
export type TemaRevisao = {
  subtema: string;
  posicao_previsao: number;
  score_previsao: number | null;
  /**
   * `false` quando o assunto está abaixo do corte da previsão registrada.
   *
   * A aposta publicada com data e hash congela 30 posições. Da 31 em diante o
   * ranking existe e o método é o mesmo, mas ninguém prometeu — e a página tem
   * de dizer isso, senão os 42 se passariam por 42 apostas registradas.
   */
  na_aposta_registrada: boolean;
  questoes: QuestaoRevisao[];
};

export type DiaRevisao = {
  dia: number;
  temas: TemaRevisao[];
};

/**
 * Uma classe medida do padrão de cobrança, com a contagem que a sustenta.
 *
 * `n` e `fracao` viajam juntos de propósito: "62% das questões" sem o `n` deixa
 * o leitor supor uma base grande, e a base aqui tem entre 16 e 24 questões por
 * assunto. O número pequeno não é defeito — é o recorte "só a prova real" —, mas
 * escondê-lo transformaria uma contagem honesta numa estatística inflada.
 */
export type ClasseMedida = { classe: string; n: number; fracao: number };

/** O que foi CONTADO sobre um subtema — nunca o que foi escrito sobre ele. */
export type EvidenciaSubtema = {
  n_questoes: number;
  anos: { min: number | null; max: number | null; ultimos_3_anos: number };
  answer_type: ClasseMedida[];
  charge_pattern: ClasseMedida[];
  reasoning_type: ClasseMedida[];
  trap_pattern: ClasseMedida[];
  abstencao: Record<string, number>;
  sustenta_afirmacao: boolean;
  metodo: string;
};

export type Armadilha = { erro: string; certo: string };

export type EstruturaEducativa = {
  tipo: "tabela" | "fluxograma";
  titulo: string;
  colunas?: string[];
  linhas?: string[][];
  passos?: string[];
};

export type FonteEducativa = {
  id: string;
  orgao: string;
  titulo: string;
  ano: number | null;
  url: string | null;
};

/**
 * A página educativa de um dia — o corpo do ebook desde a D13.
 *
 * `revisado` é o campo que não pode sumir numa refatoração: ele diz se um humano
 * aprovou aquele texto. Conteúdo médico gerado e não revisado pode aparecer na
 * página (para o operador julgar antes de aprovar), mas nunca sem o aviso — e o
 * aviso é renderizado a partir DESTE campo, não da intenção de quem publicou.
 */
/** A figura REAL de uma questão da base, com a procedência da prova que a
 *  aplicou. Medido em 04/09: 19 dos 42 assuntos têm alguma, então o bloco é
 *  opcional — a página não pode ficar com buraco onde o estoque não existe. */
export type ImagemDaBase = {
  url: string;
  prova: string | null;
  ano: number | null;
  contexto: string | null;
};

/**
 * O que a figura DECIDE na questão.
 *
 * O `tipo` não é rótulo decorativo: um corte de tomografia, uma tabela de
 * resultados e um gráfico epidemiológico exigem leituras diferentes, e chamar
 * os três de "imagem" faz o leitor procurar achado radiológico numa tabela de
 * exames. Sem `leitura` a figura não é publicada — imagem sem interpretação
 * devolve ao aluno exatamente o problema que ele já tem.
 */
export type LeituraDaImagem = {
  tipo:
    | "achado_de_imagem"
    | "quadro_laboratorial"
    | "grafico_epidemiologico"
    | "ilustracao_clinica";
  leitura: string;
};

export type PaginaEducativa = {
  subtema: string;
  /** O dia a que este assunto pertence, carimbado na montagem do dataset. */
  dia: number;
  posicao_previsao: number | null;
  na_aposta_registrada: boolean;
  area: string | null;
  especialidade: string | null;
  revisado: boolean;
  imagem?: ImagemDaBase | null;
  imagem_leitura?: LeituraDaImagem;
  evidencia: EvidenciaSubtema | null;
  resumo_30s: string;
  como_a_prova_cobra: string;
  eixos_citados: string[];
  armadilhas: Armadilha[];
  estrutura: EstruturaEducativa;
  checklist_vespera: string[];
  dispositivo_de_memoria?: { tipo: string; frase: string; decodifica: string };
  fontes: FonteEducativa[];
  afirmacoes_com_dado: { claim: string; fonte: string }[];
  exemplo_de_cobranca: { descricao: string; url_banco?: string };
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
    dias: number;
    temas_por_dia: number;
    questoes_por_tema: number;
    total_temas: number;
    total_questoes: number;
    dias_livres_ate_prova: number;
  };
  fonte_previsao: {
    content_sha256: string;
    method_version: string;
    registered_at: string;
  };
  dias: DiaRevisao[];
  /**
   * Chaveado pelo SUBTEMA.
   *
   * ⚠️ Era `conteudo_educativo`, chaveado pelo número do dia, mais uma segunda
   * coleção para os assuntos que não eram o âncora do dia. Duas coleções para o
   * mesmo tipo de coisa produziram dois caminhos de render, e dois caminhos
   * divergem: a marcação de destaque chegou a um deles e não ao outro. Uma
   * coleção só é o que torna "os 42 iguais" verificável.
   */
  conteudo: Record<string, PaginaEducativa>;
  cobertura_educativa: { aprovados: number; rascunhos: number; ausentes: number };
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

/** A página educativa de um assunto, ou `undefined` quando ele não foi gerado
 *  nem aprovado. O ebook publica uma página a menos — nunca uma página vazia
 *  fingindo que o assunto não tem conteúdo. */
export function paginaEducativa(
  revisao: RevisaoFinal,
  subtema: string,
): PaginaEducativa | undefined {
  return revisao.conteudo?.[subtema];
}

/**
 * Os assuntos de um dia que têm página, na ordem da previsão.
 *
 * Devolve o par tema+página junto porque as duas metades vêm de fontes
 * diferentes — as questões do banco, o texto do artefato educativo — e
 * separá-las na renderização é o que permitiu, antes, um assunto aparecer com
 * questões e sem texto.
 */
export function temasDoDia(
  revisao: RevisaoFinal,
  dia: DiaRevisao,
): { tema: TemaRevisao; pagina: PaginaEducativa }[] {
  return dia.temas
    .map((tema) => ({ tema, pagina: paginaEducativa(revisao, tema.subtema) }))
    .filter(
      (par): par is { tema: TemaRevisao; pagina: PaginaEducativa } =>
        par.pagina !== undefined,
    );
}

/**
 * As atualizações ligadas a UM assunto, da mais recente para a mais antiga.
 *
 * ## Por que isto existe, se a página já lista tudo no rodapé
 *
 * O painel do rodapé responde "o que mudou na medicina"; quem está revisando
 * Diabetes na véspera não vai lê-lo, e se ler não sabe qual das dezenove linhas
 * é da página que tem na frente. O mesmo fato, ao lado do assunto, é a diferença
 * entre um apêndice e um aviso.
 *
 * ⚠️ ISTO NÃO É PREVISÃO, E A PÁGINA TEM DE DIZER ISSO. O termo de pressão por
 * atualização clínica foi medido contra 14 alvos fora de amostra e REPROVADO:
 * ganho de 0,2 a 0,4% onde o critério exigia 5%, com os subtemas tocados caindo
 * nas posições 39 a 281. Ele não entra no score, e a nota que acompanha o painel
 * (`honestidade.nota_atualizacoes`) vale igual aqui.
 *
 * A ordenação é por vigência decrescente porque o que mudou por último é o que o
 * candidato tem menos chance de já ter estudado. `vigencia` é ISO `YYYY-MM-DD`,
 * então a comparação lexicográfica é a cronológica.
 */
export function atualizacoesDoAssunto(
  revisao: RevisaoFinal,
  subtema: string,
): AtualizacaoRevisao[] {
  return revisao.atualizacoes
    .filter((item) => item.subtemas.includes(subtema))
    .sort((a, b) => b.vigencia.localeCompare(a.vigencia));
}

/** A classe mais frequente de um eixo medido, ou `null` quando o classificador
 *  não achou sinal nenhum — caso em que a página não deve afirmar padrão. */
export function classeModal(
  evidencia: EvidenciaSubtema | null,
  eixo: "answer_type" | "charge_pattern" | "reasoning_type" | "trap_pattern",
): ClasseMedida | null {
  return evidencia?.[eixo]?.[0] ?? null;
}

/** `próxima_conduta` → `próxima conduta`. O sublinhado é vocabulário do
 *  classificador; o leitor do ebook não deve ver identificador de código. */
export function rotuloDaClasse(classe: string): string {
  return classe.replace(/_/g, " ");
}

/** `2026-09-13` → `13/09/2026`. Determinístico: `toLocale*` varia com o locale
 *  do build e viraria uma segunda verdade na tela. */
export function dataCurta(iso: string | null): string {
  if (!iso) return "";
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}
