"use client";

import { useEffect, useMemo, useState } from "react";
import {
  api,
  authHeader,
  getSessionCorrections,
  reportQuestionBankSessionItem,
  setQuestionBankSessionItemExclusion,
  type QuestionBankCorrectionItem,
  type QuestionBankReportType,
  type QuestionBankSession,
  type QuestionBankSessionItem,
} from "@/lib/api";
import { useAuthToken } from "@/lib/useAuthToken";
import type { SessionDiagnosis } from "./types";

type UsePostExamReviewDataParams = {
  session: QuestionBankSession;
  activeReview: boolean;
  onSessionChange?: (session: QuestionBankSession) => void;
};

export function usePostExamReviewData({
  session,
  activeReview,
  onSessionChange,
}: UsePostExamReviewDataParams) {
  const { token } = useAuthToken();
  const [diagnosis, setDiagnosis] = useState<SessionDiagnosis | null>(null);
  const [diagnosisError, setDiagnosisError] = useState(false);
  const [corrections, setCorrections] = useState<QuestionBankCorrectionItem[]>([]);
  const [expandedCorrections, setExpandedCorrections] = useState<Set<string>>(new Set());
  const [historyQuestionId, setHistoryQuestionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [localBusy, setLocalBusy] = useState(false);
  const [reportingPosition, setReportingPosition] = useState<number | null>(null);
  const [reportType, setReportType] = useState<QuestionBankReportType>("wrong_answer");
  const [reportReason, setReportReason] = useState("");

  useEffect(() => {
    if (!token || !session.session_id) return;
    setDiagnosisError(false);
    api<SessionDiagnosis>(
      `/api/question-bank/sessions/${encodeURIComponent(session.session_id)}/diagnosis`,
      { headers: authHeader(token) },
    )
      .then(setDiagnosis)
      .catch(() => setDiagnosisError(true));
  }, [token, session.session_id]);

  useEffect(() => {
    if (!token || !session.session_id) return;
    getSessionCorrections(token, session.session_id)
      .then(setCorrections)
      .catch(() => {});
  }, [token, session.session_id]);

  const correctionByQuestionId = useMemo(
    () => new Map(corrections.map((correction) => [correction.question_id, correction])),
    [corrections],
  );

  async function submitSessionReport(item: QuestionBankSessionItem) {
    if (!token) return;
    setLocalBusy(true);
    setActionError(null);
    try {
      const updated = await reportQuestionBankSessionItem(token, session.session_id, item.position, {
        report_type: reportType,
        report_reason: reportReason.trim() || undefined,
        report_context: {
          surface: "web_post_exam_review",
          session_id: session.session_id,
          position: item.position,
          active_review: activeReview,
          reported_after_reveal: Boolean(session.results_revealed_at),
          resolution_mode: session.resolution_mode,
          study_kind: session.study_kind,
          session_status: session.status,
        },
        student_snapshot: {
          selected_option: item.selected_option,
          answered: item.answered,
          doubtful: item.doubtful,
          confidence_self_rating: item.confidence_self_rating,
          is_correct: item.is_correct,
          correct_answer_visible: true,
        },
      });
      onSessionChange?.(updated);
      setReportingPosition(null);
      setReportReason("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Nao foi possivel denunciar a questao.");
    } finally {
      setLocalBusy(false);
    }
  }

  async function toggleExclusion(item: QuestionBankSessionItem) {
    if (!token || !activeReview || !item.reported_problem) return;
    setLocalBusy(true);
    setActionError(null);
    try {
      const updated = await setQuestionBankSessionItemExclusion(
        token,
        session.session_id,
        item.position,
        {
          excluded: !item.excluded_from_scoring,
          exclusion_reason: "reported_quality_issue",
        },
      );
      onSessionChange?.(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Nao foi possivel atualizar o descarte.");
    } finally {
      setLocalBusy(false);
    }
  }

  return {
    token,
    diagnosis,
    diagnosisError,
    corrections,
    correctionByQuestionId,
    expandedCorrections,
    setExpandedCorrections,
    historyQuestionId,
    setHistoryQuestionId,
    actionError,
    localBusy,
    reportingPosition,
    setReportingPosition,
    reportType,
    setReportType,
    reportReason,
    setReportReason,
    submitSessionReport,
    toggleExclusion,
  };
}
