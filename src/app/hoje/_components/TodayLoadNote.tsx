"use client";

import type { StudentToday } from "@/lib/api";

export function TodayLoadNote({ load }: { load: StudentToday["today_load"] }) {
  return (
    <aside
      aria-label="Carga do dia"
      className={`border-y px-1 py-3 text-sm ${
        load.overload_alert ? "border-warning/50 text-warning" : "border-edge"
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
