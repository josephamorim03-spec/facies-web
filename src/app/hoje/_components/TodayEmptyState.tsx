"use client";

import Link from "next/link";

export function TodayEmptyState() {
  return (
    <section className="paper-dashed bg-surface px-4 py-6 sm:px-6">
      <h2 className="font-serif text-2xl font-semibold text-ink">Suficiente por hoje</h2>
      <Link
        href="/banco?limit=10"
        className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-control border border-edge px-4 text-sm font-semibold text-ink transition hover:border-primary sm:w-auto"
      >
        Comecar bloco curto
      </Link>
    </section>
  );
}
