import Link from "next/link";
import type { Metadata } from "next";
import { RedirectIfAuthenticated } from "./_components/RedirectIfAuthenticated";
import { DestaqueProva } from "@/components/facies/DestaqueProva";
import { FaciesPicker } from "@/components/facies/FaciesPicker";
import { bancasEmDestaque, NACIONAL, todasAsBancas } from "@/lib/facies";
import { todasAsProvas } from "@/lib/provas";
import { SITE_NAME, SITE_QUALIFICADOR } from "@/lib/site";

/**
 * A home É a Fácies (§12.1).
 *
 * Não existe landing com hero decorativo e o produto três rolagens abaixo: o
 * visitante chega por link compartilhado em grupo, com intenção específica e
 * paciência de segundos.
 *
 * Server component e estática: nenhuma consulta ao banco em tempo de requisição.
 * O tráfego é pico de WhatsApp e a primeira impressão do funil inteiro não pode
 * ser uma tela de erro.
 */

const DESCRICAO =
  "A sua prova tem uma fácies. Veja como a sua banca cobra: o formato das questões, o que mais cai e a distribuição por área. Grátis, sem cadastro.";

export const metadata: Metadata = {
  // Sem `title` de propósito: a home herda o default do layout, que já é a
  // marca com o qualificador. Repetir aqui daria "Fácies — inteligência de
  // prova · Fácies".
  description: DESCRICAO,
  alternates: { canonical: "/" },
  openGraph: {
    title: `${SITE_NAME} — ${SITE_QUALIFICADOR}`,
    description: DESCRICAO,
    url: "/",
  },
};

export default function Home() {
  const destaques = bancasEmDestaque();
  const provaEmDestaque = todasAsProvas()[0];
  const total = todasAsBancas().length;

  return (
    <>
      <RedirectIfAuthenticated />

      <main className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">
        {/* ── Tese ────────────────────────────────────────────────────── */}
        <header className="py-10 sm:py-14">
          <span className="paper-eyebrow">
            A fácies da prova · grátis, sem cadastro
          </span>
          <h1 className="mt-3 max-w-[19ch] font-serif text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
            A sua prova tem uma fácies.
          </h1>
          <p className="mt-4 max-w-[56ch] text-lg text-muted">
            Escolha a sua e veja como ela cobra: o formato das questões, o que mais cai e a
            distribuição por área.
          </p>
        </header>

        {provaEmDestaque ? (
          <div className="mb-10">
            <DestaqueProva prova={provaEmDestaque} />
          </div>
        ) : null}

        {/* A leitura por INSTITUICAO vem depois da prova nacional, e nao some:
            quem presta USP ou UNIFESP ainda depende dela. Virou caso
            particular, que e o que o pivo do §1.5 diz. */}
        <div className="mb-3 flex flex-wrap items-baseline gap-x-3">
          <span className="paper-eyebrow">Ou veja uma prova institucional</span>
        </div>
        <FaciesPicker bancas={destaques} />

        {/* ── A ponte para o produto (§3.4) ────────────────────────────── */}
        <section className="mt-10 rounded-surface border border-edge border-l-2 border-l-primary bg-surface p-6 sm:p-8">
          <p className="max-w-[26ch] font-serif text-2xl font-semibold leading-snug text-ink sm:text-3xl">
            Você viu como a sua prova cobra. Agora veja o que <em>você</em> ainda não cobriu.
          </p>
          <Link
            href="/login"
            className="paper-control mt-6 inline-flex rounded-control border border-primary bg-primary px-6 py-3 text-base font-semibold text-primaryInk"
          >
            Fazer o diagnóstico
          </Link>
          <p className="mt-3 text-sm text-muted">
            As questões vêm no formato da sua banca.
          </p>
        </section>

        {/* ── O que é e o que não é (§1.2) ─────────────────────────────── */}
        <section className="mt-12 grid gap-px overflow-hidden rounded-surface border border-edge bg-edge sm:grid-cols-2">
          <div className="bg-surface p-5 sm:p-6">
            <span className="paper-eyebrow">
              É
            </span>
            <ul className="mt-3 grid gap-2 text-sm text-ink">
              <li>Uma camada de inteligência sobre o seu esforço de questões</li>
              <li>
                Especialista na <em>forma</em> da sua prova-alvo
              </li>
              <li>Um planejador que respeita escala de plantão</li>
            </ul>
          </div>
          <div className="bg-surface p-5 sm:p-6">
            <span className="paper-eyebrow">
              Não é
            </span>
            <ul className="mt-3 grid gap-2 text-sm text-muted">
              <li>Fonte de conteúdo teórico</li>
              <li>Mais um extensivo</li>
              <li>Cronograma genérico de 12 meses</li>
            </ul>
          </div>
        </section>

        {/* ── Preço. Sem plano "até a prova" — ver decisão no plano. ───── */}
        <section className="mt-12">
          <h2 className="font-serif text-2xl font-semibold text-ink">Preço</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-surface border border-primary bg-surfaceMuted p-5">
              <span className="paper-eyebrow">
                Anual
              </span>
              <div className="mt-2 font-mono text-3xl text-ink">R$ 590</div>
              <p className="mt-1 text-sm text-muted">
                Equivale a R$ 49 por mês. É o ciclo inteiro de preparação.
              </p>
            </div>
            <div className="rounded-surface border border-edge bg-surface p-5">
              <span className="paper-eyebrow">
                Mensal
              </span>
              <div className="mt-2 font-mono text-3xl text-ink">R$ 69</div>
              <p className="mt-1 text-sm text-muted">Sem compromisso, mais caro por mês.</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted">
            Reembolso integral em 7 dias, por lei e sem discussão.
          </p>
        </section>

        {/* ── Rodapé honesto: mantenha, não suavize (§13) ──────────────── */}
        <footer className="mt-14 border-t border-rule pt-8 text-sm text-muted">
          <p className="max-w-[70ch]">
            A Fácies não promete aprovação e não vende conteúdo teórico. Ela mostra como a sua
            banca cobra e organiza o seu tempo em volta disso.
          </p>
          <p className="mt-4 max-w-[70ch]">
            Base atual: {total} bancas com pelo menos 120 questões classificadas nos últimos
            anos, sobre {NACIONAL.total.toLocaleString("pt-BR")} questões de prova.
          </p>
        </footer>
      </main>
    </>
  );
}
