/**
 * O que a landing v8 afirma, DERIVADO do dataset — nunca digitado.
 *
 * ## Por que este módulo é o coração do porte
 *
 * A peça em `web/design/facies-landing-v8.html` é um HTML autocontido: cada
 * número foi copiado do dataset uma vez e ali congelou. Foi essa a falha real do
 * desenho, duas vezes — uma afirmação de formato medida em 100 questões ao lado
 * de um método que dizia `n = 1.763`, e números de maquete da v7 que não têm
 * campo em lugar nenhum.
 *
 * Portar a peça sem este módulo seria levar o congelamento junto. Aqui cada
 * afirmação tem um caminho até a fonte, e uma que perca o lastro vira erro de
 * tipo ou `null`, não texto errado na tela.
 *
 * ## A pasta é `_rascunho-v8`, com underscore, de propósito
 *
 * Pasta iniciada por `_` é privada no App Router: o Next não a transforma em
 * rota. O código existe, é compilado pelo `typecheck` e não é alcançável nem por
 * acidente. Promover é renomear a pasta.
 */
import {
  NACIONAL,
  TOTAL_BANCAS,
  bancasEmDestaque,
  nomeCurto,
  rotuloCurado,
  slugCurto,
} from "@/lib/facies";
import { diasAte, todasAsProvas } from "@/lib/provas";
import { dataCurta, revisaoPorExamKey } from "@/lib/revisao";
import { todasAsBancas } from "@/lib/facies";
import {
  dataDoRegistro,
  hashCurto,
  listaDaManchete,
  previsaoPorExamKey,
} from "@/lib/previsao";
import { coberturaDaListaPublicada } from "@/lib/cobertura";

/** O prefixo do slug da família ENARE/ENAMED, como `lib/facies.ts` já o escreve. */
const PREFIXO_FAMILIA = "exame-nacional-de-residencia-medica-ebserh";

/**
 * ⚠️ AS DUAS BASES NÃO PODEM SE MISTURAR, e foi confundi-las que produziu a
 * afirmação frágil da primeira versão:
 *
 *   o QUE a prova pergunta → 1.763 questões, 9 aplicações (série composta)
 *   COMO a prova pergunta  →   557 classificadas por formato (família)
 *
 * Por isso `serie` e `forma` são campos separados, e cada um carrega o próprio
 * `n`. Quem escrever a copy tem de citar o `n` que vem junto do número.
 */
/**
 * Quantos dias o cadastro concede, de graca e sem cartao.
 *
 * ⚠️ FONTE DE VERDADE:  (DIAS_DE_TRIAL).
 * E constante de OUTRO runtime, entao nao da para importar -- ela e repetida
 * aqui e  le o arquivo Python e reprova se
 * os dois divergirem. Sem esse laco isto vira o que ja aconteceu em
 * , que ate hoje diz "trial de 14 dias".
 */
export const DIAS_DE_TRIAL = 30;

export type Base = { n: number; do_que: string };

export function dadosDaLanding() {
  const prova = todasAsProvas()[0];
  if (!prova) return null;

  const familia = todasAsBancas().find((b) => (slugCurto(b) ?? b.slug).startsWith(PREFIXO_FAMILIA)
    || b.slug.startsWith(PREFIXO_FAMILIA));

  // A distribuição por área da edição medida. A soma tem de fechar em 100: se um
  // dia não fechar, a grade de cem quadrados deixa de ser "um por questão".
  const areas = prova.areas.linhas;
  const somaAreas = areas.reduce((s, l) => s + l.qtd, 0);

  // O formato, medido na família e não na edição direta.
  const dist = familia?.formato?.distribuicao ?? [];
  const baseFormato = dist.reduce((s, d) => s + d.qtd, 0);
  const incorreta = dist.find((d) => d.codigo === "pede_incorreta") ?? null;

  // Observado x esperado: o esperado é ajustado por tema (migration 129), então
  // não é a média nacional crua. `null` quando o motor não publicou a linha.
  const assinatura = familia?.assinatura?.find((a) => a.medida === "pede_incorreta") ?? null;
  const padronizada = familia?.padronizada?.linhas ?? [];
  const piPad = padronizada.find((l) => l.medida === "pede_incorreta") ?? null;
  // A medida que o motor MEDIU E NÃO PUBLICOU — o intervalo dela cruza 1. Ela
  // entra na página como limitação, não como achado.
  const naoPublicada = padronizada.find((l) => l.exibivel === false) ?? null;

  // `previsaoPorExamKey` e `listaDaManchete` já existem, e com elas o hash e a
  // data do registro deixam de ser string solta na página: `hashCurto` e
  // `dataDoRegistro` são as mesmas formatações que o resto do produto usa.
  const revisao = revisaoPorExamKey(prova.exam_key);
  const previsao = previsaoPorExamKey(prova.exam_key);
  const listaPrevista = previsao ? listaDaManchete(previsao) : undefined;
  // ⚠️ `coberturaDaListaPublicada` devolve null quando o artefato de cobertura
  // descreve OUTRA lista (sha ou tamanho diferentes). O bloco some em vez de
  // anunciar a cobertura de uma lista que não está na tela.
  const cobertura = coberturaDaListaPublicada(prova.exam_key);

  return {
    prova,
    familia: familia ?? null,

    areas,
    somaAreas,
    /** Verdadeiro só enquanto a maior área passar de um terço. A copy do herói
     *  diz "mais de um terço"; se isto virar falso, a frase tem de mudar. */
    maiorAreaPassaDeUmTerco: (areas[0]?.pct ?? 0) > 100 / 3,

    forma: {
      base: { n: baseFormato, do_que: "questões classificadas por formato" } as Base,
      incorreta,
      assinatura,
      padronizada: piPad,
      naoPublicada,
    },

    serie: {
      base: {
        n: prova.profundidade.questoes_rotuladas,
        do_que: "questões rotuladas na série composta",
      } as Base,
      aplicacoes: prova.profundidade.aplicacoes_na_serie,
      anosCorrelatos: prova.mais_cai.anos_correlatos,
      anosDiretos: prova.mais_cai.anos_diretos,
      linhas: prova.mais_cai.linhas,
    },

    nacional: { total: NACIONAL.total, bancas: TOTAL_BANCAS },

    // Quantas provas têm fácies medida: as bancas do acervo + a prova em
    // destaque (provas.json), que tem a face profunda e não entra na lista de
    // bancas. É o "+1" que o herói, o rodapé e as objeções citam — derivado
    // aqui uma vez para os três não divergirem (o defeito do AREA_HEX paralelo,
    // já documentado em lib/areaIdentity.ts).
    provasComFacies: TOTAL_BANCAS + 1,

    previsao: previsao
      ? {
          itens: listaPrevista?.lista ?? [],
          hash: hashCurto(previsao.content_sha256),
          registradoEm: dataDoRegistro(previsao.registered_at),
          cobertura: cobertura
            ? {
                mediaPct: cobertura.cobertura_media_pct,
                minimaPct: cobertura.cobertura_minima_pct,
                confiancaPct: cobertura.confianca_pct,
                lift: cobertura.lift,
                alvos: cobertura.alvos,
              }
            : null,
        }
      : null,
    // A revisao da ultima semana e as atualizacoes clinicas. Elas NAO entram no
    // score de previsao --  declara  --
    // e a pagina tem de dizer isso, senao o leitor conclui que a mudanca
    // normativa e o motivo de a prova cobrar.
    revisao: revisao
      ? {
          questoes: revisao.estrutura.total_questoes,
          dias: revisao.estrutura.dias,
          temas: revisao.estrutura.total_temas,
          diasLivres: revisao.estrutura.dias_livres_ate_prova,
          notaPrevisao: revisao.honestidade.nota_previsao,
          notaAtualizacoes: revisao.honestidade.nota_atualizacoes,
          atualizacoes: revisao.atualizacoes.slice(0, 3).map((a) => ({
            titulo: a.titulo,
            resumo: a.resumo,
            vigencia: dataCurta(a.vigencia),
            subtemas: a.subtemas,
            fonte: a.fontes.find((f) => f.papel === "primaria") ?? a.fontes[0] ?? null,
          })),
          total: revisao.atualizacoes.length,
        }
      : null,
    // O rotulo CURADO vem primeiro:  devolve "SCMSP" onde a curadoria
    // diz "Santa Casa", e sigla de hospital num chip nao ajuda ninguem a se
    // reconhecer.  existe exatamente para os seis destaques.
    destaques: bancasEmDestaque().map((b) => ({
      rotulo: rotuloCurado(b.slug) ?? nomeCurto(b),
      slug: slugCurto(b),
    })),

    // ⚠️ O único dado que envelhecia sozinho na peça estática. Aqui ele é
    // derivado no servidor a cada render, e `diasAte` já existe em lib/provas.
    diasParaProva: diasAte(prova.aplicacao_prevista),
  };
}

export type DadosDaLanding = NonNullable<ReturnType<typeof dadosDaLanding>>;
