import CardsAdaptativosClientPage from "./CardsAdaptativosClientPage";

/**
 * A pagina segue intacta; quem barra a entrada e o `redirects()` do
 * `next.config.js`, com `NEXT_PUBLIC_FLASHCARDS` desligado.
 *
 * ⚠️ NAO por um `redirect()` aqui dentro. Tentei: o build continuou
 * pre-renderizando a tela normalmente -- `registros.html` saiu com o Caderno
 * dentro e `x-nextjs-prerender: 1` no meta --, inclusive depois de apagar
 * `.next` e reconstruir do zero. Um redirect que so existe no fonte e pior que
 * nenhum: ele parece resolvido na revisao de codigo.
 */
export default function CardsAdaptativosPage() {
  return <CardsAdaptativosClientPage />;
}
