import { NextRequest, NextResponse } from "next/server";

import {
  ACCESS_COOKIE_MAX_AGE_SECONDS,
  REFRESH_COOKIE_NAME,
  clearSessionCookies,
  isPersistentSession,
  isSecureRequest,
  setSessionCookies,
} from "@/lib/server/sessionCookies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_EXPIRED_HEADER = "X-KrosMed-Session-Expired";
const INTERNAL_CSRF_HEADER = "x-krosmed-csrf";
const INTERNAL_CSRF_VALUE = "1";

function proxyTarget(): string {
  const raw = process.env.NEXT_API_PROXY_TARGET || "http://127.0.0.1:8000";
  return raw.replace(/\/+$/, "");
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

/** Sessão comprovadamente inválida: apaga os cookies e manda o cliente relogar. */
function sessionExpiredResponse(request: NextRequest, requestId: string): NextResponse {
  const response = NextResponse.json(
    { code: "invalid_refresh_session" },
    { status: 401, headers: { "X-Request-Id": requestId } },
  );
  response.headers.set(SESSION_EXPIRED_HEADER, "1");
  clearSessionCookies(response, isSecureRequest(request));
  return response;
}

function upstreamErrorCode(payload: unknown): string {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "";
  const record = payload as Record<string, unknown>;
  const detail = record.detail;
  if (detail && typeof detail === "object" && !Array.isArray(detail)) {
    const code = (detail as Record<string, unknown>).code;
    if (typeof code === "string") return code;
  }
  return typeof record.code === "string" ? record.code : "";
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
    return sessionExpiredResponse(request, requestId);
  }

  const persistent = isPersistentSession(request);

  const upstream = await fetch(`${proxyTarget()}/auth/session/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Request-Id": requestId,
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: "no-store",
  }).catch(() => null);

  // Backend fora do ar, lento ou limitando por taxa NÃO é sessão inválida. Tratar
  // como tal (o comportamento anterior) transformava um blip de infra em logout
  // definitivo, porque o cliente reage limpando cookie e revogando no servidor.
  if (upstream === null || upstream.status === 429 || upstream.status >= 500) {
    return NextResponse.json(
      { code: "refresh_unavailable" },
      {
        status: 503,
        headers: {
          "X-Request-Id": requestId,
          ...(upstream?.headers.get("Retry-After")
            ? { "Retry-After": upstream.headers.get("Retry-After") as string }
            : {}),
        },
      },
    );
  }

  if (!upstream.ok) {
    const errorPayload = await upstream.json().catch(() => null);
    // Corrida do próprio cliente: outra requisição já rotacionou e os cookies
    // novos já foram entregues ao navegador. Preserva a sessão e devolve 409 para
    // o cliente simplesmente repetir a requisição original.
    if (upstream.status === 401 && upstreamErrorCode(errorPayload) === "refresh_race") {
      return NextResponse.json(
        { code: "refresh_race" },
        { status: 409, headers: { "X-Request-Id": requestId } },
      );
    }
    return sessionExpiredResponse(request, requestId);
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
    return sessionExpiredResponse(request, requestId);
  }

  // `expires_in` alimenta a renovação proativa no cliente. Não é segredo e nenhum
  // token é exposto — os tokens seguem apenas em cookies httpOnly.
  const response = NextResponse.json(
    { expires_in: ACCESS_COOKIE_MAX_AGE_SECONDS },
    { status: 200, headers: { "X-Request-Id": requestId } },
  );
  setSessionCookies(response, {
    accessToken,
    refreshToken: nextRefreshToken,
    secure: isSecureRequest(request),
    persistent,
  });
  return response;
}
