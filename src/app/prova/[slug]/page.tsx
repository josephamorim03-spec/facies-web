import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProvaReport } from "@/components/facies/ProvaReport";
import { Compartilhar } from "@/components/facies/Compartilhar";
import { GateEmail } from "@/components/facies/GateEmail";
import { Contagem } from "@/components/facies/Contagem";
import { ContarVisita } from "@/components/facies/ContarVisita";
import { provaPorSlug, todasAsProvas } from "@/lib/provas";
import { SITE_NAME } from "@/lib/site";
import { CabecalhoPublico } from "@/components/facies/CabecalhoPublico";

/**
 * Uma página por prova (§11.1).
 *
 * Estática, gerada em build. O tráfego desta página é pico de WhatsApp e ela
 * precisa aguentar centenas de acessos em minutos disparados por um print.
 */

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return todasAsProvas().map((prova) => ({ slug: prova.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const prova = provaPorSlug(slug);
  if (!prova) return { title: { absolute: SITE_NAME } };

  // O nome do produto não precisa ser o texto do `<title>` (§3.2): quem busca
  // digita o nome da prova, não o da ferramenta. O `template` do layout põe a
  // marca no fim, onde ela identifica sem competir.
  // UMA estrutura só para as duas famílias de página.
  //
  // Este título era `"ENAMED — o que mais cai, e como a prova cobra"` enquanto
  // a página de banca dizia `"A fácies da {nome}"`. Duas formas diferentes para
  // a mesma coisa, e a da prova punha a sigla ANTES da palavra que nomeia o
  // produto — então o link colado no grupo abria com "ENAMED" e a marca chegava
  // depois, quando chegava. O `template` do layout já acrescenta a marca no
  // fim; o que faltava era o começo ser igual nos dois lados.
  const titulo = `A fácies do ${prova.sigla}`;
  const descricao = `A fácies do ${prova.sigla}: ${prova.profundidade.questoes_rotuladas.toLocaleString("pt-BR")} questões rotuladas em ${prova.profundidade.aplicacoes_na_serie} aplicações. Grátis, sem cadastro.`;
  const caminho = `/prova/${prova.slug}`;

  return {
    title: titulo,
    description: descricao,
    alternates: { canonical: caminho },
    openGraph: { title: titulo, description: descricao, url: caminho },
  };
}

export default async function PaginaDaProva({ params }: Props) {
  const { slug } = await params;
  const prova = provaPorSlug(slug);
  if (!prova) notFound();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">
      <CabecalhoPublico comLink />

      <header className="pb-8">
        <span className="paper-eyebrow">
          A fácies da prova · grátis, sem cadastro
        </span>
        <h1 className="mt-3 max-w-[20ch] font-serif text-4xl/[1.45] font-semibold tracking-tight text-ink sm:text-5xl/[1.45]">
          A fácies do {prova.sigla}.
        </h1>
        <p className="mt-4 max-w-[58ch] text-lg text-muted">
          Como esta prova cobra: o formato das questões, o que mais cai e de que base isso
          foi lido.
        </p>
      </header>

      <ContarVisita chave={prova.exam_key} />

      <ProvaReport prova={prova} />

      {/* COMPARTILHAR DEPOIS DA LEITURA, e não antes dela.
          Ele morava no cabeçalho, colado no título: a página pedia para a
          pessoa mandar para o grupo uma leitura que ela ainda não tinha visto.
          Aqui embaixo o pedido chega quando já existe o que compartilhar. */}
      <div className="mt-8">
        <Compartilhar
          imagem={`/prova/${prova.slug}/opengraph-image`}
          url={`/prova/${prova.slug}`}
          nome={prova.sigla}
        />
      </div>

      <Contagem
        sigla={prova.sigla}
        aplicacao={prova.aplicacao_prevista}
        cadernos={prova.cadernos_previstos}
        aplicacoesDiretas={prova.profundidade.aplicacoes_diretas}
      />

      <div className="mt-6">
        <GateEmail banca={prova.exam_key} />
      </div>

      <footer className="mt-12 border-t border-rule pt-8 text-sm text-muted">
        <p className="max-w-[70ch]">
          A Fácies não promete aprovação e não vende conteúdo teórico. Ela mostra como a sua
          prova cobra e organiza o seu tempo em volta disso.
        </p>
      </footer>
    </main>
  );
}
