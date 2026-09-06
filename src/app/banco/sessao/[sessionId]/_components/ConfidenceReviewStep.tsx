"use client";

import { useMemo, useState } from "react";

import { postConfidenceReview, type QuestionBankSession } from "@/lib/api";
import { QuestionFullContext } from "@/app/banco/_components/QuestionFullContext";
import { getAuthToken } from "@/lib/auth";
import { useToast } from "@/lib/useToast";

const LEVELS: { value: number; label: string; hint: string }[] = [
  { value: 1, label: "Chute", hint: "baixa confiança" },
  { value: 3, label: "Dúvida", hint: "entre alternativas" },
  { value: 5, label: "Certeza", hint: "alta confiança" },
];

function prefill(raw: number | null | undefined): number | undefined {
  if (raw == null) return undefined;
  if (raw <= 2) return 1;
  if (raw === 3) return 3;
  return 5;
}

/**
 * Post-submit / pre-reveal confidence capture (Fase 3). Preserves exam fidelity:
 * shown only after "enviar", before the gabarito. No score/answer/feedback shown.
 * Skippable and non-blocking — the caller reveals regardless.
 */
export function ConfidenceReviewStep({
  sessionId,
  session,
  onProceed,
}: {
  sessionId: string;
  session: QuestionBankSession;
  onProceed: () => void;
}) {
  const { showToast } = useToast();
  const items = useMemo(
    () =>
      session.items
        .filter((i) => i.answered && !i.is_annulled && !i.excluded_from_scoring)
        .sort((a, b) => a.position - b.position),
    [session.items],
  );
  const [ratings, setRatings] = useState<Record<number, number>>(() => {
    const seed: Record<number, number> = {};
    for (const it of items) {
      const p = prefill(it.confidence_self_rating);
      if (p) seed[it.position] = p;
    }
    return seed;
  });
  const [busy, setBusy] = useState(false);

  function setAll(value: number) {
    const next: Record<number, number> = {};
    for (const it of items) next[it.position] = value;
    setRatings(next);
  }

  async function saveAndProceed() {
    if (busy) return;
    const ratingList = Object.entries(ratings).map(([position, value]) => ({
      position: Number(position),
      confidence_self_rating: value,
    }));
    if (ratingList.length === 0) {
      onProceed();
      return;
    }
    setBusy(true);
    const reviewId = crypto?.randomUUID?.() ?? `rev_${Date.now()}`;
    try {
      await postConfidenceReview(getAuthToken(), sessionId, {
        review_id: reviewId,
        ratings: ratingList.map((r) => ({ ...r, event_id: `${reviewId}:${r.position}` })),
      });
      onProceed();
    } catch {
      // Non-blocking: a failed save must not trap the student before the reveal.
      showToast("Não foi possível salvar a confiança. Você pode tentar de novo ou corrigir sem ela.", "error");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-paper">
      <div className="mx-auto max-w-3xl px-4 py-6 md:py-8">
        <header className="mb-4">
          <p className="paper-eyebrow">Antes de corrigir</p>
          <h1 className="font-serif text-2xl font-semibold text-ink">Quão confiante você estava?</h1>
          <p className="mt-1 text-sm text-muted">
            Marque sua confiança em cada questão — sem ver o gabarito.
          </p>
        </header>

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAll(3)}
            className="border border-edge px-3 py-1.5 text-xs text-muted hover:text-ink"
          >
            Marcar restantes como dúvida
          </button>
        </div>

        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.position} className="rounded-control border border-edge bg-surface p-3">
              <QuestionFullContext
                eyebrow={`Q${it.position}${it.doubtful ? " - marcada" : ""}`}
                stem={it.stem}
                alternatives={it.alternatives}
                imageRefs={it.image_refs}
                tableRefs={it.table_refs}
                source={it.source}
                knowledgeNodes={it.knowledge_nodes}
                selectedOption={it.selected_option}
                showCorrectAnswer={false}
                className="rounded-control border border-edge bg-paper p-3"
              />
              <div className="mt-2 flex gap-1.5">
                {LEVELS.map((lvl) => {
                  const active = ratings[it.position] === lvl.value;
                  return (
                    <button
                      key={lvl.value}
                      type="button"
                      onClick={() => setRatings((prev) => ({ ...prev, [it.position]: lvl.value }))}
                      className={`min-h-8 flex-1 border px-2 py-1.5 text-xs transition ${
                        active
                          ? "border-primary bg-primary text-primaryInk"
                          : "border-edge text-muted hover:text-ink"
                      }`}
                      aria-pressed={active}
                    >
                      {lvl.label}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>

        <div className="sticky bottom-0 mt-5 flex flex-wrap gap-2 bg-paper py-3">
          <button
            type="button"
            onClick={() => void saveAndProceed()}
            disabled={busy}
            className="inline-flex items-center justify-center border border-primary bg-primary px-5 py-3 text-sm font-medium text-primaryInk disabled:opacity-60"
          >
            {busy ? "Salvando…" : "Salvar e corrigir"}
          </button>
          <button
            type="button"
            onClick={onProceed}
            disabled={busy}
            className="inline-flex items-center justify-center border border-edge px-5 py-3 text-sm font-medium text-muted hover:text-ink disabled:opacity-60"
          >
            Pular e corrigir
          </button>
        </div>
      </div>
    </div>
  );
}
