import { api, authHeader } from "../../shared/http";
import type {
  CanonicalFlashcardNote,
  LearningPackageRequest,
  LearningPackageResult,
} from "./types";

export async function findLearningPackageRequest(
  token: string,
  sessionId: string,
  position: number,
): Promise<LearningPackageRequest | null> {
  return api<LearningPackageRequest | null>(
    `/api/question-bank/sessions/${encodeURIComponent(sessionId)}/items/${position}/learning-package-request`,
    { headers: authHeader(token), cache: "no-store", clientCache: false },
  );
}

export async function requestLearningPackage(
  token: string,
  sessionId: string,
  position: number,
  idempotencyKey: string,
): Promise<LearningPackageRequest> {
  return api<LearningPackageRequest>(
    `/api/question-bank/sessions/${encodeURIComponent(sessionId)}/items/${position}/learning-package-requests`,
    {
      method: "POST",
      headers: { ...authHeader(token), "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({}),
    },
  );
}

export async function getLearningPackageRequest(
  token: string,
  requestId: string,
): Promise<LearningPackageRequest> {
  return api<LearningPackageRequest>(
    `/api/question-bank/learning-package-requests/${encodeURIComponent(requestId)}`,
    { headers: authHeader(token), cache: "no-store", clientCache: false },
  );
}

export async function getLearningPackageResult(
  token: string,
  requestId: string,
): Promise<LearningPackageResult> {
  return api<LearningPackageResult>(
    `/api/question-bank/learning-package-requests/${encodeURIComponent(requestId)}/result`,
    { headers: authHeader(token), cache: "no-store", clientCache: false },
  );
}

export async function saveCanonicalFlashcard(
  token: string,
  requestId: string,
  templateId: string,
  edits: { front?: string; back?: string } = {},
): Promise<CanonicalFlashcardNote> {
  return api<CanonicalFlashcardNote>(
    `/api/question-bank/learning-package-requests/${encodeURIComponent(requestId)}/flashcards/${encodeURIComponent(templateId)}/save`,
    { method: "POST", headers: authHeader(token), body: JSON.stringify(edits) },
  );
}

export async function enrollCanonicalFlashcard(
  token: string,
  noteId: string,
): Promise<CanonicalFlashcardNote> {
  return api<CanonicalFlashcardNote>(
    `/api/question-bank/canonical-flashcards/${encodeURIComponent(noteId)}/srs-enrollment`,
    { method: "POST", headers: authHeader(token), body: JSON.stringify({}) },
  );
}

export async function recordLearningPackageInteraction(
  token: string,
  requestId: string,
  event: {
    event_type: "artifact_viewed" | "flashcard_template_presented" | "dismissed";
    artifact_type?: string;
    template_id?: string;
  },
): Promise<{ recorded: boolean; event_type: string }> {
  return api<{ recorded: boolean; event_type: string }>(
    `/api/question-bank/learning-package-requests/${encodeURIComponent(requestId)}/events`,
    { method: "POST", headers: authHeader(token), body: JSON.stringify(event) },
  );
}
