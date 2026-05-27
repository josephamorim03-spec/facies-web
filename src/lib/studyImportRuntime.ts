"use client";

export const ACTIVE_STUDY_IMPORT_SESSION_STORAGE_KEY = "kros.active_study_import_session";
export const STUDY_IMPORT_EXIT_REQUEST_EVENT = "kros.study_import_exit_request";
export type StudyImportExitRequestDetail = {
  targetHref?: string;
};

function normalizeSessionId(raw: string | null | undefined): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  return value;
}

export function buildStudyImportRuntimePath(sessionId: string): string {
  return `/agenda-operacional/importar/${encodeURIComponent(sessionId)}`;
}

export function isStudyImportRuntimePath(pathname: string | null | undefined): boolean {
  const value = String(pathname ?? "").trim();
  return /^\/(?:cronograma|agenda-operacional)\/importar\/[^/]+$/.test(value);
}

export function isStudyImportResultsPath(pathname: string | null | undefined): boolean {
  const value = String(pathname ?? "").trim();
  return /^\/(?:cronograma|agenda-operacional)\/importar\/[^/]+\/resultados$/.test(value);
}

export function isStudyImportImmersivePath(pathname: string | null | undefined): boolean {
  return isStudyImportRuntimePath(pathname) || isStudyImportResultsPath(pathname);
}

export function readActiveStudyImportSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return normalizeSessionId(localStorage.getItem(ACTIVE_STUDY_IMPORT_SESSION_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function setActiveStudyImportSessionId(sessionId: string): void {
  if (typeof window === "undefined") return;
  const normalized = normalizeSessionId(sessionId);
  if (!normalized) return;
  try {
    localStorage.setItem(ACTIVE_STUDY_IMPORT_SESSION_STORAGE_KEY, normalized);
  } catch {
    // ignore write/storage quota errors
  }
}

export function clearActiveStudyImportSessionId(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ACTIVE_STUDY_IMPORT_SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
}

const REVIEW_SESSION_ACTIVE_KEY = "kros.review_session_active";

export function setReviewSessionActive(active: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (active) sessionStorage.setItem(REVIEW_SESSION_ACTIVE_KEY, "1");
    else sessionStorage.removeItem(REVIEW_SESSION_ACTIVE_KEY);
  } catch { /* ignore */ }
}

export function isReviewSessionActive(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(REVIEW_SESSION_ACTIVE_KEY) === "1";
  } catch { return false; }
}
