import Link from "next/link";
import type { ReviewTask } from "@/lib/api";
import { formatDate, taskHref } from "./format";

export function PendingReviewsSection({ tasks }: { tasks: ReviewTask[] }) {
  return (
    <section className="rounded-lg border border-edge bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-semibold">Revisões pendentes</h2>
          <p className="mt-1 text-sm text-muted">Acesse pelo banco de questões ou veja a agenda completa.</p>
        </div>
        <Link href="/hoje" className="text-sm font-semibold text-primary hover:underline">Ver hoje</Link>
      </div>
      <div className="mt-4 space-y-3">
        {tasks.slice(0, 6).length > 0 ? tasks.slice(0, 6).map((task) => (
          <div key={task.task_id} className="flex flex-col gap-3 rounded-lg border border-edge bg-paper p-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-ink">{task.theme}</p>
                {task.is_critical && <span className="rounded-full bg-[var(--amber-tint)] px-2 py-0.5 text-xs font-semibold text-warning">prioritária</span>}
              </div>
              <p className="mt-1 text-xs text-muted">
                {task.area} · {task.expected_questions} questões · vence em {formatDate(task.due_at || task.due_date)}
              </p>
            </div>
            <Link href={taskHref(task)} className="inline-flex items-center justify-center rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-surfaceMuted">
              Acessar revisão
            </Link>
          </div>
        )) : (
          <div className="rounded-lg border border-dashed border-edge bg-paper p-8 text-center text-sm text-muted">
            Nenhuma revisão pendente agora.
          </div>
        )}
      </div>
    </section>
  );
}
