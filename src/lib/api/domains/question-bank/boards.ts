import { api, authHeader } from "../../shared/http";
import type { QuestionBankBoard, QuestionBankInstitution } from "./types";

// Available exam boards (bancas) with question counts, used to power the source
// filter picker. Stable reference data — client-cached via the default policy
// for /api/question-bank/boards (see shared/http.ts).
export async function listQuestionBankBoards(token: string): Promise<QuestionBankBoard[]> {
  return api<QuestionBankBoard[]>("/api/question-bank/boards", {
    headers: authHeader(token),
  });
}

// As provas que o aluno pode declarar como alvo. Referência estável, mesmo
// cache das bancas — mas, ao contrário delas, esta lista NÃO chega vazia.
export async function listQuestionBankInstitutions(
  token: string,
): Promise<QuestionBankInstitution[]> {
  return api<QuestionBankInstitution[]>("/api/question-bank/institutions", {
    headers: authHeader(token),
  });
}
