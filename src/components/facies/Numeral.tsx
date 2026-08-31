/**
 * Número em monoespaçada com o separador apertado.
 *
 * ## O DEFEITO
 *
 * A Azeret Mono dá a MESMA célula a todo caractere — é o que a torna
 * monoespaçada e é por isso que ela foi escolhida (das oito comparadas, só
 * Azeret, Roboto Mono e Courier Prime têm o zero sem enfeite). Mas a vírgula e o
 * ponto são glifos estreitos dentro de uma célula larga, e o resultado na tela
 * era:
 *
 *     7 , 3%          em vez de   7,3%
 *     89 . 734        em vez de   89.734
 *     29 , 2%         em vez de   29,2%
 *
 * Numa seção cujo argumento inteiro é "nós medimos", número que parece
 * digitado errado custa mais que em qualquer outro lugar da página.
 *
 * ## POR QUE NÃO TROCAR A FONTE
 *
 * A saída óbvia seria mandar todo número com separador para a sans com
 * `tabular-nums`. Isso conserta o espaçamento e perde o desenho: os números
 * deixariam de ler como medida e passariam a ler como texto, que é exatamente a
 * distinção que a mono carrega nesta página.
 *
 * Então o separador é apertado no lugar: ele sai do fluxo de células com margem
 * negativa e volta a encostar nos dígitos. A fonte continua sendo a mesma, o
 * alinhamento por coluna continua valendo (os dígitos seguem em células iguais),
 * e só o glifo estreito deixa de ocupar largura de dígito.
 *
 * ⚠️ `-0.16em` e não um valor em px: a compensação tem de acompanhar o tamanho
 * do texto, e estes números aparecem de 11px (`text-micro`) a 40px no painel.
 * Em px, o que fica certo no painel esmaga o da lista.
 */
const SEPARADOR = /([.,])/;

export function Numeral({
  children,
  className = "",
}: {
  children: string;
  className?: string;
}) {
  const partes = children.split(SEPARADOR);

  return (
    <span className={`font-mono tabular-nums ${className}`}>
      {partes.map((parte, indice) =>
        SEPARADOR.test(parte) && parte.length === 1 ? (
          // `inline-block` para a margem negativa valer nos dois lados; sem ele
          // o navegador aplica só a horizontal do fluxo e o aperto sai torto.
          <span key={indice} className="-mx-[0.16em] inline-block">
            {parte}
          </span>
        ) : (
          <span key={indice}>{parte}</span>
        ),
      )}
    </span>
  );
}
