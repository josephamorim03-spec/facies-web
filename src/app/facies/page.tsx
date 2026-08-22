import Link from "next/link";
import type { Metadata } from "next";
import { NACIONAL, todasAsBancas } from "@/lib/facies";

/**
 * O índice de bancas. Estático, e é ele que dá caminho de rastreio para as 141
 * páginas do §12.2 — sem um índice ligado, página gerada em massa fica órfã.
 */

const DESCRICAO =
  "Todas as bancas com base suficiente para uma leitura honesta: pelo menos 120 questões classificadas nos últimos anos.";

export const metadata: Metadata = {
  // O " — Fácies" saiu: o `template` do layout acrescenta " · Fácies".
  title: "Bancas",
  description: DESCRICAO,
  alternates: { canonical: "/facies" },
  openGraph: { title: "Bancas", description: DESCRICAO, url: "/facies" },
};

export default function IndiceDeBancas() {
  const bancas = todasAsBancas();

  // Agrupado por UF porque é assim que o candidato procura: ele presta no estado
  // onde mora ou onde quer morar, não numa lista alfabética nacional.
  const porUf = new Map<string, typeof bancas>();
  for (const banca of bancas) {
    const chave = banca.uf ?? "Nacional";
    const lista = porUf.get(chave) ?? [];
    lista.push(banca);
    porUf.set(chave, lista);
  }
  const ufs = [...porUf.keys()].sort((a, b) =>
    a === "Nacional" ? -1 : b === "Nacional" ? 1 : a.localeCompare(b, "pt-BR"),
  );

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">
      <nav className="py-6">
        <Link href="/" className="text-sm text-primary">
          ← Fácies
        </Link>
      </nav>

      <header className="pb-8">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">Bancas</h1>
        <p className="mt-3 max-w-[62ch] text-base text-muted">
          {bancas.length} bancas com base suficiente para uma leitura honesta — pelo menos 120
          questões classificadas nos últimos anos, sobre{" "}
          {NACIONAL.total.toLocaleString("pt-BR")} questões de prova. Abaixo desse piso a
          leitura seria ruído com cara de precisão, então a página não existe.
        </p>
      </header>

      <div className="grid gap-8">
        {ufs.map((uf) => (
          <section key={uf}>
            <h2 className="border-b border-rule pb-2 font-mono text-sm text-muted">{uf}</h2>
            <ul className="mt-3 grid gap-px bg-rule sm:grid-cols-2">
              {(porUf.get(uf) ?? []).map((banca) => (
                <li key={banca.slug} className="bg-paper">
                  <Link
                    href={`/facies/${banca.slug}`}
                    className="flex items-baseline justify-between gap-3 px-3 py-2.5 hover:bg-surfaceMuted"
                  >
                    <span className="text-sm text-ink">{banca.nome}</span>
                    <span className="shrink-0 font-mono text-xs tabular-nums text-muted">
                      {banca.total.toLocaleString("pt-BR")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
