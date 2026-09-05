import { NextRequest, NextResponse } from "next/server";
import { cabecalhosDeProcedencia } from "@/lib/server/procedencia";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_COOKIE_NAME = "krosmed_session";

function apiTarget(): string {
  return String(process.env.NEXT_API_PROXY_TARGET || "http://127.0.0.1:8000").replace(/\/+$/, "");
}

function jsonError(code: string, status: number, message?: string): NextResponse {
  return NextResponse.json({ code, message }, { status });
}

function bearerToken(request: NextRequest): string {
  const auth = request.headers.get("authorization")?.trim() || "";
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return request.cookies.get(SESSION_COOKIE_NAME)?.value?.trim() || "";
}

export async function GET(request: NextRequest) {
  const token = bearerToken(request);
  if (!token) return jsonError("not_authenticated", 401);

  const upstream = await fetch(
    `${apiTarget()}/question-bank/admin/ai-resolution-requests${request.nextUrl.search}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, ...cabecalhosDeProcedencia(request) },
      cache: "no-store",
    },
  ).catch(() => null);
  if (!upstream) return jsonError("question_bank_upstream_unavailable", 502);

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: { "Content-Type": upstream.headers.get("content-type") || "application/json" },
  });
}
