"use client";

import Link from "next/link";

import { Button } from "@/components/ui/Button";
import type { StudentToday } from "@/lib/api";

function formatDate(value: string): string {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function TodaySchedulePreview({
  preview,
  loading,
  disabled,
  onPrepareReschedule,
}: {
  preview: StudentToday["schedule_preview"];
  loading?: boolean;
  disabled?: boolean;
  onPrepareReschedule?: () => void;
}) {
  if (preview.items.length === 0 && preview.overdue_count === 0) return null;
  return (
    <section className="border-y border-edge py-4" aria-label="Agenda curta">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-serif text-xl font-semibold text-ink">Agenda curta</h2>
          <p className="mt-1 text-sm text-muted">
            {preview.overdue_count > 0
              ? `${preview.overdue_count} atrasada${preview.overdue_count === 1 ? "" : "s"} sem dominar sua tela.`
              : "So o que importa para decidir agora."}
          </p>
        </div>
        {preview.reschedule_recommended && onPrepareReschedule ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={loading}
            disabled={disabled}
            onClick={onPrepareReschedule}
          >
            Reorganizar atrasadas
          </Button>
        ) : null}
      </div>

      {preview.items.length > 0 ? (
        <div className="mt-4 divide-y divide-edge border-y border-edge">
          {preview.items.slice(0, 3).map((item) => (
            <Link
              key={item.task_id}
              href={item.href}
              className="flex items-center justify-between gap-3 py-3 text-sm hover:text-ink"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{item.title}</p>
                <p className="text-xs text-muted">
                  {formatDate(item.due_date)} / {item.expected_questions}q
                  {item.is_critical ? " / prioritaria" : ""}
                  {item.is_overdue ? " / atrasada" : ""}
                </p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-muted">Estudar</span>
            </Link>
          ))}
        </div>
      ) : null}

      {preview.hidden_count > 0 ? (
        <p className="mt-3 text-xs text-muted">
          Mais {preview.hidden_count} item{preview.hidden_count === 1 ? "" : "s"} ficam no calendario.
        </p>
      ) : null}
    </section>
  );
}
