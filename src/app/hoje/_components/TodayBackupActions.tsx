"use client";

import Link from "next/link";

import type { StudentTodayAction } from "@/lib/api";

export function TodayBackupActions({ actions }: { actions: StudentTodayAction[] }) {
  if (actions.length === 0) return null;
  return (
    <section aria-label="Acoes secundarias" className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Se nao couber agora</p>
      <div className="divide-y divide-edge border-y border-edge md:grid md:grid-cols-2 md:divide-x md:divide-y-0">
        {actions.slice(0, 2).map((action) => (
          <Link
            key={`${action.kind}:${action.href}`}
            href={action.href}
            className="group px-1 py-3 transition hover:bg-surfaceMuted md:px-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-ink">{action.title}</h3>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{action.rationale}</p>
              </div>
              <span className="shrink-0 text-sm text-muted transition group-hover:text-ink">Ir</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
