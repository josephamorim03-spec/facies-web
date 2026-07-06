"use client";

import { SESSION_TAB_VALUES, type SessionsTab } from "@/lib/sessionsPanel";

const TAB_LABELS: Record<SessionsTab, string> = {
  inacabadas: "Inacabadas",
  resultados: "Resultados",
  provas: "Simulados",
  todas: "Todas",
};

export function SessionsTabs({
  value,
  counts,
  onChange,
}: {
  value: SessionsTab;
  counts: Record<SessionsTab, number>;
  onChange: (tab: SessionsTab) => void;
}) {
  return (
    <div role="tablist" aria-label="Filtrar sessões" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {SESSION_TAB_VALUES.map((tab) => {
        const active = tab === value;
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={active}
            data-sessions-tab={tab}
            onClick={() => onChange(tab)}
            className={`inline-flex min-h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              active
                ? "border-primary bg-surface text-ink shadow-sm"
                : "border-edge text-muted hover:bg-surfaceMuted hover:text-ink"
            }`}
          >
            {TAB_LABELS[tab]}
            <span className="rounded-full bg-surfaceMuted px-1.5 text-xs tabular-nums text-muted">
              {counts[tab]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
