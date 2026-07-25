"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createQuestionBankSession } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import type { Area as AreaKey } from "@/app/desempenho/_lib/perfilShared";

// CTA "Resolver bloco desta área": cria uma sessão adaptativa focada nos erros da
// área e navega para ela. Mesmo padrão de startFocusedArea (banco-de-questoes),
// reusado pela AreaInsightList e pela PriorityMatrixChart.
export function useResolveAreaBlock() {
  const router = useRouter();
  const [busyArea, setBusyArea] = useState<AreaKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resolveBlock(area: AreaKey) {
    if (busyArea) return;
    setBusyArea(area);
    setError(null);
    try {
      const token = getAuthToken();
      const created = await createQuestionBankSession(token, {
        mode: "adaptive",
        resolution_mode: "training",
        area,
        answer_status: "wrong",
        limit: 10,
      });
      router.push(`/banco-de-questoes/sessao/${created.session_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível iniciar o bloco.");
      setBusyArea(null);
    }
  }

  return { resolveBlock, busyArea, error };
}
