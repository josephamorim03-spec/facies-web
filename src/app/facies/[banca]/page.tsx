import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FaciesReport } from "@/components/facies/FaciesReport";
import { Compartilhar } from "@/components/facies/Compartilhar";
import { ContarVisita } from "@/components/facies/ContarVisita";
import { bancaPorSlug, janela, todasAsBancas } from "@/lib/facies";
import { SITE_NAME } from "@/lib/site";
import { CabecalhoPublico } from "@/components/facies/CabecalhoPublico";

/**
 * Uma página por banca — o ativo de SEO do §12.2.
 *
 * Gerada estática em build. A regra que impede o SEO programático de virar lixo
 * já está aplicada na ORIGEM: `build_facies_dataset.py` só emite banca com pelo
 * menos 120 questões recentes, então não existe página fina para gerar. Página
 * fina em massa é o padrão que buscadores penalizam; página densa em massa é o
 * que eles premiam, e a diferença inteira é essa regra.
 */

type Props = { params: Promise<{ banca: string }> };

export function generateStaticParams() {
  return todasAsBancas().map((banca) => ({ banca: banca.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { banca: slug } = await params;
  const banca = bancaPorSlug(slug);
  // `absolute` no 404: sem ele o template daria "Fácies · Fácies".
  if (!banca) return { title: { absolute: SITE_NAME } };

  const destaque = banca.leitura[0]?.replace(/\*\*/g, "") ?? "";
  const titulo = `A fácies da ${banca.nome}`;
  const descricao =
    destaque ||
    `Como a ${banca.nome} cobra: formato das questões, o que mais cai e distribuição por área, sobre ${banca.total} questões.`;
  const caminho = `/facies/${banca.slug}`;

  return {
    title: titulo,
    description: descricao,
    alternates: { canonical: caminho },
    openGraph: { title: titulo, description: descricao, url: caminho },
  };
}

export default async function PaginaDaBanca({ params }: Props) {
  const { banca: slug } = await params;
  const banca = bancaPorSlug(slug);
  if (!banca) notFound();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">
      <CabecalhoPublico comLink />

      <header className="pb-8">
        <span className="paper-eyebrow">
          A fácies da prova · {janela(banca)}
        </span>
        <h1 className="mt-3 max-w-[24ch] font-serif text-3xl/[1.35] font-semibold tracking-tight text-ink sm:text-4xl/[1.35]">
          {banca.nome}
        </h1>
        <div className="mt-5">
          <Compartilhar
            imagem={`/facies/${banca.slug}/opengraph-image`}
            url={`/facies/${banca.slug}`}
            nome={banca.nome}
          />
        </div>
      </header>

      <ContarVisita chave={banca.institution_key} />

      <FaciesReport banca={banca} />

      <p className="mt-8 max-w-[70ch] text-sm text-muted">
        A Fácies não promete aprovação e não vende conteúdo teórico. Ela mostra como a sua
        banca cobra e organiza o seu tempo em volta disso.
      </p>
    </main>
  );
}
