import Link from "next/link";

import type { OperationalTurboOverview } from "@/lib/api";
import { REVIEW_ROUTES } from "@/lib/reviewRoutes";

function IconCards({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="4" y="7" width="12" height="12" rx="1.5" />
      <rect x="8" y="5" width="12" height="12" rx="1.5" />
    </svg>
  );
}

export function CardsDuePanel({ overview }: { overview: OperationalTurboOverview | null }) {
  if (!overview || overview.due_count <= 0) return null;

  return (
    <section
      className="rounded-surface border bg-surface p-5 shadow-soft"
      style={{ borderColor: "color-mix(in srgb, var(--color-accent) 28%, var(--color-edge))" }}
    >
      <div className="flex items-center gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-accent"
          style={{ backgroundColor: "color-mix(in srgb, var(--color-accent) 12%, transparent)" }}
        >
          <IconCards className="h-8 w-8" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-2xl font-semibold">Cards no ponto</h2>
          <p className="text-sm text-muted">
            {overview.due_count} cards{overview.estimated_minutes ? ` · ~${overview.estimated_minutes} min` : ""}
          </p>
        </div>
        <Link
          href={REVIEW_ROUTES.adaptiveCards}
          className="rounded-lg border border-accent px-3 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent hover:text-accentInk"
        >
          Revisar
        </Link>
      </div>
    </section>
  );
}

