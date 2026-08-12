import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_COOKIE_NAME = "krosmed_session";
const INTERNAL_CSRF_HEADER = "x-krosmed-csrf";
const INTERNAL_CSRF_VALUE = "1";

function apiTarget(): string {
  return String(process.env.NEXT_API_PROXY_TARGET || "http://127.0.0.1:8000").replace(/\/+$/, "");
}

function tokenFor(request: NextRequest): string {
  const auth = request.headers.get("authorization")?.trim() || "";
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return request.cookies.get(SESSION_COOKIE_NAME)?.value?.trim() || "";
}

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  if (request.method !== "GET" && request.headers.get(INTERNAL_CSRF_HEADER) !== INTERNAL_CSRF_VALUE) {
    return NextResponse.json({ code: "csrf_rejected" }, { status: 403 });
  }
  const token = tokenFor(request);
  if (!token) return NextResponse.json({ code: "not_authenticated" }, { status: 401 });
  const { path } = await context.params;
  const encodedPath = path.map((part) => encodeURIComponent(String(part))).join("/");
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
  const idempotencyKey = request.headers.get("idempotency-key");
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  let body: string | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    body = await request.text();
    headers["Content-Type"] = request.headers.get("content-type") || "application/json";
  }
  const upstream = await fetch(
    `${apiTarget()}/question-bank/${encodedPath}${request.nextUrl.search}`,
    { method: request.method, headers, body, cache: "no-store" },
  ).catch(() => null);
  if (!upstream) {
    return NextResponse.json({ code: "question_bank_upstream_unavailable" }, { status: 502 });
  }
  const responseHeaders = new Headers({
    "Content-Type": upstream.headers.get("content-type") || "application/json",
    "Cache-Control": "no-store",
  });
  const location = upstream.headers.get("location");
  if (location) {
    const rewritten = location.startsWith("/question-bank/")
      ? `/api${location}`
      : location;
    responseHeaders.set("Location", rewritten);
  }
  return new NextResponse(await upstream.text(), {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
