import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "krosmed_session";
const INTERNAL_CSRF_HEADER = "x-krosmed-csrf";
const INTERNAL_CSRF_VALUE = "1";

function proxyTarget(): string {
  const raw = process.env.NEXT_API_PROXY_TARGET || "http://127.0.0.1:8000";
  return raw.replace(/\/+$/, "");
}

function createRequestId(seed?: string | null): string {
  const normalized = String(seed ?? "").trim();
  if (normalized) return normalized;
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
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
  return normalizeLoopback(origin) === normalizeLoopback(requestHostOrigin(request));
}

function isTrustedMutation(request: NextRequest): boolean {
  return (
    hasTrustedOrigin(request) &&
    request.headers.get(INTERNAL_CSRF_HEADER)?.trim() === INTERNAL_CSRF_VALUE
  );
}

function adminEmails(): Set<string> {
  return new Set(
    String(process.env.OPS_ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

function jsonError(code: string, status: number, requestId: string): NextResponse {
  return NextResponse.json({ code, request_id: requestId }, { status, headers: { "X-Request-Id": requestId } });
}

async function authorizeAdmin(request: NextRequest, requestId: string): Promise<NextResponse | null> {
  if (request.method !== "GET" && !isTrustedMutation(request)) {
    return jsonError("csrf_rejected", 403, requestId);
  }

  const allowedEmails = adminEmails();
  if (allowedEmails.size === 0) {
    return jsonError("admin_not_configured", 403, requestId);
  }

  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value?.trim() || "";
  if (!sessionToken) {
    return jsonError("not_authenticated", 401, requestId);
  }

  const meResponse = await fetch(`${proxyTarget()}/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      "X-Request-Id": requestId,
    },
    cache: "no-store",
  }).catch(() => null);

  if (!meResponse?.ok) {
    return jsonError("not_authenticated", 401, requestId);
  }

  const identity = await meResponse.json().catch(() => null);
  const email =
    identity && typeof identity === "object" && !Array.isArray(identity)
      ? String((identity as Record<string, unknown>).email ?? "").trim().toLowerCase()
      : "";
  const verified =
    identity && typeof identity === "object" && !Array.isArray(identity)
      ? (identity as Record<string, unknown>).email_verified === true
      : false;

  if (!email || !verified || !allowedEmails.has(email)) {
    return jsonError("admin_forbidden", 403, requestId);
  }

  return null;
}

export async function proxyAdminAccessKeys(
  request: NextRequest,
  opsPath: string,
  init?: { method?: string; body?: BodyInit | null },
): Promise<NextResponse> {
  const requestId = createRequestId(request.headers.get("x-request-id"));
  const authError = await authorizeAdmin(request, requestId);
  if (authError) return authError;

  const opsToken = String(process.env.OPS_TOKEN ?? "").trim();
  if (!opsToken) {
    return jsonError("ops_token_not_configured", 500, requestId);
  }

  const upstream = await fetch(`${proxyTarget()}${opsPath}`, {
    method: init?.method ?? request.method,
    headers: {
      "Content-Type": "application/json",
      "X-Ops-Token": opsToken,
      "X-Request-Id": requestId,
    },
    body: init?.body ?? null,
    cache: "no-store",
  }).catch(() => null);

  if (!upstream) {
    return jsonError("upstream_unavailable", 502, requestId);
  }

  const text = await upstream.text();
  const headers = new Headers(upstream.headers);
  headers.set("X-Request-Id", headers.get("X-Request-Id") || requestId);
  headers.delete("content-length");

  return new NextResponse(text, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}
