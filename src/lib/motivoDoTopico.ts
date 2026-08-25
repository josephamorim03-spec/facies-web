/**
 * Por que o sistema escolheu este tópico — a decisão, separada da renderização.
 *
 * ## Por que isto não mora dentro do componente
 *
 * A regra tem um controle negativo que precisa ser testável: **sem evidência,
 * nada genérico entra no lugar do número.** Um "recomendado para você" sem
 * contagem é o que faz o aluno parar de acreditar no resto da tela, e essa é
 * exatamente a classe de defeito que não dá erro — dá uma frase plausível.
 *
 * Dentro do JSX, a única forma de prender isso seria ler o texto-fonte do
 * componente com regex, que prova que a linha existe e não que ela decide certo.
 * Como função pura, o teste exercita a decisão de verdade, incluindo os casos
 * que a tela nunca mostra em desenvolvimento (evidência com contagem zero,
 * rótulo vazio, denominador ausente).
 *
 * ## O que esta camada NÃO decide
 *
 * *Quando* é lícito citar a prova do aluno é decisão do backend:
 * `target_demand_evidence` só chega quando ele declarou objetivo E a instituição
 * tem massa naquele grão (`bank_demand.role_is_reliable`). Aqui só se escolhe a
 * FORMA. Reimplementar o critério deste lado criaria duas regras que divergem —
 * e a que aparece na tela seria a errada.
 */

import type { QuestionBankTopic } from "@/lib/api/domains/question-bank/types";

/** Rótulo seco, para quando não há nem evidência nem frase montada. */
export const ROTULO_DO_MOTIVO: Record<
  QuestionBankTopic["recommendation_reason"],
  string
> = {
  knowledge_gap: "Lacuna de conhecimento",
  high_yield: "Alta cobrança",
  under_covered: "Pouco coberto",
  scheduled: "Planejado",
};

export type MotivoDoTopico =
  /** A forma que vende: o número da prova do aluno, com denominador. */
  | { forma: "evidencia"; instituicao: string; cobradas: number; total: number }
  /** A frase montada pelo backend (`topic_explanation`), que nunca inventa número. */
  | { forma: "frase"; texto: string }
  /** O último recurso: o rótulo do motivo, honesto por não fingir medida. */
  | { forma: "rotulo"; texto: string };

export function motivoDoTopico(topic: QuestionBankTopic): MotivoDoTopico {
  const evidencia = topic.target_demand_evidence;
  const instituicao = evidencia?.institution_label?.trim();
  const cobradas = evidencia?.recent_question_count ?? 0;
  const total = evidencia?.institution_recent_question_count ?? 0;

  // As TRÊS partes são exigidas juntas, e não só a existência do objeto.
  //
  // `cobradas > 0` porque "cobrou isto em 0 das últimas 1.244" é uma frase que
  // desqualifica o próprio tópico que o sistema acabou de recomendar.
  //
  // `total > 0` porque sem denominador o número é injulgável: 18 de 1.244 e 18
  // de 40 são afirmações opostas, e o aluno não tem como saber qual leu.
  //
  // Nenhum dos dois é hipótese. Medido nas 59.831 linhas de demanda em produção
  // (2026-08-24): o rótulo vem em 100%, mas o numerador é > 0 em só 69% e o
  // denominador em 89%. Sem estas guardas, uma em cada três linhas produziria
  // uma frase quebrada — e nenhuma delas daria erro.
  if (instituicao && cobradas > 0 && total > 0) {
    return { forma: "evidencia", instituicao, cobradas, total };
  }

  const frase = topic.recommendation_explanation?.trim();
  if (frase) return { forma: "frase", texto: frase };

  return { forma: "rotulo", texto: ROTULO_DO_MOTIVO[topic.recommendation_reason] };
}
