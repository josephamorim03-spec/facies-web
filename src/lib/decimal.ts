/**
 * Decimal em português. Uma casa, vírgula, sem exceção.
 *
 * POR QUE ISTO EXISTE EM VEZ DE `toFixed(1)`
 * ------------------------------------------
 * `toFixed` é do inglês: devolve `38.9`. Em português o ponto separa MILHAR e a
 * vírgula separa DECIMAL — `2.031` questões e `38,9%`. A página misturava os
 * dois, porque os inteiros já passavam por `toLocaleString("pt-BR")` e os
 * decimais não.
 *
 * Parece detalhe e não é: este produto vende rigor de medição. Um número
 * formatado na convenção errada, na tela que exibe a medição, contradiz a única
 * coisa que ele está tentando afirmar. E o custo de acertar é uma função.
 *
 * `minimumFractionDigits` junto com `maximumFractionDigits` é o que garante
 * `4,0x` em vez de `4x`: numa coluna de medidas, a casa decimal que some faz o
 * número parecer arredondado a olho.
 */
export function dec(valor: number, casas = 1): string {
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}
