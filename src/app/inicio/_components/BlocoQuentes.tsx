"use client";

import Link from "next/link";

import type { QuestionBankLongitudinalDiagnosis } from "@/lib/api";
import { Cartao } from "@/app/evolucao/_components/Cartao";

/**
 * OS ASSUNTOS QUENTES — o que está a escapar, e por quê.
 *
 * ## Este endpoint já existia, já era pré-aquecido, e NENHUMA tela o desenhava
 *
 * `getQuestionBankLongitudinalDiagnosis` (`/api/question-bank/diagnosis/longitudinal`)
 * traz `weak_node_ids`, `at_risk_node_ids`, `trap_sensitivity` e
 * `recommended_blocks` — e o `navigationWarmup` já o aquecia para a aba
 * Evolução. Era trabalho pago e deitado fora: a resposta chegava, entrava na
 * cache e ninguém a lia.
 *
 * ## Por que os blocos recomendados, e não a lista de nós fracos
 *
 * `weak_node_ids` é uma lista de identificadores: para a mostrar seria preciso
 * cruzá-la com `nodes` e inventar uma frase para cada. `recommended_blocks` já
 * vem com `label`, `why_now`, `estimated_minutes` e `recommended_question_count`
 * — o servidor já decidiu o que dizer e por quê.
 *
 * ⚠️ **`why_now` é impresso como veio.** É a razão que o motor calculou, e
 * reescrevê-la no cliente criaria uma segunda explicação para a mesma decisão —
 * duas verdades para "por que este assunto agora".
 */
export function BlocoQuentes({
  diagnostico,
}: {
  diagnostico: QuestionBankLongitudinalDiagnosis;
}) {
  // Três é o que cabe sem transformar o resumo numa lista. O Início é a tela do
  // que importa AGORA; a lista inteira é da Evolução.
  const blocos = diagnostico.recommended_blocks.slice(0, 3);
  if (blocos.length === 0) return null;

  const emRisco = diagnostico.at_risk_node_ids.length;

  return (
    <Cartao
      pergunta="O que está a escapar"
      medida="assuntos com erro recente ou retenção a cair"
      nota={
        emRisco > 0
          ? `${emRisco} ${emRisco === 1 ? "assunto" : "assuntos"} em risco de esquecimento.`
          : undefined
      }
    >
      {/* ⚠️ `grid-cols-1` na pista do telemóvel: pista implícita é `auto`, e o
          mínimo dela é o min-content — com rótulo de microcompetência lá dentro,
          a frase inteira. Foi assim que o pós-simulado estourou 430px a 390px
          (guard: `scripts/check-pista-de-grelha.mjs`). */}
      <div className="grid grid-cols-1 gap-2">
        {blocos.map((bloco) => (
          <Link
            key={bloco.node_id}
            /* 🚨 MANDA O `node_id`, e não só o nome.

               Isto era `?theme=<node_name>` sozinho — e `theme` no Banco não é
               um filtro de tópico: vira o TEXTO da caixa de busca
               (`banco/page.tsx` usa-o para `searchDraft`/`committedSearch`).
               Ou seja, o bloco recomendado chegava ao Banco como quem digitou o
               nome à mão, e acertava só quando a string batia certo com um nó
               da lista carregada.

               O caminho forte já existia e ninguém daqui o usava:
               `knowledge_node_ids` é lido por `useFocoDeEntrada`, que procura o
               nó por ID, selecciona-o e LIMPA a busca por texto.

               ⚠️ Os dois vão juntos de propósito. O hook desiste em silêncio
               quando o nó ainda não está na lista carregada (está escrito lá
               porquê), e nesse caso o `theme` continua a servir de recurso —
               que é exactamente o papel que o comentário dele lhe dá. */
            href={`/banco?knowledge_node_ids=${encodeURIComponent(bloco.node_id)}&theme=${encodeURIComponent(bloco.node_name)}&answer_status=unanswered_or_wrong`}
            className="paper-control flex min-w-0 items-center justify-between gap-3 rounded-control border border-edge bg-paper px-4 py-3 text-left hover:border-primary"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-ink">{bloco.label}</span>
              {/* A razão do servidor, palavra por palavra. */}
              <span className="mt-0.5 block text-nota text-muted">{bloco.why_now}</span>
              <span className="paper-eyebrow mt-1 block">
                {bloco.recommended_question_count} questões · {bloco.estimated_minutes} min
              </span>
            </span>
            <span aria-hidden="true" className="shrink-0 text-muted">
              ›
            </span>
          </Link>
        ))}
      </div>
    </Cartao>
  );
}
