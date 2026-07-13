"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { TrainerActionCTA } from "@/components/trainer/TrainerActionCTA";
import { Skeleton } from "@/components/Skeleton";
import {
  getTrainerReviewQueue,
  recordTrainerRecommendationEvent,
  type TrainerActionKind,
  type TrainerReviewQueue,
  type TrainerReviewQueueItem,
} from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import { getErrorMessage } from "@/lib/error-utils";
import { useAuthToken } from "@/lib/useAuthToken";

type QueueFilter = "all" | "questions" | "corrections" | "cards";

const FILTERS: Array<{ key: QueueFilter; label: string }> = [
  { key: "all", label: "Tudo" },
  { key: "questions", label: "Questões" },
  { key: "corrections", label: "Correções" },
  { key: "cards", label: "Cards" },
];

const CTA_LABEL: Partial<Record<TrainerActionKind, string>> = {
  resume_session: "Continuar revisão",
  question_block: "Revisar questões",
  scheduled_review: "Revisar agora",
  guided_correction: "Corrigir raciocínio",
  flashcard_review: "Revisar cards",
};

function category(item: TrainerReviewQueueItem): Exclude<QueueFilter, "all"> {
  if (item.action.kind === "flashcard_review") return "cards";
  if (item.action.kind === "guided_correction") return "corrections";
  return "questions";
}

function confidenceTone(level?: "low" | "medium" | "high") {
  if (level === "high") return "border-success/30 bg-success/5 text-success";
  if (level === "medium") return "border-warning/30 bg-warning/5 text-warning";
  return "border-edge bg-surfaceMuted text-muted";
}

function QueueSkeleton() {
  return (
    <div className="space-y-5" aria-label="Carregando fila de revisão">
      <Skeleton className="h-44 w-full rounded-2xl" />
      <div className="grid gap-3 md:grid-cols-2">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    </div>
  );
}

function OutcomeCard({ queue }: { queue: TrainerReviewQueue }) {
  const outcome = queue.previous_outcome;
  if (!outcome) return null;
  const observed = outcome.evidence.filter((item) => item.kind === "observed");
  const estimated = outcome.evidence.filter((item) => item.kind === "estimated");
  return (
    <section className="rounded-2xl border border-edge bg-surface px-4 py-4 sm:px-5">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Último ciclo</p>
      <p className="mt-2 text-sm leading-relaxed text-ink">{outcome.narrative}</p>
      {(observed.length > 0 || estimated.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {observed.map((item) => (
            <span key={item.key} className="rounded-full border border-edge bg-paper px-3 py-1.5 text-ink">
              {item.label}: {item.value}{item.unit ?? ""}
            </span>
          ))}
          {estimated.map((item) => (
            <span key={item.key} className="rounded-full border border-edge bg-surfaceMuted px-3 py-1.5 text-muted">
              Estimativa · {item.label}: {item.value}{item.unit ?? ""}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

function PrimaryReviewCard({
  queue,
  onStale,
}: {
  queue: TrainerReviewQueue;
  onStale: () => void;
}) {
  const item = queue.primary_item;
  if (!item) return null;
  const confidence = item.action.pedagogical_confidence;
  return (
    <section className="rounded-2xl border border-primary/30 bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Fazer agora</p>
          <h2 className="mt-2 font-serif text-2xl font-semibold text-ink sm:text-3xl">
            {item.action.title}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">{item.queue_reason}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-edge bg-paper px-3 py-1.5 text-ink">
              {item.action.estimated_minutes} min
            </span>
            <span className="rounded-full border border-edge bg-paper px-3 py-1.5 text-ink">
              {item.expected_result}
            </span>
            <span className={`rounded-full border px-3 py-1.5 ${confidenceTone(confidence?.level)}`}>
              {confidence?.label ?? "Resultado ainda preliminar"}
            </span>
            <span className="rounded-full border border-edge bg-surfaceMuted px-3 py-1.5 text-muted">
              {item.editorial_quality.label}
            </span>
          </div>
        </div>
        <TrainerActionCTA
          action={item.action}
          recommendationId={queue.recommendation_id}
          sourcePage="/revisar"
          label={CTA_LABEL[item.action.kind] ?? "Começar"}
          className="w-full shrink-0 lg:w-auto"
          onStale={onStale}
        />
      </div>
    </section>
  );
}

function QueueRow({
  queue,
  item,
  onStale,
}: {
  queue: TrainerReviewQueue;
  item: TrainerReviewQueueItem;
  onStale: () => void;
}) {
  return (
    <article className="rounded-2xl border border-edge bg-surface p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span>Prioridade {item.rank}</span>
            <span aria-hidden>·</span>
            <span>{item.action.estimated_minutes} min</span>
            <span aria-hidden>·</span>
            <span>{item.editorial_quality.label}</span>
          </div>
          <h3 className="mt-1.5 font-serif text-xl font-semibold text-ink">{item.action.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.queue_reason}</p>
          <p className="mt-2 text-xs font-medium text-ink">Resultado esperado: {item.expected_result}</p>
        </div>
        <TrainerActionCTA
          action={item.action}
          recommendationId={queue.recommendation_id}
          sourcePage="/revisar"
          label={CTA_LABEL[item.action.kind] ?? "Começar"}
          className="w-full shrink-0 sm:w-auto"
          onStale={onStale}
        />
      </div>
    </article>
  );
}

export function ReviewQueueClient() {
  const { tokenResolved } = useAuthToken();
  const [queue, setQueue] = useState<TrainerReviewQueue | null>(null);
  const [filter, setFilter] = useState<QueueFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const shownRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      const nextQueue = await getTrainerReviewQueue(token);
      setQueue(nextQueue);
      if (shownRef.current !== nextQueue.recommendation_id) {
        shownRef.current = nextQueue.recommendation_id;
        void recordTrainerRecommendationEvent(token, nextQueue.recommendation_id, {
          event_type: "shown",
          event_id: `shown:${nextQueue.recommendation_id}:review_queue`,
          payload: {
            surface: "review_queue",
            visible_actions: nextQueue.items.map((item) => ({
              action_id: item.action.action_id,
              rank: item.rank,
              kind: item.action.kind,
              editorial_state: item.editorial_quality.state,
            })),
          },
        }).catch(() => null);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Não foi possível carregar sua fila de revisão."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tokenResolved) void load();
  }, [load, tokenResolved]);

  const remaining = useMemo(() => {
    if (!queue) return [];
    const primaryId = queue.primary_item?.action.action_id;
    return queue.items.filter(
      (item) => item.action.action_id !== primaryId && (filter === "all" || category(item) === filter),
    );
  }, [filter, queue]);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Revisar</p>
        <h1 className="font-serif text-3xl font-semibold text-ink">Proteja o que você já aprendeu</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          Questões, correções e cards entram na mesma prioridade, respeitando sua carga disponível.
        </p>
      </header>

      {loading ? (
        <QueueSkeleton />
      ) : error ? (
        <section className="rounded-2xl border border-danger/30 bg-surface p-5">
          <p className="text-sm text-danger">{error}</p>
          <button type="button" onClick={() => void load()} className="mt-4 text-sm font-semibold text-primary hover:underline">
            Tentar novamente
          </button>
        </section>
      ) : queue ? (
        <>
          <OutcomeCard queue={queue} />
          {queue.missing_sources.length > 0 && (
            <p className="rounded-xl border border-edge bg-surfaceMuted px-4 py-3 text-xs text-muted">
              Priorização parcial: alguns sinais não estavam disponíveis. As ações restantes continuam válidas.
            </p>
          )}
          {queue.primary_item ? (
            <PrimaryReviewCard queue={queue} onStale={() => void load()} />
          ) : (
            <section className="rounded-2xl border border-edge bg-surface p-6 text-center">
              <h2 className="font-serif text-2xl font-semibold text-ink">Você está em dia</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted">
                Não há revisões urgentes agora. Um bloco curto de recuperação mantém o aprendizado ativo sem criar acúmulo artificial.
              </p>
              <Link href="/praticar" className="mt-5 inline-flex rounded-xl border border-primary px-4 py-2.5 text-sm font-semibold text-primary hover:bg-surfaceMuted">
                Fazer prática curta
              </Link>
            </section>
          )}

          {queue.items.length > 1 && (
            <section className="space-y-4" aria-labelledby="review-queue-title">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 id="review-queue-title" className="font-serif text-2xl font-semibold text-ink">Na sequência</h2>
                  <p className="mt-1 text-sm text-muted">A ordem muda quando você conclui uma etapa.</p>
                </div>
                <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-edge bg-surface p-1" role="tablist" aria-label="Filtrar revisões">
                  {FILTERS.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      role="tab"
                      aria-selected={filter === item.key}
                      onClick={() => setFilter(item.key)}
                      className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold ${filter === item.key ? "bg-primary text-primaryInk" : "text-muted hover:text-ink"}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                {remaining.map((item) => (
                  <QueueRow key={item.action.action_id ?? `${item.rank}-${item.action.kind}`} queue={queue} item={item} onStale={() => void load()} />
                ))}
                {remaining.length === 0 && (
                  <p className="rounded-xl border border-dashed border-edge px-4 py-6 text-center text-sm text-muted">
                    Nenhuma outra ação deste tipo na fila atual.
                  </p>
                )}
              </div>
            </section>
          )}
          <Link href="/revisoes" className="inline-flex text-sm font-medium text-muted hover:text-ink">
            Consultar histórico de sessões
          </Link>
        </>
      ) : null}
    </div>
  );
}
