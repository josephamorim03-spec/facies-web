import type { NextRequest, NextResponse } from "next/server";

/**
 * Fonte única dos cookies de sessão do BFF.
 *
 * Antes, `api/auth/session`, `api/auth/session/refresh` e `api/[...path]` tinham
 * três cópias desta lógica. Divergência entre elas (maxAge do access token vs.
 * TTL real do token no backend) é justamente o que transforma um 401 comum em
 * logout silencioso, então os nomes, TTLs e a política persistente-vs-sessão
 * ficam definidos aqui e só aqui.
 *
 * Módulo server-only: importado apenas por route handlers em `src/app/api/**`.
 */

export const SESSION_COOKIE_NAME = "krosmed_session";
export const REFRESH_COOKIE_NAME = "krosmed_refresh";
export const REFRESH_HINT_COOKIE_NAME = "krosmed_refresh_hint";
export const TOKEN_COOKIE_NAME = "krosmed_token";

/** Valores do cookie-dica, que carrega a classe de durabilidade entre requests. */
export const REFRESH_HINT_PERSISTENT = "1";
export const REFRESH_HINT_SESSION = "s";

export function parseEnvPositiveInt(name: string, fallback: number, minValue: number = 1): number {
  const raw = String(process.env[name] ?? "").trim();
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < minValue) return fallback;
  return parsed;
}

/**
 * Precisa acompanhar `KROSMED_ACCESS_TOKEN_TTL_SECONDS` do backend
 * (`app/auth/local_auth.py`). Se o cookie morrer antes do token, o request segue
 * sem bearer e o 401 resultante não distingue "expirou" de "sessão inválida".
 */
export const ACCESS_COOKIE_MAX_AGE_SECONDS = parseEnvPositiveInt(
  "NEXT_ACCESS_COOKIE_MAX_AGE_SECONDS",
  parseEnvPositiveInt("NEXT_SESSION_MAX_AGE_SECONDS", 60 * 60, 300),
  300,
);

/** "Manter conectado" marcado. */
export const REFRESH_COOKIE_MAX_AGE_SECONDS = parseEnvPositiveInt(
  "NEXT_REFRESH_COOKIE_MAX_AGE_SECONDS",
  30 * 24 * 60 * 60,
  3600,
);

/**
 * "Manter conectado" desmarcado: a sessão ainda renova, só que por um horizonte
 * curto. O registro no servidor continua com o TTL longo — quem limita é o
 * cookie, o que evita uma coluna de durabilidade em `refresh_sessions`.
 */
export const SESSION_REFRESH_COOKIE_MAX_AGE_SECONDS = parseEnvPositiveInt(
  "NEXT_SESSION_REFRESH_COOKIE_MAX_AGE_SECONDS",
  12 * 60 * 60,
  3600,
);

export function isSecureRequest(request: NextRequest): boolean {
  if (request.nextUrl.protocol === "https:") return true;
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedProto) {
    return forwardedProto.split(",")[0]?.trim().toLowerCase() === "https";
  }
  return process.env.NODE_ENV === "production";
}

/**
 * `true` quando o aluno pediu "manter conectado". A classe é carregada pelo
 * cookie-dica para sobreviver às rotações, já que o refresh não recebe de novo o
 * `remember_device` do login.
 */
export function isPersistentSession(request: NextRequest): boolean {
  return request.cookies.get(REFRESH_HINT_COOKIE_NAME)?.value?.trim() === REFRESH_HINT_PERSISTENT;
}

export function hasRefreshHint(request: NextRequest): boolean {
  return !!request.cookies.get(REFRESH_HINT_COOKIE_NAME)?.value?.trim();
}

export function expireLegacyTokenCookie(response: NextResponse, secure: boolean): void {
  response.cookies.set({
    name: TOKEN_COOKIE_NAME,
    value: "",
    sameSite: "strict",
    secure,
    path: "/",
    maxAge: 0,
  });
}

export function expireAccessCookie(response: NextResponse, secure: boolean): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  });
}

export function clearSessionCookies(response: NextResponse, secure: boolean): void {
  expireAccessCookie(response, secure);
  for (const cookie of [
    { name: REFRESH_HINT_COOKIE_NAME, path: "/" },
    { name: REFRESH_COOKIE_NAME, path: "/api/auth" },
  ]) {
    response.cookies.set({
      name: cookie.name,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: cookie.path,
      maxAge: 0,
    });
  }
  expireLegacyTokenCookie(response, secure);
}

export type SessionCookieInput = {
  accessToken: string;
  refreshToken: string;
  secure: boolean;
  /**
   * `true` -> cookies de refresh duram 30 dias; `false` -> 12 horas. Em ambos os
   * casos o refresh token EXISTE: sem ele, o access token expirando durante o uso
   * derruba a sessão sem chance de renovação.
   */
  persistent: boolean;
};

export function setSessionCookies(
  response: NextResponse,
  { accessToken, refreshToken, secure, persistent }: SessionCookieInput,
): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: accessToken,
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: ACCESS_COOKIE_MAX_AGE_SECONDS,
  });

  if (refreshToken) {
    // "manter conectado" desmarcado passa a significar "sessão curta" em vez de
    // "sem renovação nenhuma" — que era o que derrubava o aluno em 15 minutos.
    const maxAge = persistent
      ? REFRESH_COOKIE_MAX_AGE_SECONDS
      : SESSION_REFRESH_COOKIE_MAX_AGE_SECONDS;
    response.cookies.set({
      name: REFRESH_COOKIE_NAME,
      value: refreshToken,
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/api/auth",
      maxAge,
    });
    response.cookies.set({
      name: REFRESH_HINT_COOKIE_NAME,
      value: persistent ? REFRESH_HINT_PERSISTENT : REFRESH_HINT_SESSION,
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge,
    });
  } else {
    for (const cookie of [
      { name: REFRESH_COOKIE_NAME, path: "/api/auth" },
      { name: REFRESH_HINT_COOKIE_NAME, path: "/" },
    ]) {
      response.cookies.set({
        name: cookie.name,
        value: "",
        httpOnly: true,
        sameSite: "lax",
        secure,
        path: cookie.path,
        maxAge: 0,
      });
    }
  }

  expireLegacyTokenCookie(response, secure);
}
