export const SESSION_EXPIRED_EVENT = "krosmed:session-expired";
export const SESSION_RENEWED_EVENT = "krosmed:session-renewed";
export const SESSION_EXPIRED_HEADER = "X-KrosMed-Session-Expired";
export const SESSION_EXPIRED_LOGIN_URL = "/login?reason=expired";
export const SESSION_EXPIRED_MESSAGE = "Sessão expirada. Entre novamente para continuar.";

export type SessionExpiredEventDetail = {
  reason?: string;
};

export type SessionRenewedEventDetail = {
  /** Vida útil restante do access token, em segundos, quando conhecida. */
  expiresInSeconds?: number;
};

let sessionExpiredPending = false;
let sessionExpiredRedirecting = false;

function canUseBrowser(): boolean {
  return typeof window !== "undefined";
}

export function isSessionExpirationSuppressedPath(pathname: string): boolean {
  return pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/auth");
}

export function isProtectedApiPath(path: string): boolean {
  try {
    const base = canUseBrowser() && window.location?.origin ? window.location.origin : "http://krosmed.local";
    const parsed = new URL(path, base);
    if (parsed.origin !== base) return false;
    if (!parsed.pathname.startsWith("/api/")) return false;
    if (parsed.pathname.startsWith("/api/auth")) return false;
    if (parsed.pathname.startsWith("/api/version")) return false;
    return true;
  } catch {
    return false;
  }
}

export function isSessionExpiredApiResponse(
  path: string,
  res: { status: number; headers: Pick<Headers, "get"> },
): boolean {
  return (
    res.status === 401 &&
    res.headers.get(SESSION_EXPIRED_HEADER) === "1" &&
    isProtectedApiPath(path)
  );
}

export function dispatchSessionExpired(detail: SessionExpiredEventDetail = {}): boolean {
  if (!canUseBrowser()) return false;
  if (sessionExpiredPending || sessionExpiredRedirecting) return false;
  sessionExpiredPending = true;
  window.dispatchEvent(new CustomEvent<SessionExpiredEventDetail>(SESSION_EXPIRED_EVENT, { detail }));
  return true;
}

export function subscribeSessionExpired(
  callback: (detail: SessionExpiredEventDetail) => void,
): () => void {
  if (!canUseBrowser()) return () => undefined;

  function handleEvent(event: Event) {
    callback((event as CustomEvent<SessionExpiredEventDetail>).detail ?? {});
  }

  window.addEventListener(SESSION_EXPIRED_EVENT, handleEvent);
  return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleEvent);
}

/**
 * Anuncia que a sessão acabou de ser (re)emitida. O keepalive escuta este evento
 * para reagendar a renovação proativa sem importar `auth.ts` de volta (evita ciclo
 * de import: auth -> sessionExpiration, keepalive -> auth + sessionExpiration).
 */
export function dispatchSessionRenewed(detail: SessionRenewedEventDetail = {}): void {
  if (!canUseBrowser()) return;
  window.dispatchEvent(new CustomEvent<SessionRenewedEventDetail>(SESSION_RENEWED_EVENT, { detail }));
}

export function subscribeSessionRenewed(
  callback: (detail: SessionRenewedEventDetail) => void,
): () => void {
  if (!canUseBrowser()) return () => undefined;

  function handleEvent(event: Event) {
    callback((event as CustomEvent<SessionRenewedEventDetail>).detail ?? {});
  }

  window.addEventListener(SESSION_RENEWED_EVENT, handleEvent);
  return () => window.removeEventListener(SESSION_RENEWED_EVENT, handleEvent);
}

export function acknowledgeSessionExpired(): void {
  sessionExpiredPending = false;
}

export function startSessionExpiredRedirect(): boolean {
  if (sessionExpiredRedirecting) return false;
  sessionExpiredRedirecting = true;
  sessionExpiredPending = false;
  return true;
}

export function resetSessionExpirationState(): void {
  sessionExpiredPending = false;
  sessionExpiredRedirecting = false;
}
