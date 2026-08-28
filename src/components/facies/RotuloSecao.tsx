/**
 * O rótulo numerado que abre cada seção da landing — o `01 · veja você mesmo`
 * da v7.
 *
 * O NÚMERO É DECORATIVO PARA QUEM OUVE, e por isso sai do fluxo acessível. Ele
 * serve ao olho que percorre a página: dá a sensação de documento numerado e
 * mostra quanto falta. Lido em voz alta antes de cada título, viraria "zero um,
 * veja você mesmo, você sabe o que a sua prova cobra" — três coisas onde o
 * leitor esperava uma.
 *
 * O rótulo de texto FICA audível: ele diz do que a seção trata, e é a única
 * pista que o leitor de tela tem antes do título.
 *
 * A cor do número é `marcaViva` — a marca como tinta, que é exatamente o papel
 * que o handoff dá a ela ("o á do logotipo, números de seção, links, selos").
 * Dentro da faixa petróleo o `.paper-eyebrow` já é reescrito para a tinta clara,
 * então aqui não há caso especial.
 */
export function RotuloSecao({ numero, children }: { numero: string; children: React.ReactNode }) {
  return (
    // `items-center` e não `items-baseline`: o traço não tem linha de base, e
    // alinhá-lo por ela o joga para o pé do texto.
    <div className="paper-eyebrow flex items-center gap-3">
      {/* O tracking do número é MAIOR que o do rótulo (.14em contra .08em), e
          isso não é descuido do desenho: o número tem dois caracteres e, no
          espaçamento do rótulo, ele fecha num bloco que lê como uma palavra
          curta em vez de uma numeração. */}
      <span aria-hidden="true" className="tracking-[0.14em] text-marcaViva">
        {numero}
      </span>
      {/* O TRAÇO, que estava faltando. 36×2px na cor da régua — é ele que faz
          o rótulo ler como cabeçalho de documento numerado em vez de duas
          palavras soltas. Some para quem ouve: não carrega informação. */}
      <span aria-hidden="true" className="h-0.5 w-9 shrink-0 bg-rule" />
      <span>{children}</span>
    </div>
  );
}
