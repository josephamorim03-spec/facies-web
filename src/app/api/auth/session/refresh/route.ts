import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_COOKIE_NAME = "krosmed_session";
const REFRESH_COOKIE_NAME = "krosmed_refresh";
const REFRESH_HINT_COOKIE_NAME = "krosmed_refresh_hint";
const TOKEN_COOKIE_NAME = "krosmed_token";
const SESSION_EXPIRED_HEADER = "X-KrosMed-Session-Expired";
const INTERNAL_CSRF_HEADER = "x-krosmed-csrf";
const INTERNAL_CSRF_VALUE = "1";

function parseEnvPositiveInt(name: string, fallback: number, minValue: number = 1): number {
  const raw = String(process.env[name] ?? "").trim();
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < minValue) return fallback;
  return parsed;
}

const SESSION_MAX_AGE_SECONDS = parseEnvPositiveInt(
  "NEXT_ACCESS_COOKIE_MAX_AGE_SECONDS",
  parseEnvPositiveInt("NEXT_SESSION_MAX_AGE_SECONDS", 15 * 60, 300),
  300,
);
const REFRESH_MAX_AGE_SECONDS = parseEnvPositiveInt(
  "NEXT_REFRESH_COOKIE_MAX_AGE_SECONDS",
  30 * 24 * 60 * 60,
  3600,
);

function proxyTarget(): string {
  const raw = process.env.NEXT_API_PROXY_TARGET || "http://127.0.0.1:8000";
  return raw.replace(/\/+$/, "");
}

function isSecureRequest(request: NextRequest): boolean {
  if (request.nextUrl.protocol === "https:") return true;
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedProto) {
    return forwardedProto.split(",")[0]?.trim().toLowerCase() === "https";
  }
  return process.env.NODE_ENV === "production";
}

function requestOrigin(request: NextRequest): string {
  const origin = request.headers.get("origin")?.trim();
  if (origin) return origin;
  const referer = request.headers.get("referer")?.trim();
  if (!referer) return "";
  try {
    return new URL(referer).origin;
  } catch {
    return "";
  }
}

function requestHostOrigin(request: NextRequest): string {
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host")?.trim();
  if (!host) return "";
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto || request.nextUrl.protocol.replace(/:$/, "") || "http";
  return `${protocol}://${host}`;
}

function normalizeLoopback(origin: string): string {
  return origin.replace("://127.0.0.1:", "://localhost:");
}

function hasTrustedOrigin(request: NextRequest): boolean {
  const origin = requestOrigin(request);
  if (!origin) return false;
  if (origin === request.nextUrl.origin) return true;
  if (origin === requestHostOrigin(request)) return true;
  const normalizedOrigin = normalizeLoopback(origin);
  return (
    normalizedOrigin === normalizeLoopback(request.nextUrl.origin) ||
    normalizedOrigin === normalizeLoopback(requestHostOrigin(request))
  );
}

function isTrustedBrowserMutation(request: NextRequest): boolean {
  return (
    hasTrustedOrigin(request) &&
    request.headers.get(INTERNAL_CSRF_HEADER)?.trim() === INTERNAL_CSRF_VALUE
  );
}

function createRequestId(seed?: string | null): string {
  const normalized = String(seed ?? "").trim();
  if (normalized) return normalized;
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
}

function clearSessionCookies(response: NextResponse, request: NextRequest): void {
  const secure = isSecureRequest(request);
  for (const cookie of [
    { name: SESSION_COOKIE_NAME, path: "/" },
    { name: REFRESH_HINT_COOKIE_NAME, path: "/" },
    { name: TOKEN_COOKIE_NAME, path: "/" },
    { name: REFRESH_COOKIE_NAME, path: "/api/auth" },
  ]) {
    response.cookies.set({
      name: cookie.name,
      value: "",
      httpOnly: cookie.name !== TOKEN_COOKIE_NAME,
      sameSite: cookie.name === TOKEN_COOKIE_NAME ? "strict" : "lax",
      secure,
      path: cookie.path,
      maxAge: 0,
    });
  }
}

function setSessionCookies(
  response: NextResponse,
  request: NextRequest,
  accessToken: string,
  refreshToken: string,
): void {
  const secure = isSecureRequest(request);
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: accessToken,
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  response.cookies.set({
    name: REFRESH_COOKIE_NAME,
    value: refreshToken,
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/api/auth",
    maxAge: REFRESH_MAX_AGE_SECONDS,
  });
  response.cookies.set({
    name: REFRESH_HINT_COOKIE_NAME,
    value: "1",
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: REFRESH_MAX_AGE_SECONDS,
  });
  response.cookies.set({
    name: TOKEN_COOKIE_NAME,
    value: "",
    sameSite: "strict",
    secure,
    path: "/",
    maxAge: 0,
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = createRequestId(request.headers.get("x-request-id"));
  if (!isTrustedBrowserMutation(request)) {
    return NextResponse.json(
      { code: "csrf_rejected" },
      { status: 403, headers: { "X-Request-Id": requestId } },
    );
  }

  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value?.trim() || "";
  if (!refreshToken) {
    const response = NextResponse.json(
      { code: "invalid_refresh_session" },
      { status: 401, headers: { "X-Request-Id": requestId } },
    );
    response.headers.set(SESSION_EXPIRED_HEADER, "1");
    clearSessionCookies(response, request);
    return response;
  }

  const upstream = await fetch(`${proxyTarget()}/auth/session/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Request-Id": requestId,
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: "no-store",
  }).catch(() => null);

  if (!upstream?.ok) {
    const response = NextResponse.json(
      { code: "invalid_refresh_session" },
      { status: 401, headers: { "X-Request-Id": requestId } },
    );
    response.headers.set(SESSION_EXPIRED_HEADER, "1");
    clearSessionCookies(response, request);
    return response;
  }

  const payload = await upstream.json().catch(() => null);
  const accessToken =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? String((payload as Record<string, unknown>).access_token ?? "").trim()
      : "";
  const nextRefreshToken =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? String((payload as Record<string, unknown>).refresh_token ?? "").trim()
      : "";

  if (!accessToken || !nextRefreshToken) {
    const response = NextResponse.json(
      { code: "invalid_refresh_session" },
      { status: 401, headers: { "X-Request-Id": requestId } },
    );
    response.headers.set(SESSION_EXPIRED_HEADER, "1");
    clearSessionCookies(response, request);
    return response;
  }

  const response = new NextResponse(null, {
    status: 204,
    headers: { "X-Request-Id": requestId },
  });
  setSessionCookies(response, request, accessToken, nextRefreshToken);
  return response;
}
