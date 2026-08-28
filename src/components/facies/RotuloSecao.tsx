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
    <div className="paper-eyebrow flex items-baseline gap-2">
      <span aria-hidden="true" className="text-marcaViva">
        {numero}
      </span>
      <span>{children}</span>
    </div>
  );
}
