/**
 * Comentário é PROSA, não código — e os guards precisam concordar sobre isso.
 *
 * ## Porque isto virou um módulo
 *
 * Três guards nasceram na mesma rodada e trataram comentário de três maneiras:
 * `check-parametro-lido` já os removia (porque reprovava um arquivo que
 * documentava, num comentário, a URL antiga que ele próprio tinha corrigido);
 * `check-escala-viva` e `check-sem-beco` liam o fonte cru.
 *
 * O efeito é o pior tipo de falso positivo: um comentário que REGISTA a correção
 * — `// era <h2 className="text-2xl">` — reprova o lint, e a saída mais fácil
 * para quem tem pressa é apagar o registo. O guard passa a ensinar o contrário
 * do que quer.
 *
 * `banco/page.tsx` já teve de se contorcer por causa disto: lá está escrito "o
 * nome dele não se escreve aqui" porque outro contrato varre o fonte cru.
 *
 * ⚠️ Não é um parser. Remove `/* … *\/` e `// …` por regex, e por isso não
 * entende uma barra dupla dentro de uma string de URL — o `[^:]` antes
 * do `//` existe só para poupar URLs. Para o que estes guards fazem (procurar
 * `<h1`, `<Alert`, `href="/rota?x=1"`) isso basta, e um parser de verdade seria
 * mais superfície do que a regra merece.
 */
export function semComentarios(fonte) {
  return (
    fonte
      // ⚠️ O BLOCO VIRA AS SUAS PRÓPRIAS QUEBRAS, e não um espaço.
      //
      // Colapsar `/* … */` a um espaço encurtava o arquivo — e os três guards
      // calculam `file:line` contando `\n` no fonte JÁ limpo. Nesta base, onde
      // um docstring de vinte linhas é o normal, o número apontado saía dezenas
      // de linhas acima do defeito. Mandar alguém para a linha errada é quase
      // tão caro como não avisar: ele procura, não encontra, e desconfia do
      // guard em vez do código.
      .replace(/\/\*[\s\S]*?\*\//g, (bloco) => "\n".repeat(bloco.split("\n").length - 1))
      .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ")
  );
}
