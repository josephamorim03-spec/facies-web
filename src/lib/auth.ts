// Extensão explícita: `tests/unit` roda em node --test, cuja resolução ESM não
// completa especificadores relativos sem extensão (mesmo caso de areaDisplay.ts).
import { dispatchSessionRenewed, resetSessionExpirationState } from "./sessionExpiration.ts";

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

function expiresInFromPayload(payload: unknown): number | undefined {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return undefined;
  const raw = (payload as Record<string, unknown>).expires_in;
  const parsed = typeof raw === "number" ? raw : Number.parseInt(String(raw ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
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
    throw new Error("Sessão inválida.");
  }
  const payload = await response.json().catch(() => null);
  dispatchSessionRenewed({ expiresInSeconds: expiresInFromPayload(payload) });
}

/**
 * Renovação em voo compartilhada por TODOS os chamadores (single-flight).
 *
 * Sem isso, cada request que recebe 401 dispara seu próprio POST de refresh. Uma
 * tela que faz N chamadas em paralelo gerava N rotações concorrentes do MESMO
 * refresh token; o backend lê as perdedoras como reuso de token e revogava a
 * família inteira — inclusive os tokens recém-emitidos —, deslogando o aluno de
 * forma irrecuperável (visto em produção: 21 `refresh_session_reuse_detected`
 * numa única rajada). Um refresh por vez elimina a corrida na origem.
 */
let inflightRefresh: Promise<SessionRefreshOutcome> | null = null;

/**
 * `raced` é distinto de `renewed` de propósito: quem perdeu a corrida não recebeu
 * cookie novo nesta resposta — quem rotacionou foi outra aba. O cookie do vencedor
 * pode ainda estar a caminho, então o chamador precisa poder tentar mais uma vez
 * em vez de concluir que a sessão morreu.
 */
export type SessionRefreshOutcome = "renewed" | "raced" | "failed";

export async function refreshAuthSession(): Promise<SessionRefreshOutcome> {
  if (typeof window === "undefined") return "failed";
  const pending = inflightRefresh;
  if (pending) return pending;

  const attempt = performSessionRefresh();
  inflightRefresh = attempt;
  try {
    return await attempt;
  } finally {
    if (inflightRefresh === attempt) {
      inflightRefresh = null;
    }
  }
}

async function performSessionRefresh(): Promise<SessionRefreshOutcome> {
  try {
    const response = await fetch("/api/auth/session/refresh", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        [INTERNAL_CSRF_HEADER]: INTERNAL_CSRF_VALUE,
      },
      cache: "no-store",
    });
    if (response.status === 409) {
      resetSessionExpirationState();
      return "raced";
    }
    if (response.ok) {
      const payload = await response.json().catch(() => null);
      resetSessionExpirationState();
      dispatchSessionRenewed({ expiresInSeconds: expiresInFromPayload(payload) });
      return "renewed";
    }
  } catch {
    // handled by caller
  }
  return "failed";
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
