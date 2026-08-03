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
import { SessionList } from "./SessionList";
import { SessionsTabs } from "./SessionsTabs";
import { useSessionsPanelData } from "./useSessionsPanelData";

function LoadingBlock() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-56 rounded" />
      <Skeleton className="h-10 w-full max-w-md rounded-full" />
      <Skeleton className="h-72 rounded-lg" />
    </div>
  );
}

// Histórico: o log de sessões (treinos + simulados). Retomar, ver resultado ou
// concluir revisão — uma lista escaneável. Simulados é um filtro (?tipo=provas),
// não uma página. Análise pedagógica vive em /estatisticas.
export function SessoesContent({ initialTab = "inacabadas" }: { initialTab?: SessionsTab }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseSessionsTab(searchParams.get("tipo") ?? initialTab);
  const { token } = useAuthToken();
  const { sessions, loading, error, reload } = useSessionsPanelData();
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
  }, [tab]);

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
      router.push(`/banco/sessao/${created.session_id}`);
    } catch {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-paper text-ink">
        <LoadingBlock />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-serif text-4xl font-semibold leading-tight md:text-5xl">Histórico</h1>
            <p className="mt-3 max-w-2xl text-sm text-muted">
              Retome sessões inacabadas, reveja resultados de treinos e simulados e acompanhe seu
              tempo de resposta.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/banco"
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

        <section className="rounded-lg border border-edge bg-surface p-5 shadow-sm">
          <SessionsTabs value={tab} counts={counts} onChange={changeTab} />
          <div className="mt-4">
            <SessionList sessions={visibleSessions} tab={tab} />
          </div>
        </section>
      </div>
    </main>
  );
}
