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
import { REVIEW_ROUTES } from "@/lib/reviewRoutes";
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

function compactCount(value: number): string {
  if (value >= 1000) return "999+";
  return String(Math.max(0, value));
}

function filterCount(queue: TrainerReviewQueue, filter: QueueFilter): number {
  if (filter === "all") return queue.counts.total;
  if (filter === "questions") return queue.counts.questions;
  if (filter === "corrections") return queue.counts.corrections;
  return queue.flashcards_overview?.due_count ?? queue.counts.cards;
}

function QueueSkeleton() {
  return (
    <div className="space-y-5" aria-label="Carregando fila de revisão">
      <Skeleton className="h-44 w-full rounded-surface" />
      <div className="grid gap-3 md:grid-cols-2">
        <Skeleton className="h-32 w-full rounded-surface" />
        <Skeleton className="h-32 w-full rounded-surface" />
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

function ReviewSourceSummary({ queue }: { queue: TrainerReviewQueue }) {
  const load = queue.daily_load.review_load;
  const cards = queue.flashcards_overview;
  const estimatedMinutes = load?.estimated_minutes ?? queue.daily_load.prescribed_minutes;
  const items = [
    {
      label: "Cronograma",
      value: load?.topic_tasks_due ?? 0,
      detail: load?.overdue_topic_tasks ? `${load.overdue_topic_tasks} atrasada(s)` : "tarefas no ponto",
    },
    {
      label: "Questoes",
      value: load?.questions_due ?? 0,
      detail: "fila de erro/revisao",
    },
    {
      label: "Cards",
      value: cards?.due_count ?? load?.cards_due ?? 0,
      detail: cards ? `${cards.total_eligible} elegivel(is)` : "turbo indisponivel",
    },
  ];
  return (
    <section className="rounded-surface border border-edge bg-surface px-4 py-4 sm:px-5" aria-label="Carga de revisao">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h2 className="font-serif text-xl font-semibold text-ink">Carga de revisão</h2>
        <p className="text-sm tabular-nums text-muted">≈ {estimatedMinutes} min hoje</p>
      </div>
      <dl className="mt-4 divide-y divide-edge">
        {items.map((item) => (
          <div key={item.label} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-2.5">
            <dt className="min-w-0">
              <span className="block text-sm font-medium text-ink">{item.label}</span>
              <span className="block text-xs leading-5 text-muted">{item.detail}</span>
            </dt>
            <dd className="font-serif text-2xl font-semibold tabular-nums leading-none text-ink">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function FlashcardsOverviewPanel({
  queue,
  actionItem,
  surfaceHomeVisible,
  onStale,
}: {
  queue: TrainerReviewQueue;
  actionItem?: TrainerReviewQueueItem;
  surfaceHomeVisible?: boolean;
  onStale: () => void;
}) {
  const overview = queue.flashcards_overview;
  if (!overview) return null;

  const hasDue = overview.due_count > 0;
  const preview = overview.priority_preview.slice(0, 3);
  return (
    <section className="rounded-surface border border-edge bg-surface p-4 sm:p-5" aria-labelledby="flashcards-review-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span>{overview.total_eligible} card{overview.total_eligible === 1 ? "" : "s"} elegivel{overview.total_eligible === 1 ? "" : "is"}</span>
            <span aria-hidden>|</span>
            <span>{overview.due_count} no ponto</span>
            {overview.overdue_count > 0 && (
              <>
                <span aria-hidden>|</span>
                <span className="font-semibold text-warning">{overview.overdue_count} atrasado{overview.overdue_count === 1 ? "" : "s"}</span>
              </>
            )}
          </div>
          <h2 id="flashcards-review-title" className="mt-1.5 font-serif text-xl font-semibold text-ink">
            {hasDue ? "Flashcards para recuperar agora" : "Flashcards no caderno"}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            {hasDue
              ? `${overview.due_count} card${overview.due_count === 1 ? "" : "s"} chegou${overview.due_count === 1 ? "" : "ram"} ao ponto de revisao.`
              : "Nenhum card venceu agora; eles continuam visiveis aqui para manutencao opcional."}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto">
          {actionItem ? (
            <TrainerActionCTA
              action={actionItem.action}
              recommendationId={queue.recommendation_id}
              sourcePage="/revisar"
              label="Revisar cards"
              className="w-full shrink-0 sm:w-auto"
              onStale={onStale}
            />
          ) : !surfaceHomeVisible ? (
            <Link href={REVIEW_ROUTES.adaptiveCards} className="paper-control inline-flex min-h-11 items-center justify-center border border-primary px-4 py-2.5 text-sm font-semibold text-primary hover:bg-surfaceMuted">
              Abrir cards
            </Link>
          ) : null}
          <Link href={REVIEW_ROUTES.notebook} className="text-center text-xs font-semibold text-muted hover:text-ink">
            Ver caderno
          </Link>
        </div>
      </div>
      {preview.length > 0 && (
        <div className="mt-4 grid gap-2 md:grid-cols-3">
          {preview.map((item) => (
            <div key={item.note_id} className="rounded-surface border border-edge bg-paper px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{item.area} | {item.context.label}</p>
              <p className="mt-1 line-clamp-2 text-sm font-semibold text-ink">{item.insight_question}</p>
              <p className="mt-1 truncate text-xs text-muted">{item.theme}</p>
            </div>
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
    <article className="rounded-surface border border-edge bg-surface p-4 sm:p-5">
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

  const flashcardsActionItem = useMemo(() => {
    return queue?.items.find((item) => item.action.kind === "flashcard_review");
  }, [queue]);

  const showFlashcardsPanel = Boolean(
    queue?.flashcards_overview && (filter === "all" || filter === "cards"),
  );

  return (
    <StudentPage>
      <StudentPageHeader
        title="Revisar"
        actions={experienceEnabled && experience ? (
          <DataFreshness
            status={experience.status}
            generatedAt={experience.generated_at}
            missingSources={experience.missing_sources}
          />
        ) : undefined}
      />

      {loading ? (
        <QueueSkeleton />
      ) : error ? (
        <section className="rounded-surface border border-danger/30 bg-surface p-5">
          <p className="text-sm text-danger">{error}</p>
          <button type="button" onClick={() => void load()} className="mt-4 text-sm font-semibold text-primary hover:underline">
            Tentar novamente
          </button>
        </section>
      ) : queue ? (
        <>
          <OutcomeCard queue={queue} />
          <ReviewSourceSummary queue={queue} />
          {queue.primary_item ? (
            <PrimaryReviewCard queue={queue} onStale={() => void load()} />
          ) : (
            <EmptyState
              title="Suficiente por agora"
              description="Você protegeu o que precisava hoje."
              action={<Link href="/praticar" className="paper-control inline-flex min-h-11 items-center border border-primary px-4 py-2.5 text-sm font-semibold text-primary hover:bg-surfaceMuted">
                Fazer prática curta
              </Link>}
            />
          )}

          {showFlashcardsPanel && (
            <FlashcardsOverviewPanel
              queue={queue}
              actionItem={flashcardsActionItem}
              surfaceHomeVisible={false}
              onStale={() => void load()}
            />
          )}

          {(queue.items.length > 1 || queue.flashcards_overview) && (
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
                      count={compactCount(filterCount(queue, item.key))}
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
                  <p className="rounded-surface border border-dashed border-edge px-4 py-6 text-center text-sm text-muted">
                    {filter === "cards" && queue.flashcards_overview
                      ? "Nenhuma acao urgente de cards agora. O resumo acima mostra o que ja existe no caderno."
                      : "Nenhuma outra ação deste tipo na fila atual."}
                  </p>
                )}
              </div>
            </section>
          )}
          <Link href={REVIEW_ROUTES.sessionHistory} className="inline-flex text-sm font-medium text-muted hover:text-ink">
            Consultar histórico de sessões
          </Link>
        </>
      ) : null}
    </StudentPage>
  );
}
