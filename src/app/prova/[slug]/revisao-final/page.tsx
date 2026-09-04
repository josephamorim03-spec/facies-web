import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CabecalhoPublico } from "@/components/facies/CabecalhoPublico";
import { Compartilhar } from "@/components/facies/Compartilhar";
import { dec } from "@/lib/decimal";
import { provaPorSlug, todasAsProvas } from "@/lib/provas";
import {
  dataCurta,
  diasDaRevisao,
  temasDoDia,
  revisaoPorExamKey,
} from "@/lib/revisao";
import { CONT_LANDING } from "@/lib/site";
import { BotaoImprimirPdf } from "./_components/BotaoImprimirPdf";
import { PaginaDoDia } from "./_components/PaginaDoDia";

/**
 * A Revisão Final — a última semana antes da prova, em ebook público.
 *
 * ## O que esta página é, e o que ela se recusa a ser
 *
 * É a previsão transformada em ação: os 7 assuntos que medimos como mais
 * prováveis viraram 7 páginas de revisão de véspera, cada uma ancorada no que a
 * PRÓPRIA base da prova (ENARE + Revalida + ENAMED) cobra naquele assunto. Não é
 * uma promessa: a mesma honestidade da `/aposta` vale aqui, com o lift E a faixa
 * histórica, incluindo o pior caso.
 *
 * ## Por que as 30 questões saíram daqui
 *
 * A versão anterior publicava as 30 questões reais COM gabarito, sem cadastro.
 * Três problemas de uma vez: queimava as questões para uso como prática inédita,
 * redistribuía item de banca em massa por WhatsApp, e — o pior — entregava
 * gabarito sem comentário, que é a forma menos educativa possível de mostrar uma
 * questão. As questões agora vivem só no app, onde o gabarito aparece depois da
 * resposta e o desempenho é registrado (D13/D14).
 *
 * O que ficou público é o que de fato ensina na véspera: como a banca cobra cada
 * assunto, onde se erra, uma estrutura por tema e o checklist. Cada página diz
 * de onde vieram os dados dela.
 *
 * ## O conteúdo pode estar em rascunho, e a página diz isso
 *
 * `revisado` viaja por dia dentro do dataset. Um tema gerado e não aprovado por
 * revisão médica aparece com o aviso, ou não aparece — nunca sem o aviso.
 *
 * Estática, como as irmãs: o tráfego é pico de WhatsApp.
 */

type Props = { params: Promise<{ slug: string }> };

/** Só as provas que TÊM revisão gerada viram página — uma rota viva para as 138
 *  bancas seria um 404 disfarçado de promessa. */
export function generateStaticParams() {
  return todasAsProvas()
    .filter((prova) => revisaoPorExamKey(prova.exam_key) !== undefined)
    .map((prova) => ({ slug: prova.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const prova = provaPorSlug(slug);
  const revisao = prova ? revisaoPorExamKey(prova.exam_key) : undefined;
  if (!prova || !revisao) return {};

  const caminho = `/prova/${slug}/revisao-final`;
  const titulo = `Revisão Final ${prova.sigla}: a última semana`;
  const descricao = `Os ${revisao.estrutura.total_temas} assuntos que medimos como mais prováveis no ${prova.sigla}, seis por dia em ${revisao.estrutura.dias} dias: como a banca cobra cada um, onde se erra e o que conferir na véspera. Grátis, sem cadastro.`;

  return {
    title: titulo,
    description: descricao,
    alternates: { canonical: caminho },
    openGraph: { title: titulo, description: descricao, url: caminho },
  };
}

export default async function PaginaRevisaoFinal({ params }: Props) {
  const { slug } = await params;
  const prova = provaPorSlug(slug);
  const revisao = prova ? revisaoPorExamKey(prova.exam_key) : undefined;
  if (!prova || !revisao) notFound();

  const dias = diasDaRevisao(revisao).map((dia) => ({
    dia,
    temas: temasDoDia(revisao, dia),
  }));
  const totalPaginas = dias.reduce((soma, d) => soma + d.temas.length, 0);
  const h = revisao.honestidade;
  const total = revisao.estrutura.total_questoes;
  const livres = revisao.estrutura.dias_livres_ate_prova;
  const emRascunho = revisao.cobertura_educativa?.rascunhos ?? 0;
  const ganho = (valor: number | null) => (valor === null ? null : dec(valor, 2));
  const faixa =
    h.historico_minimo !== null && h.historico_maximo !== null
      ? `${ganho(h.historico_minimo)}× a ${ganho(h.historico_maximo)}×`
      : null;

  return (
    <main className={`${CONT_LANDING} revisao-final-print pb-16`}>
      {/* A navegação é ação, não conteúdo: some na impressão. */}
      <div className="print:hidden">
        <CabecalhoPublico comLink />
      </div>

      <header className="pb-8">
        <span className="paper-eyebrow">revisão final · grátis, sem cadastro</span>
        <h1 className="mt-3 max-w-[22ch] font-serif text-4xl/[1.45] font-semibold tracking-tight text-ink sm:text-5xl/[1.45]">
          A última semana antes do {prova.sigla}.
        </h1>
        <p className="mt-4 max-w-[60ch] text-lg text-muted">
          Um assunto por dia, do mais provável ao menos: o que a sua prova cobra
          nele, onde se erra e o que conferir na véspera. Os {livres} dias que
          sobram até a prova ficam livres.
        </p>
        {revisao.aplicacao_prevista ? (
          <p className="mt-2 font-mono text-sm text-muted">
            prova em {dataCurta(revisao.aplicacao_prevista)}
          </p>
        ) : null}
      </header>

      {emRascunho > 0 ? (
        <p className="border border-edge bg-surfaceMuted p-4 text-sm text-ink sm:p-5">
          <span className="paper-eyebrow">pré-visualização</span>{" "}
          {emRascunho} das {totalPaginas} páginas ainda{" "}
          <strong>não passaram por revisão médica</strong>. Elas estão aqui para
          serem revisadas, não para estudo definitivo — e cada uma repete este
          aviso no próprio cabeçalho.
        </p>
      ) : null}

      {/* ── A evidência, com a mesma honestidade da aposta ────────────────── */}
      {h.lift !== null ? (
        <section className="mt-6 paper-surface p-5 sm:p-6" aria-labelledby="evidencia">
          <h2 id="evidencia" className="paper-eyebrow">
            por que estes assuntos
          </h2>
          <p className="mt-4 max-w-[62ch] text-base text-muted">
            A lista dos assuntos é a mesma da{" "}
            <a href={`/prova/${prova.slug}/aposta`} className="text-ink underline underline-offset-4">
              aposta registrada
            </a>
            , fechada antes da prova com data e hash. O método que a montou foi medido
            em {dec(h.acerto_pct ?? 0)}% de cobertura contra {dec(h.piso_pct ?? 0)}% que
            uma lista ao acaso cobriria —{" "}
            <span className="text-ink">{ganho(h.lift)}× o acaso</span>.
          </p>
          {faixa ? (
            <p className="mt-3 max-w-[62ch] text-sm text-muted">
              A faixa histórica do mesmo método vai de {faixa}, e o mínimo ficou{" "}
              <span className="text-ink">abaixo do acaso</span>. Ele está aqui porque
              aconteceu: {h.nota_previsao}
            </p>
          ) : null}
        </section>
      ) : null}

      {/* ── CTA: resolver no app + baixar o PDF ───────────────────────────── */}
      <section className="mt-8 print:hidden" aria-labelledby="resolver-no-app">
        <div className="paper-surface flex flex-wrap items-center justify-between gap-x-6 gap-y-4 p-5 sm:p-6">
          <div className="min-w-0 max-w-[52ch]">
            <h2 id="resolver-no-app" className="paper-eyebrow">
              e as questões?
            </h2>
            <p className="mt-2 text-base text-muted">
              {total} questões da própria base da prova,{" "}
              {revisao.estrutura.questoes_por_tema} de cada assunto e{" "}
              {revisao.estrutura.temas_por_dia * revisao.estrutura.questoes_por_tema} por dia, dentro do app — com o gabarito só depois da sua resposta e o
              desempenho registrado. Aqui fora elas apareceriam com gabarito à
              mostra, que é a forma menos útil de revisar.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/revisao-final"
              className="paper-control inline-flex min-h-11 items-center rounded-control border border-edge bg-ink px-4 py-2 text-sm font-semibold text-paper transition hover:brightness-95"
            >
              Resolver no app
            </a>
            <BotaoImprimirPdf />
          </div>
        </div>
      </section>

      {/* ── Os 7 dias ─────────────────────────────────────────────────────── */}
      <section className="mt-10" aria-labelledby="dias">
        <h2 id="dias" className="paper-eyebrow">
          os {dias.length} dias e os {totalPaginas} assuntos, na ordem
        </h2>
        {totalPaginas === 0 ? (
          <p className="mt-4 max-w-[62ch] text-base text-muted">
            As páginas de revisão ainda não foram publicadas. Enquanto isso, a{" "}
            <a href={`/prova/${prova.slug}/aposta`} className="text-ink underline underline-offset-4">
              aposta registrada
            </a>{" "}
            já mostra quais assuntos medimos como mais prováveis.
          </p>
        ) : (
          <div className="mt-6 space-y-16">
            {dias.map(({ dia, temas }) => (
              <div key={dia.dia}>
                <p className="paper-eyebrow border-b-2 border-edge pb-2">
                  dia {dia.dia} de {dias.length} · {temas.length} assuntos ·{" "}
                  {temas.reduce((n, t) => n + t.tema.questoes.length, 0)} questões
                </p>
                <div className="space-y-14">
                  {temas.map(({ tema, pagina }) => (
                    <PaginaDoDia key={tema.subtema} tema={tema} pagina={pagina} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── As atualizações, como fato e não previsão ─────────────────────── */}
      {revisao.atualizacoes.length > 0 ? (
        <section className="mt-12 print:break-before-page" aria-labelledby="atualizacoes">
          <h2 id="atualizacoes" className="paper-eyebrow">
            o que mudou e pode ser cobrado
          </h2>
          <p className="mt-3 max-w-[62ch] text-base text-muted">
            {h.nota_atualizacoes}
          </p>
          <ul className="mt-5 space-y-4">
            {revisao.atualizacoes.map((item) => (
              <li key={item.slug} className="paper-surface p-4 sm:p-5 print:break-inside-avoid">
                <p className="text-base font-medium text-ink">{item.titulo}</p>
                <p className="mt-1 max-w-[62ch] text-sm text-muted">{item.resumo}</p>
                <p className="mt-2 text-xs text-muted">
                  vigência {dataCurta(item.vigencia)}
                  {item.dias_antes_da_prova >= 0
                    ? ` · ${item.dias_antes_da_prova} dias antes da prova`
                    : " · posterior à prova"}
                  {item.subtemas.length > 0 ? ` · ${item.subtemas.join(", ")}` : ""}
                </p>
                {item.fontes.length > 0 ? (
                  <a
                    href={item.fontes[0].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-sm text-primary underline-offset-4 hover:underline"
                  >
                    fonte primária
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── Os limites, ditos por nós ─────────────────────────────────────── */}
      <section className="mt-12" aria-labelledby="limites">
        <h2 id="limites" className="paper-eyebrow">
          o que esta revisão não é
        </h2>
        <ul className="mt-4 max-w-[64ch] space-y-3 text-base text-muted">
          <li>
            <span className="text-ink">Não é garantia.</span> A faixa medida do método
            vai de {faixa ?? "abaixo a acima do acaso"}, e o pior caso já aconteceu.
          </li>
          <li>
            <span className="text-ink">Não cobre a prova inteira.</span> São os{" "}
            {dias.length} assuntos mais prováveis de um universo muito maior. O resto
            continua podendo cair.
          </li>
          <li>
            <span className="text-ink">Não é um curso teórico.</span> É revisão de
            véspera: como a banca cobra, onde se erra e o que conferir. Não substitui
            o estudo do assunto, e a Fácies não vende conteúdo teórico.
          </li>
          <li>
            <span className="text-ink">Não é fonte primária.</span> Cada página lista
            de onde vieram os dados dela; diante de divergência, vale a fonte.
          </li>
        </ul>
      </section>

      <div className="mt-10 print:hidden">
        <Compartilhar
          imagem={`/prova/${prova.slug}/revisao-final/opengraph-image`}
          url={`/prova/${prova.slug}/revisao-final`}
          nome={`revisão final do ${prova.sigla}`}
        />
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
