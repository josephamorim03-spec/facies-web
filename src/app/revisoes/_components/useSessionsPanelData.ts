"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getQuestionBankLongitudinalDiagnosis,
  getStudyPerformanceSummary,
  listQuestionBankSessions,
  listReviewTasks,
  type QuestionBankLongitudinalDiagnosis,
  type QuestionBankSession,
  type ReviewTask,
  type StudyPerformanceSummary,
} from "@/lib/api";
import { useAuthToken } from "@/lib/useAuthToken";

export type SessionsPanelData = {
  sessions: QuestionBankSession[];
  tasks: ReviewTask[];
  performanceSummary: StudyPerformanceSummary | null;
  longitudinal: QuestionBankLongitudinalDiagnosis | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

export function useSessionsPanelData(): SessionsPanelData {
  const { token, tokenResolved } = useAuthToken();
  const [sessions, setSessions] = useState<QuestionBankSession[]>([]);
  const [tasks, setTasks] = useState<ReviewTask[]>([]);
  const [performanceSummary, setPerformanceSummary] = useState<StudyPerformanceSummary | null>(null);
  const [longitudinal, setLongitudinal] = useState<QuestionBankLongitudinalDiagnosis | null>(null);
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
    // Sessões são o dado herói: falha vira estado de erro; o resto degrada em silêncio.
    Promise.all([
      listQuestionBankSessions(token, { limit: 30 }),
      listReviewTasks(token, { status: "pending" }).catch(() => [] as ReviewTask[]),
      getStudyPerformanceSummary(token).catch(() => null),
      getQuestionBankLongitudinalDiagnosis(token).catch(() => null),
    ])
      .then(([sessionData, taskData, perf, meta]) => {
        if (cancelled) return;
        setSessions(sessionData);
        setTasks(taskData);
        setPerformanceSummary(perf);
        setLongitudinal(meta);
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

  return { sessions, tasks, performanceSummary, longitudinal, loading, error, reload };
}
