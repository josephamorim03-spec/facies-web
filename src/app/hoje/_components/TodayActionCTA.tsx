"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { startTrainerAction, type StudentTodayAction } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import { useToast } from "@/lib/useToast";

export function TodayActionCTA({
  action,
  children,
  className,
}: {
  action: StudentTodayAction;
  children: ReactNode;
  className: string;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const execution = action.execution;

  if (execution?.kind !== "trainer_action") {
    return (
      <Link href={execution?.href ?? action.href} className={className}>
        {children}
      </Link>
    );
  }

  async function start() {
    if (busy || !execution?.action_id || !execution.recommendation_id) return;
    setBusy(true);
    try {
      const result = await startTrainerAction(getAuthToken(), execution.action_id, {
        recommendation_id: execution.recommendation_id,
        source_page: "/hoje",
      });
      router.push(result.session_id ? `/banco/sessao/${result.session_id}` : result.href ?? action.href);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Não foi possível iniciar a atividade.",
        "error",
      );
      setBusy(false);
    }
  }

  return (
    <button type="button" className={className} disabled={busy} onClick={() => void start()}>
      {busy ? "Iniciando..." : children}
    </button>
  );
}
