/**
 * A Fácies da prova — leitura do dataset estático.
 *
 * O dado NÃO vem do banco em tempo de requisição. A página pública é servida
 * estática de CDN porque o tráfego dela é pico de WhatsApp: centenas de acessos
 * em minutos, disparados por um print, sem aviso. Agregação ao vivo cai
 * justamente na hora que importa, e a primeira impressão do funil inteiro vira
 * tela de erro.
 *
 * O arquivo é gerado por `scripts/build_facies_dataset.py` **no repositório
 * kbank** (pdf_extractor_api), não neste — ele lê o acervo rotulado direto de
 * lá, em read-only, e o resultado é commitado aqui. Procurar o gerador nesta
 * árvore não acha nada, e isso já custou uma investigação.
 *
 * Regenerar: rodar o script no kbank e substituir `src/data/facies/*.json`.
 * O `gerado_em` viaja dentro do JSON, então a data na tela nunca mente sobre o
 * acervo — e o produto vende exatamente medida auditável.
 *
 * Latência de um dia é irrelevante para dado de cinco anos; latência de um ano
 * não é — por isso `GERADO_EM` (mais abaixo) sai do próprio dataset e não de
 * uma constante escrita à mão, que divergiria do arquivo na primeira troca.
 */

import dados from "@/data/facies/facies.json";
import { cohenH, decidirExibicao } from "@/lib/distintividade";

export type FormatoLinha = {
  codigo: string;
  rotulo: string;
  qtd: number;
  pct: number;
  /**
   * Decisão do gerador — ver `build_facies_dataset.py`.
   *
   * Opcional porque o dataset em produção pode ser anterior à mudança. Quando
   * ausente, a regra é recalculada aqui com os mesmos limiares; quando presente,
   * ela manda. Assim regerar o dataset não exige novo deploy de código, e as
   * duas pontas nunca discordam.
   */
  exibivel?: boolean;
};

export type AlternativaLinha = { n: number; qtd: number; pct: number };

export type Banca = {
  slug: string;
  institution_key: string;
  nome: string;
  uf: string | null;
  total: number;
  questoes_total: number;
  questoes_recentes: number;
  primeiro_ano: number | null;
  ultimo_ano: number | null;
  grao_confiavel: string;
  leitura: string[];
  formato: {
    distribuicao: FormatoLinha[];
    alternativas: AlternativaLinha[];
  };
  mais_cai: {
    cobertura: number;
    base: number;
    linhas: { rotulo: string; n: number; exibivel: boolean }[];
  };
  areas: {
    cobertura: number;
    base: number;
    linhas: { rotulo: string; n: number; pct: number }[];
  };
};

export type Nacional = {
  total: number;
  formato_pct: Record<string, number>;
  alternativas_pct: Record<string, number>;
};

const DATASET = dados as unknown as {
  gerado_em: string;
  piso_n_celula: number;
  nacional: Nacional;
  bancas: Banca[];
};

/** Piso do §14.3: abaixo disto a célula não exibe número. */
export const PISO_N_CELULA = DATASET.piso_n_celula;

export const NACIONAL = DATASET.nacional;

export const GERADO_EM = DATASET.gerado_em;

/**
 * Bancas em destaque na home, por volume recente.
 *
 * A home carrega só estas para poder trocar de banca sem ida ao servidor; o
 * dataset inteiro passa de 600 KB e não cabe no primeiro carregamento de quem
 * abriu o link no corredor, entre um paciente e outro.
 */
export const DESTAQUES = 6;

export function todasAsBancas(): Banca[] {
  return DATASET.bancas;
}

export function bancasEmDestaque(): Banca[] {
  return DATASET.bancas.slice(0, DESTAQUES);
}

export function bancaPorSlug(slug: string): Banca | undefined {
  return DATASET.bancas.find((banca) => banca.slug === slug);
}

/** Janela declarada da base, para a página nunca exibir número sem denominador. */
export function janela(banca: Banca): string {
  if (!banca.primeiro_ano || !banca.ultimo_ano) return "janela não declarada";
  if (banca.primeiro_ano === banca.ultimo_ano) return String(banca.primeiro_ano);
  return `${banca.primeiro_ano}–${banca.ultimo_ano}`;
}

/**
 * As linhas de formato que merecem a tela, da mais característica para a menos.
 *
 * **Ponto único de decisão.** O cartão de OpenGraph tinha a própria regra e a
 * página não tinha nenhuma — a versão que circula no WhatsApp era mais
 * criteriosa que a que o aluno lia. Os dois consomem esta função.
 */
export function formatoDistintivo(linha: FormatoLinha, base: number): boolean {
  if (linha.codigo === "direta") return false;
  return decidirExibicao(
    linha.exibivel,
    linha.qtd,
    base,
    linha.pct,
    NACIONAL.formato_pct[linha.codigo] ?? 0,
  );
}

export function formatosDistintivos(banca: Banca): FormatoLinha[] {
  const base = banca.questoes_total;
  const forca = (linha: FormatoLinha) =>
    Math.abs(cohenH(linha.pct, NACIONAL.formato_pct[linha.codigo] ?? 0));
  return banca.formato.distribuicao
    .filter((linha) => formatoDistintivo(linha, base))
    .sort((a, b) => forca(b) - forca(a));
}
