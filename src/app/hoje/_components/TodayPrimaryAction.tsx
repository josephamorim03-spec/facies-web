"use client";

import Link from "next/link";

import type { StudentTodayAction } from "@/lib/api";

function sourceLabel(source: string): string {
  const labels: Record<string, string> = {
    trainer: "Treinador",
    question_bank: "Banco de questões",
    schedule: "Agenda",
    flashcards: "Flashcards",
    student_experience: "Hoje",
  };
  return labels[source] ?? source;
}

export function TodayPrimaryAction({ action }: { action: StudentTodayAction }) {
  return (
    <section
      aria-label="Proxima acao"
      className="rounded-surface border border-edge bg-paper px-4 py-5 sm:px-6 sm:py-6"
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            <span>Sua proxima acao</span>
            <span aria-hidden="true">/</span>
            <span>{sourceLabel(action.source)}</span>
            {action.estimated_minutes !== null && action.estimated_minutes > 0 ? (
              <>
                <span aria-hidden="true">/</span>
                <span>{action.estimated_minutes} min</span>
              </>
            ) : null}
          </div>
          <div>
            <h2 className="font-serif text-3xl font-semibold leading-tight text-ink sm:text-4xl">
              {action.title}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">
              {action.rationale}
            </p>
          </div>
        </div>
        <Link
          href={action.href}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-control border border-primary bg-primary px-5 text-sm font-semibold text-primaryInk transition hover:brightness-[1.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:w-auto"
        >
          {action.cta_label}
        </Link>
      </div>
    </section>
  );
}
