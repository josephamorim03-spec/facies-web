import { api, authHeader } from "../../shared/http";
import type { QuestionBankSourceOption, QuestionBankYearStat } from "./types";

export async function listQuestionBankSources(token: string): Promise<QuestionBankSourceOption[]> {
  return api<QuestionBankSourceOption[]>("/api/question-bank/sources", {
    headers: authHeader(token),
  });
}

export async function listQuestionBankYears(token: string): Promise<QuestionBankYearStat[]> {
  return api<QuestionBankYearStat[]>("/api/question-bank/years", {
    headers: authHeader(token),
  });
}
