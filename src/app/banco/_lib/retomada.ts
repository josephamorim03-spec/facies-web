// Extensão explícita: `tests/unit` roda em `node --test`, cuja resolução ESM
// não completa especificadores relativos sem extensão (mesmo caso de `auth.ts`).

/** O mínimo que a retomada precisa saber de um item da sessão. */
export type ItemParaRetomar = {
  position: number;
  selected_option?: string | null;
  is_annulled?: boolean | null;
  excluded_from_scoring?: boolean | null;
};

/**
 * Onde reabrir a sessão: a primeira questão SEM resposta.
 *
 * ⚠️ Antes isto era `unanswered_question_numbers[0]`, e esse campo conta
 * **tentativa gravada** (`app/domain/entities/question_bank_session.py`), não
 * rascunho. Como toda sessão nova é `resolution_mode="simulation"` e o rascunho
 * só vira tentativa no finalize, durante a prova inteira a lista contém TODAS
 * as posições — e `[0]` é sempre 1.
 *
 * Consequência: qualquer remontagem no meio da prova — recarregar a página,
 * voltar de outra aba, tocar em "tentar de novo" depois de um erro de rede —
 * atirava o aluno para a **questão 1 com 40 respondidas**. Não perdia resposta
 * (o rascunho está gravado), mas numa prova de 100 é uma viagem de volta a pé.
 *
 * O servidor tem `draft_question_numbers()`, mas o cliente não precisa escolher
 * entre dois campos do servidor para saber uma coisa que ele já tem nos itens:
 * `selected_option` é "o aluno pôs alguma coisa aqui", a mesma definição que o
 * diálogo de saída e a etapa de confiança usam.
 *
 * ⚠️ `unanswered_question_numbers` continua certo para o que foi feito: é o que
 * alimenta o portão `confirm_unanswered` no finalize, onde "respondida" tem
 * mesmo de significar tentativa. São dois sentidos, e dois campos.
 *
 * @returns a posição, ou `null` quando não há onde retomar — tudo respondido,
 *   ou sessão sem item pontuável. `null` quer dizer **não mexa**: mover o aluno
 *   sem ter para onde é pior do que deixá-lo onde está.
 */
export function posicaoParaRetomar(items: readonly ItemParaRetomar[]): number | null {
  const pendentes = items
    .filter(
      (item) =>
        !item.selected_option && !item.is_annulled && !item.excluded_from_scoring,
    )
    .map((item) => item.position);
  return pendentes.length > 0 ? Math.min(...pendentes) : null;
}
