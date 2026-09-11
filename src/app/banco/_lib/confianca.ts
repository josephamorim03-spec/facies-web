// Extensão explícita: `tests/unit` roda em `node --test`, cuja resolução ESM
// não completa especificadores relativos sem extensão (mesmo caso de `auth.ts`).

/**
 * As duas regras da etapa de confiança, fora do componente — porque componente
 * não se testa aqui.
 *
 * `tests/unit` corre em `node --test --experimental-strip-types`: importa `.ts`
 * e executa, mas não renderiza React. Enquanto estas duas regras viviam dentro
 * do `ConfidenceReviewStep`, o mais que um teste conseguia era procurar o texto
 * do código — afirmar um PROXY em vez da propriedade. Aqui elas são funções
 * puras, e o teste chama-as.
 */

/** O mínimo que a etapa precisa saber de um item. */
export type ItemDeConfianca = {
  position: number;
  selected_option?: string | null;
  is_annulled?: boolean | null;
  excluded_from_scoring?: boolean | null;
};

/**
 * Quem entra na etapa de confiança.
 *
 * ⚠️ O critério é `selected_option`, e NÃO `answered`.
 *
 * A etapa abre com a sessão ainda `active`, antes do finalize. Até 2026-09-10
 * `answered` só ficava verdadeiro na tentativa gravada — que só existe DEPOIS
 * do finalize —, então numa prova inteira esta lista vinha **vazia**: o ecrã
 * aparecia com título, um botão, e nada para marcar. Era o "aparece, mas não
 * permite responder questão por questão" que o operador relatou.
 *
 * A PR #76 alinhou `answered` ao rascunho e o sintoma sumiu, mas `answered`
 * continua a ser o campo com dois sentidos possíveis (tentativa gravada vs.
 * rascunho). `selected_option` — "o aluno pôs alguma coisa aqui" — é a mesma
 * definição que o diálogo de saída usa, e não depende de qual sentido vence.
 *
 * Anulada e excluída da pontuação saem: não há calibração a medir onde não há
 * certo nem errado.
 */
export function questoesParaConfianca<T extends ItemDeConfianca>(items: readonly T[]): T[] {
  return items
    .filter((item) => Boolean(item.selected_option) && !item.is_annulled && !item.excluded_from_scoring)
    .sort((a, b) => a.position - b.position);
}

/**
 * "Marcar restantes" marca as RESTANTES.
 *
 * ⚠️ A versão anterior montava um objeto novo com o valor para toda a gente e
 * substituía o estado inteiro. O rótulo do botão dizia "restantes" e o código
 * dizia "todas": quem marcasse quarenta questões com cuidado e tocasse aqui
 * perdia as quarenta — sem aviso, sem desfazer, e sem nada na tela que
 * denunciasse a diferença, porque o botão pinta tudo do mesmo jeito.
 */
export function marcarRestantes(
  atual: Readonly<Record<number, number>>,
  posicoes: readonly number[],
  valor: number,
): Record<number, number> {
  const proximo: Record<number, number> = { ...atual };
  for (const posicao of posicoes) {
    if (!proximo[posicao]) proximo[posicao] = valor;
  }
  return proximo;
}
