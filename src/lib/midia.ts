import { bancasComPagina, nomeCurto } from "@/lib/facies";
import { todasAsProvas } from "@/lib/provas";

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

export type FormatoId = "feed" | "retrato" | "story";

/** As três caixas do Instagram. 1080 de largura nos três, altura por formato. */
export const FORMATOS: Record<FormatoId, { largura: number; altura: number; rotulo: string }> = {
  feed: { largura: 1080, altura: 1080, rotulo: "Feed" },
  retrato: { largura: 1080, altura: 1350, rotulo: "Retrato" },
  story: { largura: 1080, altura: 1920, rotulo: "Story" },
};

export type PeçaId = "cara";

/**
 * As peças que a central sabe gerar.
 *
 * `cara` é o pilar 1 do doc de mídia: a mesma fácies pública, refluída nos
 * formatos do Instagram. Novas peças (`area`, `mais-cai`, `legenda`) entram
 * AQUI, como um item novo — e o catálogo e o guard passam a conhecê-las sem
 * cadastro adicional em lugar nenhum.
 */
export const PECAS: { id: PeçaId; rotulo: string }[] = [
  { id: "cara", rotulo: "A cara da prova" },
];

/** O alvo de uma peça: uma prova nacional ou uma banca institucional. */
export type Assunto =
  | { tipo: "prova"; slug: string; sigla: string; caminho: string }
  | { tipo: "banca"; slug: string; sigla: string; caminho: string };

/**
 * Todos os assuntos geráveis — as provas nacionais e as bancas com página.
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

export type Peça = { peca: PeçaId; assunto: Assunto };

/**
 * Resolve a peça pelo par `peca`/`slug`. `undefined` sem drama: peça ou slug
 * desconhecido viram 404 na rota, nunca uma renderização com dado errado.
 */
export function resolverPeca(pecaId: string, slug: string): Peça | undefined {
  const peca = PECAS.find((p) => p.id === pecaId);
  if (!peca) return undefined;
  const assunto = assuntos().find((a) => a.slug === slug);
  if (!assunto) return undefined;
  return { peca: peca.id, assunto };
}

/** O caminho da peça renderizada, pronto para `href`. */
export function caminhoDaPeca(pecaId: PeçaId, slug: string, formato: FormatoId): string {
  return `/midia/${pecaId}/${slug}?formato=${formato}`;
}
