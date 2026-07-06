"use client";

import { useMemo, useState } from "react";

import { postConfidenceReview, type QuestionBankSession } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import { useToast } from "@/lib/useToast";

const LEVELS: { value: number; label: string; hint: string }[] = [
  { value: 1, label: "Chute", hint: "baixa confiança" },
  { value: 3, label: "Dúvida", hint: "entre alternativas" },
  { value: 5, label: "Certeza", hint: "alta confiança" },
];
const PAGE_SIZE = 12;
type ConfidenceFilter = "all" | "marked" | "changed" | "slow" | "missing";

function prefill(raw: number | null | undefined): number | undefined {
  if (raw == null) return undefined;
  if (raw <= 2) return 1;
  if (raw === 3) return 3;
  return 5;
}

/**
 * Post-submit / pre-reveal confidence capture (Fase 3). Preserves exam fidelity:
 * shown only after "enviar", before the gabarito. No score/answer/feedback shown.
 * Skippable and non-blocking: the caller reveals regardless.
 */
export function ConfidenceReviewStep({
  sessionId,
  session,
  changedPositions = [],
  onProceed,
}: {
  sessionId: string;
  session: QuestionBankSession;
  changedPositions?: number[];
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
  const [filter, setFilter] = useState<ConfidenceFilter>("all");
  const [page, setPage] = useState(0);

  const changedSet = useMemo(() => new Set(changedPositions), [changedPositions]);
  const slowThreshold = useMemo(() => {
    const times = items
      .map((it) => it.time_ms)
      .filter((value): value is number => typeof value === "number" && value > 0)
      .sort((a, b) => a - b);
    if (times.length === 0) return null;
    const mid = Math.floor(times.length / 2);
    const median = times.length % 2 ? times[mid] : Math.round((times[mid - 1] + times[mid]) / 2);
    return Math.max(90_000, Math.round(median * 1.6));
  }, [items]);

  const counts = useMemo<Record<ConfidenceFilter, number>>(() => {
    const base: Record<ConfidenceFilter, number> = {
      all: items.length,
      marked: 0,
      changed: 0,
      slow: 0,
      missing: 0,
    };
    for (const item of items) {
      if (item.doubtful) base.marked += 1;
      if (changedSet.has(item.position)) base.changed += 1;
      if (slowThreshold !== null && (item.time_ms ?? 0) >= slowThreshold) base.slow += 1;
      if (!ratings[item.position]) base.missing += 1;
    }
    return base;
  }, [changedSet, items, ratings, slowThreshold]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filter === "marked") return item.doubtful;
      if (filter === "changed") return changedSet.has(item.position);
      if (filter === "slow") return slowThreshold !== null && (item.time_ms ?? 0) >= slowThreshold;
      if (filter === "missing") return !ratings[item.position];
      return true;
    });
  }, [changedSet, filter, items, ratings, slowThreshold]);
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = filteredItems.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  function setAll(value: number) {
    setRatings((prev) => {
      const next = { ...prev };
      for (const it of items) {
        if (!next[it.position]) next[it.position] = value;
      }
      return next;
    });
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Antes de corrigir</p>
          <h1 className="font-serif text-2xl font-semibold text-ink">Quão confiante você estava?</h1>
          <p className="mt-1 text-sm text-muted">
            Marque sua confiança em cada questão sem ver o gabarito. Isso mede sua calibração e não altera suas respostas.
          </p>
        </header>

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAll(3)}
            className="rounded-lg border border-edge px-3 py-1.5 text-xs font-semibold text-muted hover:text-ink"
          >
            Marcar restantes como dúvida
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-1.5">
          {([
            ["all", "Todas"],
            ["marked", "Marcadas"],
            ["changed", "Alteradas"],
            ["slow", "Lentas"],
            ["missing", "Sem confiança"],
          ] as [ConfidenceFilter, string][]).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setFilter(value);
                setPage(0);
              }}
              disabled={value !== "all" && counts[value] === 0}
              className={`min-h-8 rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${
                filter === value
                  ? "border-primary bg-primary text-primaryInk"
                  : "border-edge text-muted hover:text-ink"
              }`}
            >
              {label} <span className="tabular-nums">({counts[value]})</span>
            </button>
          ))}
        </div>

        <ul className="space-y-2">
          {pageItems.map((it) => (
            <li key={it.position} className="rounded-xl border border-edge bg-surface p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-muted">
                    Q{it.position} · você marcou {it.selected_option ?? "-"}
                    {it.doubtful ? " · marcada" : ""}
                    {changedSet.has(it.position) ? " · alterada" : ""}
                    {slowThreshold !== null && (it.time_ms ?? 0) >= slowThreshold ? " · lenta" : ""}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-ink">{it.stem}</p>
                </div>
              </div>
              <div className="mt-2 flex gap-1.5">
                {LEVELS.map((lvl) => {
                  const active = ratings[it.position] === lvl.value;
                  return (
                    <button
                      key={lvl.value}
                      type="button"
                      onClick={() => setRatings((prev) => ({ ...prev, [it.position]: lvl.value }))}
                      className={`min-h-8 flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold transition ${
                        active
                          ? "border-primary bg-primary text-primaryInk"
                          : "border-edge text-muted hover:text-ink"
                      }`}
                      aria-pressed={active}
                      title={lvl.hint}
                    >
                      {lvl.label}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>

        {filteredItems.length === 0 && (
          <div className="rounded-xl border border-dashed border-edge bg-surface p-5 text-sm text-muted">
            Nenhuma questão neste filtro.
          </div>
        )}

        {pageCount > 1 && (
          <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted">
            <span>
              Página {safePage + 1} de {pageCount}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(0, value - 1))}
                disabled={safePage === 0}
                className="rounded-lg border border-edge px-3 py-1.5 font-semibold disabled:opacity-45"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
                disabled={safePage >= pageCount - 1}
                className="rounded-lg border border-edge px-3 py-1.5 font-semibold disabled:opacity-45"
              >
                Próxima
              </button>
            </div>
          </div>
        )}

        <div className="sticky bottom-0 mt-5 flex flex-wrap gap-2 bg-paper py-3">
          <button
            type="button"
            onClick={() => void saveAndProceed()}
            disabled={busy}
            className="inline-flex items-center justify-center rounded-xl border border-primary bg-primary px-5 py-3 text-sm font-semibold text-primaryInk disabled:opacity-60"
          >
            {busy ? "Salvando..." : "Salvar e corrigir"}
          </button>
          <button
            type="button"
            onClick={onProceed}
            disabled={busy}
            className="inline-flex items-center justify-center rounded-xl border border-edge px-5 py-3 text-sm font-semibold text-muted hover:text-ink disabled:opacity-60"
          >
            Pular e corrigir
          </button>
        </div>
      </div>
    </div>
  );
}
