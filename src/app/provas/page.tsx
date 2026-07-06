"use client";

import Link from "next/link";
import { useMemo } from "react";
import CreateSimuladoPanel from "./_components/CreateSimuladoPanel";
import { SessionList } from "../revisoes/_components/SessionList";
import { useSessionsPanelData } from "../revisoes/_components/useSessionsPanelData";
import { filterSessionsByTab, sessionAccuracy, sessionDurationMs } from "@/lib/sessionsPanel";
import { formatDurationMs } from "@/lib/formatDuration";

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-edge bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-1 font-serif text-2xl font-semibold text-ink">{value}</p>
      {detail && <p className="mt-1 text-xs text-muted">{detail}</p>}
    </div>
  );
}

export default function ProvasPage() {
  const { sessions, loading, error, reload } = useSessionsPanelData();
  const simulations = useMemo(() => filterSessionsByTab(sessions, "provas"), [sessions]);
  const finalized = simulations.filter((session) => session.status === "finalized");
  const active = simulations.filter((session) => session.status === "active");
  const latest = finalized[0] ?? null;
  const avgAccuracy =
    finalized.length > 0
      ? Math.round(finalized.reduce((acc, session) => acc + sessionAccuracy(session), 0) / finalized.length)
      : null;
  const avgDurationMs =
    finalized.length > 0
      ? Math.round(
          finalized.reduce((acc, session) => acc + (sessionDurationMs(session) ?? 0), 0) /
            Math.max(1, finalized.filter((session) => sessionDurationMs(session) !== null).length),
        )
      : null;

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Simulados</p>
            <h1 className="mt-1 font-serif text-4xl font-semibold leading-tight md:text-5xl">
              Experimentos de desempenho
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-muted">
              Crie um bloco em modo prova, corrija ao final e use o debrief para entender tempo,
              confiança, temas e estratégia.
            </p>
          </div>
          <Link
            href="/revisoes"
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-edge px-4 py-2 text-sm font-semibold text-muted hover:border-primary hover:text-ink"
          >
            Ver sessões
          </Link>
        </header>

        <CreateSimuladoPanel onCreated={reload} />

        <section className="grid gap-3 md:grid-cols-3">
          <Stat label="Simulados" value={String(simulations.length)} detail={`${active.length} em andamento`} />
          <Stat label="Média recente" value={avgAccuracy === null ? "-" : `${avgAccuracy}%`} detail="sessões finalizadas" />
          <Stat
            label="Tempo médio"
            value={avgDurationMs ? (formatDurationMs(avgDurationMs) ?? "-") : "-"}
            detail={latest ? "último resultado disponível" : "sem resultado ainda"}
          />
        </section>

        {error && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger bg-surface p-4 text-sm text-danger">
            <span>{error}</span>
            <button
              type="button"
              onClick={reload}
              className="rounded-lg border border-danger px-3 py-1.5 text-sm font-semibold text-danger hover:bg-surfaceMuted"
            >
              Tentar novamente
            </button>
          </div>
        )}

        <section className="rounded-lg border border-edge bg-surface p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Resultados recentes</p>
              <h2 className="mt-1 font-serif text-2xl font-semibold text-ink">Histórico de simulados</h2>
            </div>
            <Link href="/banco-de-questoes" className="text-sm font-semibold text-primary hover:underline">
              Montador avançado em Questões
            </Link>
          </div>
          {loading ? (
            <div className="h-52 animate-pulse rounded-lg border border-edge bg-paper" />
          ) : simulations.length > 0 ? (
            <SessionList sessions={simulations} tab="provas" />
          ) : (
            <div className="rounded-lg border border-dashed border-edge bg-paper p-8 text-center text-sm text-muted">
              <p>Nenhum simulado ainda. Crie seu primeiro experimento acima.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
