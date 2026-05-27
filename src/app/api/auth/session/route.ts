import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_COOKIE_NAME = "krosmed_session";
const TOKEN_COOKIE_NAME = "krosmed_token";
const INTERNAL_CSRF_HEADER = "x-krosmed-csrf";
const INTERNAL_CSRF_VALUE = "1";
const MAX_TOKEN_LENGTH = 4096;

function parseEnvPositiveInt(name: string, fallback: number, minValue: number = 1): number {
  const raw = String(process.env[name] ?? "").trim();
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < minValue) return fallback;
  return parsed;
}

const SESSION_MAX_AGE_SECONDS = parseEnvPositiveInt(
  "NEXT_SESSION_MAX_AGE_SECONDS",
  24 * 60 * 60,
  300,
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

function extractBearerToken(raw: string | null): string {
  const header = String(raw ?? "").trim();
  const parts = header.split(" ", 2);
  if (parts.length !== 2 || parts[0]?.toLowerCase() !== "bearer") return "";
  return parts[1]?.trim() ?? "";
}

function looksLikeJwt(token: string): boolean {
  const parts = token.split(".");
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

function isSupportedSessionToken(token: string): boolean {
  return looksLikeJwt(token);
}

async function tokenFromRequest(request: NextRequest): Promise<string> {
  const headerToken = extractBearerToken(request.headers.get("authorization"));
  if (headerToken) return headerToken;
  const payload = await request.json().catch(() => null);
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const accessToken = (payload as Record<string, unknown>).access_token;
    if (typeof accessToken === "string") return accessToken.trim();
  }
  return "";
}

function setSessionCookies(response: NextResponse, request: NextRequest, accessToken: string): void {
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
    name: TOKEN_COOKIE_NAME,
    value: "",
    sameSite: "strict",
    secure,
    path: "/",
    maxAge: 0,
  });
}

function jsonError(code: string, status: number, requestId: string): NextResponse {
  return NextResponse.json(
    { code, message: "Sessao invalida.", request_id: requestId },
    { status, headers: { "X-Request-Id": requestId } },
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = createRequestId(request.headers.get("x-request-id"));
  if (!isTrustedBrowserMutation(request)) {
    return jsonError("csrf_rejected", 403, requestId);
  }
  const accessToken = await tokenFromRequest(request);

  if (!accessToken || accessToken.length > MAX_TOKEN_LENGTH || !isSupportedSessionToken(accessToken)) {
    return jsonError("invalid_session_token", 401, requestId);
  }

  const validationResponse = await fetch(`${proxyTarget()}/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-Request-Id": requestId,
    },
    cache: "no-store",
  }).catch(() => null);

  if (!validationResponse?.ok) {
    return jsonError("invalid_session_token", 401, requestId);
  }

  const identity = await validationResponse.json().catch(() => null);
  const userIdValue =
    identity && typeof identity === "object" && !Array.isArray(identity)
      ? (identity as Record<string, unknown>).user_id
      : null;
  const userId = typeof userIdValue === "string" ? userIdValue.trim() : "";

  if (userId === accessToken) {
    return jsonError("legacy_session_token_not_allowed", 401, requestId);
  }

  const response = NextResponse.json(
    { user_id: userId },
    { status: 200, headers: { "X-Request-Id": requestId } },
  );
  setSessionCookies(response, request, accessToken);
  return response;
}
