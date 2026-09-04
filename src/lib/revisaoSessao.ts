import type { QuestionBankSessionCreatePayload } from "@/lib/api";

/**
 * O payload que abre um dia da Semana Final como sessão de questões.
 *
 * ## Por que isto é uma função e não um objeto inline no componente
 *
 * As três escolhas abaixo são silenciosas quando quebram: se `answer_status`
 * deixar de ser `"all"`, o dia simplesmente vem menor para quem já respondeu
 * algumas questões da base — nenhum erro, nenhum log, só uma revisão incompleta.
 * Como função exportada ela fica sob teste, e o teste é o que impede a
 * regressão de passar despercebida.
 *
 * ## As escolhas, e o que foi verificado no servidor
 *
 * - `question_ids`: a sessão tem EXATAMENTE as questões do dia. O servidor as
 *   ordena com `preserve_order`, então a ordem da revisão é preservada.
 * - `answer_status: "all"`: sem este campo, `_answer_status` cai em
 *   `"unanswered"` e o ramo de ids explícitos filtra as já respondidas. É
 *   revisão, não prática de inéditas.
 * - `feedback_timing: "immediate"`: é o eixo que governa a revelação do
 *   gabarito. `session_kind: "bank_topic"` NÃO é pinado pelo servidor — só
 *   `kros` e `institutional_exam` forçam `post_result`.
 * - `limit`: o tamanho do dia. `_bounded_question_bank_limit` só limita
 *   (`max(1, min(CAP, v))`), então 3 questões passam como 3.
 *
 * ⚠️ `resolution_mode` fica FORA de propósito: o validador do schema o pina em
 * `"simulation"` em toda sessão nova. Enviá-lo seria campo morto — declararia
 * uma intenção que o servidor descarta.
 */
export function payloadDoDia(questaoIds: string[]): QuestionBankSessionCreatePayload {
  return {
    session_kind: "bank_topic",
    feedback_timing: "immediate",
    answer_status: "all",
    question_ids: questaoIds,
    limit: questaoIds.length,
  };
}
