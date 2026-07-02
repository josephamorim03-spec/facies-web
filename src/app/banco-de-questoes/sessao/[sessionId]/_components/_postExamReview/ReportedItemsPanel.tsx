"use client";

import type { QuestionBankSessionItem } from "@/lib/api";

type ReportedItemsPanelProps = {
  items: QuestionBankSessionItem[];
  isWorking: boolean;
  onToggleExclusion: (item: QuestionBankSessionItem) => void;
};

export function ReportedItemsPanel({
  items,
  isWorking,
  onToggleExclusion,
}: ReportedItemsPanelProps) {
  if (items.length === 0) return null;

  return (
    <section className="rounded-lg border border-warning/50 bg-[var(--amber-tint)] p-4 shadow-[var(--soft-shadow)]">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-warning">
        Questoes denunciadas
      </p>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <label
            key={item.question_id}
            className="flex items-start justify-between gap-3 rounded-lg border border-warning/30 bg-surface px-3 py-2"
          >
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">
                Questao {item.position}
              </span>
              <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-muted">
                {item.stem}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2 text-xs font-semibold text-ink">
              <input
                type="checkbox"
                checked={item.excluded_from_scoring}
                disabled={isWorking}
                onChange={() => onToggleExclusion(item)}
                className="h-4 w-4 accent-[var(--color-primary)]"
              />
              Nao contabilizar
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}
