"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { getAuthToken } from "@/lib/auth";
import { useToast } from "@/lib/useToast";
import { recordTrainerRecommendationEvent, startTrainerAction, type TrainerAction } from "@/lib/api";
import { startTrainerQuestionSession, withTrainerHandoff } from "@/lib/trainer/session";

// Kinds whose "start" means creating a question-bank session right here.
const SESSION_KINDS = new Set(["question_block", "scheduled_review"]);

const FALLBACK_HREF: Record<string, string> = {
  flashcard_review: "/cards-adaptativos",
  manual_study: "/caderno",
  // Iniciar um simulado vive em Questões (intenção "Simular prova"); /provas é
  // só o histórico filtrado (medição), não a criação.
  simulation: "/banco-de-questoes",
  guided_correction: "/banco-de-questoes",
};

/**
 * Executes a trainer action: creates the session for session-kinds (recording
 * `started` with the real session_id), or navigates with the trainer handoff
 * (`rec`/`src`) for href-kinds. `flashcard_review` defers `started` to the turbo
 * runner; the other href-kinds record `started` on navigation. A failed event
 * never blocks the student.
 */
export function TrainerActionCTA({
  action,
  recommendationId,
  sourcePage,
  label,
  className = "",
}: {
  action: TrainerAction;
  recommendationId: string;
  sourcePage: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  const baseClass =
    "inline-flex items-center justify-center gap-2 rounded-xl border border-primary bg-primary px-4 py-2.5 text-sm font-semibold text-primaryInk shadow-sm transition hover:brightness-105 disabled:opacity-60";

  async function handleClick() {
    if (busy || action.blocked_reason) return;
    const token = getAuthToken();

    if (action.action_id) {
      setBusy(true);
      try {
        const result = await startTrainerAction(token, action.action_id, {
          recommendation_id: recommendationId,
          action,
          source_page: sourcePage,
        });
        if (result.session_id) {
          router.push(`/banco-de-questoes/sessao/${result.session_id}`);
          return;
        }
        router.push(result.href ?? action.href ?? FALLBACK_HREF[action.kind] ?? "/hoje");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Não foi possível iniciar a ação.";
        showToast(message, "error");
        setBusy(false);
      }
      return;
    }

    if (SESSION_KINDS.has(action.kind)) {
      setBusy(true);
      try {
        const sessionId = await startTrainerQuestionSession({
          token,
          recommendationId,
          action,
          sourcePage,
        });
        router.push(`/banco-de-questoes/sessao/${sessionId}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Não foi possível iniciar a sessão.";
        showToast(message, "error");
        setBusy(false);
      }
      return;
    }

    // href-kind: navigate with the handoff so the destination can close the loop.
    const target = action.href ?? FALLBACK_HREF[action.kind] ?? "/hoje";
    if (action.kind !== "flashcard_review") {
      // These "start" on navigation; the turbo runner records started for flashcards.
      void recordTrainerRecommendationEvent(token, recommendationId, {
        event_type: "started",
        event_id: `started:${recommendationId}:${sourcePage}:${action.kind}`,
        payload: { source_page: sourcePage, action_kind: action.kind, target_href: target },
      }).catch(() => null);
    }
    router.push(withTrainerHandoff(target, recommendationId, sourcePage));
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy || Boolean(action.blocked_reason)}
      title={action.blocked_reason ?? undefined}
      className={`${baseClass} ${className}`}
    >
      {busy ? "Abrindo…" : label ?? "Começar"}
      {!busy && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden>
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      )}
    </button>
  );
}
