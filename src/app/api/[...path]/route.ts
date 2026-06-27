import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_COOKIE_NAME = "krosmed_session";
const TOKEN_COOKIE_NAME = "krosmed_token";
const INTERNAL_CSRF_HEADER = "x-krosmed-csrf";
const INTERNAL_CSRF_VALUE = "1";
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const CLOCK_SKEW_SECONDS = 30;
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);
const AUTH_SESSION_PATHS = new Set<string>();
const LONG_TIMEOUT_PROXY_PATHS = new Set([
  "analysis/simulations/analyze-errors/progressive/stream",
]);

function parseEnvPositiveInt(name: string, fallback: number, minValue: number = 1): number {
  const raw = String(process.env[name] ?? "").trim();
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < minValue) return fallback;
  return parsed;
}

const DEFAULT_PROXY_TIMEOUT_MS = parseEnvPositiveInt("NEXT_API_PROXY_TIMEOUT_MS", 25000, 1000);
const SESSION_MAX_AGE_SECONDS = parseEnvPositiveInt(
  "NEXT_SESSION_MAX_AGE_SECONDS",
  50 * 60,
  300,
);
const STREAM_PROXY_TIMEOUT_MS = parseEnvPositiveInt(
  "NEXT_API_PROXY_STREAM_TIMEOUT_MS",
  190000,
  10000,
);

class UpstreamTimeoutError extends Error {
  constructor() {
    super("upstream_timeout");
    this.name = "UpstreamTimeoutError";
  }
}

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

function isSameOriginMutation(request: NextRequest, method: string): boolean {
  if (!MUTATING_METHODS.has(method)) return true;
  return hasTrustedOrigin(request);
}

function hasInternalCsrfHeader(request: NextRequest, method: string): boolean {
  if (!MUTATING_METHODS.has(method)) return true;
  return request.headers.get(INTERNAL_CSRF_HEADER)?.trim() === INTERNAL_CSRF_VALUE;
}

function createRequestId(seed?: string): string {
  const normalized = String(seed ?? "").trim();
  if (normalized) return normalized;
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
}

function buildUpstreamHeaders(request: NextRequest, requestId: string): Headers {
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("cookie");
  headers.delete("content-length");
  headers.delete("connection");
  headers.delete("transfer-encoding");
  headers.delete(INTERNAL_CSRF_HEADER);

  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value?.trim() || "";
  if (sessionToken && !headers.has("authorization")) {
    headers.set("authorization", `Bearer ${sessionToken}`);
  }
  headers.set("x-request-id", requestId);
  return headers;
}

async function buildUpstreamBody(request: NextRequest): Promise<BodyInit | undefined> {
  if (request.method === "GET" || request.method === "HEAD") {
    return undefined;
  }
  const body = await request.arrayBuffer();
  return body.byteLength > 0 ? body : undefined;
}

function buildProxyPath(pathParts: string[]): string {
  const cleanParts = pathParts.filter((part) => !!part).map((part) => encodeURIComponent(part));
  return cleanParts.join("/");
}

function responseWithRequestId(body: unknown, status: number, requestId: string): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      "X-Request-Id": requestId,
    },
  });
}

function isJwtExpired(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  try {
    const padding = "=".repeat((4 - (parts[1]!.length % 4)) % 4);
    const payload = JSON.parse(Buffer.from(parts[1]! + padding, "base64").toString("utf8")) as Record<string, unknown>;
    const exp = typeof payload.exp === "number" ? payload.exp : null;
    if (exp === null) return false;
    return Math.floor(Date.now() / 1000) - CLOCK_SKEW_SECONDS > exp;
  } catch {
    return false;
  }
}

function expireLegacyTokenCookie(response: NextResponse, secure: boolean): void {
  response.cookies.set({
    name: TOKEN_COOKIE_NAME,
    value: "",
    sameSite: "strict",
    secure,
    path: "/",
    maxAge: 0,
  });
}

function setSessionCookie(response: NextResponse, accessToken: string, secure: boolean): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: accessToken,
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  expireLegacyTokenCookie(response, secure);
}

function redactAccessTokenPayload(payload: unknown): unknown {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;
  const redacted = { ...(payload as Record<string, unknown>) };
  delete redacted.access_token;
  return redacted;
}

function timeoutForPath(pathKey: string): number {
  if (LONG_TIMEOUT_PROXY_PATHS.has(pathKey)) return STREAM_PROXY_TIMEOUT_MS;
  return DEFAULT_PROXY_TIMEOUT_MS;
}

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new UpstreamTimeoutError();
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function proxyHandler(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const resolvedParams = await context.params;
  const pathParts = resolvedParams.path ?? [];
  const requestId = createRequestId(request.headers.get("x-request-id") ?? undefined);
  if (pathParts.length === 0) {
    return responseWithRequestId({ code: "proxy_path_missing" }, 400, requestId);
  }

  const method = request.method.toUpperCase();
  if (!isSameOriginMutation(request, method) || !hasInternalCsrfHeader(request, method)) {
    return responseWithRequestId(
      { code: "csrf_rejected", message: "Requisicao recusada por protecao de origem." },
      403,
      requestId,
    );
  }
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value?.trim() || "";
  if (sessionToken && isJwtExpired(sessionToken)) {
    const expiredResponse = responseWithRequestId(
      { code: "oidc_token_invalid", message: "Token expired" },
      401,
      requestId,
    );
    expiredResponse.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: isSecureRequest(request),
      path: "/",
      maxAge: 0,
    });
    return expiredResponse;
  }

  const proxyPath = buildProxyPath(pathParts);
  const pathKey = pathParts.join("/");
  const upstreamUrl = `${proxyTarget()}/${proxyPath}${request.nextUrl.search}`;

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetchWithTimeout(
      upstreamUrl,
      {
        method,
        headers: buildUpstreamHeaders(request, requestId),
        body: await buildUpstreamBody(request),
        redirect: "manual",
        cache: "no-store",
      },
      timeoutForPath(pathKey),
    );
  } catch (err) {
    if (err instanceof UpstreamTimeoutError) {
      return responseWithRequestId({ code: "upstream_timeout", message: "Backend demorou para responder. Tente novamente em instantes.", request_id: requestId }, 504, requestId);
    }
    return responseWithRequestId({ code: "upstream_unavailable", message: "Backend indisponível. Verifique se a API local está rodando em :8000 ou tente novamente em instantes.", request_id: requestId }, 502, requestId);
  }

  const responseHeaders = new Headers(upstreamResponse.headers);
  for (const header of HOP_BY_HOP_HEADERS) {
    responseHeaders.delete(header);
  }
  // undici (Node fetch) já descomprimiu upstreamResponse.body, mas mantém os
  // headers Content-Encoding e Content-Length descrevendo o corpo comprimido
  // original. Repassá-los faz o navegador tentar descomprimir bytes já planos
  // (ERR_CONTENT_DECODING_FAILED). NextResponse reenquadra o corpo do stream.
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");
  responseHeaders.set("X-Request-Id", responseHeaders.get("X-Request-Id") || requestId);

  const contentType = upstreamResponse.headers.get("content-type")?.toLowerCase() ?? "";
  const shouldInspectAuthPayload =
    method === "POST" &&
    AUTH_SESSION_PATHS.has(pathKey) &&
    contentType.includes("application/json");

  if (shouldInspectAuthPayload && upstreamResponse.ok) {
    const payload = await upstreamResponse.clone().json().catch(() => null);
    const payloadRecord =
      payload && typeof payload === "object" && !Array.isArray(payload)
        ? payload as Record<string, unknown>
        : null;
    const accessToken =
      typeof payloadRecord?.access_token === "string"
        ? payloadRecord.access_token.trim()
        : "";

    responseHeaders.delete("content-length");
    const response = NextResponse.json(redactAccessTokenPayload(payload), {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
    if (accessToken) {
      setSessionCookie(response, accessToken, isSecureRequest(request));
    }
    return response;
  }

  const response = new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });

  return response;
}

export { proxyHandler as GET };
export { proxyHandler as POST };
export { proxyHandler as PUT };
export { proxyHandler as PATCH };
export { proxyHandler as DELETE };
export { proxyHandler as OPTIONS };
export { proxyHandler as HEAD };
