"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createQuestionBankSession,
  getStudyPerformanceSummary,
  listReviewTasks,
  type ReviewTask,
  type StudyPerformanceSummary,
} from "@/lib/api";
import { useAuthToken } from "@/lib/useAuthToken";
import { Skeleton } from "@/components/Skeleton";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type RevisaoCategory = {
  id: string;
  label: string;
  sublabel: string;
  count: number;
  href?: string;
  onAction?: () => void;
  actionLabel: string;
  color: "danger" | "warning" | "primary" | "success" | "muted";
  icon: string;
};

function CategoryCard({
  category,
  loading,
}: {
  category: RevisaoCategory;
  loading: boolean;
}) {
  const colorClasses = {
    danger: "text-danger",
    warning: "text-warning",
    primary: "text-primary",
    success: "text-success",
    muted: "text-muted",
  };

  return (
    <div className="km-card flex items-center gap-4 p-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surfaceMuted text-2xl">
        {category.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{category.label}</p>
        <p className="text-xs text-muted">{category.sublabel}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {loading ? (
          <Skeleton className="h-5 w-8 rounded" />
        ) : (
          <span className={`text-xl font-bold tabular-nums ${colorClasses[category.color]}`}>
            {category.count}
          </span>
        )}
        {category.href ? (
          <Link
            href={category.href}
            className="rounded-xl border border-primary px-3 py-1.5 text-xs font-semibold text-primary hover:bg-surfaceMuted"
          >
            {category.actionLabel}
          </Link>
        ) : (
          <button
            type="button"
            onClick={category.onAction}
            disabled={category.count === 0}
            className="rounded-xl border border-primary px-3 py-1.5 text-xs font-semibold text-primary hover:bg-surfaceMuted disabled:opacity-40"
          >
            {category.actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export default function RevisoesPage() {
  const { token, tokenResolved } = useAuthToken();
  const router = useRouter();

  const [tasks, setTasks] = useState<ReviewTask[]>([]);
  const [performanceSummary, setPerformanceSummary] = useState<StudyPerformanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = useMemo(() => todayISO(), []);

  useEffect(() => {
    if (!tokenResolved) return;
    Promise.all([
      listReviewTasks(token, { status: "pending" }),
      getStudyPerformanceSummary(token).catch(() => null),
    ])
      .then(([taskData, perf]) => {
        setTasks(taskData);
        setPerformanceSummary(perf);
      })
      .catch(() => setError("Não foi possível carregar as revisões."))
      .finally(() => setLoading(false));
  }, [token, tokenResolved]);

  // Count of recent errors: tasks that are overdue (proxy for "erros recentes")
  const overdueTasks = tasks.filter((t) => t.is_overdue);

  // Marked questions: tasks categorized as "questões marcadas" could use "doubtful" from sessions
  // For now we show the total pending task count as "questões agendadas"
  const pendingToday = tasks.filter((t) => t.due_date === today);
  const markedCount = tasks.filter((t) => t.is_critical).length;

  // Weak themes from performance summary
  const weakThemes = performanceSummary?.diagnosis?.weaknesses?.length ?? 0;

  // Spaced review count: all pending tasks
  const spacedCount = tasks.length;

  async function startWeaknessSession() {
    if (!token || !performanceSummary) return;
    setBusy(true);
    try {
      const created = await createQuestionBankSession(token, {
        mode: "adaptive",
        resolution_mode: "training",
        answer_status: "answered",
        limit: 20,
      });
      router.push(`/banco-de-questoes/sessao/${created.session_id}`);
    } catch {
      setBusy(false);
    }
  }

  const categories: RevisaoCategory[] = [
    {
      id: "erros",
      label: "Erros recentes",
      sublabel: "Questões que você errou nas últimas sessões",
      count: overdueTasks.length,
      href: "/banco-de-questoes?answer_status=wrong",
      actionLabel: "Revisar",
      color: "danger",
      icon: "✗",
    },
    {
      id: "marcadas",
      label: "Questões marcadas",
      sublabel: "Questões que você marcou para revisar",
      count: markedCount,
      href: "/banco-de-questoes?answer_status=answered",
      actionLabel: "Revisar",
      color: "primary",
      icon: "⚑",
    },
    {
      id: "temas",
      label: "Temas em queda",
      sublabel: "Áreas com baixo desempenho recente",
      count: weakThemes,
      onAction: () => void startWeaknessSession(),
      actionLabel: busy ? "…" : "Treinar",
      color: "muted",
      icon: "↓",
    },
    {
      id: "espacada",
      label: "Revisão espaçada",
      sublabel: "Tarefas agendadas pelo algoritmo",
      count: spacedCount,
      href: "/today",
      actionLabel: "Ver agenda",
      color: "success",
      icon: "⟳",
    },
  ];

  return (
    <main className="min-h-screen bg-paper px-4 py-6 text-ink md:px-6 md:py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <h1 className="font-serif text-3xl font-semibold leading-tight md:text-4xl">Revisões</h1>
          <p className="mt-2 text-sm text-muted">
            {pendingToday.length > 0
              ? `${pendingToday.length} revisão${pendingToday.length > 1 ? "ões" : ""} agendada${pendingToday.length > 1 ? "s" : ""} para hoje.`
              : "Todas as suas revisões organizadas em um lugar."}
          </p>
        </header>

        {error && (
          <div className="rounded-xl border border-danger bg-surface p-4 text-sm text-danger">{error}</div>
        )}

        <section className="space-y-3">
          {categories.map((cat) => (
            <CategoryCard key={cat.id} category={cat} loading={loading} />
          ))}
        </section>

        <div className="rounded-2xl border border-edge bg-surfaceMuted p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Acesso rápido</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/banco-de-questoes"
              className="rounded-xl border border-edge bg-surface px-3 py-2 text-xs font-semibold text-ink hover:border-primary"
            >
              Banco de questões
            </Link>
            <Link
              href="/dados-e-relatorios"
              className="rounded-xl border border-edge bg-surface px-3 py-2 text-xs font-semibold text-ink hover:border-primary"
            >
              Desempenho
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
