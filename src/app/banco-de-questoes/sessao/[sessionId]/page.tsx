"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  finalizeQuestionBankSession,
  getQuestionBankGuidedReview,
  getQuestionBankSession,
  recordQuestionBankAttempt,
  recordQuestionBankCorrection,
  recordQuestionBankEvents,
  revealQuestionBankSessionResults,
  reportQuestionProblem,
  submitQuestionBankGuidedReview,
  type OperationalQuestionOutcome,
  type QuestionBankFinalizeResult,
  type QuestionBankGuidedReview,
  type QuestionBankGuidedReviewValue,
  type QuestionBankOption,
  type QuestionBankReportType,
  type QuestionBankSession,
  type QuestionBankStudentEventPayload,
  type QuestionBankStudentEventType,
} from "@/lib/api";
import { useAuthToken } from "@/lib/useAuthToken";
import { Alert } from "@/components/ui/Alert";
import StudyQuestion from "./_components/StudyQuestion";
import FixacaoRound from "./_components/FixacaoRound";
import QuickNoteModal from "./_components/QuickNoteModal";
import ExamQuestion from "./_components/ExamQuestion";
import ExamMap from "./_components/ExamMap";
import PostExamReview from "./_components/PostExamReview";
import AttemptHistoryModal from "../../_components/AttemptHistoryModal";

type QuickNoteTarget = {
  questionId: string;
  area: string | null;
  theme: string | null;
  questionOutcome: OperationalQuestionOutcome | null;
  selectedOption: QuestionBankOption | null;
  correctAnswer: QuestionBankOption | null;
  errorHypothesis: string | null;
};

type CorrectionConfidenceLevel = "low" | "medium" | "high";

const CORRECTION_CONFIDENCE_DELTA: Record<CorrectionConfidenceLevel, number> = {
  low: 0.15,
  medium: 0.35,
  high: 0.6,
};

export default function SessionPage() {
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

  // Client-side alternative elimination ("cortar") — a visual study aid, per position.
  // Never sent to the backend; does not affect the recorded attempt or FSRS.
  const [eliminatedOptions, setEliminatedOptions] = useState<Record<number, QuestionBankOption[]>>({});

  // Optional end-of-training retrieval round over the missed items (ungraded).
  const [showFixacao, setShowFixacao] = useState(false);

  function toggleEliminate(position: number, option: QuestionBankOption) {
    setEliminatedOptions((prev) => {
      const current = prev[position] ?? [];
      const next = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option];
      enqueueStudentEvent(position, "option_eliminated", {
        option,
        eliminated: next.includes(option),
        eliminated_options: next,
      });
      return { ...prev, [position]: next };
    });
  }

  async function loadGuidedReview(position: number) {
    if (!session) return;
    try {
      const review = await getQuestionBankGuidedReview(token, session.session_id, position);
      setGuidedReviews((prev) => ({ ...prev, [position]: review }));
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
      // Keep the classic free-text correction available if checkpoints fail.
    }
  }

  function revealAnswer(position: number) {
    setRevealedPositions((prev) => ({ ...prev, [position]: true }));
    enqueueStudentEvent(position, "answer_revealed", {
      elapsed_ms: Date.now() - questionStartTimeRef.current,
    });
    void loadGuidedReview(position);
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
  const [guidedResponses, setGuidedResponses] = useState<Record<number, Record<string, QuestionBankGuidedReviewValue>>>({});

  // Report state
  const [reportingQuestionId, setReportingQuestionId] = useState<string | null>(null);
  const [reportType, setReportType] = useState<QuestionBankReportType>("error");
  const [reportReason, setReportReason] = useState("");
  const [reportDone, setReportDone] = useState<Record<string, boolean>>({});
  const [quickNoteTarget, setQuickNoteTarget] = useState<QuickNoteTarget | null>(null);
  const [historyQuestionId, setHistoryQuestionId] = useState<string | null>(null);

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

  // Load session on mount
  useEffect(() => {
    if (!tokenResolved || !sessionId) return;
    setLoading(true);
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

  // ─── Handlers ────────────────────────────────────────────────────────────

  async function answer(position: number, selected: QuestionBankOption) {
    if (!session) return;
    const currentItem = session.items.find((item) => item.position === position);
    if (!currentItem) return;
    const existingSelectedOption = currentItem.selected_option;
    if (currentItem.answered && existingSelectedOption === selected) return;
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
      });
      const eventType: QuestionBankStudentEventType = existingSelectedOption
        ? "answer_changed"
        : "answer_selected";
      const eventPayload: Record<string, unknown> = {
        selected_option: selected,
        time_ms: elapsedMs,
        doubtful: nextDoubtful,
        confidence_self_rating: nextConfidence,
        eliminated_options: eliminatedOptions[position] ?? [],
      };
      if (existingSelectedOption) {
        eventPayload.previous_selected_option = existingSelectedOption;
      } else {
        eventPayload.time_to_first_answer_ms = elapsedMs;
      }
      enqueueStudentEvent(position, eventType, eventPayload);
      setSession(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível registrar a resposta.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleDoubtful(position: number) {
    if (!session) return;
    const item = session.items.find((i) => i.position === position);
    if (!item) return;
    if (!item.selected_option) {
      setPreAnswerDoubtful((prev) => ({ ...prev, [position]: !Boolean(prev[position]) }));
      enqueueStudentEvent(position, "doubt_marked", {
        value: !Boolean(preAnswerDoubtful[position]),
        phase: "pre_answer",
      });
      return;
    }
    setBusy(true);
    try {
      const updated = await recordQuestionBankAttempt(token, session.session_id, position, {
        selected_option: item.selected_option,
        doubtful: !item.doubtful,
        confidence_self_rating: item.confidence_self_rating ?? confidenceRatings[position] ?? null,
      });
      setSession(updated);
    } catch {
      // silently ignore
    } finally {
      setBusy(false);
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
    setBusy(true);
    setError(null);
    try {
      if (
        session.resolution_mode === "simulation" &&
        session.status === "active" &&
        !session.results_revealed_at
      ) {
        const updated = await revealQuestionBankSessionResults(token, session.session_id);
        setSession(updated);
        setFinalizeOut(null);
        return;
      }
      const out = await finalizeQuestionBankSession(token, session.session_id, {
        confirm_unanswered: true,
        confirm_reported_items: true,
      });
      setFinalizeOut(out);
      setSession(out.session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível finalizar a sessão.");
    } finally {
      setBusy(false);
    }
  }

  async function submitReport(questionId: string) {
    setBusy(true);
    try {
      await reportQuestionProblem(token, questionId, {
        report_type: reportType,
        report_reason: reportReason.trim() || undefined,
      });
      setReportDone((prev) => ({ ...prev, [questionId]: true }));
      setReportingQuestionId(null);
      setReportReason("");
    } catch {
      // user can retry without losing session
    } finally {
      setBusy(false);
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
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper">
        <p className="text-sm text-danger">{error}</p>
        <button
          type="button"
          onClick={() => router.push("/banco-de-questoes")}
          className="rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-surfaceMuted"
        >
          Voltar ao banco
        </button>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper">
        <p className="text-sm text-muted">Sessão indisponível ou expirada.</p>
        <button
          type="button"
          onClick={() => router.push("/banco-de-questoes")}
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
  // The displayed "n/total" + progress must track movement through the (possibly
  // reranked) `items` array, not the stable `position` id — otherwise the counter
  // and progress bar jump around as the adaptive order changes.
  const currentIndex = session.items.findIndex((i) => i.position === currentPosition);
  const displayPosition = currentIndex >= 0 ? currentIndex + 1 : currentPosition;
  const primaryNode = currentItem.knowledge_nodes.find((node) => node.is_primary) ?? currentItem.knowledge_nodes[0];
  const quickNoteTheme = primaryNode?.node_name ?? session.theme ?? "Questão do banco";
  const quickNoteOutcome: OperationalQuestionOutcome | null =
    currentItem.is_correct === null ? null : currentItem.is_correct ? "correct" : "incorrect";
  const sessionKindLabel = session.study_kind === "full_exam" ? "Prova" : "Simulado";
  const examLabel = [session.theme, session.area].filter(Boolean).join(" · ") || "Sessão";

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
        <StudyQuestion
          fixacaoCount={fixacaoItems.length}
          onFixar={() => setShowFixacao(true)}
          item={currentItem}
          position={displayPosition}
          total={total}
          sessionStatus={session.status}
          revealed={Boolean(revealedPositions[currentPosition])}
          correctionDraft={correctionDrafts[currentPosition] ?? ""}
          guidedReview={guidedReviews[currentPosition] ?? null}
          guidedResponses={guidedResponses[currentPosition] ?? {}}
          confidenceRating={confidenceRatings[currentPosition] ?? currentItem.confidence_self_rating ?? null}
          doubtfulDraft={preAnswerDoubtful[currentPosition] ?? currentItem.doubtful}
          correctionConfidenceLevel={correctionConfidence[currentPosition] ?? "medium"}
          eliminated={eliminatedOptions[currentPosition] ?? []}
          onToggleEliminate={(opt) => toggleEliminate(currentPosition, opt)}
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
          onConfidenceRatingChange={(v) => changeConfidenceRating(currentPosition, v)}
          onToggleDoubtful={() => void toggleDoubtful(currentPosition)}
          onCorrectionConfidenceChange={(v) => setCorrectionConfidence((prev) => ({ ...prev, [currentPosition]: v }))}
          onSubmitCorrection={() => void submitCorrection(currentPosition)}
          onToggleReport={() =>
            setReportingQuestionId((prev) =>
              prev === currentItem.question_id ? null : currentItem.question_id,
            )
          }
          onReportTypeChange={setReportType}
          onReportReasonChange={setReportReason}
          onSubmitReport={() => void submitReport(currentItem.question_id)}
          onCancelReport={() => setReportingQuestionId(null)}
          onPrev={() => goToPrevAdaptive()}
          onNext={() => goToNextAdaptive()}
          onFinalize={() => void finalize()}
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
                  });
                }
              : undefined
          }
          onShowHistory={
            currentItem.question_id
              ? () => setHistoryQuestionId(currentItem.question_id)
              : undefined
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
      </>
    );
  }

  // Simulation mode
  return (
    <>
      {errorToast}
      <ExamQuestion
        item={currentItem}
        position={currentPosition}
        total={total}
        sessionStatus={session.status}
        sessionStartedAt={session.created_at}
        examLabel={examLabel}
        sessionKindLabel={sessionKindLabel}
        answeredCount={session.answered_count}
        doubtfulCount={session.doubtful_count}
        unansweredCount={session.unanswered_count}
        busy={busy}
        eliminated={eliminatedOptions[currentPosition] ?? []}
        onToggleEliminate={(opt) => toggleEliminate(currentPosition, opt)}
        onAnswer={(opt) => void answer(currentPosition, opt)}
        onToggleDoubtful={() => void toggleDoubtful(currentPosition)}
        onPrev={() => navigateTo(currentPosition - 1)}
        onNext={() => navigateTo(currentPosition + 1)}
        onOpenMap={() => setShowMap(true)}
        onFinalize={() => void finalize()}
        finalizeLabel={`Corrigir ${sessionKindLabel.toLowerCase()}`}
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
