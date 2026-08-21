"use client";

import type { QuestionBankReasoningCheckpoint } from "@/lib/api";

type Props = {
  chain: QuestionBankReasoningCheckpoint[];
  status: string;
};

/**
 * Fechamento da correção: o que aquele autorrelato virou.
 *
 * A afirmação é verificável, e por isso pode ser feita: o servidor projeta as
 * respostas em `student_knowledge_state.self_report_adjustment`
 * (`_project_self_report_for_run`), recomputando a partir do ledger inteiro.
 *
 * O que ele deliberadamente NÃO diz é "isso melhorou seu domínio": o autorrelato
 * não toca `mastery_score`, nem FSRS, nem exposição, nem streak. Prometer efeito
 * onde não há seria o tipo de frase que faz o aluno parar de acreditar no resto.
 */
export function ReasoningClosing({ chain, status }: Props) {
  const settled = status === "gap_identified" || status === "completed" || status === "awaiting_attribution";
  if (!settled || !chain || chain.length === 0) return null;

  const verified = chain.filter((item) => item.state === "verified").length;
  const gaps = chain.filter((item) => item.state === "gap").length;

  return (
    <section
      aria-label="Registro no motor"
      className="mt-4 border-t border-ink pt-3"
    >
      <p className="text-nano font-semibold uppercase tracking-[0.16em] text-muted">
        Gravando no motor
      </p>

      <dl className="mt-2 flex flex-col gap-1 text-xs">
        <div className="flex items-center gap-3">
          <dt className="text-ink">Elos verificados</dt>
          <span className="chrome-leader" aria-hidden="true" />
          <dd className="font-semibold tabular-nums text-primary">{verified}</dd>
        </div>
        <div className="flex items-center gap-3">
          <dt className="text-ink">Lacunas identificadas</dt>
          <span className="chrome-leader" aria-hidden="true" />
          <dd className="font-semibold tabular-nums text-primary">{gaps}</dd>
        </div>
        <div className="flex items-center gap-3">
          <dt className="text-ink">Perfil cognitivo</dt>
          <span className="chrome-leader" aria-hidden="true" />
          <dd className="font-semibold uppercase tracking-[0.1em] text-primary">Atualizado</dd>
        </div>
      </dl>

      <p className="mt-3 max-w-[68ch] font-serif text-sm leading-relaxed text-muted">
        O que você declarou não vira nota. Vira ajuste no seu perfil: o motor passa a saber onde a
        cadeia quebra, e não só que a resposta saiu errada.
      </p>
    </section>
  );
}
