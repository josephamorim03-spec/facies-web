import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "krosmed_session";
const REFRESH_COOKIE_NAME = "krosmed_refresh";
const REFRESH_HINT_COOKIE_NAME = "krosmed_refresh_hint";
const TOKEN_COOKIE_NAME = "krosmed_token";
const INTERNAL_CSRF_HEADER = "x-krosmed-csrf";
const INTERNAL_CSRF_VALUE = "1";

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
  // Turbopack dev-server may normalise the hostname; treat 127.0.0.1 and localhost as equivalent
  const normOrigin = normalizeLoopback(origin);
  return (
    normOrigin === normalizeLoopback(request.nextUrl.origin) ||
    normOrigin === normalizeLoopback(requestHostOrigin(request))
  );
}

function isTrustedBrowserMutation(request: NextRequest): boolean {
  return (
    hasTrustedOrigin(request) &&
    request.headers.get(INTERNAL_CSRF_HEADER)?.trim() === INTERNAL_CSRF_VALUE
  );
}

function isSecureRequest(request: NextRequest): boolean {
  if (request.nextUrl.protocol === "https:") return true;
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedProto) {
    return forwardedProto.split(",")[0]?.trim().toLowerCase() === "https";
  }
  return process.env.NODE_ENV === "production";
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isTrustedBrowserMutation(request)) {
    return NextResponse.json({ code: "csrf_rejected" }, { status: 403 });
  }
  const secure = isSecureRequest(request);

  // Forward the token to the backend so it can be revoked server-side.
  const token =
    request.cookies.get(SESSION_COOKIE_NAME)?.value ||
    request.cookies.get(TOKEN_COOKIE_NAME)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value || "";
  if (token || refreshToken) {
    const apiTarget =
      process.env.NEXT_API_PROXY_TARGET || `http://localhost:8000`;
    try {
      await fetch(`${apiTarget}/auth/logout`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch {
      // Backend unreachable is acceptable — cookie removal still happens below.
      // The token will expire naturally within its TTL.
    }
  }

  const response = new NextResponse(null, { status: 204 });

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  });
  response.cookies.set({
    name: TOKEN_COOKIE_NAME,
    value: "",
    sameSite: "strict",
    secure,
    path: "/",
    maxAge: 0,
  });
  response.cookies.set({
    name: REFRESH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/api/auth",
    maxAge: 0,
  });
  response.cookies.set({
    name: REFRESH_HINT_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  });

  return response;
}
