import { api, authHeader } from "../../shared/http";
import type {
  QuestionBankCorrectionItem,
  QuestionBankReportType,
  QuestionBankSession,
} from "./types";

export async function getSessionCorrections(
  token: string,
  sessionId: string,
): Promise<QuestionBankCorrectionItem[]> {
  return api<QuestionBankCorrectionItem[]>(
    `/api/question-bank/sessions/${encodeURIComponent(sessionId)}/corrections`,
    { headers: authHeader(token) },
  );
}

export async function reportQuestionBankSessionItem(
  token: string,
  sessionId: string,
  position: number,
  payload: { report_type?: QuestionBankReportType; report_reason?: string },
): Promise<QuestionBankSession> {
  return api<QuestionBankSession>(
    `/api/question-bank/sessions/${encodeURIComponent(sessionId)}/items/${position}/report`,
    { method: "POST", headers: authHeader(token), body: JSON.stringify(payload) },
  );
}

export async function setQuestionBankSessionItemExclusion(
  token: string,
  sessionId: string,
  position: number,
  payload: { excluded: boolean; exclusion_reason?: string; exclusion_note?: string | null },
): Promise<QuestionBankSession> {
  return api<QuestionBankSession>(
    `/api/question-bank/sessions/${encodeURIComponent(sessionId)}/items/${position}/exclusion`,
    { method: "PUT", headers: authHeader(token), body: JSON.stringify(payload) },
  );
}

export async function reportQuestionProblem(
  token: string,
  questionId: string,
  payload: { report_type?: QuestionBankReportType; report_reason?: string },
): Promise<{ result?: string; question_id?: string; open_reports?: number; flagged?: boolean }> {
  return api<{ result?: string; question_id?: string; open_reports?: number; flagged?: boolean }>(
    `/api/question-bank/questions/${encodeURIComponent(questionId)}/report`,
    { method: "POST", headers: authHeader(token), body: JSON.stringify(payload) },
  );
}
