import { api, authHeader } from "../../shared/http";
import type {
  QuestionBankExamDebrief,
  QuestionBankLongitudinalDiagnosis,
  QuestionBankPerformance,
} from "./types";

export async function getQuestionBankExamDebrief(
  token: string,
  sessionId: string,
): Promise<QuestionBankExamDebrief> {
  return api<QuestionBankExamDebrief>(
    `/api/question-bank/sessions/${encodeURIComponent(sessionId)}/exam-debrief`,
    { headers: authHeader(token) },
  );
}

export async function getQuestionBankLongitudinalDiagnosis(token: string): Promise<QuestionBankLongitudinalDiagnosis> {
  return api<QuestionBankLongitudinalDiagnosis>("/api/question-bank/diagnosis/longitudinal", { headers: authHeader(token) });
}

export async function getQuestionBankPerformance(
  token: string,
): Promise<QuestionBankPerformance> {
  return api<QuestionBankPerformance>("/api/question-bank/performance", {
    headers: authHeader(token),
  });
}
