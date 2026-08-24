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

/** Quantas bancas o acervo cobre. Derivado, para a comparacao poder citar o
 *  denominador sem ninguem digitar "141" numa string. */
export const TOTAL_BANCAS = DATASET.bancas.length;

/**
 * As bancas dos chips da home. CURADA, e não `slice(0, 6)`.
 *
 * O corte por volume punha SES-DF em primeiro e o Revalida/INEP em quinto —
 * ordem do ACERVO, não da intenção de quem chega. Quem abre a página está
 * decidindo onde prestar, e a lista tem de parecer com o mercado que ele
 * disputa: São Paulo concentra as vagas mais concorridas, e a home não
 * mencionava Unicamp nem UNIFESP.
 *
 * Prefixo, e não slug inteiro: os slugs carregam o nome do hospital por extenso
 * ("...-hospital-das-clinicas-da-faculdade-de-medici") e são truncados de forma
 * imprevisível. Casar por prefixo sobrevive à regeneração da base.
 */
/**
 * O RÓTULO VEM JUNTO, e não da heurística de sigla.
 *
 * `FaciesPicker.sigla()` pega o trecho em caixa alta mais longo do nome do
 * edital, e o próprio comentário dela admite que curar 141 bancas é trabalho
 * editorial que não foi feito. O resultado aparecia nos chips: a Unicamp virava
 * **"FCM"** (de "Faculdade de Ciências Médicas", que está entre parênteses no
 * nome) e a Santa Casa virava **"SCMSP"** — nomes que ninguém usa para falar
 * dessas provas.
 *
 * Curar 141 continua fora de alcance. Curar SEIS não é: são exatamente as que a
 * home mostra, e são as que decidem a primeira impressão. A heurística segue
 * valendo para todas as outras.
 */
const DESTAQUE_PREFIXOS: { prefixo: string; rotulo: string }[] = [
  { prefixo: "sp-universidade-de-sao-paulo-usp-sp", rotulo: "USP-SP" },
  { prefixo: "sp-universidade-estadual-de-campinas-unicamp", rotulo: "Unicamp" },
  { prefixo: "sp-universidade-federal-de-sao-paulo-unifesp", rotulo: "UNIFESP" },
  { prefixo: "sp-santa-casa-de-misericordia-de-sao-paulo-scmsp", rotulo: "Santa Casa" },
  { prefixo: "rs-associacao-medica-do-rio-grande-do-sul-amrigs", rotulo: "AMRIGS" },
  { prefixo: "rj-universidade-federal-do-rio-de-janeiro-ufrj", rotulo: "UFRJ" },
];

/** O rótulo curado da banca, quando existe. `null` devolve o seletor à
 *  heurística — que continua sendo o caminho das outras 135. */
export function rotuloCurado(slug: string): string | null {
  return DESTAQUE_PREFIXOS.find((d) => slug.startsWith(d.prefixo))?.rotulo ?? null;
}

export function bancasEmDestaque(): Banca[] {
  const escolhidas = DESTAQUE_PREFIXOS.map(({ prefixo }) =>
    DATASET.bancas.find((banca) => banca.slug.startsWith(prefixo)),
  ).filter((banca): banca is Banca => banca != null);

  // Rede de segurança: se um prefixo caducar numa regeneração da base, a banca
  // sumiria da home em silêncio e a fileira de chips encolheria sem ninguém
  // perceber. Completar por volume mantém a home sempre com `DESTAQUES` chips.
  for (const banca of DATASET.bancas) {
    if (escolhidas.length >= DESTAQUES) break;
    if (!escolhidas.includes(banca)) escolhidas.push(banca);
  }
  return escolhidas.slice(0, DESTAQUES);
}

/**
 * Incidência média por área no acervo INTEIRO.
 *
 * É o denominador que transforma "Cirurgia 24%" em informação. Sozinho, 24% não
 * diz se a banca cobra muito ou pouco; contra os 14,5% da média, diz que esta
 * prova cobra quase dez pontos a mais — que é literalmente a fácies dela.
 *
 * Derivada da própria base, nunca digitada: a soma bate com `NACIONAL.total`
 * por construção, porque percorre as mesmas bancas que alimentam aquele número.
 * Conferido: 100.601 questões em 141 bancas.
 *
 * O `Map` é montado uma vez, na primeira chamada — são 141 bancas × 7 áreas, e
 * refazer a conta a cada célula do mosaico seria trabalho repetido à toa.
 */
let mediaPorArea: Map<string, number> | null = null;

export function mediaNacionalDaArea(rotulo: string): number | null {
  if (mediaPorArea == null) {
    const soma = new Map<string, number>();
    let geral = 0;
    for (const banca of DATASET.bancas) {
      for (const linha of banca.areas?.linhas ?? []) {
        soma.set(linha.rotulo, (soma.get(linha.rotulo) ?? 0) + linha.n);
        geral += linha.n;
      }
    }
    mediaPorArea = new Map(
      geral > 0 ? [...soma].map(([nome, n]) => [nome, (n / geral) * 100]) : [],
    );
  }
  return mediaPorArea.get(rotulo) ?? null;
}

export function bancaPorSlug(slug: string): Banca | undefined {
  return DATASET.bancas.find((banca) => banca.slug === slug);
}

/**
 * A janela que a base INTEIRA cobre — do ano mais antigo ao mais recente.
 *
 * Existe para a home poder dizer "de quando é isto" ao lado de "quanto é isto".
 * Contagem sem recorte de tempo não responde a pergunta que quem compra faz
 * primeiro, e é a mesma disciplina do `janela()` por banca logo abaixo: número
 * nesta página nunca aparece sem o seu denominador.
 *
 * Derivada, nunca digitada: some sozinha do ar quando a base for regerada, e
 * não vira uma segunda verdade sobre o mesmo dado.
 */
export function janelaNacional(): string | null {
  const anos = DATASET.bancas.flatMap((banca) =>
    banca.primeiro_ano && banca.ultimo_ano ? [banca.primeiro_ano, banca.ultimo_ano] : [],
  );
  if (anos.length === 0) return null;
  const min = Math.min(...anos);
  const max = Math.max(...anos);
  return min === max ? String(min) : `${min}–${max}`;
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
