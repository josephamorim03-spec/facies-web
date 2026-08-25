import Link from "next/link";
import { CabecalhoPublico } from "@/components/facies/CabecalhoPublico";

/**
 * Um documento legal em página pública.
 *
 * PÚBLICA sem sessão, e isso é exigência, não escolha: o Decreto 7.962/2013
 * (art. 3º) manda o contrato estar disponível ANTES da contratação, em meio que
 * permita conservação e reprodução. Termos atrás de login seriam termos que só
 * quem já aceitou consegue ler.
 *
 * ## Por que o Markdown vira parágrafo aqui, e não `dangerouslySetInnerHTML`
 *
 * O texto vem do backend como Markdown cru. Renderizá-lo com HTML injetado
 * abriria uma superfície de script numa página que, por desenho, é servida a
 * quem não tem sessão — e o ganho seria formatação. Este renderizador cobre o
 * que documento legal usa (título, parágrafo, lista, citação, tabela vira texto)
 * e ignora o resto, o que é o comportamento seguro.
 */

type Props = {
  titulo: string;
  documento: {
    publicado: boolean;
    version?: string | null;
    effective_from?: string | null;
    conteudo?: string | null;
  };
};

/** Formata a data de vigência sem `Intl` pesado: a string já vem ISO. */
function vigenciaLegivel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const data = iso.slice(0, 10).split("-");
  if (data.length !== 3) return null;
  return `${data[2]}/${data[1]}/${data[0]}`;
}

function Bloco({ linha, chave }: { linha: string; chave: string }) {
  const texto = linha.trim();

  if (texto.startsWith("### ")) {
    return (
      <h3 key={chave} className="mt-8 font-serif text-lg font-semibold text-ink">
        {texto.slice(4)}
      </h3>
    );
  }
  if (texto.startsWith("## ")) {
    return (
      <h2 key={chave} className="mt-10 font-serif text-xl font-semibold text-ink">
        {texto.slice(3)}
      </h2>
    );
  }
  if (texto.startsWith("# ")) {
    // O H1 do arquivo não é renderizado: a página já tem um, e dois H1 quebram
    // a hierarquia para leitor de tela.
    return null;
  }
  if (texto.startsWith("> ")) {
    return (
      <blockquote
        key={chave}
        className="mt-4 border-l-2 border-primary pl-4 text-sm leading-6 text-ink"
      >
        {texto.slice(2)}
      </blockquote>
    );
  }
  if (texto.startsWith("- ") || texto.startsWith("* ")) {
    return (
      <li key={chave} className="ml-5 list-disc text-sm leading-6 text-muted">
        {texto.slice(2)}
      </li>
    );
  }
  if (texto.startsWith("|") || texto.startsWith("---")) {
    // Tabela e régua: o conteúdo importa mais que a grade. Renderizar como texto
    // preserva a informação sem inventar um componente de tabela para um caso.
    return texto.startsWith("---") ? null : (
      <p key={chave} className="mt-2 font-mono text-xs leading-5 text-muted">
        {texto.replace(/\|/g, " · ").trim()}
      </p>
    );
  }
  if (!texto) return null;

  return (
    <p key={chave} className="mt-4 max-w-[70ch] text-sm leading-6 text-muted">
      {texto}
    </p>
  );
}

export function DocumentoLegal({ titulo, documento }: Props) {
  const vigencia = vigenciaLegivel(documento.effective_from);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16 sm:px-6">
      <CabecalhoPublico />

      <header className="border-b border-rule py-10">
        <h1 className="font-serif text-3xl font-semibold leading-tight text-ink">
          {titulo}
        </h1>
        {documento.publicado && vigencia ? (
          <p className="paper-eyebrow mt-3">
            Versão {documento.version} · em vigor desde {vigencia}
          </p>
        ) : null}
      </header>

      {documento.publicado && documento.conteudo ? (
        <article className="pt-2">
          {documento.conteudo.split("\n").map((linha, i) => (
            <Bloco key={`l${i}`} chave={`l${i}`} linha={linha} />
          ))}
        </article>
      ) : (
        // O texto ainda não existe, e a página diz isso em vez de fingir.
        // Afirmar que há um documento quando não há é o defeito que esta tela
        // existe para não cometer.
        <div className="mt-8 rounded-surface border border-edge bg-surfaceMuted p-5 sm:p-6">
          <p className="text-base text-ink">Este documento ainda não foi publicado.</p>
          <p className="mt-2 max-w-[58ch] text-sm leading-6 text-muted">
            Enquanto isso, nada é cobrado e nenhum aceite é pedido no cadastro. A leitura
            da fácies da sua prova continua gratuita e não depende disto.
          </p>
          <Link
            href="/"
            className="paper-control mt-4 inline-flex rounded-control border border-primary bg-primary px-5 py-2.5 text-sm font-semibold text-primaryInk"
          >
            Ver a fácies da sua prova
          </Link>
        </div>
      )}

      <footer className="mt-14 border-t border-rule pt-8">
        <p className="max-w-[70ch] text-sm text-muted">
          A Fácies não promete aprovação e não vende conteúdo teórico.
        </p>
      </footer>
    </main>
  );
}
