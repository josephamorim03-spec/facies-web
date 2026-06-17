"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  finalizeQuestionBankSession,
  getQuestionBankSession,
  recordQuestionBankAttempt,
  recordQuestionBankCorrection,
  reportQuestionProblem,
  type OperationalQuestionOutcome,
  type QuestionBankFinalizeResult,
  type QuestionBankOption,
  type QuestionBankReportType,
  type QuestionBankSession,
} from "@/lib/api";
import { useAuthToken } from "@/lib/useAuthToken";
import StudyQuestion from "./_components/StudyQuestion";
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

  // Reveal state (training mode)
  const [revealedPositions, setRevealedPositions] = useState<Record<number, boolean>>({});
  const [correctionDrafts, setCorrectionDrafts] = useState<Record<number, string>>({});
  const [confidenceRatings, setConfidenceRatings] = useState<Record<number, number | null>>({});
  const [preAnswerDoubtful, setPreAnswerDoubtful] = useState<Record<number, boolean>>({});
  const [correctionConfidence, setCorrectionConfidence] = useState<Record<number, CorrectionConfidenceLevel>>({});

  // Report state
  const [reportingQuestionId, setReportingQuestionId] = useState<string | null>(null);
  const [reportType, setReportType] = useState<QuestionBankReportType>("error");
  const [reportReason, setReportReason] = useState("");
  const [reportDone, setReportDone] = useState<Record<string, boolean>>({});
  const [quickNoteTarget, setQuickNoteTarget] = useState<QuickNoteTarget | null>(null);
  const [historyQuestionId, setHistoryQuestionId] = useState<string | null>(null);

  // Track per-question start time so we can send time_ms to the backend
  const questionStartTimeRef = useRef<number>(Date.now());

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
    setBusy(true);
    setError(null);
    try {
      const updated = await recordQuestionBankAttempt(token, session.session_id, position, {
        selected_option: selected,
        time_ms: Date.now() - questionStartTimeRef.current,
        doubtful: Boolean(preAnswerDoubtful[position]),
        confidence_self_rating: confidenceRatings[position] ?? null,
      });
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
    if (!response) return;
    setBusy(true);
    setError(null);
    try {
      const out = await recordQuestionBankCorrection(token, session.session_id, position, {
        prompt: "Qual foi o raciocínio correto e onde você errou?",
        response_value: response,
        confidence_delta: CORRECTION_CONFIDENCE_DELTA[correctionConfidence[position] ?? "medium"],
      });
      setSession(out.session);
      setCorrectionDrafts((prev) => ({ ...prev, [position]: "" }));
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
      const out = await finalizeQuestionBankSession(token, session.session_id, { confirm_unanswered: true });
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

  // Finalized: show post-exam review
  if (session.status === "finalized") {
    return <PostExamReview session={session} finalizeOut={finalizeOut} />;
  }

  const currentItem = session.items.find((i) => i.position === currentPosition) ?? session.items[0];
  if (!currentItem) return null;

  const total = session.total_questions;
  const primaryNode = currentItem.knowledge_nodes.find((node) => node.is_primary) ?? currentItem.knowledge_nodes[0];
  const quickNoteTheme = primaryNode?.node_name ?? session.theme ?? "Questão do banco";
  const quickNoteOutcome: OperationalQuestionOutcome | null =
    currentItem.is_correct === null ? null : currentItem.is_correct ? "correct" : "incorrect";
  const examLabel = [session.theme, session.area].filter(Boolean).join(" · ") || "Sessão";

  function navigateTo(pos: number) {
    questionStartTimeRef.current = Date.now();
    const clamped = Math.max(1, Math.min(total, pos));
    setCurrentPosition(clamped);
    setShowMap(false);
  }

  // Training mode
  if (session.resolution_mode === "training") {
    return (
      <>
        {error && (
          <div className="fixed left-0 right-0 top-0 z-50 bg-danger px-4 py-2 text-center text-xs font-semibold text-white">
            {error}
          </div>
        )}
        <StudyQuestion
          item={currentItem}
          position={currentPosition}
          total={total}
          sessionStatus={session.status}
          revealed={Boolean(revealedPositions[currentPosition])}
          correctionDraft={correctionDrafts[currentPosition] ?? ""}
          confidenceRating={confidenceRatings[currentPosition] ?? currentItem.confidence_self_rating ?? null}
          doubtfulDraft={preAnswerDoubtful[currentPosition] ?? currentItem.doubtful}
          correctionConfidenceLevel={correctionConfidence[currentPosition] ?? "medium"}
          busy={busy}
          reportOpen={reportingQuestionId === currentItem.question_id}
          reportType={reportType}
          reportReason={reportReason}
          reportDone={Boolean(reportDone[currentItem.question_id])}
          onAnswer={(opt) => void answer(currentPosition, opt)}
          onReveal={() => setRevealedPositions((prev) => ({ ...prev, [currentPosition]: true }))}
          onCorrectionChange={(v) => setCorrectionDrafts((prev) => ({ ...prev, [currentPosition]: v }))}
          onConfidenceRatingChange={(v) => setConfidenceRatings((prev) => ({ ...prev, [currentPosition]: v }))}
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
          onPrev={() => navigateTo(currentPosition - 1)}
          onNext={() => navigateTo(currentPosition + 1)}
          onFinalize={() => void finalize()}
          onQuickNote={
            currentItem.question_id
              ? () =>
                  setQuickNoteTarget({
                    questionId: currentItem.question_id,
                    area: session.area,
                    theme: quickNoteTheme,
                    questionOutcome: quickNoteOutcome,
                  })
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
      {error && (
        <div className="fixed left-0 right-0 top-0 z-50 bg-danger px-4 py-2 text-center text-xs font-semibold text-white">
          {error}
        </div>
      )}
      <ExamQuestion
        item={currentItem}
        position={currentPosition}
        total={total}
        sessionStatus={session.status}
        sessionStartedAt={session.created_at}
        examLabel={examLabel}
        busy={busy}
        onAnswer={(opt) => void answer(currentPosition, opt)}
        onToggleDoubtful={() => void toggleDoubtful(currentPosition)}
        onPrev={() => navigateTo(currentPosition - 1)}
        onNext={() => navigateTo(currentPosition + 1)}
        onOpenMap={() => setShowMap(true)}
        onFinalize={() => void finalize()}
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
            currentPosition={currentPosition}
            onNavigateTo={navigateTo}
            onClose={() => setShowMap(false)}
          />
        </>
      )}
    </>
  );
}
