import { api, authHeader } from "../../shared/http";
import type { QuestionBankBoard } from "./types";

// Available exam boards (bancas) with question counts, used to power the source
// filter picker. Stable reference data — client-cached via the default policy
// for /api/question-bank/boards (see shared/http.ts).
export async function listQuestionBankBoards(token: string): Promise<QuestionBankBoard[]> {
  return api<QuestionBankBoard[]>("/api/question-bank/boards", {
    headers: authHeader(token),
  });
}
