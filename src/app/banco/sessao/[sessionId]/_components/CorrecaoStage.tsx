"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import type { QuestionBankSession, QuestionBankSessionItem } from "@/lib/api";
import { ReasoningReviewPanel } from "./ReasoningReviewPanel";

type Props = {
  token: string;
  session: QuestionBankSession;
  onSessionChange?: (session: QuestionBankSession) => void;
  /** Sai da etapa e vai para o gabarito e os comentários. */
  onSkip: () => void;
};

/**
 * Etapa de correção — micro a micro, antes do gabarito.
 *
 * Era um botão por item, enterrado na lista do pós-prova: quem não abrisse item
 * por item nunca descobria que a etapa existia. Agora é um passo do fluxo, com
 * lugar próprio e um item de cada vez.
 *
 * **Responder é opcional, por decisão do produto.** Isso muda o que a tela
 * precisa fazer: quando pular não custa nada, o que decide o valor não é a
 * obrigatoriedade, é a qualidade do convite. Por isso a lista do que será
 * verificado aparece ANTES de qualquer botão de pular — o aluno precisa ver o
 * que está deixando na mesa para escolher de verdade, em vez de escapar do
 * atrito por reflexo.
 */
export function CorrecaoStage({ token, session, onSessionChange, onSkip }: Props) {
  const eligible = useMemo(
    () =>
      session.items.filter(
        (item) => item.reasoning_review_eligible && item.feedback_state !== "revealed",
      ),
    [session.items],
  );

  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);

  if (eligible.length === 0) return null;

  const current: QuestionBankSessionItem | undefined = eligible[index];
  const isLast = index >= eligible.length - 1;

  if (!started) {
    return (
      <section
        aria-labelledby="correcao-stage-title"
        className="paper-surface mt-4 border-2 border-primary p-4 sm:p-5"
      >
        <p className="paper-eyebrow">
          Antes do gabarito
        </p>
        <h2 id="correcao-stage-title" className="mt-1 font-serif text-2xl font-semibold text-ink">
          Onde seu raciocínio parou
        </h2>
        <p className="mt-2 max-w-[68ch] font-serif text-base leading-relaxed text-muted">
          Em {eligible.length}{" "}
          {eligible.length === 1 ? "questão" : "questões"} dá para localizar o elo exato em que a
          cadeia quebrou — se foi ler o caso, fechar o diagnóstico ou escolher a conduta. Errar por
          não reconhecer a doença e errar por não saber a dose são coisas diferentes, e o gabarito
          sozinho não distingue as duas.
        </p>

        {/* O custo de pular, explícito e antes do botão. */}
        <ul className="mt-4 flex flex-col gap-1">
          {eligible.slice(0, 5).map((item) => (
            <li
              key={item.position}
              className="flex items-center gap-3 rounded-control border border-edge bg-surface px-3 py-2 text-xs"
            >
              <span className="font-semibold tabular-nums text-muted">
                {String(item.position).padStart(2, "0")}
              </span>
              {/* O nó primário nomeia a questão melhor que o id: o aluno
                  reconhece "Insuficiência cardíaca", não "q_8f21c". */}
              <span className="min-w-0 flex-1 truncate text-ink">
                {item.knowledge_nodes.find((node) => node.is_primary)?.node_name ??
                  item.knowledge_nodes[0]?.node_name ??
                  `Questão ${item.position}`}
              </span>
              <span className="paper-eyebrow shrink-0">
                {item.is_correct === false ? "Errou" : "Marcou dúvida"}
              </span>
            </li>
          ))}
          {eligible.length > 5 ? (
            <li className="paper-eyebrow px-3 py-1">
              e mais {eligible.length - 5}
            </li>
          ) : null}
        </ul>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="button" variant="primary" size="md" onClick={() => setStarted(true)}>
            Localizar a lacuna
          </Button>
          <Button type="button" variant="ghost" size="md" onClick={onSkip}>
            Ir direto ao gabarito
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="correcao-stage-title" className="paper-surface mt-4 border-2 border-primary p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="correcao-stage-title" className="paper-eyebrow">
          Correção · questão {current?.position}
        </h2>
        <p className="paper-eyebrow">
          {index + 1} de {eligible.length}
        </p>
      </div>

      <div
        role="progressbar"
        aria-valuenow={index + 1}
        aria-valuemin={0}
        aria-valuemax={eligible.length}
        aria-label="Progresso da correção"
        className="paper-meter mt-2 h-2.5"
      >
        <div style={{ width: `${((index + 1) / eligible.length) * 100}%` }} />
      </div>

      {current ? (
        <ReasoningReviewPanel
          key={current.position}
          token={token}
          session={session}
          item={current}
          onSessionChange={onSessionChange}
        />
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2 border-t border-edge pt-4">
        {isLast ? (
          <Button type="button" variant="primary" onClick={onSkip}>
            Ver gabarito e comentários
          </Button>
        ) : (
          <Button type="button" variant="primary" onClick={() => setIndex((n) => n + 1)}>
            Próxima questão
          </Button>
        )}
        {/* Pular UM item não é pular a etapa: quem travou numa questão continua
            nas outras, em vez de abandonar tudo. */}
        {!isLast ? (
          <Button type="button" variant="ghost" onClick={() => setIndex((n) => n + 1)}>
            Pular esta
          </Button>
        ) : null}
        <Button type="button" variant="ghost" onClick={onSkip}>
          Sair da correção
        </Button>
      </div>
    </section>
  );
}
