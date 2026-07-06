"use client";

import { useCallback, useEffect, useState } from "react";
import { listQuestionBankSessions, type QuestionBankSession } from "@/lib/api";
import { useAuthToken } from "@/lib/useAuthToken";

export type SessionsPanelData = {
  sessions: QuestionBankSession[];
  loading: boolean;
  error: string | null;
  reload: () => void;
};

// Histórico é um log: só precisa das sessões. Análise (metacognição, diagnóstico)
// vive em /estatisticas; revisões pendentes vivem em /hoje.
export function useSessionsPanelData(): SessionsPanelData {
  const { token, tokenResolved } = useAuthToken();
  const [sessions, setSessions] = useState<QuestionBankSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setLoading(true);
    setReloadKey((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!tokenResolved) return;
    let cancelled = false;
    listQuestionBankSessions(token, { limit: 30 })
      .then((sessionData) => {
        if (cancelled) return;
        setSessions(sessionData);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError("Não foi possível carregar suas sessões.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, tokenResolved, reloadKey]);

  return { sessions, loading, error, reload };
}
