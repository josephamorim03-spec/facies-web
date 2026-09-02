import Link from "next/link";
import { BuscaDeProva } from "@/components/facies/BuscaDeProva";
import { CabecalhoPublico } from "@/components/facies/CabecalhoPublico";
import { GradeDeAreas } from "./GradeDeAreas";
import type { DadosDaLanding } from "./dados";

/**
 * O herói da v8.
 *
 * ## A manchete e a linha de baixo
 *
 * A manchete usa a palavra do corredor — "cara" — e o cabeçalho logo acima traz
 * "Fácies · a cara da sua prova", que é o par que ENSINA o nome sem uma linha de
 * glossário. O botão mantém o nome do produto. São dois registros com papéis
 * separados, como a folha de copy define.
 *
 * A palavra destacada em serifa e `marcaViva` repete o gesto do logotipo, que é
 * Source Serif com o "á" na mesma cor. ⚠️ Isso contraria o briefing do desenho,
 * que proíbe destacar uma palavra do título — foi pedido explicitamente, e está
 * registrado em `web/design/LEIA-ME.md` para ninguém "corrigir" depois.
 *
 * ## A linha de baixo entrega fato, não definição
 *
 * Três versões anteriores explicavam o termo, argumentavam ou acusavam, e
 * nenhuma pegava. O leitor chega de um link compartilhado, já curioso: ele não
 * precisa ser desafiado, precisa ser atendido. Então a primeira linha entrega
 * dois fatos medidos da prova dele e fecha com o porquê do produto.
 */
export function Heroi({ dados }: { dados: DadosDaLanding }) {
  const { prova, areas, forma, maiorAreaPassaDeUmTerco } = dados;
  const maior = areas[0];
  const razao = forma.padronizada?.razao ?? null;

  return (
    <>
      <CabecalhoPublico />

      <section className="pb-14 pt-7 sm:pb-24 sm:pt-16">
        <div className="mx-auto w-full max-w-[1080px] px-5 sm:px-8">
          <h1 className="mb-3.5 max-w-[16ch] font-sans text-[34px] font-semibold leading-[1.12] tracking-[-0.022em] sm:text-6xl lg:text-7xl">
            Cada prova tem uma{" "}
            <em className="font-serif text-[1.12em] font-semibold not-italic leading-[0.9] tracking-[-0.01em] text-marcaViva">
              cara
            </em>
            .
          </h1>

          {/* ⚠️ As duas afirmações têm de vir do dado, e as duas podem deixar de
              ser verdade numa regeração: "mais de um terço" some se a maior área
              cair abaixo de 33,4%, e "metade" some se a razão sair da faixa. */}
          <p className="max-w-[66ch] text-lg sm:text-xl">
            A do {prova.sigla}:{" "}
            {maiorAreaPassaDeUmTerco ? "mais de um terço" : `${maior?.pct}%`} é{" "}
            {maior?.rotulo.toLowerCase()}, e a pegadinha de comando quase não existe
            {razao !== null && razao > 0.45 && razao < 0.55
              ? " — metade do que se esperaria pelos temas que ela cobra"
              : null}
            . Você não vai achar isso no edital.
          </p>

          <div className="mt-5">
            <BuscaDeProva />
          </div>

          {/* Os atalhos existem porque o campo sozinho exige saber o que digitar.
              A curadoria vem de `bancasEmDestaque()`, e não do volume: o corte por
              volume punha SES-DF em primeiro, e quem abre a página está decidindo
              onde prestar — a lista tem de parecer com o mercado que ele disputa. */}
          {dados.destaques.length > 0 ? (
            <ul className="m-0 mt-3 flex list-none flex-wrap items-center gap-1.5 p-0">
              <li className="mr-1 text-sm text-muted">Mais buscadas</li>
              <li>
                <Link
                  href={`/prova/${prova.slug}`}
                  className="paper-control inline-flex min-h-11 items-center rounded-control border
                    border-primary bg-primary px-3.5 py-2.5 text-sm font-medium text-primaryInk
                    transition hover:bg-primaryStrong focus-visible:outline focus-visible:outline-2
                    focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {prova.sigla}
                </Link>
              </li>
              {dados.destaques.map((d) =>
                d.slug ? (
                  <li key={d.slug}>
                    <Link
                      href={`/prova/${d.slug}`}
                      className="paper-control inline-flex min-h-11 items-center rounded-control border
                        border-rule px-3.5 py-2.5 text-sm font-medium text-ink transition
                        hover:border-muted focus-visible:outline focus-visible:outline-2
                        focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      {d.rotulo}
                    </Link>
                  </li>
                ) : null,
              )}
            </ul>
          ) : null}

          <hr className="my-[18px] border-0 border-t border-rule" />

          <p className="mb-3 font-mono text-micro text-muted">
            {prova.sigla} · edição medida · n = {prova.questoes_declaradas} questões ·
            próxima aplicação{" "}
            <time dateTime={prova.aplicacao_prevista}>
              {prova.aplicacao_prevista.split("-").reverse().join(".")}
            </time>
          </p>

          <GradeDeAreas linhas={areas} />
        </div>
      </section>
    </>
  );
}
