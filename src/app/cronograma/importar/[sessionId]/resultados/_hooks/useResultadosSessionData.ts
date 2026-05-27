import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { getAuthToken } from "@/lib/auth";
import {
  resolveOperationalAttachmentDisplayUrl,
  getStudyImportSession,
  listStudyImportSessionQuestions,
  me,
} from "@/lib/api";
import type {
  FinalizationResult,
  StudyImportQuestion,
  StudyImportSession,
  WrongQuestionSummary,
} from "@/lib/api";
import {
  nextStudyImportFontPreset,
  readStudyImportFontPreset,
  studyImportAPlusIconClass,
  studyImportContentTextClass,
  writeStudyImportFontPreset,
} from "@/lib/studyImportFontPreset";
import type { StudyImportFontPreset } from "@/lib/studyImportFontPreset";
import { clearActiveStudyImportSessionId, STUDY_IMPORT_EXIT_REQUEST_EVENT } from "@/lib/studyImportRuntime";
import type { StudyImportExitRequestDetail } from "@/lib/studyImportRuntime";

import { buildCorrectionQuestion } from "../_lib/resultadosHelpers";
import type { CorrectionFilter, CorrectionQuestion, PendingExitTarget } from "../_lib/resultadosTypes";

export function useResultadosSessionData(params: { sessionId: string }) {
  const { sessionId } = params;
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [session, setSession] = useState<StudyImportSession | null>(null);
  const [finResult, setFinResult] = useState<FinalizationResult | null>(null);
  const [allQuestions, setAllQuestions] = useState<StudyImportQuestion[]>([]);

  const [resultFilter, setResultFilter] = useState<CorrectionFilter>("all");
  const [fontPreset, setFontPreset] = useState<StudyImportFontPreset>("md");
  const [navDrawerOpen, setNavDrawerOpen] = useState(false);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [loadingImageRefs, setLoadingImageRefs] = useState<Record<string, boolean>>({});
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [pendingExitTarget, setPendingExitTarget] = useState<PendingExitTarget | null>(null);

  const imageFetchInFlightRef = useRef<Set<string>>(new Set());
  const blobUrlsByRef = useRef<Record<string, string>>({});
  const allowExitRef = useRef(false);

  useEffect(() => {
    setToken(getAuthToken());
  }, []);

  useEffect(() => {
    setFontPreset(readStudyImportFontPreset());
  }, []);

  useEffect(() => {
    allowExitRef.current = false;
    setExitConfirmOpen(false);
    setPendingExitTarget(null);
    setResultFilter("all");
    setNavDrawerOpen(false);
    imageFetchInFlightRef.current.clear();
    const previous = Object.values(blobUrlsByRef.current);
    for (const url of previous) {
      URL.revokeObjectURL(url);
    }
    blobUrlsByRef.current = {};
    setImageUrls({});
    setImageErrors({});
    setLoadingImageRefs({});
  }, [sessionId]);

  const fetchAllQuestions = useCallback(async (authToken: string, currentSessionId: string) => {
    const pageSize = 10 as const;
    let currentPage = 1;
    let totalPages = 1;
    const collected: StudyImportQuestion[] = [];

    while (currentPage <= totalPages) {
      const response = await listStudyImportSessionQuestions(authToken, currentSessionId, {
        page: currentPage,
        page_size: pageSize,
      });
      collected.push(...(response.items ?? []));
      totalPages = Math.max(1, response.total_pages ?? 1);
      currentPage += 1;
    }

    collected.sort((a, b) => a.question_number - b.question_number);
    return collected;
  }, []);

  const loadData = useCallback(async () => {
    if (token === null || !sessionId) return;
    setLoading(true);
    setError("");
    try {
      const [sessionData, meData] = await Promise.all([
        getStudyImportSession(token, sessionId),
        me(token),
      ]);
      setSession(sessionData);
      setUserId(meData.user_id);

      if (sessionData.status !== "finalized") {
        router.replace(`/agenda-operacional/importar/${sessionId}`);
        return;
      }

      allowExitRef.current = true;

      const questions = await fetchAllQuestions(token, sessionId);
      setAllQuestions(questions);

      try {
        const stored = sessionStorage.getItem(`finalization_${sessionId}`);
        if (stored) {
          const parsed = JSON.parse(stored) as FinalizationResult;
          setFinResult(parsed);
          sessionStorage.removeItem(`finalization_${sessionId}`);
        } else {
          const scorable = questions.filter((q) => !q.is_annulled);
          const totalQ = scorable.length;
          const correctQ = scorable.filter(
            (q) =>
              q.state.selected_option &&
              q.correct_answer &&
              q.state.selected_option === q.correct_answer,
          ).length;
          const wrongSummaries: WrongQuestionSummary[] = scorable
            .filter(
              (q) =>
                !(
                  q.state.selected_option &&
                  q.correct_answer &&
                  q.state.selected_option === q.correct_answer
                ),
            )
            .map((q) => ({
              question_number: q.question_number,
              stem: q.stem.length > 200 ? q.stem.slice(0, 200) : q.stem,
              options: q.options,
              marked_option: q.state.selected_option,
              correct_option: q.correct_answer,
            }));
          setFinResult({
            study_id: sessionData.directed_study_id ?? "",
            created_tasks: [],
            total_questions: totalQ,
            correct_questions: correctQ,
            wrong_question_summaries: wrongSummaries,
          });
        }
      } catch {
        // ignore parse errors
      }
    } catch {
      setError("Erro ao carregar resultados.");
    } finally {
      setLoading(false);
    }
  }, [fetchAllQuestions, router, sessionId, token]);

  useEffect(() => {
    if (token === null || !sessionId) return;
    loadData();
  }, [token, sessionId, loadData]);

  const requestExitConfirmation = useCallback((targetHref: string = "/agenda-operacional") => {
    if (allowExitRef.current) {
      clearActiveStudyImportSessionId();
      router.replace(targetHref);
      return;
    }
    setPendingExitTarget({ href: targetHref });
    setExitConfirmOpen(true);
  }, [router]);

  const confirmExit = useCallback(() => {
    const targetHref = pendingExitTarget?.href ?? "/agenda-operacional";
    clearActiveStudyImportSessionId();
    allowExitRef.current = true;
    setExitConfirmOpen(false);
    setPendingExitTarget(null);
    router.replace(targetHref);
  }, [pendingExitTarget, router]);

  const cancelExit = useCallback(() => {
    setExitConfirmOpen(false);
    setPendingExitTarget(null);
  }, []);

  useEffect(() => {
    function onMenuExitRequest(event: Event) {
      if (allowExitRef.current) return;
      const detail = (event as CustomEvent<StudyImportExitRequestDetail>).detail;
      requestExitConfirmation(detail?.targetHref ?? "/agenda-operacional");
    }
    window.addEventListener(STUDY_IMPORT_EXIT_REQUEST_EVENT, onMenuExitRequest as EventListener);
    return () => {
      window.removeEventListener(STUDY_IMPORT_EXIT_REQUEST_EVENT, onMenuExitRequest as EventListener);
    };
  }, [requestExitConfirmation]);

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (allowExitRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    const guardState = { importSessionResultGuard: sessionId };
    window.history.pushState(guardState, "", window.location.href);

    function onPopState() {
      if (allowExitRef.current) return;
      requestExitConfirmation("/agenda-operacional");
      window.history.pushState(guardState, "", window.location.href);
    }

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [sessionId, requestExitConfirmation]);

  const wrongQuestions = useMemo(() => finResult?.wrong_question_summaries ?? [], [finResult]);
  const fullQuestionByNumber = useMemo(() => {
    const map = new Map<number, StudyImportQuestion>();
    for (const question of allQuestions) {
      map.set(question.question_number, question);
    }
    return map;
  }, [allQuestions]);
  const wrongByNumber = useMemo(() => {
    const map = new Map<number, WrongQuestionSummary>();
    for (const item of wrongQuestions) {
      map.set(item.question_number, item);
    }
    return map;
  }, [wrongQuestions]);

  const correctionQuestions = useMemo(() => {
    const out: CorrectionQuestion[] = [];
    for (const question of allQuestions) {
      const item = buildCorrectionQuestion(question, wrongByNumber.get(question.question_number));
      if (item) out.push(item);
    }
    return out.sort((a, b) => a.question_number - b.question_number);
  }, [allQuestions, wrongByNumber]);

  const correctCount = useMemo(
    () => correctionQuestions.filter((question) => question.status === "correct").length,
    [correctionQuestions],
  );
  const wrongCount = useMemo(
    () => correctionQuestions.filter((question) => question.status === "wrong").length,
    [correctionQuestions],
  );

  const filteredQuestions = useMemo(() => {
    if (resultFilter === "all") return correctionQuestions;
    return correctionQuestions.filter((question) => question.status === resultFilter);
  }, [correctionQuestions, resultFilter]);
  const contentTextClass = useMemo(() => studyImportContentTextClass(fontPreset), [fontPreset]);
  const aPlusIconClass = useMemo(() => studyImportAPlusIconClass(fontPreset), [fontPreset]);

  const visibleImageRefs = useMemo(() => {
    const refs = new Set<string>();
    for (const question of filteredQuestions) {
      for (const ref of question.image_attachment_refs ?? []) {
        const normalized = String(ref || "").trim();
        if (normalized) refs.add(normalized);
      }
      for (const optionRefs of Object.values(question.option_image_attachment_refs ?? {})) {
        for (const ref of optionRefs ?? []) {
          const normalized = String(ref || "").trim();
          if (normalized) refs.add(normalized);
        }
      }
    }
    return Array.from(refs.values()).sort();
  }, [filteredQuestions]);

  useEffect(() => {
    if (token === null || visibleImageRefs.length === 0) return;
    const pending = visibleImageRefs.filter(
      (ref) =>
        !imageUrls[ref] &&
        !imageErrors[ref] &&
        !loadingImageRefs[ref] &&
        !imageFetchInFlightRef.current.has(ref),
    );
    if (pending.length === 0) return;

    for (const ref of pending) {
      imageFetchInFlightRef.current.add(ref);
      setLoadingImageRefs((prev) => {
        if (prev[ref]) return prev;
        return { ...prev, [ref]: true };
      });

      (async () => {
        try {
          const resolved = await resolveOperationalAttachmentDisplayUrl(token, ref);
          setImageUrls((prev) => {
            const previous = prev[ref];
            if (previous && previous.startsWith("blob:")) {
              URL.revokeObjectURL(previous);
            }
            return { ...prev, [ref]: resolved.url };
          });
          const previousBlobUrl = blobUrlsByRef.current[ref];
          if (previousBlobUrl && previousBlobUrl !== resolved.url) {
            URL.revokeObjectURL(previousBlobUrl);
          }
          if (resolved.revoke) {
            blobUrlsByRef.current[ref] = resolved.url;
          } else {
            delete blobUrlsByRef.current[ref];
          }
        } catch {
          setImageErrors((prev) => ({ ...prev, [ref]: true }));
        } finally {
          imageFetchInFlightRef.current.delete(ref);
          setLoadingImageRefs((prev) => {
            if (!prev[ref]) return prev;
            const next = { ...prev };
            delete next[ref];
            return next;
          });
        }
      })();
    }
  }, [token, visibleImageRefs, imageUrls, imageErrors, loadingImageRefs]);

  useEffect(() => {
    const inFlight = imageFetchInFlightRef.current;
    return () => {
      const previous = Object.values(blobUrlsByRef.current);
      for (const url of previous) {
        URL.revokeObjectURL(url);
      }
      blobUrlsByRef.current = {};
      inFlight.clear();
    };
  }, []);

  const totalQuestions = finResult?.total_questions ?? 0;
  const correctQuestions = finResult?.correct_questions ?? 0;
  const accuracy = totalQuestions > 0 ? Math.round((correctQuestions / totalQuestions) * 100) : 0;
  const title = useMemo(() => {
    if (!session) return "Resultado";
    if (session.study_kind === "full_exam") return session.full_exam_name ?? "Prova";
    return session.theme ?? "Tema";
  }, [session]);

  const cycleFontPreset = useCallback(() => {
    setFontPreset((current) => {
      const next = nextStudyImportFontPreset(current);
      writeStudyImportFontPreset(next);
      return next;
    });
  }, []);

  return {
    token,
    userId,
    loading,
    error,
    session,
    finResult,
    allQuestions,
    wrongQuestions,
    fullQuestionByNumber,
    wrongByNumber,
    correctionQuestions,
    correctCount,
    wrongCount,
    filteredQuestions,
    resultFilter,
    setResultFilter,
    fontPreset,
    cycleFontPreset,
    contentTextClass,
    aPlusIconClass,
    navDrawerOpen,
    setNavDrawerOpen,
    imageUrls,
    imageErrors,
    loadingImageRefs,
    requestExitConfirmation,
    exitConfirmOpen,
    pendingExitTarget,
    confirmExit,
    cancelExit,
    title,
    totalQuestions,
    correctQuestions,
    accuracy,
  };
}
