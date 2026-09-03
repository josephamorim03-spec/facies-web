import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { revisaoPorExamKey } from "@/lib/revisao";
import { ProvaReport } from "@/components/facies/ProvaReport";
import { FaciesReport } from "@/components/facies/FaciesReport";
import { Compartilhar } from "@/components/facies/Compartilhar";
import { GateEmail } from "@/components/facies/GateEmail";
import { Contagem } from "@/components/facies/Contagem";
import { ContarVisita } from "@/components/facies/ContarVisita";
import { provaPorSlug, todasAsProvas } from "@/lib/provas";
import {
  bancaPorSlugCurto,
  bancasComPagina,
  GERADO_EM,
  janela,
  janelaNacional,
  nomeCurto,
} from "@/lib/facies";
import { CONT_LANDING, SITE_NAME } from "@/lib/site";
import { CabecalhoPublico } from "@/components/facies/CabecalhoPublico";

/**
 * Uma página por prova — e "prova" aqui inclui a banca institucional.
 *
 * ## Por que as duas famílias moram na MESMA rota
 *
 * Elas viviam separadas: `/prova/[slug]` para o ENAMED e `/facies/[banca]` para
 * as 138 institucionais. Duas URLs para a mesma pergunta ("como esta prova
 * cobra?"), com dois renderizadores diferentes — e quem clicava em "ver a fácies
 * completa" caía numa tela de estrutura diferente conforme tivesse escolhido o
 * ENAMED ou a USP.
 *
 * A separação era da ESTRUTURA DO ACERVO (uma prova nacional com base composta
 * versus uma instituição com histórico próprio), não da pergunta de quem chega.
 * Agora o endereço é um só e curto — `/prova/enamed`, `/prova/usp-sp` — e o slug
 * longo de `/facies/<...>` vira 301 permanente em `next.config.js`.
 *
 * ## O que continua diferente, e por quê
 *
 * `ProvaReport` e `FaciesReport` compartilham a casca, o cabeçalho de laudo e os
 * painéis 01 e 02 (`PainelLaudo` + `MapaDaProva` + `BarrasArea`). O que difere é
 * o que cada uma legitimamente TEM: a prova declara base composta e a validação
 * com o `n` na cara; a banca tem o painel de formato distintivo. Espremer as
 * duas num renderizador só exibiria o score ponderado da prova como se fosse
 * contagem de questões — a precisão fabricada que esta página recusa.
 *
 * Estática, gerada em build. O tráfego desta página é pico de WhatsApp e ela
 * precisa aguentar centenas de acessos em minutos disparados por um print.
 */

type Props = { params: Promise<{ slug: string }> };

/** `GERADO_EM` em dia/mês/ano, determinístico — `toLocaleDateString` varia por
 *  locale do build e transformaria a data em segunda verdade. */
function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

export function generateStaticParams() {
  return [
    ...todasAsProvas().map((prova) => ({ slug: prova.slug })),
    // `bancasComPagina` filtra quem não tem slug fixado. Uma banca sem entrada em
    // `slugs.json` não vira página muda: o guard do lint reprova o build antes.
    ...bancasComPagina().map(({ slug }) => ({ slug })),
  ];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const caminho = `/prova/${slug}`;

  // A PROVA PRIMEIRO. `slugs.json` reserva os slugs de prova (o guard confere),
  // então a ordem não é ambígua — mas deixá-la explícita evita que uma colisão
  // futura resolva silenciosamente para o lado errado.
  const prova = provaPorSlug(slug);
  if (prova) {
    // O nome do produto não precisa ser o texto do `<title>` (§3.2): quem busca
    // digita o nome da prova, não o da ferramenta. O `template` do layout põe a
    // marca no fim, onde ela identifica sem competir.
    // UMA estrutura só para as duas famílias de página.
    const titulo = `A fácies do ${prova.sigla}`;
    const descricao = `A fácies do ${prova.sigla}: ${prova.profundidade.questoes_rotuladas.toLocaleString("pt-BR")} questões rotuladas em ${prova.profundidade.aplicacoes_na_serie} aplicações. Grátis, sem cadastro.`;
    return {
      title: titulo,
      description: descricao,
      alternates: { canonical: caminho },
      openGraph: { title: titulo, description: descricao, url: caminho },
    };
  }

  const banca = bancaPorSlugCurto(slug);
  // `absolute` no 404: sem ele o template daria "Fácies · Fácies".
  if (!banca) return { title: { absolute: SITE_NAME } };

  const destaque = banca.leitura[0]?.replace(/\*\*/g, "") ?? "";
  const curto = nomeCurto(banca);
  const titulo = `A fácies da ${curto}`;
  const descricao =
    destaque ||
    `Como a ${curto} cobra: formato das questões, o que mais cai e distribuição por área, sobre ${banca.questoes_total} questões.`;

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
  const banca = prova ? null : bancaPorSlugCurto(slug);
  if (!prova && !banca) notFound();

  // A revisão só existe para prova com aposta congelada + seleção gerada.
  const revisao = prova ? revisaoPorExamKey(prova.exam_key) : undefined;

  // O CONTÊINER É O DA LANDING, e não `max-w-5xl`.
  //
  // O funil público tinha TRÊS larguras: a home em 1080 (`CONT_LANDING`, medida
  // no design renderizado) e as páginas de laudo em `max-w-5xl`, que são 1024.
  // A coluna estreitava 56px ao rolar da home para a página da prova — o tipo de
  // defeito que ninguém aponta e todo mundo sente. `lib/site.ts` já registra ter
  // corrigido exatamente isso DENTRO da home; as páginas de destino ficaram para
  // trás porque repetiam o literal.
  return (
    <main className={`${CONT_LANDING} pb-16`}>
      <CabecalhoPublico comLink />

      {prova ? (
        <>
          <header className="pb-8">
            <span className="paper-eyebrow">
              A fácies da prova · grátis, sem cadastro
            </span>
            <h1 className="mt-3 max-w-[20ch] font-serif text-4xl/[1.45] font-semibold tracking-tight text-ink sm:text-5xl/[1.45]">
              A fácies do {prova.sigla}.
            </h1>
            <p className="mt-4 max-w-[58ch] text-lg text-muted">
              Como esta prova cobra: o formato das questões, o que mais cai e de que base
              foi lido.
            </p>
          </header>

          <ContarVisita chave={prova.exam_key} />

          <ProvaReport prova={prova} />

          {/* A REVISÃO FINAL ENTRA AQUI, e não no fim.
              Quem acabou de ler como a prova cobra está no único momento em que
              "e agora, o que eu faço com isso?" é a pergunta natural. Depois do
              Compartilhar a pessoa já saiu da leitura; depois do GateEmail ela já
              foi convertida em outra coisa. Só aparece quando existe revisão
              gerada para esta prova — um link para página inexistente seria
              promessa quebrada. */}
          {revisao ? (
            <section className="mt-8" aria-labelledby="revisao-final-cta">
              <div className="paper-surface flex flex-wrap items-center justify-between gap-x-6 gap-y-4 p-5 sm:p-6">
                <div className="min-w-0 max-w-[54ch]">
                  <h2 id="revisao-final-cta" className="paper-eyebrow">
                    a última semana
                  </h2>
                  {/* A promessa acompanha o que a página entrega. Ela dizia
                      "30 questões com gabarito" até 02/09; desde a D13 o ebook
                      é educativo e as questões ficam no app. */}
                  <p className="mt-2 text-base text-muted">
                    Os {revisao.dias.length} assuntos que medimos como mais prováveis, um
                    por dia: como a prova cobra cada um, onde se erra e o que conferir na
                    véspera. Grátis, sem cadastro.
                  </p>
                </div>
                <Link
                  href={`/prova/${prova.slug}/revisao-final`}
                  className="paper-control inline-flex min-h-11 items-center rounded-control border border-edge bg-ink px-4 py-2 text-sm font-semibold text-paper transition hover:brightness-95"
                >
                  Ver a revisão final
                </Link>
              </div>
            </section>
          ) : null}

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
        </>
      ) : null}

      {banca ? (
        <>
          <header className="pb-8">
            <span className="paper-eyebrow">A fácies da prova · {janela(banca)}</span>
            <h1 className="mt-3 max-w-[24ch] font-serif text-3xl/[1.35] font-semibold tracking-tight text-ink sm:text-4xl/[1.35]">
              {nomeCurto(banca)}
            </h1>
            {/* O nome do EDITAL fica, mas como legenda. Ele é a identidade legal da
                banca e some do título por ser longo demais para aba, para prévia de
                WhatsApp e para a forma como qualquer pessoa chama a prova — mas
                sumir da página inteira faria a leitura deixar de dizer sobre QUEM
                ela é. Só troca de hierarquia. */}
            {/* O prefixo de UF sai da legenda: o rotulo do edital comeca com
                "SP - " e a sigla ja termina em "-SP", entao o estado aparecia duas
                vezes numa linha que existe so para dar a identidade legal. */}
            <p className="mt-2 max-w-[60ch] text-sm text-muted">
              {banca.nome.replace(/^\s*[A-Za-zÀ-ÿ]{2,10}\s*-\s*/, "")}
            </p>
          </header>

          <ContarVisita chave={banca.institution_key} />

          <FaciesReport banca={banca} />

          <div className="mt-8">
            <Compartilhar
              imagem={`/prova/${slug}/opengraph-image`}
              url={`/prova/${slug}`}
              nome={nomeCurto(banca)}
            />
          </div>

          {/* A data do acervo, que nunca pode mentir: `GERADO_EM` viaja dentro do
              dataset (nao e' constante digitada) e `janelaNacional` e' derivada das
              proprias bancas. Sem esta linha, a base tinha numeros sem dizer de
              quando eram. */}
          <p className="mt-8 max-w-[70ch] text-xs text-muted">
            Acervo de {janelaNacional() ?? "período não declarado"} · atualizado em{" "}
            {formatarData(GERADO_EM)}.
          </p>
        </>
      ) : null}

      <footer className="mt-12 border-t border-rule pt-8 text-sm text-muted">
        <p className="max-w-[70ch]">
          A Fácies não promete aprovação e não vende conteúdo teórico. Ela mostra como a sua
          prova cobra e organiza o seu tempo em volta disso.
        </p>
      </footer>
    </main>
  );
}
