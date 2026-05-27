"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { getAuthToken } from "@/lib/auth";
import {
  APIError,
  finalizeStudyImportSession,
  getAPIErrorCode,
  getStudyImportSession,
  listDirectedStudies,
  listReviewTasks,
  listStudyImportSessionQuestions,
  StudyImportQuestion,
  StudyImportQuestionPage,
  StudyImportSession,
  updateStudyImportQuestionState,
} from "@/lib/api";
import {
  buildStudyImportRuntimePath,
  clearActiveStudyImportSessionId,
  setActiveStudyImportSessionId,
  STUDY_IMPORT_EXIT_REQUEST_EVENT,
} from "@/lib/studyImportRuntime";
import { resolveImportSessionErrorMessage } from "../../../_components/studyReview/shared";
import type { StudyImportExitRequestDetail } from "@/lib/studyImportRuntime";
import type { OptionLetter } from "./useSwipeGestures";
import { useStudyImportImages } from "./useStudyImportImages";

export type PageSize = 1 | 5 | 10;

export type PendingExitTarget = {
  href: string;
};

export type StudyImportSessionState = {
  token: string | null;
  loading: boolean;
  error: string;
  session: StudyImportSession | null;
  questionPage: StudyImportQuestionPage | null;
  revisionNumber: number | null;
  pageSize: PageSize;
  page: number;
  savingQuestion: number | null;
  finalizing: boolean;
  isPageTransitioning: boolean;
  pendingModalOpen: boolean;
  pendingNumbers: number[];
  navDrawerOpen: boolean;
  imageUrls: Record<string, string>;
  imageErrors: Record<string, boolean>;
  loadingImageRefs: Record<string, boolean>;
  questionStateByNumber: Record<number, { answered: boolean; doubtful: boolean }>;
  exitConfirmOpen: boolean;
  pendingExitTarget: PendingExitTarget | null;
  sessionTitle: string;
  sessionSubtitle: string;
  isLastPage: boolean;
  allAnswered: boolean;
  showFinalizar: boolean;
  visibleNumbers: number[];
  currentNumbersSet: Set<number>;
  currentAnchorNumber: number;
  unansweredSet: Set<number>;
  visibleImageRefs: string[];
};

export type StudyImportSessionRefs = {
  imageFetchInFlightRef: React.MutableRefObject<Set<string>>;
  blobUrlsByRef: React.MutableRefObject<Record<string, string>>;
  allowExitRef: React.MutableRefObject<boolean>;
  latestLoadQuestionsRequestIdRef: React.MutableRefObject<number>;
  pendingPageTopScrollRef: React.MutableRefObject<boolean>;
  pendingScrollQuestionNumberRef: React.MutableRefObject<number | null>;
  questionRefs: React.MutableRefObject<Record<number, HTMLElement | null>>;
  firstQuestionRef: React.MutableRefObject<HTMLElement | null>;
};

export type StudyImportSessionActions = {
  refreshSession: () => Promise<void>;
  loadQuestions: () => Promise<void>;
  goToPage: (nextPage: number, options?: { targetQuestionNumber?: number | null }) => void;
  jumpToQuestionNumber: (questionNumber: number, closeDrawer?: boolean) => void;
  handleSelectOption: (question: StudyImportQuestion, letter: OptionLetter) => Promise<void>;
  handleToggleEliminate: (question: StudyImportQuestion, letter: OptionLetter) => Promise<void>;
  handleToggleDoubt: (question: StudyImportQuestion) => Promise<void>;
  goToNextUnanswered: () => void;
  finalizeWithConfirm: (confirmUnanswered: boolean) => Promise<void>;
  requestExitConfirmation: (targetHref?: string) => void;
  confirmExit: () => void;
  cancelExit: () => void;
  setNavDrawerOpen: (open: boolean) => void;
  setPendingModalOpen: (open: boolean) => void;
  setPageSize: (size: PageSize) => void;
  setIsPageTransitioning: (value: boolean) => void;
  setPage: (page: number) => void;
  isQuestionAnswered: (questionNumber: number) => boolean;
  isQuestionDoubtful: (questionNumber: number) => boolean;
  scrollQuestionIntoView: (node: HTMLElement | null) => boolean;
};

function readUnansweredFromError(err: unknown): number[] {
  const details = (err as APIError | undefined)?.details as any;
  const detail = details?.detail ?? details;
  if (Array.isArray(detail?.unanswered_question_numbers)) {
    return detail.unanswered_question_numbers
      .map((item: unknown) => Number(item))
      .filter((item: number) => Number.isFinite(item) && item > 0);
  }
  return [];
}

export function useStudyImportSession(): [
  StudyImportSessionState,
  StudyImportSessionRefs,
  StudyImportSessionActions,
] {
  const router = useRouter();
  const params = useParams<{ sessionId: string }>();
  const sessionId = String(params?.sessionId ?? "");

  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [session, setSession] = useState<StudyImportSession | null>(null);
  const [questionPage, setQuestionPage] = useState<StudyImportQuestionPage | null>(null);
  const [revisionNumber, setRevisionNumber] = useState<number | null>(null);

  const [pageSize, setPageSize] = useState<PageSize>(1);
  const [page, setPage] = useState(1);

  const [savingQuestion, setSavingQuestion] = useState<number | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);

  const [pendingModalOpen, setPendingModalOpen] = useState(false);
  const [pendingNumbers, setPendingNumbers] = useState<number[]>([]);
  const [navDrawerOpen, setNavDrawerOpen] = useState(false);
  const [questionStateByNumber, setQuestionStateByNumber] = useState<
    Record<number, { answered: boolean; doubtful: boolean }>
  >({});
  const [hydratingDrawerState, setHydratingDrawerState] = useState(false);
  const [drawerStateHydrated, setDrawerStateHydrated] = useState(false);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [pendingExitTarget, setPendingExitTarget] = useState<PendingExitTarget | null>(null);

  const allowExitRef = useRef(false);
  const latestLoadQuestionsRequestIdRef = useRef(0);
  const pendingPageTopScrollRef = useRef(false);
  const pendingScrollQuestionNumberRef = useRef<number | null>(null);
  const questionRefs = useRef<Record<number, HTMLElement | null>>({});
  const firstQuestionRef = useRef<HTMLElement | null>(null);
  const hasBootstrappedLoadRef = useRef(false);
  const {
    state: { imageUrls, imageErrors, loadingImageRefs, visibleImageRefs },
    refs: { imageFetchInFlightRef, blobUrlsByRef },
    resetImages,
  } = useStudyImportImages({ token, questionPage });

  // --- Token ---
  useEffect(() => {
    setToken(getAuthToken());
  }, []);

  // --- Cleanup on sessionId change ---
  useEffect(() => {
    allowExitRef.current = false;
    setExitConfirmOpen(false);
    setPendingExitTarget(null);
    setRevisionNumber(null);
    setQuestionStateByNumber({});
    setNavDrawerOpen(false);
    setDrawerStateHydrated(false);
    setHydratingDrawerState(false);
    resetImages();
    latestLoadQuestionsRequestIdRef.current = 0;
    pendingPageTopScrollRef.current = false;
    pendingScrollQuestionNumberRef.current = null;
    questionRefs.current = {};
    firstQuestionRef.current = null;
    hasBootstrappedLoadRef.current = false;
    setIsPageTransitioning(false);
  }, [sessionId, resetImages]);

  // --- Data fetching ---
  const refreshSession = useCallback(async () => {
    if (token === null || !sessionId) return;
    const snapshot = await getStudyImportSession(token, sessionId);
    setSession(snapshot);
  }, [token, sessionId]);

  const loadQuestions = useCallback(async () => {
    if (token === null || !sessionId) return;
    const requestId = ++latestLoadQuestionsRequestIdRef.current;
    try {
      const out = await listStudyImportSessionQuestions(token, sessionId, {
        page,
        page_size: pageSize,
      });
      if (requestId !== latestLoadQuestionsRequestIdRef.current) return;
      setQuestionPage(out);
      setQuestionStateByNumber((prev) => {
        const next = { ...prev };
        for (const item of out.items ?? []) {
          next[item.question_number] = {
            answered: Boolean(item.state?.answered),
            doubtful: Boolean(item.state?.doubtful),
          };
        }
        return next;
      });
      setIsPageTransitioning(false);
    } catch (err: any) {
      if (requestId !== latestLoadQuestionsRequestIdRef.current) return;
      if (page > 1 && err?.status === 422) {
        pendingPageTopScrollRef.current = true;
        pendingScrollQuestionNumberRef.current = null;
        setIsPageTransitioning(true);
        setPage(1);
        return;
      }
      setIsPageTransitioning(false);
      throw err;
    }
  }, [token, sessionId, page, pageSize]);

  const hydrateDrawerQuestionStates = useCallback(async () => {
    if (token === null || !sessionId || !session) return;
    if (hydratingDrawerState || drawerStateHydrated) return;
    setHydratingDrawerState(true);
    try {
      const allNumbers = session.question_numbers ?? [];
      const maxPageSize: PageSize = 10;
      const totalPages = Math.max(1, Math.ceil(allNumbers.length / maxPageSize));
      const merged: Record<number, { answered: boolean; doubtful: boolean }> = {};
      for (let currentPage = 1; currentPage <= totalPages; currentPage += 1) {
        const out = await listStudyImportSessionQuestions(token, sessionId, {
          page: currentPage,
          page_size: maxPageSize,
          only_unanswered: false,
        });
        for (const item of out.items ?? []) {
          merged[item.question_number] = {
            answered: Boolean(item.state?.answered),
            doubtful: Boolean(item.state?.doubtful),
          };
        }
      }
      setQuestionStateByNumber((prev) => ({ ...prev, ...merged }));
      setDrawerStateHydrated(true);
    } catch {
      // best-effort hydration; keep current page states
    } finally {
      setHydratingDrawerState(false);
    }
  }, [token, sessionId, session, hydratingDrawerState, drawerStateHydrated]);

  // --- Bootstrap load ---
  useEffect(() => {
    if (token === null || !sessionId) return;
    let cancelled = false;
    const isInitialLoad = !hasBootstrappedLoadRef.current;
    if (isInitialLoad) {
      setLoading(true);
    }
    setError("");
    (async () => {
      try {
        await Promise.all([refreshSession(), loadQuestions()]);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message ?? "Erro ao carregar sessão.");
        }
      } finally {
        if (!cancelled && isInitialLoad) {
          setLoading(false);
          hasBootstrappedLoadRef.current = true;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, sessionId, page, pageSize, refreshSession, loadQuestions]);

  // --- Revision number resolution ---
  useEffect(() => {
    const reviewTaskId = session?.review_task_id ?? null;
    const studyKind = session?.study_kind ?? null;
    if (token === null || !studyKind || studyKind === "full_exam" || !reviewTaskId) {
      setRevisionNumber(null);
      return;
    }
    const authToken = token;
    let cancelled = false;

    async function resolveRevisionNumber() {
      try {
        const [pendingTasks, doneTasks, studies] = await Promise.all([
          listReviewTasks(authToken, { status: "pending" }),
          listReviewTasks(authToken, { status: "done" }),
          listDirectedStudies(authToken),
        ]);
        const targetTask = [...pendingTasks, ...doneTasks].find(
          (task) => task.task_id === reviewTaskId,
        );
        if (!targetTask) {
          if (!cancelled) setRevisionNumber(null);
          return;
        }
        const sortedStudies = studies
          .filter(
            (item) =>
              item.study_kind !== "full_exam" &&
              item.area === targetTask.area &&
              item.theme === targetTask.theme,
          )
          .sort((a, b) => a.performed_at.localeCompare(b.performed_at));
        const index = sortedStudies.findIndex(
          (item) => item.study_id === targetTask.source_study_id,
        );
        if (!cancelled) {
          setRevisionNumber(index >= 0 ? index + 1 : null);
        }
      } catch {
        if (!cancelled) setRevisionNumber(null);
      }
    }

    void resolveRevisionNumber();
    return () => {
      cancelled = true;
    };
  }, [token, session?.review_task_id, session?.study_kind]);

  // --- Exit confirmation ---
  const requestExitConfirmation = useCallback(
    (targetHref: string = "/agenda-operacional") => {
      setPendingExitTarget({ href: targetHref });
      setExitConfirmOpen(true);
    },
    [],
  );

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

  // --- Session ID registration ---
  useEffect(() => {
    if (!sessionId) return;
    setActiveStudyImportSessionId(sessionId);
  }, [sessionId]);

  // --- Auto-clear on inactive session ---
  useEffect(() => {
    if (!session || session.status === "active") return;
    clearActiveStudyImportSessionId();
    allowExitRef.current = true;
  }, [session]);

  // --- Menu exit request listener ---
  useEffect(() => {
    function onMenuExitRequest(event: Event) {
      if (allowExitRef.current) return;
      const detail = (event as CustomEvent<StudyImportExitRequestDetail>).detail;
      requestExitConfirmation(detail?.targetHref ?? "/agenda-operacional");
    }
    window.addEventListener(
      STUDY_IMPORT_EXIT_REQUEST_EVENT,
      onMenuExitRequest as EventListener,
    );
    return () => {
      window.removeEventListener(
        STUDY_IMPORT_EXIT_REQUEST_EVENT,
        onMenuExitRequest as EventListener,
      );
    };
  }, [requestExitConfirmation]);

  // --- beforeunload guard ---
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

  // --- History popstate guard ---
  useEffect(() => {
    if (!sessionId) return;
    const guardState = { importSessionGuard: sessionId };
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

  // --- Memos ---
  const unansweredSet = useMemo(
    () => new Set(session?.unanswered_question_numbers ?? []),
    [session?.unanswered_question_numbers],
  );

  const visibleNumbers = useMemo(() => {
    if (!session) return [];
    return session.question_numbers;
  }, [session]);

  const currentNumbersSet = useMemo(() => {
    const set = new Set<number>();
    for (const item of questionPage?.items ?? []) {
      set.add(item.question_number);
    }
    return set;
  }, [questionPage?.items]);

  const currentAnchorNumber = useMemo(() => {
    const first = questionPage?.items?.[0];
    return first ? first.question_number : 0;
  }, [questionPage?.items]);

  const sessionTitle = useMemo(() => {
    if (!session) return "Simulado";
    if (session.study_kind === "full_exam") return "Prova na Íntegra";
    if (session.review_task_id) {
      return revisionNumber ? `Revisão #${revisionNumber}` : "Revisão";
    }
    return "Estudo Inicial";
  }, [session, revisionNumber]);

  const sessionSubtitle = useMemo(() => {
    if (!session) return "";
    if (session.study_kind === "full_exam") {
      const examName = String(session.full_exam_name ?? "").trim() || "Prova";
      if (session.full_exam_year) return `${examName} ${session.full_exam_year}`;
      return examName;
    }
    return String(session.theme ?? "").trim() || "Tema";
  }, [session]);

  const isLastPage = page >= (questionPage?.total_pages ?? 1);
  const allAnswered = (session?.unanswered_count ?? 1) === 0;
  const showFinalizar = isLastPage || allAnswered;

  // --- Hydrate drawer on open ---
  useEffect(() => {
    if (!navDrawerOpen || !session) return;
    void hydrateDrawerQuestionStates();
  }, [navDrawerOpen, session, hydrateDrawerQuestionStates]);

  // --- Navigation ---
  const scrollQuestionIntoView = useCallback((node: HTMLElement | null): boolean => {
    if (!node) return false;
    node.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  }, []);

  useEffect(() => {
    if (!pendingPageTopScrollRef.current) return;
    const pendingQuestionNumber = pendingScrollQuestionNumberRef.current;
    pendingPageTopScrollRef.current = false;
    pendingScrollQuestionNumberRef.current = null;
    if (pendingQuestionNumber !== null) {
      const node =
        questionRefs.current[pendingQuestionNumber] ?? firstQuestionRef.current;
      requestAnimationFrame(() => {
        if (node) {
          scrollQuestionIntoView(node);
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      });
    } else {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
  }, [currentAnchorNumber, scrollQuestionIntoView]);

  function goToPage(nextPage: number, options?: { targetQuestionNumber?: number | null }) {
    const totalPages = Math.max(1, questionPage?.total_pages ?? 1);
    const boundedPage = Math.max(1, Math.min(totalPages, nextPage));
    const targetQuestionNumber = options?.targetQuestionNumber ?? null;
    if (boundedPage === page) {
      const node =
        targetQuestionNumber !== null
          ? (questionRefs.current[targetQuestionNumber] ?? firstQuestionRef.current)
          : firstQuestionRef.current;
      pendingPageTopScrollRef.current = false;
      pendingScrollQuestionNumberRef.current = null;
      requestAnimationFrame(() => {
        scrollQuestionIntoView(node);
      });
      return;
    }
    pendingScrollQuestionNumberRef.current = targetQuestionNumber;
    pendingPageTopScrollRef.current = true;
    setIsPageTransitioning(true);
    setPage(boundedPage);
  }

  function jumpToQuestionNumber(questionNumber: number, closeDrawer: boolean = true) {
    if (!session) return;
    const source = session.question_numbers;
    const index = source.indexOf(questionNumber);
    if (index < 0) return;
    const nextPage = Math.floor(index / pageSize) + 1;
    goToPage(nextPage, { targetQuestionNumber: questionNumber });
    if (closeDrawer) {
      setNavDrawerOpen(false);
    }
  }

  // --- Question interaction handlers ---
  async function handleSelectOption(question: StudyImportQuestion, letter: OptionLetter) {
    if (token === null || !sessionId) return;
    const selected = question.state.selected_option === letter;
    const eliminated = question.state.eliminated_options.includes(letter);
    if (eliminated && !selected) return;
    const nextValue = question.state.selected_option === letter ? null : letter;
    setSavingQuestion(question.question_number);
    setError("");
    try {
      await updateStudyImportQuestionState(token, sessionId, question.question_number, {
        selected_option: nextValue,
      });
      await Promise.all([refreshSession(), loadQuestions()]);
    } catch (err: any) {
      setError(err?.message ?? "Erro ao salvar resposta.");
    } finally {
      setSavingQuestion(null);
    }
  }

  async function handleToggleEliminate(question: StudyImportQuestion, letter: OptionLetter) {
    if (token === null || !sessionId) return;
    const current = question.state.eliminated_options;
    const exists = current.includes(letter);
    const nextValues = exists
      ? current.filter((item) => item !== letter)
      : [...current, letter];
    const shouldClearSelected = !exists && question.state.selected_option === letter;
    const nextSelected = shouldClearSelected ? null : question.state.selected_option;
    setQuestionPage((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((q) =>
          q.question_number === question.question_number
            ? {
                ...q,
                state: {
                  ...q.state,
                  eliminated_options: nextValues,
                  selected_option: nextSelected,
                },
              }
            : q,
        ),
      };
    });
    setSavingQuestion(question.question_number);
    setError("");
    try {
      await updateStudyImportQuestionState(token, sessionId, question.question_number, {
        ...(shouldClearSelected ? { selected_option: null } : {}),
        eliminated_options: nextValues,
      });
      await Promise.all([refreshSession(), loadQuestions()]);
    } catch (err: any) {
      setError(err?.message ?? "Erro ao atualizar cortes.");
      await loadQuestions();
    } finally {
      setSavingQuestion(null);
    }
  }

  async function handleToggleDoubt(question: StudyImportQuestion) {
    if (token === null || !sessionId) return;
    setQuestionPage((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((q) =>
          q.question_number === question.question_number
            ? { ...q, state: { ...q.state, doubtful: !question.state.doubtful } }
            : q,
        ),
      };
    });
    setSavingQuestion(question.question_number);
    setError("");
    try {
      await updateStudyImportQuestionState(token, sessionId, question.question_number, {
        doubtful: !question.state.doubtful,
      });
      await Promise.all([refreshSession(), loadQuestions()]);
    } catch (err: any) {
      setError(err?.message ?? "Erro ao atualizar dúvida.");
    } finally {
      setSavingQuestion(null);
    }
  }

  function goToNextUnanswered() {
    const numbers = session?.unanswered_question_numbers ?? [];
    if (numbers.length === 0) return;
    const next = numbers.find((item) => item > currentAnchorNumber) ?? numbers[0];
    jumpToQuestionNumber(next);
    setPendingModalOpen(false);
  }

  async function finalizeWithConfirm(confirmUnanswered: boolean) {
    if (token === null || !sessionId) return;
    setFinalizing(true);
    setError("");
    try {
      const result = await finalizeStudyImportSession(token, sessionId, {
        confirm_unanswered: confirmUnanswered,
      });
      try {
        sessionStorage.setItem(`finalization_${sessionId}`, JSON.stringify(result));
      } catch {
        /* quota */
      }
      clearActiveStudyImportSessionId();
      allowExitRef.current = true;
      router.replace(`${buildStudyImportRuntimePath(sessionId)}/resultados`);
    } catch (err: any) {
      const code = getAPIErrorCode(err);
      if (code === "unanswered_questions" && !confirmUnanswered) {
        const unresolved = readUnansweredFromError(err);
        setPendingNumbers(
          unresolved.length > 0
            ? unresolved
            : (session?.unanswered_question_numbers ?? []),
        );
        setPendingModalOpen(true);
      } else {
        setError(resolveImportSessionErrorMessage(err));
      }
    } finally {
      setFinalizing(false);
    }
  }

  const isQuestionAnswered = useCallback(
    (questionNumber: number) => {
      const state = questionStateByNumber[questionNumber];
      if (state) {
        return state.answered;
      }
      return !unansweredSet.has(questionNumber);
    },
    [questionStateByNumber, unansweredSet],
  );

  const isQuestionDoubtful = useCallback(
    (questionNumber: number) => {
      return Boolean(questionStateByNumber[questionNumber]?.doubtful);
    },
    [questionStateByNumber],
  );

  return [
    {
      token,
      loading,
      error,
      session,
      questionPage,
      revisionNumber,
      pageSize,
      page,
      savingQuestion,
      finalizing,
      isPageTransitioning,
      pendingModalOpen,
      pendingNumbers,
      navDrawerOpen,
      imageUrls,
      imageErrors,
      loadingImageRefs,
      questionStateByNumber,
      exitConfirmOpen,
      pendingExitTarget,
      sessionTitle,
      sessionSubtitle,
      isLastPage,
      allAnswered,
      showFinalizar,
      visibleNumbers,
      currentNumbersSet,
      currentAnchorNumber,
      unansweredSet,
      visibleImageRefs,
    },
    {
      imageFetchInFlightRef,
      blobUrlsByRef,
      allowExitRef,
      latestLoadQuestionsRequestIdRef,
      pendingPageTopScrollRef,
      pendingScrollQuestionNumberRef,
      questionRefs,
      firstQuestionRef,
    },
    {
      refreshSession,
      loadQuestions,
      goToPage,
      jumpToQuestionNumber,
      handleSelectOption,
      handleToggleEliminate,
      handleToggleDoubt,
      goToNextUnanswered,
      finalizeWithConfirm,
      requestExitConfirmation,
      confirmExit,
      cancelExit,
      setNavDrawerOpen,
      setPendingModalOpen,
      setPageSize,
      setIsPageTransitioning,
      setPage,
      isQuestionAnswered,
      isQuestionDoubtful,
      scrollQuestionIntoView,
    },
  ];
}
