"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import {
  finalizeQuestionBankSession,
  createQuestionTextHighlight,
  deleteQuestionTextHighlight,
  getAPIErrorDetail,
  getQuestionBankAiRequestPreview,
  getQuestionBankAiRequestStatus,
  getQuestionBankGuidedReview,
  getQuestionBankSession,
  recordQuestionBankAttempt,
  recordQuestionBankPostAnswerReflection,
  recordQuestionBankCorrection,
  recordQuestionBankEvents,
  reportQuestionBankSessionItem,
  requestQuestionBankAICorrection,
  submitQuestionBankGuidedReview,
  setQuestionBankBookmark,
  type OperationalQuestionOutcome,
  type QuestionBankFinalizeResult,
  type QuestionBankAiRequestPreview,
  type QuestionBankAiRequestResult,
  type QuestionBankAiRequestStatusResult,
  type QuestionBankGuidedReview,
  type QuestionBankGuidedReviewValue,
  type QuestionBankOption,
  type QuestionPostAnswerReflection,
  type QuestionBankReportType,
  type QuestionBankSession,
  type QuestionTextHighlight,
  type QuestionTextHighlightKind,
  type QuestionTextHighlightTarget,
  type QuestionBankStudentEventPayload,
  type QuestionBankStudentEventType,
} from "@/lib/api";
import { useAuthToken } from "@/lib/useAuthToken";
import { invalidateLearningQueries } from "@/lib/queryKeys";
import { Alert } from "@/components/ui/Alert";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import FixacaoRound from "./_components/FixacaoRound";
import QuickNoteModal from "./_components/QuickNoteModal";
import FocusedQuestion from "./_components/FocusedQuestion";
import ExamMap from "./_components/ExamMap";
import PostExamReview from "./_components/PostExamReview";
import { ConfidenceReviewStep } from "./_components/ConfidenceReviewStep";
import AttemptHistoryModal from "../../_components/AttemptHistoryModal";
import LearningPackagePanel from "./_components/LearningPackagePanel";

type QuickNoteTarget = {
  questionId: string;
  area: string | null;
  theme: string | null;
  questionOutcome: OperationalQuestionOutcome | null;
  selectedOption: QuestionBankOption | null;
  correctAnswer: QuestionBankOption | null;
  errorHypothesis: string | null;
  highlightContext: QuestionTextHighlight[];
};

type CorrectionConfidenceLevel = "low" | "medium" | "high";

const CORRECTION_CONFIDENCE_DELTA: Record<CorrectionConfidenceLevel, number> = {
  low: 0.15,
  medium: 0.35,
  high: 0.6,
};

function safeAttemptErrorMessage(err: unknown): string {
  const detail = getAPIErrorDetail(err);
  const code = typeof detail?.code === "string" ? detail.code : null;
  const message = typeof detail?.message === "string" ? detail.message : null;
  const requestId = typeof detail?.request_id === "string" ? detail.request_id : null;
  const missingColumns = Array.isArray(detail?.missing_columns)
    ? detail.missing_columns.filter((item): item is string => typeof item === "string")
    : [];

  if (message) return requestId ? `${message} (req ${requestId})` : message;
  if (code === "question_bank_schema_drift" || code === "schema_contract_invalid") {
    const columns = missingColumns.length > 0 ? ` Colunas ausentes: ${missingColumns.join(", ")}.` : "";
    return `O banco transacional est? com schema incompatével para registrar respostas.${columns}${requestId ? ` Req ${requestId}.` : ""}`;
  }
  if (code) return `Não foi possível registrar a resposta (${code}).${requestId ? ` Req ${requestId}.` : ""}`;
  if (err instanceof Error && err.message && !/traceback|stack trace|undefinedcolumn/i.test(err.message)) {
    return err.message;
  }
  return "Não foi possível registrar a resposta. Tente novamente em instantes.";
}

export default function SessionPage() {
  const queryClient = useQueryClient();
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const router = useRouter();
  const { token, tokenResolved } = useAuthToken();

  // Session state
  const [session, setSession] = useState<QuestionBankSession | null>(null);
  const [finalizeOut, setFinalizeOut] = useState<QuestionBankFinalizeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Navigation
  const [currentPosition, setCurrentPosition] = useState(1);
  const [showMap, setShowMap] = useState(false);
  const [confidenceStepOpen, setConfidenceStepOpen] = useState(false);
  // Sair do simulado pede confirmação (fica salvo, retomável); no treino sai direto.
  const [simExitConfirmOpen, setSimExitConfirmOpen] = useState(false);

  // Client-side alternative elimination ("cortar") — a visual study aid, per position.
  // Never sent to the backend; does not affect the recorded attempt or FSRS.
  // Elimination and answer drafts are returned by the session API.

  // Optional end-of-training retrieval round over the missed items (ungraded).
  const [showFixacao, setShowFixacao] = useState(false);

  async function loadGuidedReview(position: number) {
    if (!session) return;
    try {
      const review = await getQuestionBankGuidedReview(token, session.session_id, position);
      setGuidedReviews((prev) => ({ ...prev, [position]: review }));
      setGuidedReviewErrors((prev) => (prev[position] ? { ...prev, [position]: false } : prev));
      if (review.existing_responses.length > 0) {
        setGuidedResponses((prev) => ({
          ...prev,
          [position]: Object.fromEntries(
            review.existing_responses
              .filter((r) => ["yes", "partial", "no", "unsure"].includes(r.response_value))
              .map((r) => [r.checkpoint_key, r.response_value as QuestionBankGuidedReviewValue]),
          ),
        }));
      }
    } catch {
      // Keep the classic free-text correction available if checkpoints fail, but
      // flag it so the student sees a retry instead of a silently blank panel.
      setGuidedReviewErrors((prev) => ({ ...prev, [position]: true }));
    }
  }

  async function revealAnswer(position: number) {
    if (!session) return;
    const item = session.items.find((candidate) => candidate.position === position);
    if (!item || !item.selected_option) return;
    setBusy(true);
    setError(null);
    const elapsedMs = Date.now() - questionStartTimeRef.current;
    try {
      const updated = item.answer_committed
        ? session
        : await recordQuestionBankAttempt(token, session.session_id, position, {
            selected_option: item.selected_option,
            time_ms: elapsedMs,
            doubtful: item.doubtful,
            confidence_self_rating: item.confidence_self_rating ?? confidenceRatings[position] ?? null,
            eliminated_options: item.eliminated_options ?? [],
            commit: true,
          });
      setSession(updated);
      setRevealedPositions((prev) => ({ ...prev, [position]: true }));
      enqueueStudentEvent(position, "answer_revealed", {
        elapsed_ms: elapsedMs,
        committed: !item.answer_committed,
      });
      void loadGuidedReview(position);
    } catch (err) {
      setError(safeAttemptErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function changeConfidenceRating(position: number, value: number | null) {
    setConfidenceRatings((prev) => ({ ...prev, [position]: value }));
    if (value !== null) {
      enqueueStudentEvent(position, "confidence_marked", {
        confidence_self_rating: value,
        phase: "pre_answer",
      });
    }
  }

  // Reveal state (training mode)
  const [revealedPositions, setRevealedPositions] = useState<Record<number, boolean>>({});
  const [correctionDrafts, setCorrectionDrafts] = useState<Record<number, string>>({});
  const [confidenceRatings, setConfidenceRatings] = useState<Record<number, number | null>>({});
  const [preAnswerDoubtful, setPreAnswerDoubtful] = useState<Record<number, boolean>>({});
  const [correctionConfidence, setCorrectionConfidence] = useState<Record<number, CorrectionConfidenceLevel>>({});
  const [guidedReviews, setGuidedReviews] = useState<Record<number, QuestionBankGuidedReview>>({});
  const [guidedReviewErrors, setGuidedReviewErrors] = useState<Record<number, boolean>>({});
  const [guidedResponses, setGuidedResponses] = useState<Record<number, Record<string, QuestionBankGuidedReviewValue>>>({});

  // Report state
  const [reportingQuestionId, setReportingQuestionId] = useState<string | null>(null);
  const [reportType, setReportType] = useState<QuestionBankReportType>("wrong_answer");
  const [reportReason, setReportReason] = useState("");
  const [reportDone, setReportDone] = useState<Record<string, boolean>>({});
  const [aiCorrectionRequested, setAiCorrectionRequested] = useState<Record<string, boolean>>({});
  const [aiCorrectionRequesting, setAiCorrectionRequesting] = useState<Record<string, boolean>>({});
  const [aiRequestPreviewByQuestion, setAiRequestPreviewByQuestion] = useState<Record<string, QuestionBankAiRequestPreview | null>>({});
  const [aiRequestPreviewLoadingByQuestion, setAiRequestPreviewLoadingByQuestion] = useState<Record<string, boolean>>({});
  const [aiRequestStatusByQuestion, setAiRequestStatusByQuestion] = useState<Record<string, QuestionBankAiRequestResult | QuestionBankAiRequestStatusResult | null>>({});
  const [quickNoteTarget, setQuickNoteTarget] = useState<QuickNoteTarget | null>(null);
  const [historyQuestionId, setHistoryQuestionId] = useState<string | null>(null);
  const [reflectionBusyByPosition, setReflectionBusyByPosition] = useState<Record<number, boolean>>({});

  // Track per-question start time so we can send time_ms to the backend
  const questionStartTimeRef = useRef<number>(Date.now());
  const eventQueueRef = useRef<Record<number, QuestionBankStudentEventPayload[]>>({});
  const eventFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushStudentEvents = useCallback(() => {
    if (!session) return;
    const queued = eventQueueRef.current;
    eventQueueRef.current = {};
    for (const [rawPosition, events] of Object.entries(queued)) {
      if (events.length === 0) continue;
      void recordQuestionBankEvents(token, session.session_id, Number(rawPosition), events).catch(() => {
        eventQueueRef.current[Number(rawPosition)] = [
          ...(eventQueueRef.current[Number(rawPosition)] ?? []),
          ...events,
        ];
      });
    }
  }, [session, token]);

  function newEventId(type: QuestionBankStudentEventType, position: number) {
    return `sqe_${sessionId}_${position}_${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  const currentQuestionId =
    session?.items.find((i) => i.position === currentPosition)?.question_id ?? session?.items[0]?.question_id ?? null;

  const loadAiRequestPreview = useCallback(async (questionId: string) => {
    if (!tokenResolved || !questionId) return;
    setAiRequestPreviewLoadingByQuestion((prev) => ({ ...prev, [questionId]: true }));
    try {
      const preview = await getQuestionBankAiRequestPreview(token, questionId);
      setAiRequestPreviewByQuestion((prev) => ({ ...prev, [questionId]: preview }));
    } catch {
      // Degrade silently: the student still keeps the normal correction/report flow.
    } finally {
      setAiRequestPreviewLoadingByQuestion((prev) => ({ ...prev, [questionId]: false }));
    }
  }, [token, tokenResolved]);

  useEffect(() => {
    if (!currentQuestionId || aiRequestPreviewByQuestion[currentQuestionId] || aiRequestPreviewLoadingByQuestion[currentQuestionId]) {
      return;
    }
    void loadAiRequestPreview(currentQuestionId);
  }, [currentQuestionId, aiRequestPreviewByQuestion, aiRequestPreviewLoadingByQuestion, loadAiRequestPreview]);

  function enqueueStudentEvent(
    position: number,
    eventType: QuestionBankStudentEventType,
    payload: Record<string, unknown> = {},
  ) {
    if (!session) return;
    const event: QuestionBankStudentEventPayload = {
      event_id: newEventId(eventType, position),
      event_type: eventType,
      occurred_at: new Date().toISOString(),
      payload,
    };
    eventQueueRef.current[position] = [...(eventQueueRef.current[position] ?? []), event];
    if (eventFlushTimerRef.current) clearTimeout(eventFlushTimerRef.current);
    eventFlushTimerRef.current = setTimeout(flushStudentEvents, 700);
  }

  useEffect(() => {
    return () => {
      if (eventFlushTimerRef.current) clearTimeout(eventFlushTimerRef.current);
    };
  }, []);

  // ── Timing v1 (Fatia C): honest per-question visit tracking for simulados ──
  // visible_ms via Page Visibility, idle suspicion at end of a stale visit,
  // revisits via visit_index. Emitted through the existing event queue.
  type VisitState = {
    position: number;
    visitId: string;
    visitIndex: number;
    enteredAt: number;
    visibleAccumMs: number;
    hiddenAccumMs: number;
    lastVisibleStart: number | null;
    hiddenStart: number | null;
    activityCount: number;
    focusLossCount: number;
    lastActivityAt: number;
    idleSuspectMs: number;
  };
  const visitRef = useRef<VisitState | null>(null);
  const visitIndexByPosRef = useRef<Record<number, number>>({});
  const IDLE_GAP_MS = 45_000;

  const endVisitRef = useRef<(reason: string) => void>(() => {});
  endVisitRef.current = (reason: string) => {
    const v = visitRef.current;
    if (!v) return;
    visitRef.current = null;
    const now = Date.now();
    if (v.lastVisibleStart != null) v.visibleAccumMs += now - v.lastVisibleStart;
    if (v.hiddenStart != null) v.hiddenAccumMs += now - v.hiddenStart;
    const idleGap = now - v.lastActivityAt;
    if (idleGap > IDLE_GAP_MS) v.idleSuspectMs += idleGap - IDLE_GAP_MS;
    enqueueStudentEvent(v.position, "question_view_ended", {
      schema_version: "timing_v1",
      visit_id: v.visitId,
      visit_index: v.visitIndex,
      entered_at: new Date(v.enteredAt).toISOString(),
      left_at: new Date(now).toISOString(),
      wall_ms: now - v.enteredAt,
      visible_ms: Math.round(v.visibleAccumMs),
      hidden_ms: Math.round(v.hiddenAccumMs),
      idle_suspect_ms: Math.round(v.idleSuspectMs),
      activity_count: v.activityCount,
      focus_loss_count: v.focusLossCount,
      end_reason: reason,
    });
  };

  // Begin/end a visit as the current question changes.
  //
  // KROS-022: era `resolution_mode === "simulation"` apenas. O treino diario --
  // que e' a maior parte do estudo -- ficava sem `visible_ms`, e o unico numero
  // disponivel para ele era `time_ms`: wall-clock cru, sem pausa em aba oculta e
  // sem teto. Minutos observados por dia precisam da MESMA medida honesta nos
  // dois modos, senao a leitura de rotina compara tempo visivel com tempo de aba
  // aberta. O custo e' ~2 eventos por questao, o mesmo volume que o simulado ja
  // produz pela mesma fila com debounce.
  useEffect(() => {
    if (!session || session.status !== "active") return;
    const position = currentPosition;
    const now = Date.now();
    const idx = visitIndexByPosRef.current[position] ?? 0;
    visitIndexByPosRef.current[position] = idx + 1;
    const hiddenNow = typeof document !== "undefined" && document.visibilityState === "hidden";
    visitRef.current = {
      position,
      visitId: `${sessionId}_${position}_${now}_${Math.random().toString(36).slice(2, 6)}`,
      visitIndex: idx,
      enteredAt: now,
      visibleAccumMs: 0,
      hiddenAccumMs: 0,
      lastVisibleStart: hiddenNow ? null : now,
      hiddenStart: hiddenNow ? now : null,
      activityCount: 0,
      focusLossCount: 0,
      lastActivityAt: now,
      idleSuspectMs: 0,
    };
    enqueueStudentEvent(position, "question_presented", {
      schema_version: "timing_v1",
      visit_id: visitRef.current.visitId,
      visit_index: idx,
      entered_at: new Date(now).toISOString(),
    });
    return () => endVisitRef.current("navigate");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPosition, session?.session_id, session?.status]);

  // Visibility / focus / activity / pagehide listeners.
  useEffect(() => {
    if (!session) return;
    if (typeof document === "undefined") return;
    const onVisibility = () => {
      const v = visitRef.current;
      if (!v) return;
      const now = Date.now();
      if (document.visibilityState === "hidden") {
        if (v.lastVisibleStart != null) {
          v.visibleAccumMs += now - v.lastVisibleStart;
          v.lastVisibleStart = null;
        }
        if (v.hiddenStart == null) v.hiddenStart = now;
      } else {
        if (v.hiddenStart != null) {
          v.hiddenAccumMs += now - v.hiddenStart;
          v.hiddenStart = null;
        }
        v.lastVisibleStart = now;
        v.lastActivityAt = now;
      }
    };
    const onActivity = () => {
      const v = visitRef.current;
      if (!v) return;
      v.activityCount += 1;
      v.lastActivityAt = Date.now();
    };
    const onBlur = () => {
      const v = visitRef.current;
      if (v) v.focusLossCount += 1;
    };
    const onPageHide = () => {
      endVisitRef.current("pagehide");
      flushStudentEvents();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pointerdown", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity);
    window.addEventListener("blur", onBlur);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [session, flushStudentEvents]);

  // Load (or reload) the session. Exposed via useCallback so the error state can
  // offer a retry instead of dead-ending the student when the first fetch times
  // out or 5xxs — the most common way the banco "doesn't show up".
  const loadSession = useCallback(() => {
    if (!tokenResolved || !sessionId) return;
    setLoading(true);
    setError(null);
    getQuestionBankSession(token, sessionId)
      .then((s) => {
        setSession(s);
        // Start at first unanswered question if available
        if (s.unanswered_question_numbers.length > 0) {
          setCurrentPosition(s.unanswered_question_numbers[0]);
        }
        questionStartTimeRef.current = Date.now();
      })
      .catch(() => setError("Não foi possível carregar a sessão."))
      .finally(() => setLoading(false));
  }, [tokenResolved, token, sessionId]);

  // Load session on mount / when auth resolves.
  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  async function answer(position: number, selected: QuestionBankOption | null, commit = false) {
    if (!session) return;
    const currentItem = session.items.find((item) => item.position === position);
    if (!currentItem) return;
    const existingSelectedOption = currentItem.selected_option;
    const currentEliminated = currentItem.eliminated_options ?? [];
    if (selected && currentEliminated.includes(selected)) return;
    if (!commit && selected === existingSelectedOption) selected = null;
    setBusy(true);
    setError(null);
    const elapsedMs = Date.now() - questionStartTimeRef.current;
    const nextDoubtful = existingSelectedOption
      ? Boolean(currentItem.doubtful)
      : Boolean(preAnswerDoubtful[position]);
    const nextConfidence = existingSelectedOption
      ? currentItem.confidence_self_rating ?? confidenceRatings[position] ?? null
      : confidenceRatings[position] ?? null;
    try {
      const updated = await recordQuestionBankAttempt(token, session.session_id, position, {
        selected_option: selected,
        time_ms: elapsedMs,
        doubtful: nextDoubtful,
        confidence_self_rating: nextConfidence,
        eliminated_options: currentEliminated,
        commit,
      });
      const eventType: QuestionBankStudentEventType = selected === null
        ? "answer_cleared"
        : existingSelectedOption
          ? "answer_changed"
          : "answer_selected";
      const eventPayload: Record<string, unknown> = {
        selected_option: selected,
        time_ms: elapsedMs,
        doubtful: nextDoubtful,
        confidence_self_rating: nextConfidence,
        eliminated_options: currentEliminated,
        draft: !commit,
      };
      if (existingSelectedOption) {
        eventPayload.previous_selected_option = existingSelectedOption;
      } else {
        eventPayload.time_to_first_answer_ms = elapsedMs;
      }
      enqueueStudentEvent(position, eventType, eventPayload);
      setSession(updated);
    } catch (err) {
      setError(safeAttemptErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function toggleEliminate(position: number, option: QuestionBankOption) {
    if (!session) return;
    const item = session.items.find((candidate) => candidate.position === position);
    if (!item || item.answer_committed) return;
    const currentEliminated = item.eliminated_options ?? [];
    const wasEliminated = currentEliminated.includes(option);
    const nextEliminated = wasEliminated
      ? currentEliminated.filter((candidate) => candidate !== option)
      : [...currentEliminated, option];
    const nextSelected = !wasEliminated && item.selected_option === option
      ? null
      : item.selected_option;
    setBusy(true);
    setError(null);
    try {
      const updated = await recordQuestionBankAttempt(token, session.session_id, position, {
        selected_option: nextSelected,
        time_ms: Date.now() - questionStartTimeRef.current,
        doubtful: item.doubtful,
        confidence_self_rating: item.confidence_self_rating ?? confidenceRatings[position] ?? null,
        eliminated_options: nextEliminated,
        commit: false,
      });
      setSession(updated);
      enqueueStudentEvent(position, "option_eliminated", {
        option,
        eliminated: !wasEliminated,
        eliminated_options: nextEliminated,
        draft: true,
      });
      if (nextSelected === null && item.selected_option === option) {
        enqueueStudentEvent(position, "answer_cleared", {
          selected_option: null,
          previous_selected_option: option,
          reason: "option_eliminated",
          draft: true,
        });
      }
    } catch (err) {
      setError(safeAttemptErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function toggleDoubtful(position: number) {
    if (!session) return;
    const item = session.items.find((i) => i.position === position);
    if (!item) return;
    const currentEliminated = item.eliminated_options ?? [];
    if (!item.selected_option) {
      const nextDoubtful = !item.doubtful;
      setPreAnswerDoubtful((prev) => ({ ...prev, [position]: nextDoubtful }));
      try {
        const updated = await recordQuestionBankAttempt(token, session.session_id, position, {
          selected_option: null,
          doubtful: nextDoubtful,
          confidence_self_rating: confidenceRatings[position] ?? null,
          eliminated_options: currentEliminated,
          commit: false,
        });
        setSession(updated);
      } catch (err) {
        setError(safeAttemptErrorMessage(err));
      }
      enqueueStudentEvent(position, "doubt_marked", {
        value: nextDoubtful,
        phase: "pre_answer",
        draft: true,
      });
      return;
    }
    setBusy(true);
    try {
      const updated = await recordQuestionBankAttempt(token, session.session_id, position, {
        selected_option: item.selected_option,
        doubtful: !item.doubtful,
        confidence_self_rating: item.confidence_self_rating ?? confidenceRatings[position] ?? null,
        eliminated_options: currentEliminated,
        commit: false,
      });
      setSession(updated);
    } catch {
      // silently ignore
    } finally {
      setBusy(false);
    }
  }

  async function bookmarkQuestion(questionId: string, bookmarked: boolean, position: number) {
    if (!session) return;
    const previous = session;
    setSession({
      ...session,
      items: session.items.map((item) =>
        item.question_id === questionId ? { ...item, bookmarked } : item,
      ),
    });
    try {
      const out = await setQuestionBankBookmark(token, questionId, {
        bookmarked,
        session_id: session.session_id,
        position,
      });
      setSession((current) =>
        current
          ? {
              ...current,
              items: current.items.map((item) =>
                item.question_id === out.question_id
                  ? { ...item, bookmarked: out.bookmarked }
                  : item,
              ),
            }
          : current,
      );
    } catch (err) {
      setSession(previous);
      setError(err instanceof Error ? err.message : "Não foi possível salvar favorito.");
      throw err;
    }
  }

  function patchQuestionHighlights(questionId: string, updater: (highlights: QuestionTextHighlight[]) => QuestionTextHighlight[]) {
    setSession((current) =>
      current
        ? {
            ...current,
            items: current.items.map((item) =>
              item.question_id === questionId
                ? { ...item, text_highlights: updater(item.text_highlights ?? []) }
                : item,
            ),
          }
        : current,
    );
  }

  async function addTextHighlight(
    questionId: string,
    input: {
      target: QuestionTextHighlightTarget;
      option?: QuestionBankOption | null;
      kind: QuestionTextHighlightKind;
      selected_text: string;
      prefix: string;
      suffix: string;
      occurrence_index: number;
    },
  ) {
    if (!session) return;
    try {
      const highlight = await createQuestionTextHighlight(token, questionId, {
        ...input,
        session_id: session.session_id,
      });
      patchQuestionHighlights(questionId, (highlights) => [...highlights, highlight]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o grifo.");
      throw err;
    }
  }

  async function removeTextHighlight(questionId: string, highlightId: string) {
    try {
      await deleteQuestionTextHighlight(token, questionId, highlightId);
      patchQuestionHighlights(questionId, (highlights) =>
        highlights.filter((highlight) => highlight.highlight_id !== highlightId),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível limpar o grifo.");
      throw err;
    }
  }

  async function reflectPostAnswer(position: number, reflection: QuestionPostAnswerReflection) {
    if (!session) return;
    setReflectionBusyByPosition((prev) => ({ ...prev, [position]: true }));
    setError(null);
    try {
      const updated = await recordQuestionBankPostAnswerReflection(token, session.session_id, position, reflection);
      setSession(updated);
      enqueueStudentEvent(position, "confidence_marked", {
        phase: "post_answer",
        post_answer_reflection: reflection,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar a reflexão.");
    } finally {
      setReflectionBusyByPosition((prev) => ({ ...prev, [position]: false }));
    }
  }

  async function submitCorrection(position: number) {
    if (!session) return;
    const response = correctionDrafts[position]?.trim();
    const review = guidedReviews[position];
    const structuredResponses = Object.entries(guidedResponses[position] ?? {}).map(([checkpoint_key, response_value]) => ({
      checkpoint_key,
      response_value,
      free_text: response || null,
    }));
    if (!response && structuredResponses.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      if (review?.eligible && structuredResponses.length > 0) {
        const out = await submitQuestionBankGuidedReview(token, session.session_id, position, {
          event_id: newEventId("guided_checkpoint_answered", position),
          responses: structuredResponses,
          free_text: response || null,
        });
        setSession(out.session);
        enqueueStudentEvent(position, "correction_saved", {
          mode: "guided_review",
          checkpoint_count: structuredResponses.length,
          free_text_present: Boolean(response),
        });
      } else {
        const out = await recordQuestionBankCorrection(token, session.session_id, position, {
          prompt: "Qual foi o raciocínio correto e onde você errou?",
          response_value: response,
          confidence_delta: CORRECTION_CONFIDENCE_DELTA[correctionConfidence[position] ?? "medium"],
        });
        setSession(out.session);
        enqueueStudentEvent(position, "correction_saved", {
          mode: "free_text",
          free_text_present: true,
        });
      }
      setCorrectionDrafts((prev) => ({ ...prev, [position]: "" }));
      setGuidedResponses((prev) => ({ ...prev, [position]: {} }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar a correção guiada.");
    } finally {
      setBusy(false);
    }
  }

  async function finalize() {
    if (!session) return;
    // Exam-like + active + not revealed: capture pre-reveal confidence first.
    if (
      session.resolution_mode === "simulation" &&
      session.status === "active" &&
      !session.results_revealed_at
    ) {
      setConfidenceStepOpen(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const out = await finalizeQuestionBankSession(token, session.session_id, {
        confirm_unanswered: true,
        confirm_reported_items: true,
      });
      setFinalizeOut(out);
      setSession(out.session);
      void invalidateLearningQueries(queryClient);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível finalizar a sessão.");
    } finally {
      setBusy(false);
    }
  }

  // Submit first, then show the result. Confidence remains optional.
  async function proceedReveal() {
    if (!session) return;
    setConfidenceStepOpen(false);
    setBusy(true);
    setError(null);
    try {
      const out = await finalizeQuestionBankSession(token, session.session_id, {
        confirm_unanswered: true,
        confirm_reported_items: true,
      });
      setSession(out.session);
      setFinalizeOut(out);
      void invalidateLearningQueries(queryClient);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível corrigir a sessão.");
    } finally {
      setBusy(false);
    }
  }

  async function submitReport(questionId: string) {
    if (!session) return;
    const item = session.items.find((entry) => entry.question_id === questionId);
    if (!item) return;
    setBusy(true);
    try {
      const updated = await reportQuestionBankSessionItem(token, session.session_id, item.position, {
        report_type: reportType,
        report_reason: reportReason.trim() || undefined,
        report_context: {
          surface: "web_question_session",
          session_id: session.session_id,
          position: item.position,
          reported_after_reveal: Boolean(session.results_revealed_at),
          resolution_mode: session.resolution_mode,
          study_kind: session.study_kind,
        },
        student_snapshot: {
          selected_option: item.selected_option,
          answered: item.answered,
          doubtful: item.doubtful,
          confidence_self_rating: item.confidence_self_rating,
        },
      });
      setSession(updated);
      setReportDone((prev) => ({ ...prev, [questionId]: true }));
      setReportingQuestionId(null);
      setReportReason("");
    } catch {
      // user can retry without losing session
    } finally {
      setBusy(false);
    }
  }

  async function requestAiCorrection(questionId: string) {
    if (!tokenResolved || !questionId) return;
    setAiCorrectionRequesting((prev) => ({ ...prev, [questionId]: true }));
    setError(null);
    try {
      const result = await requestQuestionBankAICorrection(token, questionId, {
        sourcePage: "question_session",
      });
      setAiRequestStatusByQuestion((prev) => ({ ...prev, [questionId]: result }));
      setAiCorrectionRequested((prev) => ({ ...prev, [questionId]: true }));
      if (result.request_id) {
        const status = await getQuestionBankAiRequestStatus(token, questionId, result.request_id).catch(() => null);
        if (status) {
          setAiRequestStatusByQuestion((prev) => ({ ...prev, [questionId]: status }));
        }
      }
      await loadAiRequestPreview(questionId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível solicitar a IA canônica.";
      setError(message);
    } finally {
      setAiCorrectionRequesting((prev) => ({ ...prev, [questionId]: false }));
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (!tokenResolved || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper">
        <p className="text-sm text-muted">Carregando sessão…</p>
      </main>
    );
  }

  if (error && !session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper px-4 text-center">
        <p className="text-sm text-danger">{error}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => loadSession()}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primaryInk hover:opacity-90"
          >
            Tentar novamente
          </button>
          <button
            type="button"
            onClick={() => router.push("/banco")}
            className="rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-surfaceMuted"
          >
            Voltar ao banco
          </button>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper">
        <p className="text-sm text-muted">Sessão indisponível ou expirada.</p>
        <button
          type="button"
          onClick={() => router.push("/banco")}
          className="rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-surfaceMuted"
        >
          Voltar ao banco
        </button>
      </main>
    );
  }

  // Finalized or corrected-but-not-yet-accounted simulation: show post-exam review.
  if (session.status === "finalized" || session.results_revealed_at) {
    return (
      <PostExamReview
        session={session}
        finalizeOut={finalizeOut}
        busy={busy}
        onFinalize={() => void finalize()}
        onSessionChange={setSession}
      />
    );
  }

  const currentItem = session.items.find((i) => i.position === currentPosition) ?? session.items[0];
  if (!currentItem) return null;

  const total = session.total_questions;
  const sessionDisplayLabel = session.subtheme ?? session.theme ?? "Sessao";
  // The displayed "n/total" follows the stable `items` array instead of assuming
  // position IDs are contiguous (reported/excluded questions may create gaps).
  const currentIndex = session.items.findIndex((i) => i.position === currentPosition);
  const displayPosition = currentIndex >= 0 ? currentIndex + 1 : currentPosition;
  const primaryNode = currentItem.knowledge_nodes.find((node) => node.is_primary) ?? currentItem.knowledge_nodes[0];
  const quickNoteTheme = primaryNode?.node_name ?? sessionDisplayLabel ?? "Questão do banco";
  const quickNoteOutcome: OperationalQuestionOutcome | null =
    currentItem.is_correct === null ? null : currentItem.is_correct ? "correct" : "incorrect";
  const sessionKindLabel = session.study_kind === "full_exam" ? "Prova" : "Simulado";
  const examLabel = [sessionDisplayLabel, session.area].filter(Boolean).join(" · ") || "Sessao";

  function navigateTo(pos: number) {
    questionStartTimeRef.current = Date.now();
    const clamped = Math.max(1, Math.min(total, pos));
    setCurrentPosition(clamped);
    setShowMap(false);
  }

  // Navigate by the order of `session.items` (which the backend rerank rewrites
  // after each answer), not by numeric position. `position` is a stable id, so
  // walking position±1 would ignore the adaptive order entirely.
  function navigateToIndex(index: number) {
    if (!session) return;
    const items = session.items;
    const target = items[Math.max(0, Math.min(items.length - 1, index))];
    if (!target) return;
    questionStartTimeRef.current = Date.now();
    setCurrentPosition(target.position);
    setShowMap(false);
  }

  // Training: advance to the next unanswered question in adaptive (array) order.
  // After a rerank the unanswered items sit at the back sorted by priority, so
  // this lands on the most valuable next question.
  function goToNextAdaptive() {
    if (!session) return;
    const items = session.items;
    const start = items.findIndex((i) => i.position === currentPosition);
    for (let k = start + 1; k < items.length; k++) {
      if (!items[k].answered) return navigateToIndex(k);
    }
    const firstUnanswered = items.findIndex((i) => !i.answered);
    if (firstUnanswered >= 0) return navigateToIndex(firstUnanswered);
    if (start + 1 < items.length) navigateToIndex(start + 1);
  }

  function goToPrevAdaptive() {
    if (!session) return;
    const start = session.items.findIndex((i) => i.position === currentPosition);
    if (start > 0) navigateToIndex(start - 1);
  }

  // Non-blocking, dismissible error toast (replaces the old fixed red top banner).
  const errorToast = error ? (
    <div
      className="fixed inset-x-0 bottom-4 z-50 mx-auto w-full max-w-md px-4"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <Alert variant="danger" onDismiss={() => setError(null)} className="shadow-[var(--soft-shadow)]">
        {error}
      </Alert>
    </div>
  ) : null;

  // Items worth re-testing at the end of a training session: missed or hesitated.
  const fixacaoItems = session.items.filter((i) => i.answered && (i.is_correct === false || i.doubtful));

  // Training mode
  if (session.resolution_mode === "training") {
    if (showFixacao && fixacaoItems.length > 0) {
      return <FixacaoRound items={fixacaoItems} onExit={() => setShowFixacao(false)} />;
    }
    return (
      <>
        {errorToast}
        <FocusedQuestion
          item={currentItem}
          displayPosition={displayPosition}
          total={total}
          sessionStatus={session.status}
          sessionStartedAt={session.created_at}
          sessionLabel={sessionDisplayLabel}
          sessionKindLabel="Treino"
          flowKind="training"
          defaultPresentationMode="learning"
          canUseLearningFeedback
          canChangeAnswer
          revealed={Boolean(revealedPositions[currentPosition])}
          correctionDraft={correctionDrafts[currentPosition] ?? ""}
          guidedReview={guidedReviews[currentPosition] ?? null}
          guidedReviewError={Boolean(guidedReviewErrors[currentPosition])}
          guidedResponses={guidedResponses[currentPosition] ?? {}}
          correctionConfidenceLevel={correctionConfidence[currentPosition] ?? "medium"}
          eliminated={currentItem.eliminated_options ?? []}
          busy={busy}
          reportOpen={reportingQuestionId === currentItem.question_id}
          reportType={reportType}
          reportReason={reportReason}
          reportDone={Boolean(reportDone[currentItem.question_id])}
          onAnswer={(opt) => void answer(currentPosition, opt)}
          onReveal={() => revealAnswer(currentPosition)}
          onCorrectionChange={(v) => setCorrectionDrafts((prev) => ({ ...prev, [currentPosition]: v }))}
          onGuidedResponseChange={(checkpointKey, value) =>
            setGuidedResponses((prev) => ({
              ...prev,
              [currentPosition]: {
                ...(prev[currentPosition] ?? {}),
                [checkpointKey]: value,
              },
            }))
          }
          onCorrectionConfidenceChange={(v) => setCorrectionConfidence((prev) => ({ ...prev, [currentPosition]: v }))}
          onSubmitCorrection={() => void submitCorrection(currentPosition)}
          onToggleEliminate={(opt) => toggleEliminate(currentPosition, opt)}
          onToggleDoubtful={() => void toggleDoubtful(currentPosition)}
          onToggleReport={() =>
            setReportingQuestionId((prev) =>
              prev === currentItem.question_id ? null : currentItem.question_id,
            )
          }
          onReportTypeChange={setReportType}
          onReportReasonChange={setReportReason}
          onSubmitReport={() => void submitReport(currentItem.question_id)}
          onCancelReport={() => setReportingQuestionId(null)}
          onOpenMap={() => setShowMap(true)}
          canPrev={currentIndex > 0}
          canNext={currentIndex >= 0 && currentIndex < session.items.length - 1}
          onPrev={() => goToPrevAdaptive()}
          onNext={() => goToNextAdaptive()}
          onFinalize={() => void finalize()}
          onExit={() => router.push("/banco")}
          bookmarked={Boolean(currentItem.bookmarked)}
          onBookmarkChange={(bookmarked) =>
            bookmarkQuestion(currentItem.question_id, bookmarked, currentPosition)
          }
          onCreateHighlight={(input) => addTextHighlight(currentItem.question_id, input)}
          onDeleteHighlight={(highlightId) => removeTextHighlight(currentItem.question_id, highlightId)}
          onReflect={(reflection) => void reflectPostAnswer(currentPosition, reflection)}
          reflectionBusy={Boolean(reflectionBusyByPosition[currentPosition])}
          finalizeLabel="Finalizar"
          fixacaoCount={fixacaoItems.length}
          onFixar={() => setShowFixacao(true)}
          onQuickNote={
            currentItem.question_id
              ? () => {
                  const selected = currentItem.selected_option;
                  const errorHypothesis =
                    selected && currentItem.is_correct === false
                      ? (currentItem.distractor_diagnosis?.[selected]?.trim() || null)
                      : null;
                  setQuickNoteTarget({
                    questionId: currentItem.question_id,
                    area: session.area,
                    theme: quickNoteTheme,
                    questionOutcome: quickNoteOutcome,
                    selectedOption: selected,
                    correctAnswer: currentItem.correct_answer,
                    errorHypothesis,
                    highlightContext: currentItem.text_highlights ?? [],
                  });
                }
              : undefined
          }
          onShowHistory={
            currentItem.question_id
              ? () => setHistoryQuestionId(currentItem.question_id)
              : undefined
          }
          onRequestAiCorrection={
            currentItem.question_id
              ? () => void requestAiCorrection(currentItem.question_id)
              : undefined
          }
          learningPackagePanel={
            revealedPositions[currentPosition] && currentItem.question_id
              ? <LearningPackagePanel
                  key={`${session.session_id}:${currentPosition}`}
                  token={token}
                  sessionId={session.session_id}
                  position={currentPosition}
                />
              : null
          }
        />
        {quickNoteTarget && (
          <QuickNoteModal
            key={quickNoteTarget.questionId}
            questionId={quickNoteTarget.questionId}
            defaultArea={quickNoteTarget.area}
            defaultTheme={quickNoteTarget.theme}
            questionOutcome={quickNoteTarget.questionOutcome}
            selectedOption={quickNoteTarget.selectedOption}
            correctAnswer={quickNoteTarget.correctAnswer}
            errorHypothesis={quickNoteTarget.errorHypothesis}
            highlightContext={quickNoteTarget.highlightContext}
            onClose={() => setQuickNoteTarget(null)}
          />
        )}
        {historyQuestionId && (
          <AttemptHistoryModal
            key={historyQuestionId}
            questionId={historyQuestionId}
            onClose={() => setHistoryQuestionId(null)}
          />
        )}
        {showMap && (
          <>
            <div
              className="fixed inset-0 z-20 bg-ink/20"
              onClick={() => setShowMap(false)}
              aria-hidden="true"
            />
            <ExamMap
              items={session.items}
              sessionKindLabel="Treino"
              currentPosition={currentPosition}
              onNavigateTo={navigateTo}
              onClose={() => setShowMap(false)}
            />
          </>
        )}
      </>
    );
  }

  // Simulation mode
  return (
    <>
      {errorToast}
      {confidenceStepOpen && (
        <ConfidenceReviewStep
          sessionId={session.session_id}
          session={session}
          onProceed={() => void proceedReveal()}
        />
      )}
      <FocusedQuestion
        item={currentItem}
        displayPosition={currentPosition}
        total={total}
        sessionStatus={session.status}
        sessionStartedAt={session.created_at}
        sessionLabel={examLabel}
        sessionKindLabel={sessionKindLabel}
        flowKind="simulation"
        defaultPresentationMode="exam"
        canUseLearningFeedback={false}
        canChangeAnswer
        revealed={false}
        correctionDraft=""
        guidedReview={null}
        guidedResponses={{}}
        correctionConfidenceLevel="medium"
        busy={busy}
        reportOpen={false}
        reportType={reportType}
        reportReason={reportReason}
        reportDone={false}
        eliminated={currentItem.eliminated_options ?? []}
        onAnswer={(opt) => void answer(currentPosition, opt)}
        onReveal={() => undefined}
        onCorrectionChange={() => undefined}
        onGuidedResponseChange={() => undefined}
        onCorrectionConfidenceChange={() => undefined}
        onSubmitCorrection={() => undefined}
        onToggleEliminate={(opt) => toggleEliminate(currentPosition, opt)}
        onToggleDoubtful={() => void toggleDoubtful(currentPosition)}
        onToggleReport={() => undefined}
        onReportTypeChange={setReportType}
        onReportReasonChange={setReportReason}
        onSubmitReport={() => undefined}
        onCancelReport={() => undefined}
        onOpenMap={() => setShowMap(true)}
        canPrev={currentPosition > 1}
        canNext={currentPosition < total}
        onPrev={() => navigateTo(currentPosition - 1)}
        onNext={() => navigateTo(currentPosition + 1)}
        onFinalize={() => void finalize()}
        onExit={() => setSimExitConfirmOpen(true)}
        bookmarked={Boolean(currentItem.bookmarked)}
        onBookmarkChange={(bookmarked) =>
          bookmarkQuestion(currentItem.question_id, bookmarked, currentPosition)
        }
        onCreateHighlight={(input) => addTextHighlight(currentItem.question_id, input)}
        onDeleteHighlight={(highlightId) => removeTextHighlight(currentItem.question_id, highlightId)}
        finalizeLabel={`Corrigir ${sessionKindLabel.toLowerCase()}`}
      />
      <ConfirmDialog
        open={simExitConfirmOpen}
        title="Sair do simulado?"
        message="Ele fica salvo — você pode retomar quando quiser em Questões ou no Histórico."
        cancelLabel="Continuar simulado"
        confirmLabel="Sair"
        onCancel={() => setSimExitConfirmOpen(false)}
        onConfirm={() => {
          setSimExitConfirmOpen(false);
          router.push("/banco");
        }}
      />
      {showMap && (
        <>
          <div
            className="fixed inset-0 z-20 bg-ink/20"
            onClick={() => setShowMap(false)}
            aria-hidden="true"
          />
          <ExamMap
            items={session.items}
            sessionKindLabel={sessionKindLabel}
            currentPosition={currentPosition}
            onNavigateTo={navigateTo}
            onClose={() => setShowMap(false)}
          />
        </>
      )}
    </>
  );
}
