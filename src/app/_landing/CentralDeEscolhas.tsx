import Link from "next/link";
import type { DadosDaLanding } from "./dados";

/**
 * A central de escolhas — as três portas da home.
 *
 * A v8 demonstrava a jornada num rolar contínuo: quem chegava de um link
 * compartilhado tinha de atravessar a página inteira antes de achar o que fazer.
 * Este bloco põe a decisão na frente — três portas, cada uma um pedaço do
 * produto que funciona hoje e não pede cadastro.
 *
 * ## "Teste sem cadastro" NÃO aponta para um fluxo de responder questões
 *
 * Ele não existe. Aponta para a demonstração interativa das nove medidas (a
 * seção `NoveMedidas` logo abaixo, âncora `#demo-interativa`): a experiência
 * prática sem conta que o produto tem hoje. Um diagnóstico anônimo de verdade é
 * etapa posterior, quando houver rota pública para ele.
 *
 * ⚠️ As três portas são verificáveis como ALCANÇÁVEIS hoje: a fácies
 * (`/prova/<slug>`) e o ebook (`/prova/<slug>/revisao-final`, com "Baixar em
 * PDF") são rotas públicas, e a demo das medidas é esta mesma página. Nenhum dos
 * três destinos pede cadastro.
 */

type Porta = {
  titulo: string;
  texto: string;
  rotulo: string;
  href: string;
  selo: string;
};

export function CentralDeEscolhas({ dados }: { dados: DadosDaLanding }) {
  const { prova } = dados;

  const portas: Porta[] = [
    {
      titulo: "Ver a cara da sua prova",
      texto: `O peso de cada área, os assuntos que mais voltam e como a ${prova.sigla} escreve as questões — medido questão por questão.`,
      rotulo: `Abrir a fácies do ${prova.sigla}`,
      href: `/prova/${prova.slug}`,
      selo: "grátis · sem cadastro",
    },
    {
      titulo: "Baixar o ebook de revisão",
      texto: `A última semana antes do ${prova.sigla}: um assunto por dia, onde se erra e o checklist da véspera. Em PDF.`,
      rotulo: "Baixar o ebook",
      href: `/prova/${prova.slug}/revisao-final`,
      selo: "grátis · sem cadastro",
    },
    {
      titulo: "Teste sem cadastro",
      texto: "Toque numa medida e veja, numa questão de exemplo, o que a leitura enxerga — sem criar conta.",
      rotulo: "Experimentar a leitura",
      href: "#demo-interativa",
      selo: "demonstração",
    },
  ];

  return (
    <section className="border-t border-rule py-14 sm:py-24">
      <div className="mx-auto w-full max-w-[1080px] px-[var(--gutter)]">
        <div className="max-w-[66ch]">
          <span className="paper-eyebrow">por onde começar</span>
          <h2 className="mt-3 mb-4 max-w-[24ch] font-sans font-semibold">
            Três portas, de graça e sem cadastro.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {portas.map((porta) => (
            <div
              key={porta.titulo}
              className="flex flex-col rounded-surface border border-rule bg-surface p-5 sm:p-6"
            >
              <h3 className="font-sans font-semibold">{porta.titulo}</h3>
              <p className="mt-2 grow text-base text-muted">{porta.texto}</p>
              <Link
                href={porta.href}
                className="paper-control mt-5 inline-flex min-h-11 items-center justify-center rounded-control
                  border border-primary bg-primary px-4 py-2.5 text-sm font-medium text-primaryInk
                  transition hover:bg-primaryStrong focus-visible:outline focus-visible:outline-2
                  focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {porta.rotulo}
              </Link>
              <p className="mt-3 text-sm text-muted">{porta.selo}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
