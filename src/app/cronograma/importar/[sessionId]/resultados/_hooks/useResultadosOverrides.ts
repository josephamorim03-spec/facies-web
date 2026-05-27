import { useCallback, useEffect, useRef, useState } from "react";

import {
  deleteQuestionOverride,
  getSessionOverrides,
  setQuestionOverride,
} from "@/lib/api";

type OverrideType = "aceitar_ia" | "anulada";

type UseResultadosOverridesProps = {
  token: string | null;
  sessionId: string;
  baseTotal: number;
  baseCorrect: number;
};

export function useResultadosOverrides({
  token,
  sessionId,
  baseTotal,
  baseCorrect,
}: UseResultadosOverridesProps) {
  const [overrides, setOverrides] = useState<Record<number, OverrideType>>({});
  const [displayTotal, setDisplayTotal] = useState(baseTotal);
  const [displayCorrect, setDisplayCorrect] = useState(baseCorrect);
  const [loadingQuestion, setLoadingQuestion] = useState<number | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (token === null || !sessionId || initializedRef.current) return;
    initializedRef.current = true;

    void getSessionOverrides(token, sessionId)
      .then((result) => {
        setOverrides(result.overrides as Record<number, OverrideType>);
        setDisplayTotal(result.updated_total);
        setDisplayCorrect(result.updated_correct);
      })
      .catch(() => {
        // If overrides endpoint fails (e.g. session not finalized yet), keep base score
      });
  }, [token, sessionId]);

  const applyOverride = useCallback(
    async (questionNumber: number, type: OverrideType) => {
      if (token === null) return;
      setLoadingQuestion(questionNumber);
      try {
        const result = await setQuestionOverride(token, sessionId, questionNumber, type);
        setOverrides((prev) => ({ ...prev, [questionNumber]: type }));
        setDisplayTotal(result.updated_total);
        setDisplayCorrect(result.updated_correct);
      } finally {
        setLoadingQuestion(null);
      }
    },
    [token, sessionId],
  );

  const removeOverride = useCallback(
    async (questionNumber: number) => {
      if (token === null) return;
      setLoadingQuestion(questionNumber);
      try {
        const result = await deleteQuestionOverride(token, sessionId, questionNumber);
        setOverrides((prev) => {
          const next = { ...prev };
          delete next[questionNumber];
          return next;
        });
        setDisplayTotal(result.updated_total);
        setDisplayCorrect(result.updated_correct);
      } finally {
        setLoadingQuestion(null);
      }
    },
    [token, sessionId],
  );

  return {
    overrides,
    displayTotal,
    displayCorrect,
    applyOverride,
    removeOverride,
    loadingQuestion,
  };
}
