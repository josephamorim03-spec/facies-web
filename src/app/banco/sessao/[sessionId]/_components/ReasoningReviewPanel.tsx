"use client";

import { useState } from "react";
import {
  answerQuestionBankReasoningCheckpoint,
  attributeQuestionBankReasoningReview,
  getQuestionBankReasoningReview,
  revealQuestionBankItemFeedback,
  type QuestionBankReasoningReview,
  type QuestionBankSession,
  type QuestionBankSessionItem,
} from "@/lib/api";
import { ReasoningChain } from "./ReasoningChain";
import { ReasoningClosing } from "./ReasoningClosing";

type Props = {
  token: string;
  session: QuestionBankSession;
  item: QuestionBankSessionItem;
  onSessionChange?: (session: QuestionBankSession) => void;
};

const RESPONSE_OPTIONS = [
  ["yes", "Sim"],
  ["partial", "Parcialmente"],
  ["no", "Não"],
  ["unsure", "Não tenho certeza"],
] as const;

function newKey(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function ReasoningReviewPanel({ token, session, item, onSessionChange }: Props) {
  const [review, setReview] = useState<QuestionBankReasoningReview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reveal() {
    setBusy(true);
    setError(null);
    try {
      onSessionChange?.(
        await revealQuestionBankItemFeedback(token, session.session_id, item.position),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível revelar o feedback.");
    } finally {
      setBusy(false);
    }
  }

  async function openReview() {
    setBusy(true);
    setError(null);
    try {
      setReview(
        await getQuestionBankReasoningReview(token, session.session_id, item.position),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível abrir a revisão.");
    } finally {
      setBusy(false);
    }
  }

  async function answer(responseValue: "yes" | "partial" | "no" | "unsure") {
    if (!review?.current_checkpoint) return;
    setBusy(true);
    setError(null);
    try {
      setReview(
        await answerQuestionBankReasoningCheckpoint(
          token,
          session.session_id,
          item.position,
          {
            checkpoint_key: review.current_checkpoint.checkpoint_key,
            response_value: responseValue,
          },
          newKey("reasoning-response"),
        ),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível registrar a resposta.");
    } finally {
      setBusy(false);
    }
  }

  async function attribute(
    value: "inattention_to_command" | "marking_error" | "changed_correct_answer" | "guess" | "unsure",
  ) {
    setBusy(true);
    setError(null);
    try {
      onSessionChange?.(
        await attributeQuestionBankReasoningReview(
          token,
          session.session_id,
          item.position,
          value,
          newKey("reasoning-attribution"),
        ),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível concluir a revisão.");
    } finally {
      setBusy(false);
    }
  }

  if (!review) {
    return (
      <div className="mt-4 border border-primary/35 bg-[var(--wash-selecao)] p-4">
        <p className="text-sm font-medium text-ink">Antes de ver o comentário</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Você pode localizar até onde seu raciocínio chegou ou abrir o feedback agora.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          {item.reasoning_review_eligible && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void openReview()}
              className="border border-primary bg-primary px-4 py-2.5 text-sm font-medium text-primaryInk disabled:opacity-50"
            >
              Revisar raciocínio
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => void reveal()}
            className="rounded-control border border-edge bg-surface px-4 py-2.5 text-sm font-medium text-ink disabled:opacity-50"
          >
            Revelar resposta e comentários
          </button>
        </div>
        {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mt-4 border border-primary/40 bg-surface p-4" aria-live="polite">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="paper-eyebrow text-primary">
            Revisão estruturada do raciocínio
          </p>
          <p className="mt-1 text-xs text-muted">Autorrelato — não altera seu domínio.</p>
        </div>
        <button type="button" disabled={busy} onClick={() => void reveal()} className="text-xs text-muted underline">
          Pular e revelar
        </button>
      </div>

      {review.current_checkpoint && (
        <div className="mt-4">
          <p className="text-xs text-muted">Passo {review.current_checkpoint.step_order}</p>
          <h3 className="mt-1 text-base font-semibold leading-relaxed text-ink">
            {review.current_checkpoint.prompt}
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {RESPONSE_OPTIONS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                disabled={busy}
                onClick={() => void answer(value)}
                className="border border-edge px-3 py-2 text-sm font-medium text-ink hover:border-primary disabled:opacity-50"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <ReasoningChain chain={review.chain} />

      {review.first_gap && (
        <div className="mt-4 border border-warning/40 bg-[var(--wash-atencao)] p-3">
          <p className="paper-eyebrow text-warning">Primeira lacuna percebida</p>
          <p className="mt-1 text-sm font-medium text-ink">
            {review.first_gap.knowledge_node_name ?? "Microcompetência associada"}
          </p>
          <p className="mt-1 font-serif text-sm leading-relaxed text-muted">{review.first_gap.feedback}</p>
          <button type="button" disabled={busy} onClick={() => void reveal()} className="mt-3 bg-primary px-4 py-2 text-sm font-medium text-primaryInk disabled:opacity-50">
            Ver resposta e comentários
          </button>
        </div>
      )}

      <ReasoningClosing chain={review.chain} status={review.status} />

      {review.status === "awaiting_attribution" && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-ink">Você reconheceu todos os passos. O que melhor explica o erro?</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {Object.entries(review.attribution_options).map(([value, label]) => (
              <button
                key={value}
                type="button"
                disabled={busy}
                onClick={() => void attribute(value as Parameters<typeof attribute>[0])}
                className="border border-edge px-3 py-2 text-left text-sm font-medium text-ink hover:border-primary disabled:opacity-50"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-xs text-danger">{error}</p>}
    </div>
  );
}
