import { NextRequest, NextResponse } from "next/server";

import {
  ACCESS_COOKIE_MAX_AGE_SECONDS,
  isSecureRequest,
  setSessionCookies,
} from "@/lib/server/sessionCookies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INTERNAL_CSRF_HEADER = "x-krosmed-csrf";
const INTERNAL_CSRF_VALUE = "1";
const MAX_TOKEN_LENGTH = 4096;

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

function extractBearerToken(raw: string | null): string {
  const header = String(raw ?? "").trim();
  const parts = header.split(" ", 2);
  if (parts.length !== 2 || parts[0]?.toLowerCase() !== "bearer") return "";
  return parts[1]?.trim() ?? "";
}

/**
 * O corpo é lido UMA vez.
 *
 * Havia dois `await request.json()` neste handler: um dentro de
 * `tokenFromRequest` e outro para o `remember_device`. O corpo de um `Request` é
 * um stream de leitura única — o segundo `json()` rejeita, o `.catch(() => null)`
 * engole, e `rememberDevice` vira `false` em silêncio.
 *
 * Só não quebrava porque o único chamador (`establishAuthSession`) manda o token
 * TAMBÉM no header `Authorization`, e aí o primeiro `json()` nunca chegava a
 * rodar. Um chamador que mandasse apenas o corpo — o que o contrato permite —
 * perderia o "manter conectado" sem nenhum erro: a sessão duraria 12 horas em
 * vez de 30 dias, e o aluno seria deslogado sem explicação.
 */
type CorpoDaSessao = { accessToken: string; rememberDevice: boolean };

async function lerCorpo(request: NextRequest): Promise<CorpoDaSessao> {
  const headerToken = extractBearerToken(request.headers.get("authorization"));
  const payload = await request.json().catch(() => null);
  const registro =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : null;

  const tokenDoCorpo =
    typeof registro?.access_token === "string" ? registro.access_token.trim() : "";

  return {
    accessToken: headerToken || tokenDoCorpo,
    rememberDevice: Boolean(registro?.remember_device),
  };
}

function jsonError(code: string, status: number, requestId: string): NextResponse {
  return NextResponse.json(
    { code, message: "Sessão inválida.", request_id: requestId },
    { status, headers: { "X-Request-Id": requestId } },
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = createRequestId(request.headers.get("x-request-id"));
  if (!isTrustedBrowserMutation(request)) {
    return jsonError("csrf_rejected", 403, requestId);
  }

  const { accessToken, rememberDevice } = await lerCorpo(request);

  if (!accessToken || accessToken.length > MAX_TOKEN_LENGTH) {
    return jsonError("invalid_session_token", 401, requestId);
  }

  const validationResponse = await fetch(`${proxyTarget()}/auth/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Request-Id": requestId,
    },
    body: JSON.stringify({ access_token: accessToken, remember_device: rememberDevice }),
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
  const sessionAccessTokenValue =
    identity && typeof identity === "object" && !Array.isArray(identity)
      ? (identity as Record<string, unknown>).access_token
      : null;
  const sessionAccessToken =
    typeof sessionAccessTokenValue === "string" ? sessionAccessTokenValue.trim() : "";
  const refreshTokenValue =
    identity && typeof identity === "object" && !Array.isArray(identity)
      ? (identity as Record<string, unknown>).refresh_token
      : null;
  const refreshToken = typeof refreshTokenValue === "string" ? refreshTokenValue.trim() : "";

  if (!userId || !sessionAccessToken) {
    return jsonError("invalid_session_token", 401, requestId);
  }

  // `expires_in` alimenta a renovação proativa no cliente; nenhum token vaza para
  // o navegador (seguem só em cookies httpOnly).
  const response = NextResponse.json(
    { user_id: userId, expires_in: ACCESS_COOKIE_MAX_AGE_SECONDS },
    { status: 200, headers: { "X-Request-Id": requestId } },
  );
  setSessionCookies(response, {
    accessToken: sessionAccessToken,
    refreshToken,
    secure: isSecureRequest(request),
    persistent: rememberDevice,
  });
  return response;
}
