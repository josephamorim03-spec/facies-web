"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createQuestionBankSession } from "@/lib/api";
import { Skeleton } from "@/components/Skeleton";
import { useAuthToken } from "@/lib/useAuthToken";
import {
  SESSION_TAB_VALUES,
  filterSessionsByTab,
  parseSessionsTab,
  type SessionsTab,
} from "@/lib/sessionsPanel";
import { IconArrowRight } from "./icons";
import { MetacognitionSidebar } from "./MetacognitionSidebar";
import { PendingReviewsSection } from "./PendingReviewsSection";
import { SessionList } from "./SessionList";
import { SessionsMetrics } from "./SessionsMetrics";
import { SessionsTabs } from "./SessionsTabs";
import { useSessionsPanelData } from "./useSessionsPanelData";
import { CreateSimuladoPanel } from "@/app/provas/_components/CreateSimuladoPanel";

function LoadingBlock() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-56 rounded" />
      <div className="grid gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-lg" />
    </div>
  );
}

export function SessoesContent({
  initialTab = "inacabadas",
  lockedTab,
  variant = "sessoes",
}: {
  initialTab?: SessionsTab;
  /** When set, the tab is fixed (no switcher, no URL rewrites) — used by /provas. */
  lockedTab?: SessionsTab;
  variant?: "sessoes" | "simulados";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = lockedTab ?? parseSessionsTab(searchParams.get("tipo") ?? initialTab);
  const isSimulados = variant === "simulados";
  const { token, tokenResolved } = useAuthToken();
  const { sessions, tasks, performanceSummary, longitudinal, loading, error, reload } =
    useSessionsPanelData();
  const [busy, setBusy] = useState(false);

  const counts = useMemo(() => {
    const result = {} as Record<SessionsTab, number>;
    for (const value of SESSION_TAB_VALUES) {
      result[value] = filterSessionsByTab(sessions, value).length;
    }
    return result;
  }, [sessions]);
  const visibleSessions = useMemo(() => filterSessionsByTab(sessions, tab), [sessions, tab]);

  useEffect(() => {
    // Locked tab (e.g. /provas) never rewrites the URL to /revisoes.
    if (lockedTab) return;
    if (tab === "inacabadas") return;

    const syncCanonicalTabUrl = () => {
      if (window.location.pathname !== "/revisoes") return;
      const currentParams = new URLSearchParams(window.location.search);
      if (currentParams.get("tipo") === tab) return;
      currentParams.set("tipo", tab);
      window.history.replaceState(
        window.history.state,
        "",
        `/revisoes?${currentParams.toString()}${window.location.hash}`,
      );
    };

    // Next can normalize the visible URL after hydration on this query-only page.
    syncCanonicalTabUrl();
    const animationFrame = window.requestAnimationFrame(syncCanonicalTabUrl);
    const timeout = window.setTimeout(syncCanonicalTabUrl, 100);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(timeout);
    };
  }, [tab, lockedTab]);

  function changeTab(next: SessionsTab) {
    router.replace(next === "inacabadas" ? "/revisoes" : `/revisoes?tipo=${next}`, {
      scroll: false,
    });
  }

  async function startWeaknessSession() {
    setBusy(true);
    try {
      const created = await createQuestionBankSession(token, {
        mode: "adaptive",
        resolution_mode: "training",
        answer_status: "unanswered_or_wrong",
        limit: 20,
      });
      router.push(`/banco-de-questoes/sessao/${created.session_id}`);
    } catch {
      setBusy(false);
    }
  }

  if (!tokenResolved || loading) {
    return (
      <main className="min-h-screen bg-paper text-ink">
        <LoadingBlock />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-serif text-4xl font-semibold leading-tight md:text-5xl">
              {isSimulados ? "Simulados" : "Sessões"}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-muted">
              {isSimulados
                ? "Meça seu desempenho sob pressão: abra resultados de provas e simulados e acompanhe seu tempo de resposta e queda por fadiga."
                : "Continue sessões inacabadas, abra resultados de provas e simulados e acompanhe seu tempo de resposta."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {isSimulados ? (
              <CreateSimuladoPanel />
            ) : (
              <>
                <Link
                  href="/banco-de-questoes"
                  className="inline-flex min-h-10 items-center justify-center rounded-lg border border-primary px-4 py-3 text-sm font-semibold text-primary hover:bg-surfaceMuted"
                >
                  Nova sessão
                </Link>
                <button
                  type="button"
                  onClick={() => void startWeaknessSession()}
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-4 py-3 text-sm font-semibold text-primaryInk disabled:opacity-50"
                >
                  {busy ? "Criando..." : "Criar revisão inteligente"}
                  <IconArrowRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </header>

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

        <SessionsMetrics sessions={sessions} />

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_23rem]">
          <div className="space-y-5">
            <section className="rounded-lg border border-edge bg-surface p-5 shadow-sm">
              {!lockedTab && <SessionsTabs value={tab} counts={counts} onChange={changeTab} />}
              <div className={lockedTab ? "" : "mt-4"}>
                <SessionList sessions={visibleSessions} tab={tab} />
              </div>
            </section>
            <PendingReviewsSection tasks={tasks} />
          </div>
          <MetacognitionSidebar longitudinal={longitudinal} performanceSummary={performanceSummary} />
        </section>
      </div>
    </main>
  );
}
