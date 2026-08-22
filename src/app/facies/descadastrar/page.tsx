import type { Metadata } from "next";
import { Descadastro } from "./_components/Descadastro";

/**
 * A saída da lista, prometida na tela de inscrição.
 *
 * Por que existe uma PÁGINA e não só um link que já cancela: scanner de e-mail
 * corporativo e pré-carregamento de navegador seguem links por conta própria.
 * Um `GET` que cancela descadastraria gente que nunca clicou, e ela só
 * descobriria ao parar de receber — sem entender por quê.
 *
 * O "um clique" prometido continua sendo um clique: o da página. E ele é do
 * titular, não de um robô.
 */

export const metadata: Metadata = {
  title: "Parar de receber",
  // Não indexável: é uma página de ação com token na URL, não conteúdo.
  robots: { index: false, follow: false },
};

export default function PaginaDescadastro() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-16 sm:px-6">
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">
        Parar de receber os avisos
      </h1>
      <p className="mt-4 text-base text-muted">
        Você deixa de receber os avisos sobre mudanças na sua prova. A fácies continua
        aberta e sem cadastro — isto encerra só os e-mails.
      </p>
      <Descadastro />
    </main>
  );
}
