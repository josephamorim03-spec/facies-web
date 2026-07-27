"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import type { StudentSurfaceHome, StudentTodayAction } from "@/lib/api";

function sourceLabel(source: string): string {
  const labels: Record<string, string> = {
    flashcards: "Flashcards",
    plan: "Planejar",
    question_bank: "Banco",
    review: "Revisar",
    schedule: "Agenda",
    track: "Acompanhar",
    trainer: "Treinador",
  };
  return labels[source] ?? source;
}

export function StudentPrimaryAction({
  action,
  eyebrow,
}: {
  action: StudentTodayAction;
  eyebrow?: string;
}) {
  return (
    <section className="rounded-surface border border-edge bg-paper px-4 py-5 sm:px-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            {eyebrow ? `${eyebrow} / ` : ""}{sourceLabel(action.source)}
            {action.estimated_minutes && action.estimated_minutes > 0 ? ` / ${action.estimated_minutes} min` : ""}
          </p>
          <div>
            <h2 className="font-serif text-3xl font-semibold leading-tight text-ink sm:text-4xl">
              {action.title}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{action.rationale}</p>
          </div>
        </div>
        <Link
          href={action.href}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-control border border-primary bg-primary px-5 text-sm font-semibold text-primaryInk transition hover:brightness-[1.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:w-auto"
        >
          {action.cta_label}
        </Link>
      </div>
    </section>
  );
}

export function StudentLoadNote({ load }: { load: StudentSurfaceHome["load_note"] }) {
  if (!load) return null;
  return (
    <aside className={`rounded-lg border px-4 py-3 text-sm ${load.overload_alert ? "border-warning/50 bg-warning/5" : "border-edge bg-surface"}`}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-semibold text-ink">Carga {load.label}</p>
        <p className="text-xs text-muted">
          {load.estimated_minutes} min / limite {load.recommended_limit_minutes} min
        </p>
      </div>
      <p className="mt-1 leading-5 text-muted">{load.short_message}</p>
    </aside>
  );
}

export function StudentBackupActions({ actions }: { actions: StudentTodayAction[] }) {
  if (actions.length === 0) return null;
  return (
    <section className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Alternativas</p>
      <div className="grid gap-2 md:grid-cols-2">
        {actions.slice(0, 2).map((action) => (
          <Link
            key={`${action.kind}:${action.href}`}
            href={action.href}
            className="rounded-surface border border-edge bg-surface px-4 py-3 transition hover:border-primary"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-ink">{action.title}</h3>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{action.rationale}</p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-muted">{action.cta_label}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function StudentSurfaceInsight({ surface }: { surface: StudentSurfaceHome }) {
  if (!surface.insight && !surface.support_metric) return null;
  const tone =
    surface.insight?.severity === "critical"
      ? "border-warning/60 bg-warning/5"
      : surface.insight?.severity === "attention"
        ? "border-edge bg-surface"
        : "border-edge bg-paper";
  return (
    <aside className={`rounded-lg border px-4 py-3 ${tone}`}>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(10rem,14rem)] md:items-center">
        <div className="min-w-0">
          {surface.insight ? (
            <>
              <h3 className="text-base font-semibold text-ink">{surface.insight.title}</h3>
              <p className="mt-1 text-sm leading-5 text-muted">{surface.insight.message}</p>
            </>
          ) : null}
        </div>
        {surface.support_metric ? (
          <div className="rounded-lg border border-edge bg-paper px-3 py-2">
            <p className="text-xs text-muted">{surface.support_metric.label}</p>
            <p className="mt-1 text-2xl font-semibold text-ink">
              {surface.support_metric.value ?? "-"}
              {surface.support_metric.unit ? <span className="text-sm text-muted"> {surface.support_metric.unit}</span> : null}
            </p>
            <p className="mt-1 text-xs leading-4 text-muted">{surface.support_metric.interpretation}</p>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

export function StudentDeepLinks({ links }: { links: StudentSurfaceHome["deep_links"] }) {
  if (!links || links.length === 0) return null;
  return (
    <nav className="grid gap-2 sm:grid-cols-3" aria-label="Aprofundamentos">
      {links.slice(0, 3).map((link) => (
        <Link
          key={`${link.label}:${link.href}`}
          href={link.href}
          className="rounded-lg border border-edge bg-surface px-4 py-3 transition hover:border-primary"
        >
          <p className="text-sm font-semibold text-ink">{link.label}</p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{link.reason}</p>
        </Link>
      ))}
    </nav>
  );
}

export function StudentDetailsDisclosure({
  title = "Detalhes",
  status,
  missingSources,
  children,
}: {
  title?: string;
  status: StudentSurfaceHome["status"];
  missingSources: string[];
  children: ReactNode;
}) {
  return (
    <details className="group rounded-lg border border-edge bg-surface">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-ink sm:px-5">
        <span>{title}</span>
        <span className="text-muted transition group-open:rotate-90" aria-hidden="true">
          &gt;
        </span>
      </summary>
      <div className="space-y-4 border-t border-edge p-4 sm:p-5">
        {status !== "complete" ? (
          <p className="rounded-lg border border-edge bg-paper px-3 py-2 text-xs leading-5 text-muted">
            Dados parciais: {missingSources.join(", ") || "fonte indisponível"}.
          </p>
        ) : null}
        {children}
      </div>
    </details>
  );
}

export function StudentSurfaceSnapshot({ items }: { items: Array<{ label: string; value: string; href?: string }> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map((item) => {
        const content = (
          <>
            <p className="text-xs text-muted">{item.label}</p>
            <p className="mt-1 text-lg font-semibold text-ink">{item.value}</p>
          </>
        );
        return item.href ? (
          <Link key={item.label} href={item.href} className="rounded-surface border border-edge bg-paper p-3 hover:border-primary">
            {content}
          </Link>
        ) : (
          <div key={item.label} className="rounded-lg border border-edge bg-paper p-3">
            {content}
          </div>
        );
      })}
    </div>
  );
}
