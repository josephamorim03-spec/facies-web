import { api, authHeader } from "../../shared/http";
import type {
  QuestionBankLearningInsight,
  QuestionBankLearnerModel,
  QuestionBankLongitudinalDiagnosis,
  QuestionBankNextAction,
  QuestionBankPerformance,
  QuestionBankReviewQueue,
} from "./types";

export async function getQuestionBankLongitudinalDiagnosis(token: string): Promise<QuestionBankLongitudinalDiagnosis> {
  return api<QuestionBankLongitudinalDiagnosis>("/api/question-bank/diagnosis/longitudinal", { headers: authHeader(token) });
}

export async function getQuestionBankLearnerModel(token: string): Promise<QuestionBankLearnerModel> {
  return api<QuestionBankLearnerModel>("/api/question-bank/learner-model", { headers: authHeader(token) });
}

export async function getQuestionBankLearningInsights(token: string): Promise<QuestionBankLearningInsight[]> {
  return api<QuestionBankLearningInsight[]>("/api/question-bank/learning-insights", { headers: authHeader(token) });
}

export async function getQuestionBankReviewQueue(
  token: string,
): Promise<QuestionBankReviewQueue> {
  return api<QuestionBankReviewQueue>("/api/question-bank/review-queue", {
    headers: authHeader(token),
  });
}

export async function getQuestionBankNextAction(
  token: string,
): Promise<QuestionBankNextAction> {
  return api<QuestionBankNextAction>("/api/question-bank/next-action", {
    headers: authHeader(token),
  });
}

export async function getQuestionBankPerformance(
  token: string,
): Promise<QuestionBankPerformance> {
  return api<QuestionBankPerformance>("/api/question-bank/performance", {
    headers: authHeader(token),
  });
}
