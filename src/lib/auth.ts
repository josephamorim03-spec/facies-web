import { resetSessionExpirationState } from "./sessionExpiration";

const TOKEN_KEY = "krosmed_token";
const SESSION_KEY = "krosmed_session";
const REFRESH_KEY = "krosmed_refresh";
const REFRESH_HINT_KEY = "krosmed_refresh_hint";
const INTERNAL_CSRF_HEADER = "X-KrosMed-CSRF";
const INTERNAL_CSRF_VALUE = "1";

function secureCookieSuffix(): string {
  return window.location.protocol === "https:" ? "; Secure" : "";
}

/**
 * Returns an empty string by design.
 *
 * Auth tokens are NEVER exposed to JavaScript. The login flow stores the
 * access token in an httpOnly cookie (`krosmed_session`) set by the
 * Next.js API route `/api/auth/session`. The BFF proxy (`/api/[...path]`)
 * reads that cookie and injects `Authorization: Bearer <token>` when
 * forwarding requests to the backend.
 *
 * This function exists for API compatibility with `authHeader()` but
 * intentionally returns "" so that no token is ever added to client-side
 * fetch headers. Auth is handled entirely server-side via cookies.
 */
export function getAuthToken(): string {
  return "";
}

export async function establishAuthSession(token: string, rememberDevice = false): Promise<void> {
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
    body: JSON.stringify({ access_token: normalized, remember_device: rememberDevice }),
  });
  if (!response.ok) {
    throw new Error("Sessao invalida.");
  }
}

export async function refreshAuthSession(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const response = await fetch("/api/auth/session/refresh", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        [INTERNAL_CSRF_HEADER]: INTERNAL_CSRF_VALUE,
      },
      cache: "no-store",
    });
    if (response.ok) {
      resetSessionExpirationState();
      return true;
    }
  } catch {
    // handled by caller
  }
  return false;
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
  document.cookie = `${REFRESH_HINT_KEY}=; SameSite=Lax; Path=/; Max-Age=0${secure}`;
  // Best effort cleanup for old non-httpOnly session cookies (if any).
  document.cookie = `${SESSION_KEY}=; SameSite=Lax; Path=/; Max-Age=0${secure}`;
  document.cookie = `${REFRESH_KEY}=; SameSite=Lax; Path=/api/auth; Max-Age=0${secure}`;
  void fetch("/api/auth/logout", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      [INTERNAL_CSRF_HEADER]: INTERNAL_CSRF_VALUE,
    },
    keepalive: true,
  }).catch(() => undefined);
}
