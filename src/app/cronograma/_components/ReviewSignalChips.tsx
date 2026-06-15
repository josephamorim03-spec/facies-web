import type { ReviewTask } from "@/lib/api";

function formatPercent(value: number | null | undefined): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const pct = value <= 1 ? value * 100 : value;
  return `${Math.round(Math.max(0, Math.min(100, pct)))}%`;
}

function pluralizeQuestion(count: number): string {
  return count === 1 ? "1 q vencida do tópico" : `${count} q vencidas do tópico`;
}

export function hasReviewSignals(task: ReviewTask): boolean {
  return Boolean(
    formatPercent(task.node_retention) ||
      formatPercent(task.node_mastery) ||
      task.at_risk ||
      Number(task.due_question_count ?? 0) > 0,
  );
}

export function ReviewSignalChips({
  task,
  compact = false,
  className = "",
}: {
  task: ReviewTask;
  compact?: boolean;
  className?: string;
}) {
  const retention = formatPercent(task.node_retention);
  const mastery = formatPercent(task.node_mastery);
  const dueQuestionCount = Math.max(0, Number(task.due_question_count ?? 0));

  if (!retention && !mastery && !task.at_risk && dueQuestionCount <= 0) return null;

  const baseClass = compact
    ? "rounded-full border px-1.5 py-0.5 text-[9px] font-medium leading-none"
    : "rounded-full border px-2 py-0.5 text-[10px] font-medium leading-none";

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      {retention && (
        <span className={`${baseClass} border-edge bg-surface text-muted`} title={`Retenção do nó: ${retention}`}>
          {compact ? `Ret ${retention}` : `Retenção ${retention}`}
        </span>
      )}
      {mastery && (
        <span className={`${baseClass} border-edge bg-surface text-muted`} title={`Domínio do nó: ${mastery}`}>
          {compact ? `Dom ${mastery}` : `Domínio ${mastery}`}
        </span>
      )}
      {task.at_risk && (
        <span
          className={`${baseClass} border-warning bg-[var(--amber-tint)] text-ink`}
          title="A tarefa foi priorizada pelo desempenho recente no banco de questões."
        >
          vencida pela performance
        </span>
      )}
      {dueQuestionCount > 0 && (
        <span className={`${baseClass} border-primary/40 bg-primary/10 text-primary`} title={pluralizeQuestion(dueQuestionCount)}>
          {pluralizeQuestion(dueQuestionCount)}
        </span>
      )}
    </div>
  );
}
