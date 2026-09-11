"use client";

import Link from "next/link";

import type { QuestionBankPerformance } from "@/lib/api";
import { Cartao, Numero } from "@/app/evolucao/_components/Cartao";

/**
 * A EVOLUÇÃO, RESUMIDA — dois números e a porta.
 *
 * ## ⚠️ NÃO HÁ NÚMERO NOVO, e é por isso que este bloco é tão magro
 *
 * A regra da casa é explícita: *"um assunto nao pode ter 2 respostas numa tela e
 * 34 na outra"* (`12b`). O Início compõe peças que já existem — não recalcula.
 *
 * Os dois números vêm de `getQuestionBankPerformance`, a MESMA consulta que o
 * hub do "Mais" já usa para os seus três registos. Se um dia divergirem, é
 * porque alguém mudou a consulta, não porque uma das telas fez a sua própria
 * conta.
 *
 * A projeção de nota, o mosaico de dias e "onde mais escapa" continuam na
 * Evolução, e a porta abaixo leva lá. Trazê-los para aqui seria transformar o
 * resumo numa segunda Evolução — e duas telas que respondem à mesma pergunta é
 * como o produto passa a discordar de si próprio.
 */
export function BlocoEvolucao({ desempenho }: { desempenho: QuestionBankPerformance }) {
  const acerto = desempenho.first_attempt_accuracy;

  return (
    <Cartao
      pergunta="Como você vem indo"
      medida="acerto de primeira · questões distintas"
      nota={
        <Link href="/evolucao" className="paper-control text-primary hover:underline">
          Ver a evolução inteira ›
        </Link>
      }
    >
      <div className="flex items-end gap-8">
        <div>
          <Numero
            valor={acerto === null || acerto === undefined ? "—" : `${Math.round(acerto * 100)}%`}
          />
          <p className="paper-eyebrow mt-1">acerto de primeira</p>
        </div>
        <div>
          <p className="font-mono text-dado-menor tabular-nums text-ink">
            {(desempenho.unique_questions ?? 0).toLocaleString("pt-BR")}
          </p>
          <p className="paper-eyebrow mt-1">questões</p>
        </div>
      </div>
    </Cartao>
  );
}
