import { NextRequest, NextResponse } from "next/server";

import { readAdminEmails } from "../_adminEmails";
import { isAllowedQuestionBankAdminPath } from "./_questionBankAdminPaths";
import { cabecalhosDeProcedencia } from "@/lib/server/procedencia";

const SESSION_COOKIE_NAME = "krosmed_session";
const INTERNAL_CSRF_HEADER = "x-krosmed-csrf";
const INTERNAL_CSRF_VALUE = "1";

function questionBankTarget(): string {
  const raw =
    process.env.QUESTION_BANK_ADMIN_BASE_URL ||
    process.env.QUESTION_BANK_PUBLIC_BASE_URL ||
    "";
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

function jsonError(code: string, status: number, requestId: string, message?: string): NextResponse {
  return NextResponse.json(
    { code, message, request_id: requestId },
    { status, headers: { "X-Request-Id": requestId } },
  );
}

function sanitizeUpstreamHeaders(headers: Headers): Headers {
  const responseHeaders = new Headers(headers);
  for (const header of [
    "connection",
    "content-encoding",
    "content-length",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "server",
    "set-cookie",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    "x-powered-by",
  ]) {
    responseHeaders.delete(header);
  }
  return responseHeaders;
}

function logAdminProxyEvent(
  level: "info" | "warn" | "error",
  event: string,
  fields: Record<string, unknown>,
): void {
  const payload = {
    event,
    area: "question_bank_admin_proxy",
    ...fields,
  };
  const message = JSON.stringify(payload);
  if (level === "error") console.error(message);
  else if (level === "warn") console.warn(message);
  else console.info(message);
}

function safeOrigin(value: string): string {
  try {
    return new URL(value).origin;
  } catch {
    return "invalid";
  }
}

function sanitizeUpstreamErrorBody(text: string): Record<string, string> {
  const sanitized: Record<string, string> = {};
  const assign = (key: string, value: unknown) => {
    const clean = String(value ?? "").replace(/\s+/g, " ").trim();
    if (clean) sanitized[key] = clean.slice(0, 300);
  };

  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const data = parsed as Record<string, unknown>;
      assign("upstream_code", data.code);
      assign("upstream_message", data.message);
      if (typeof data.detail === "string") assign("upstream_detail", data.detail);
      return sanitized;
    }
  } catch {
    /* fall through to generic text snippet */
  }

  assign("upstream_message", text);
  return sanitized;
}

type AdminAuthorization = { actor: string } | { error: NextResponse };

async function authorizeAdmin(request: NextRequest, requestId: string): Promise<AdminAuthorization> {
  if (request.method !== "GET" && !isTrustedMutation(request)) {
    logAdminProxyEvent("warn", "csrf_rejected", {
      request_id: requestId,
      method: request.method,
      path: request.nextUrl.pathname,
      has_origin: Boolean(requestOrigin(request)),
    });
    return { error: jsonError("csrf_rejected", 403, requestId) };
  }

  const allowedEmails = readAdminEmails();
  if (allowedEmails.size === 0) {
    logAdminProxyEvent("error", "admin_not_configured", {
      request_id: requestId,
      method: request.method,
      path: request.nextUrl.pathname,
    });
    return { error: jsonError("admin_not_configured", 403, requestId) };
  }

  const proxyTarget = String(process.env.NEXT_API_PROXY_TARGET || "http://127.0.0.1:8000").replace(/\/+$/, "");
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value?.trim() || "";
  if (!sessionToken) {
    logAdminProxyEvent("warn", "not_authenticated_missing_session", {
      request_id: requestId,
      method: request.method,
      path: request.nextUrl.pathname,
    });
    return { error: jsonError("not_authenticated", 401, requestId) };
  }

  const meResponse = await fetch(`${proxyTarget}/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      "X-Request-Id": requestId,
      ...cabecalhosDeProcedencia(request),
    },
    cache: "no-store",
  }).catch(() => null);

  if (!meResponse?.ok) {
    logAdminProxyEvent("warn", "not_authenticated_me_failed", {
      request_id: requestId,
      method: request.method,
      path: request.nextUrl.pathname,
      upstream_status: meResponse?.status ?? null,
    });
    return { error: jsonError("not_authenticated", 401, requestId) };
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
    logAdminProxyEvent("warn", "admin_forbidden", {
      request_id: requestId,
      method: request.method,
      path: request.nextUrl.pathname,
      has_email: Boolean(email),
      email_verified: verified,
    });
    return { error: jsonError("admin_forbidden", 403, requestId) };
  }

  return { actor: email };
}

export async function proxyQuestionBankAdmin(
  request: NextRequest,
  questionBankPath: string,
  init?: {
    method?: string;
    body?: BodyInit | null;
    contentType?: string | null;
  },
): Promise<NextResponse> {
  const requestId = createRequestId(request.headers.get("x-request-id"));
  const method = init?.method ?? request.method;
  if (!isAllowedQuestionBankAdminPath(method, questionBankPath)) {
    logAdminProxyEvent("warn", "path_rejected", {
      request_id: requestId,
      method,
      path: questionBankPath.split("?")[0],
    });
    return jsonError("admin_proxy_path_rejected", 403, requestId);
  }
  const authorization = await authorizeAdmin(request, requestId);
  if ("error" in authorization) return authorization.error;

  const target = questionBankTarget();
  if (!target) {
    logAdminProxyEvent("error", "question_bank_admin_not_configured", {
      request_id: requestId,
      method: init?.method ?? request.method,
      path: questionBankPath,
    });
    return jsonError(
      "question_bank_admin_not_configured",
      500,
      requestId,
      "QUESTION_BANK_ADMIN_BASE_URL ou QUESTION_BANK_PUBLIC_BASE_URL nao configurada.",
    );
  }

  const adminKey = String(process.env.QUESTION_BANK_ADMIN_API_KEY ?? "").trim();
  if (!adminKey) {
    logAdminProxyEvent("error", "question_bank_admin_key_missing", {
      request_id: requestId,
      method: init?.method ?? request.method,
      path: questionBankPath,
      target_configured: Boolean(target),
    });
    return jsonError("question_bank_admin_key_missing", 500, requestId);
  }

  const headers = new Headers({
    "X-Question-Bank-Admin-Key": adminKey,
    "X-KrosMed-Admin-Actor": authorization.actor,
    "X-Request-Id": requestId,
  });
  if (init?.contentType?.trim()) {
    headers.set("Content-Type", init.contentType.trim());
  }

  const upstream = await fetch(`${target}${questionBankPath}`, {
    method: init?.method ?? request.method,
    headers,
    body: init?.body ?? null,
    cache: "no-store",
  }).catch(() => null);

  if (!upstream) {
    logAdminProxyEvent("error", "question_bank_upstream_unavailable", {
      request_id: requestId,
      method: init?.method ?? request.method,
      path: questionBankPath,
      target_origin: safeOrigin(target),
    });
    return jsonError("question_bank_upstream_unavailable", 502, requestId);
  }

  const text = await upstream.text();
  if (!upstream.ok) {
    logAdminProxyEvent(upstream.status >= 500 ? "error" : "warn", "question_bank_upstream_error", {
      request_id: requestId,
      method: init?.method ?? request.method,
      path: questionBankPath,
      upstream_status: upstream.status,
      target_origin: safeOrigin(target),
      ...sanitizeUpstreamErrorBody(text),
    });
  }
  const responseHeaders = sanitizeUpstreamHeaders(upstream.headers);
  responseHeaders.set("X-Request-Id", responseHeaders.get("X-Request-Id") || requestId);
  // upstream.text() já entrega o corpo descomprimido; content-length/encoding do
  // upstream descrevem o corpo comprimido e quebram o navegador (ERR_CONTENT_DECODING_FAILED).
  responseHeaders.delete("content-length");
  responseHeaders.delete("content-encoding");

  return new NextResponse(text, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}
