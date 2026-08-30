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
import slugsCurtos from "@/data/facies/slugs.json";
import { BASE_MINIMA, cohenH, decidirExibicao } from "@/lib/distintividade";

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
  /** Quantas das `questoes_total` são anuladas.
   *
   *  Elas voltaram a CONTAR sem voltar a ser SERVIDAS (migration 118): o
   *  ENARE tem 100 questões por edição e a leitura dizia 90, porque a projeção
   *  que alimenta o gerador exclui anulada. O total agora bate com a prova, e
   *  `mais_cai`/`formato` seguem sem elas — anulada não representa o que a
   *  banca cobra. */
  questoes_anuladas: number;
  /** A prova desta banca ainda existe, e se não, o aluno faz qual?
   *
   *  `null` quando ninguém decidiu — 138 das 141 hoje. NÃO é "está ativa":
   *  preencher por omissão afirmaria, sobre a informação mais cara de errar
   *  desta página, o que ninguém verificou. */
  situacao: {
    situacao: "ativa" | "aderiu_enare" | "processo_unificado" | "extinta";
    alvo_atual: string | null;
    ultima_edicao: number | null;
    nota: string | null;
    fonte: string | null;
  } | null;
  /** O MESMO acervo lido pelo eixo da PROVA, e não da disciplina médica.
   *
   *  `câncer de esôfago` vive sob Clínica Médica na árvore e cai no caderno de
   *  Cirurgia — os dois eixos discordam por desenho (migration 119).
   *
   *  ⚠️ `cobertura` é a metade honesta do número: hoje ela fica entre 1,2% e
   *  9% (mediana 4,1%), porque só 8 nós estão mapeados. O ENARE aparece como
   *  "100% Cirurgia" sobre cobertura de 4,3% — sem mostrar a cobertura, essa
   *  barra parece um achado. Campo NOVO ao lado de `areas`, não substituto. */
  blocos: {
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

/**
 * Nomes que a estrutura do rótulo do edital não resolve.
 *
 * A regra abaixo funciona porque quase todo nome segue
 * `UF - Nome por extenso - SIGLA qualificador (hospital)`. Estes não seguem, e
 * inventar heurística para eles quebraria os outros 139.
 */
const NOME_CURTO_FIXO: { prefixo: string; nome: string }[] = [
  { prefixo: "exame-nacional-de-residencia-medica-ebserh", nome: "ENARE" },
  { prefixo: "revalida-nacional-instituto-nacional", nome: "Revalida" },
];

/**
 * O nome CURTO da banca — o que aparece em título, chip e cartão.
 *
 * `banca.nome` é o rótulo do edital, e ele é longo por obrigação legal:
 * "SP - Universidade de São Paulo - USP - SP (Hospital das Clínicas da
 * Faculdade de Medici". Usá-lo cru produzia títulos como "A fácies da SP -
 * Universidade de São Paulo - USP - SP (Hospital…" — que não cabe em aba, não
 * cabe em prévia de WhatsApp e não é como ninguém chama a prova.
 *
 * A estrutura do rótulo é regular o bastante para extrair:
 *
 *   1. cai o prefixo de UF  ("SP - ")
 *   2. cai o que está entre parênteses (o hospital-sede)
 *   3. do que sobra, a CAUDA depois do primeiro " - " é a sigla com o seu
 *      qualificador — "USP - SP" vira "USP-SP", "SES DF" vira "SES-DF"
 *   4. sem cauda (ou com cauda longa demais), fica o nome limpo inteiro
 *
 * Medido nas 141: 139 nomes distintos, média de 7,3 caracteres. A heurística
 * anterior — pegar o trecho em caixa alta mais longo — dava 19 colisões
 * (sete bancas viravam "SMS", cinco viravam "SES") e cortava no meio da palavra
 * quando não achava sigla ("Faculdade de Medic").
 *
 * Colisão resolve por UF, como o edital faz. Se ainda assim empatar, volta o
 * nome inteiro: dois botões com o mesmo texto é pior que um botão comprido.
 */
export function nomeCurto(banca: Banca): string {
  const fixo = NOME_CURTO_FIXO.find((n) => banca.slug.startsWith(n.prefixo));
  if (fixo) return fixo.nome;

  const curto = extrairNomeCurto(banca.nome);
  if (contarNomeCurto(curto) === 1) return curto;

  const comUf = banca.uf ? `${curto}-${banca.uf}` : curto;
  if (contarNomeCurto(comUf, true) === 1) return comUf;

  return limparNome(banca.nome);
}

function limparNome(nome: string): string {
  return nome
    .replace(/^\s*[A-Za-zÀ-ÿ]{2,10}\s*-\s*/, "")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .trim();
}

function extrairNomeCurto(nome: string): string {
  const limpo = limparNome(nome);
  const partes = limpo
    .split(/\s+-\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (partes.length >= 2) {
    const cauda = partes.slice(1).join("-");
    // 24 caracteres: acima disso a "sigla" não é sigla, é outro nome por
    // extenso — e aí o nome principal informa mais.
    if (cauda.length <= 24) return cauda.replace(/\s+/g, "-");
  }
  return partes[0] || limpo;
}

/** Quantas bancas produzem este mesmo nome curto. Memoizado: são 141 nomes e a
 *  contagem é consultada uma vez por chip, título e cartão. */
let indiceNomeCurto: Map<string, number> | null = null;
let indiceComUf: Map<string, number> | null = null;

function contarNomeCurto(candidato: string, comUf = false): number {
  if (indiceNomeCurto == null) {
    indiceNomeCurto = new Map();
    indiceComUf = new Map();
    for (const banca of DATASET.bancas) {
      const curto = extrairNomeCurto(banca.nome);
      indiceNomeCurto.set(curto, (indiceNomeCurto.get(curto) ?? 0) + 1);
      const chave = banca.uf ? `${curto}-${banca.uf}` : curto;
      indiceComUf.set(chave, (indiceComUf.get(chave) ?? 0) + 1);
    }
  }
  const indice = comUf ? indiceComUf! : indiceNomeCurto;
  return indice.get(candidato) ?? 0;
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
 *
 * ⚠️ Aqui havia "Conferido: 100.601 questões em 141 bancas", e o dataset já
 * tinha sido regerado duas vezes desde então — a contagem mudou nas duas. Não
 * adianta trocar pelo número do dia: o invariante é o que está escrito acima
 * ("bate com `NACIONAL.total`"), e ele se verifica sozinho. Contagem fixa em
 * comentário é afirmação com prazo de validade.
 *
 * O `Map` é montado uma vez, na primeira chamada — é o acervo inteiro × 7 áreas, e
 * refazer a conta a cada barra do painel seria trabalho repetido à toa.
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

/**
 * A banca pela chave que o OBJETIVO do aluno carrega.
 *
 * `bancaPorSlug` serve a URL pública; esta serve a ponte com o app. O objetivo
 * do aluno guarda `institution_key` (`StudentTargetExamItem`), e é a MESMA
 * chave deste dataset: `student_objectives_service._resolve_institution` valida
 * a chave declarada contra o vocabulário de instituições do banco de questões,
 * que é de onde `build_facies_dataset.py` também lê. Chave inventada é recusada
 * no onboarding, com `unknown_institution_key`.
 *
 * ⚠️ Devolve `null` sem drama. Uma banca pode estar no catálogo de objetivos e
 * ainda não ter fácies publicada — o dataset só publica quem passa do piso de
 * questões recentes. A tela precisa dizer isso, não quebrar.
 */
export function bancaPorInstitutionKey(chave: string | null | undefined): Banca | undefined {
  const alvo = (chave ?? "").trim();
  if (!alvo) return undefined;
  return DATASET.bancas.find((banca) => banca.institution_key === alvo);
}

export function bancaPorSlug(slug: string): Banca | undefined {
  return DATASET.bancas.find((banca) => banca.slug === slug);
}

/**
 * ══ A URL PÚBLICA DA BANCA ═══════════════════════════════════════════════════
 *
 * `banca.slug` é o slug LONGO que o gerador do kbank deriva do `institution_key`
 * e trunca em 80 caracteres:
 *
 *     sp-universidade-de-sao-paulo-usp-sp-hospital-das-clinicas-da-faculdade-de-medici
 *
 * Ele não cabe numa mensagem, não sobrevive ao boca a boca e o truncamento corta
 * no meio da palavra. A URL servida é a CURTA — `/prova/usp-sp` —, e ela vem de
 * `slugs.json`, um mapa `institution_key → slug` CONGELADO.
 *
 * ⚠️ POR QUE CONGELADO, e não derivado de `nomeCurto` na hora: `nomeCurto`
 * desempata consultando o dataset inteiro (`contarNomeCurto`). Uma banca nova
 * pode virar o nome curto de outra — e a URL dela mudaria sozinha na regeração
 * seguinte, matando em silêncio todo link já colado em grupo e toda página já
 * indexada. O rótulo EXIBIDO pode evoluir; o endereço não.
 *
 * O slug longo continua existindo e tem um consumidor só: os 301 de
 * `/facies/<longo>` em `next.config.js`, e o casamento por prefixo de
 * `rotuloCurado`/`DESTAQUE_PREFIXOS`.
 *
 * Acrescentar banca: `node scripts/gerar-slugs-facies.mjs`.
 * Os invariantes (completude, unicidade, colisão com prova, entrada órfã) são
 * conferidos por `scripts/check-slugs-facies.mjs`, dentro do `npm run lint`.
 */
const SLUGS_CURTOS = slugsCurtos as Record<string, string>;

/**
 * A URL desta banca. `null` quando ela ainda não tem slug fixado — o que só
 * acontece com dataset regerado sem rodar o gerador, e é exatamente o caso que o
 * guard reprova. Quem chama trata como "sem página", nunca inventa endereço.
 */
export function slugCurto(banca: Banca): string | null {
  return SLUGS_CURTOS[banca.institution_key] ?? null;
}

/** O caminho público da banca, pronto para `href`. `null` sem slug fixado. */
export function caminhoDaBanca(banca: Banca): string | null {
  const slug = slugCurto(banca);
  return slug ? `/prova/${slug}` : null;
}

/**
 * A banca pela URL curta. Índice montado uma vez — a rota resolve 138 bancas e
 * varrer o array a cada requisição seria trabalho repetido à toa.
 */
let porSlugCurto: Map<string, Banca> | null = null;

export function bancaPorSlugCurto(slug: string): Banca | undefined {
  if (porSlugCurto == null) {
    porSlugCurto = new Map();
    for (const banca of DATASET.bancas) {
      const curto = SLUGS_CURTOS[banca.institution_key];
      if (curto) porSlugCurto.set(curto, banca);
    }
  }
  return porSlugCurto.get(slug);
}

/** As bancas que têm URL — as que `generateStaticParams` pode emitir. */
export function bancasComPagina(): { banca: Banca; slug: string }[] {
  return DATASET.bancas.flatMap((banca) => {
    const slug = SLUGS_CURTOS[banca.institution_key];
    return slug ? [{ banca, slug }] : [];
  });
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

/**
 * O EXTREMO do acervo para um formato — a banca que mais o usa.
 *
 * Existe para um zero poder ser lido. "0%" sozinho não informa nada: pode ser a
 * medida não ter rodado, o formato não existir no país, ou a prova ser mesmo
 * uma exceção. Com a régua ao lado (nacional 7,2%, extremo 29,2%) as três
 * leituras se separam sozinhas.
 *
 * Derivado, nunca digitado — mesma disciplina de `mediaNacionalDaArea`: some
 * sozinho quando o dataset for regerado, em vez de virar uma segunda verdade.
 */
let extremoPorFormato: Map<string, number> | null = null;

/**
 * ⚠️ DOIS FILTROS, e a conferência provou que os dois são necessários.
 *
 * Sem filtro nenhum, o extremo de "pede a incorreta" sai **31%** — da FHEMIG,
 * que tem 517 questões mas só **197 com formato classificado (38%)**. Não é
 * base pequena: 197 sustenta uma proporção. É base SELECIONADA — 31% daquelas
 * 197, e ninguém sabe se as outras 320 se parecem com elas.
 *
 * Com o piso de cobertura, o extremo é **29,2%**, do HECI: 428 questões, 96%
 * classificadas. O número quase não muda; o que muda é ele ser um fato sobre a
 * banca em vez de um fato sobre qual subconjunto foi rotulado.
 *
 * O corte é 50% porque o resultado é o MESMO de 50 a 95 — medido. Escolher 90
 * seria mais severo sem comprar nada, e descartaria 30 bancas à toa.
 *
 * ⚠️ MEDIDO NO DATASET DE 2026-08-28 13:xx, e a regeração das 15:04 CONSERTOU
 * o caso: a cobertura mínima subiu de 14,8% para 90,7%, e a FHEMIG deixou de
 * existir como exceção. Procurar hoje pelos 38% não acha nada.
 *
 * O filtro fica assim mesmo. Ele custa uma linha, e a próxima regeração pode
 * reintroduzir o buraco sem avisar ninguém — extremo é a estatística que mais
 * atrai o caso defeituoso, porque basta UM. Guard que só existe enquanto o bug
 * está visível é guard que sai justamente antes de ser preciso.
 */
const COBERTURA_MINIMA_DE_FORMATO = 50;

export function extremoNacionalDoFormato(codigo: string): number | null {
  if (extremoPorFormato == null) {
    const maximo = new Map<string, number>();
    for (const banca of DATASET.bancas) {
      const linhas = banca.formato?.distribuicao ?? [];
      // A base do percentual é a soma das linhas, NÃO `questoes_total`: o `pct`
      // do gerador é calculado sobre o que foi classificado. Usar o total aqui
      // compararia um número com o denominador de outro.
      const base = linhas.reduce((soma, linha) => soma + linha.qtd, 0);
      const cobertura = banca.questoes_total > 0 ? (base / banca.questoes_total) * 100 : 0;
      if (base < BASE_MINIMA || cobertura < COBERTURA_MINIMA_DE_FORMATO) continue;
      for (const linha of linhas) {
        const atual = maximo.get(linha.codigo) ?? 0;
        if (linha.pct > atual) maximo.set(linha.codigo, linha.pct);
      }
    }
    extremoPorFormato = maximo;
  }
  return extremoPorFormato.get(codigo) ?? null;
}

/**
 * ⚠️ PONTO CEGO CONHECIDO de `formatosDistintivos`: ausência não vira linha.
 *
 * A função itera `banca.formato.distribuicao`, e o gerador só emite linha para
 * o formato que **ocorreu**. Um formato com `qtd 0` não existe naquela lista,
 * então nenhum ajuste de filtro faz a função dizer "esta prova não usa um
 * formato que 7,2% do acervo usa" — ela não tem sobre o que iterar.
 *
 * Não é hipotético: para o ENAMED o fato mais característico É um zero. Nenhuma
 * das 90 questões pede a incorreta, contra 7,2% nacional e 29,2% no extremo.
 *
 * A correção é iterar as chaves de `NACIONAL.formato_pct` em vez da
 * distribuição, aplicando a mesma `decidirExibicao`. Ela **não está aqui de
 * propósito**: escrevi a função, e ela não teria chamador de verdade. A seção
 * 03 mostra o zero com a régua ao lado (contexto, que não precisa de corte
 * estatístico), e o painel que precisaria da versão "notável" é o de banca, que
 * pede decisão de UI própria. Função exportada sem caminho vivo é o que este
 * repositório já pagou caro para aprender a não fazer.
 *
 * Quando o painel de banca for mexido, começar por aqui.
 */
