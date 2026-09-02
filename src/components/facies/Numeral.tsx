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

/**
 * ⚠️ SÓ O SEPARADOR ENTRE DÍGITOS, e a primeira versão desta função errava nas
 * duas pontas.
 *
 * Ela quebrava qualquer `,` ou `.` em `<span>` próprio — e span vizinho é ponto
 * de quebra de linha. Na landing isso saiu assim, em produção:
 *
 *     ... em outra, 29,
 *     2% das questões pedem ...
 *
 * O número partido no meio, que é pior do que o espaçamento que eu tinha ido
 * consertar. Também apertava vírgula de PROSA — "idade, atraso, náusea" tem
 * vírgula de lista, e ali o espaço normal está certo.
 *
 * Agora o texto é varrido por grupos NUMÉRICOS (`29,2`, `89.734`, `7,3`): cada
 * grupo vira uma unidade que não quebra, e só dentro dele o separador é
 * apertado. Fora dos grupos nada muda — a prosa quebra onde precisa, que é o
 * que faz "6 — idade, atraso, náusea, PA, teste, ausências" caber na coluna.
 */
const GRUPO_NUMERICO = /(\d+(?:[.,]\d+)+)/;

function apertarSeparadores(numero: string, chave: number) {
  return (
    // `whitespace-nowrap`: o grupo inteiro é uma palavra só para o layout.
    <span key={chave} className="whitespace-nowrap">
      {numero.split(SEPARADOR).map((parte, i) =>
        parte.length === 1 && SEPARADOR.test(parte) ? (
          // `inline-block` para a margem negativa valer nos dois lados; sem ele
          // o navegador aplica só a horizontal do fluxo e o aperto sai torto.
          <span key={i} className="-mx-[0.16em] inline-block">
            {parte}
          </span>
        ) : (
          <span key={i}>{parte}</span>
        ),
      )}
    </span>
  );
}

export function Numeral({
  children,
  className = "",
}: {
  children: string;
  className?: string;
}) {
  const partes = children.split(GRUPO_NUMERICO);

  return (
    <span className={`font-mono tabular-nums ${className}`}>
      {partes.map((parte, indice) =>
        GRUPO_NUMERICO.test(parte) ? (
          apertarSeparadores(parte, indice)
        ) : (
          <span key={indice}>{parte}</span>
        ),
      )}
    </span>
  );
}
