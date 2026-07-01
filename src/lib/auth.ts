import { resetSessionExpirationState } from "./sessionExpiration";

const TOKEN_KEY = "krosmed_token";
const SESSION_KEY = "krosmed_session";
const INTERNAL_CSRF_HEADER = "X-KrosMed-CSRF";
const INTERNAL_CSRF_VALUE = "1";

function secureCookieSuffix(): string {
  return window.location.protocol === "https:" ? "; Secure" : "";
}

export function getAuthToken(): string {
  return "";
}

export async function establishAuthSession(token: string): Promise<void> {
  const normalized = token.trim();
  if (!normalized) {
    throw new Error("Token vazio.");
  }
  const response = await fetch("/api/auth/session", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      Authorization: `Bearer ${normalized}`,
      "Content-Type": "application/json",
      [INTERNAL_CSRF_HEADER]: INTERNAL_CSRF_VALUE,
    },
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    throw new Error("Sessao invalida.");
  }
}

export function setAuthToken(token: string): void {
  if (typeof window === "undefined") return;
  resetSessionExpirationState();
  void establishAuthSession(token).catch(() => undefined);
}

export function clearAuthToken(): void {
  if (typeof window === "undefined") return;
  const secure = secureCookieSuffix();
  document.cookie = `${TOKEN_KEY}=; SameSite=Strict; Path=/; Max-Age=0${secure}`;
  // Best effort cleanup for old non-httpOnly session cookies (if any).
  document.cookie = `${SESSION_KEY}=; SameSite=Lax; Path=/; Max-Age=0${secure}`;
  void fetch("/api/auth/logout", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      [INTERNAL_CSRF_HEADER]: INTERNAL_CSRF_VALUE,
    },
    keepalive: true,
  }).catch(() => undefined);
}
