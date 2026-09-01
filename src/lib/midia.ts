import { bancasComPagina, nomeCurto } from "@/lib/facies";
import { todasAsProvas } from "@/lib/provas";
import { revisaoPorExamKey } from "@/lib/revisao";

/**
 * A central de mídia — o REGISTRO das peças geráveis.
 *
 * ## Por que isto é só enumeração, sem JSX
 *
 * O que decide o catálogo e o que decide a renderização são coisas diferentes.
 * Aqui vive o que é testável e barato: quantos assuntos existem, quais formatos,
 * como se monta o caminho de uma peça. O pixel (Satori/ImageResponse) vive na
 * rota `midia/[peca]/[slug]`, que consome isto.
 *
 * Separando, o guard `check-midia-pecas.mjs` pode reprovar um dataset regerado
 * que esvazie o catálogo SEM precisar renderizar imagem nenhuma.
 *
 * ## Sem backend, sem tabela
 *
 * A fonte é o dataset estático de `provas.json` e `facies.json` — os mesmos que
 * já servem a landing. Nenhuma rota nova toca o banco.
 */

export type FormatoId = "feed" | "story";

/**
 * Dois formatos, não três — o sistema de Instagram do handoff
 * (`Instagram - modelos.dc.html`) é explícito: o quadrado saiu porque a grade do
 * perfil é retrato, e post quadrado entra nela cortado justo no rodapé, onde vive
 * o logotipo. 4:5 (1080×1350) vai ao feed e ao carrossel; 9:16 (1080×1920) vai
 * ao story.
 */
export const FORMATOS: Record<FormatoId, { largura: number; altura: number; rotulo: string }> = {
  feed: { largura: 1080, altura: 1350, rotulo: "Feed 4:5" },
  story: { largura: 1080, altura: 1920, rotulo: "Story 9:16" },
};

export type PeçaId = "cara" | "revisao" | "dado";

/**
 * As peças que a central sabe gerar.
 *
 * `cara` é o pilar 1 do doc de mídia: a mesma fácies pública, refluída nos
 * formatos do Instagram. `revisao` é o ebook da Revisão Final — o plano
 * gratuito "questões + ebook". `dado` é a família C do handoff: um número
 * gigante e uma linha, para o feed lido em movimento. Uma peça nova entra AQUI
 * como item novo, e o catálogo e a rota passam a conhecê-la sem cadastro em
 * outro lugar.
 */
export const PECAS: { id: PeçaId; rotulo: string }[] = [
  { id: "cara", rotulo: "A cara da prova" },
  { id: "revisao", rotulo: "A revisão final" },
  { id: "dado", rotulo: "Um dado só" },
];

/** O alvo de uma peça: uma prova nacional ou uma banca institucional. */
export type Assunto =
  | { tipo: "prova"; slug: string; sigla: string; caminho: string }
  | { tipo: "banca"; slug: string; sigla: string; caminho: string };

/**
 * Os assuntos da peça `cara` — as provas nacionais e as bancas com página.
 *
 * As duas famílias dividem o namespace `/prova/<slug>` de propósito, então o
 * `caminho` (o link gratuito que cada peça carrega) é o mesmo formato para as
 * duas. A banca sem slug fixado em `slugs.json` não vira peça, pelo mesmo motivo
 * de não virar página: sem endereço estável, a peça apontaria para um 404.
 */
export function assuntos(): Assunto[] {
  const provas: Assunto[] = todasAsProvas().map((prova) => ({
    tipo: "prova",
    slug: prova.slug,
    sigla: prova.sigla,
    caminho: `/prova/${prova.slug}`,
  }));
  const bancas: Assunto[] = bancasComPagina().map(({ banca, slug }) => ({
    tipo: "banca",
    slug,
    sigla: nomeCurto(banca),
    caminho: `/prova/${slug}`,
  }));
  return [...provas, ...bancas];
}

/**
 * Os assuntos de uma peça específica. Cada peça escolhe o seu universo e o seu
 * `caminho` — `revisao` só existe para provas com ebook gerado, e o link dela é
 * o do ebook (`/prova/<slug>/revisao-final`), não o da fácies.
 */
export function assuntosDaPeca(pecaId: PeçaId): Assunto[] {
  if (pecaId === "revisao") {
    return todasAsProvas()
      .filter((prova) => revisaoPorExamKey(prova.exam_key) !== undefined)
      .map((prova) => ({
        tipo: "prova",
        slug: prova.slug,
        sigla: prova.sigla,
        caminho: `/prova/${prova.slug}/revisao-final`,
      }));
  }
  return assuntos();
}

export type Peça = { peca: PeçaId; assunto: Assunto };

/**
 * Resolve a peça pelo par `peca`/`slug`. `undefined` sem drama: peça ou slug
 * desconhecido viram 404 na rota, nunca uma renderização com dado errado.
 */
export function resolverPeca(pecaId: string, slug: string): Peça | undefined {
  const peca = PECAS.find((p) => p.id === pecaId);
  if (!peca) return undefined;
  const assunto = assuntosDaPeca(peca.id).find((a) => a.slug === slug);
  if (!assunto) return undefined;
  return { peca: peca.id, assunto };
}

/** O caminho da peça renderizada, pronto para `href`. */
export function caminhoDaPeca(pecaId: PeçaId, slug: string, formato: FormatoId): string {
  return `/midia/${pecaId}/${slug}?formato=${formato}`;
}
