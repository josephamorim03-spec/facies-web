"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { TrainerActionCTA } from "@/components/trainer/TrainerActionCTA";
import { Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { OutcomeCard as PaperOutcomeCard } from "@/components/ui/OutcomeCard";
import { StudyActionCard } from "@/components/ui/StudyActionCard";
import {
  DataFreshness,
  LearningStatus,
  StudentPage,
  StudentPageHeader,
} from "@/components/student/StudentExperienceUI";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
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
import { useStudentExperience } from "@/lib/StudentExperienceContext";

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
  return (
    <PaperOutcomeCard narrative={outcome.narrative} evidence={outcome.evidence} />
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
    <StudyActionCard
      eyebrow="Fazer agora"
      title={item.action.title}
      reason={item.queue_reason}
      minutes={item.action.estimated_minutes}
      expectedResult={item.expected_result}
      metadata={(
        <>
          <span className={`rounded-full border px-2.5 py-1 ${confidenceTone(confidence?.level)}`}>
            {confidence?.label ?? "Resultado ainda preliminar"}
          </span>
          <span>{item.editorial_quality.label}</span>
        </>
      )}
      action={(
        <TrainerActionCTA
          action={item.action}
          recommendationId={queue.recommendation_id}
          sourcePage="/revisar"
          label={CTA_LABEL[item.action.kind] ?? "Começar"}
          className="w-full shrink-0 lg:w-auto"
          onStale={onStale}
        />
      )}
    />
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
  const { enabled: experienceEnabled, experience } = useStudentExperience();
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
    <StudentPage>
      <StudentPageHeader
        eyebrow="Revisar"
        title="Proteja o que você já aprendeu"
        description="Questões, correções e cards são priorizados sem misturar suas unidades."
        actions={experienceEnabled && experience ? (
          <DataFreshness
            status={experience.status}
            generatedAt={experience.generated_at}
            missingSources={experience.missing_sources}
          />
        ) : undefined}
      />

      {experienceEnabled && experience ? <LearningStatus load={experience.review_load} /> : null}

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
            <EmptyState
              title="Suficiente por agora"
              description="Você protegeu o que precisava hoje. Se quiser continuar, faça uma prática curta sem criar acúmulo artificial."
              action={<Link href="/praticar" className="paper-control inline-flex min-h-11 items-center border border-primary px-4 py-2.5 text-sm font-semibold text-primary hover:bg-surfaceMuted">
                Fazer prática curta
              </Link>}
            />
          )}

          {queue.items.length > 1 && (
            <section className="space-y-4" aria-labelledby="review-queue-title">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 id="review-queue-title" className="font-serif text-2xl font-semibold text-ink">Na sequência</h2>
                  <p className="mt-1 text-sm text-muted">A ordem muda quando você conclui uma etapa.</p>
                </div>
                <Tabs value={filter} onValueChange={(value) => setFilter(value as QueueFilter)}>
                  <TabsList aria-label="Filtrar revisões">
                    {FILTERS.map((item) => (
                    <TabsTrigger
                      key={item.key}
                      value={item.key}
                    >
                      {item.label}
                    </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
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
    </StudentPage>
  );
}
