"use client";

import type { StudentTodayAction } from "@/lib/api";
import { TodayActionCTA } from "./TodayActionCTA";

export function TodayBackupActions({ actions }: { actions: StudentTodayAction[] }) {
  if (actions.length === 0) return null;
  return (
    <section aria-label="Acoes secundarias" className="space-y-2">
      <p className="paper-eyebrow">Se não couber agora</p>
      <div className="divide-y divide-edge border-y border-edge md:grid md:grid-cols-2 md:divide-x md:divide-y-0">
        {actions.slice(0, 2).map((action) => (
          <TodayActionCTA
            key={`${action.kind}:${action.href}`}
            action={action}
            className="group px-1 py-3 transition hover:bg-surfaceMuted md:px-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-medium text-ink">{action.title}</h3>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{action.rationale}</p>
              </div>
              <span className="shrink-0 text-sm text-muted transition group-hover:text-ink">Ir</span>
            </div>
          </TodayActionCTA>
        ))}
      </div>
    </section>
  );
}
