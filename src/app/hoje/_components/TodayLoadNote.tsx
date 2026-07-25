"use client";

import type { StudentToday } from "@/lib/api";

export function TodayLoadNote({ load }: { load: StudentToday["today_load"] }) {
  return (
    <aside
      aria-label="Carga do dia"
      className={`rounded-lg border px-4 py-3 text-sm ${
        load.overload_alert ? "border-warning/50 bg-warning/5" : "border-edge bg-surface"
      }`}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-semibold text-ink">Carga {load.label}</p>
        <p className="text-xs text-muted">
          ~{load.estimated_minutes}/{load.recommended_limit_minutes} min
        </p>
      </div>
    </aside>
  );
}
