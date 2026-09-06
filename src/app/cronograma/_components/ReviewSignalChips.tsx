import type { ReviewTask } from "@/lib/api";
import { memoryPhrase, type GuidanceTone } from "@/lib/guidanceCopy";

function formatPercent(value: number | null | undefined): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const pct = value <= 1 ? value * 100 : value;
  return `${Math.round(Math.max(0, Math.min(100, pct)))}%`;
}

// node_retention pode vir 0–1 ou 0–100; memoryPhrase espera 0–1.
function normalizeRetention(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value <= 1 ? value : value / 100;
}

function toneChipClass(tone: GuidanceTone): string {
  if (tone === "critical") return "border-danger/40 bg-danger/10 text-danger";
  if (tone === "attention") return "border-warning bg-[var(--wash-atencao)] text-ink";
  if (tone === "positive") return "border-success/40 bg-success/10 text-success";
  return "border-edge bg-surface text-muted";
}

// Rótulo curto para o chip compacto (calendário): a frase completa fica no tooltip.
function memoryShort(tone: GuidanceTone): string {
  if (tone === "critical") return "Caiu";
  if (tone === "attention") return "Esquecendo";
  if (tone === "positive") return "Firme";
  return "Sem leitura";
}

function pluralizeQuestionPractice(count: number): string {
  return count === 1 ? "1 questão para praticar" : `${count} questões para praticar`;
}

export function hasReviewSignals(task: ReviewTask): boolean {
  return Boolean(
    formatPercent(task.node_retention) ||
      formatPercent(task.node_mastery) ||
      task.at_risk ||
      Number(task.question_practice_count ?? 0) > 0,
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
  const retentionPct = formatPercent(task.node_retention);
  const retention01 = normalizeRetention(task.node_retention);
  const memory = retention01 !== null ? memoryPhrase(retention01) : null;
  const mastery = formatPercent(task.node_mastery);
  const questionPracticeCount = Math.max(0, Number(task.question_practice_count ?? 0));

  if (!memory && !mastery && !task.at_risk && questionPracticeCount <= 0) return null;

  const baseClass = compact
    ? "border px-1.5 py-0.5 text-micro leading-none"
    : "border px-2 py-0.5 text-micro leading-none";

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      {/* Memória do tema — "retenção baixa" virou um estado legível, não um % técnico. */}
      {memory && (
        <span
          className={`${baseClass} ${toneChipClass(memory.tone)}`}
          title={`Memória do tópico${retentionPct ? `: ${retentionPct}` : ""}. ${memory.phrase}`}
        >
          {compact ? memoryShort(memory.tone) : memory.label}
        </span>
      )}
      {mastery && (
        <span className={`${baseClass} border-edge bg-surface text-muted`} title={`Domínio do tópico: ${mastery}`}>
          {compact ? `Dom ${mastery}` : `Domínio ${mastery}`}
        </span>
      )}
      {/* Só mostra o aviso de risco quando não há leitura de memória (evita chip duplicado). */}
      {task.at_risk && !memory && (
        <span
          className={`${baseClass} border-warning bg-[var(--wash-atencao)] text-ink`}
          title="Antecipada: você está começando a esquecer."
        >
          {compact ? "Revisar já" : "Revisar antes de esquecer"}
        </span>
      )}
      {questionPracticeCount > 0 && (
        <span
          className={`${baseClass} border-primary/40 bg-primary/10 text-primary`}
          title={pluralizeQuestionPractice(questionPracticeCount)}
        >
          {pluralizeQuestionPractice(questionPracticeCount)}
        </span>
      )}
    </div>
  );
}
