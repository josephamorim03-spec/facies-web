import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_COOKIE_NAME = "krosmed_session";
const INTERNAL_CSRF_HEADER = "x-krosmed-csrf";
const INTERNAL_CSRF_VALUE = "1";

function targetBase(): string {
  return String(
    process.env.QUESTION_BANK_ADMIN_BASE_URL ||
      process.env.QUESTION_BANK_PUBLIC_BASE_URL ||
      "",
  ).replace(/\/+$/, "");
}

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

async function currentUserId(request: NextRequest, token: string): Promise<string | null> {
  const response = await fetch(`${apiTarget()}/me`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  }).catch(() => null);
  if (!response?.ok) return null;
  const identity = await response.json().catch(() => null);
  if (!identity || typeof identity !== "object" || Array.isArray(identity)) return null;
  const record = identity as Record<string, unknown>;
  return String(record.id ?? record.user_id ?? record.sub ?? record.email ?? "").trim() || null;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ questionId: string }> },
) {
  if (request.headers.get(INTERNAL_CSRF_HEADER)?.trim() !== INTERNAL_CSRF_VALUE) {
    return jsonError("csrf_rejected", 403);
  }
  const token = bearerToken(request);
  if (!token) return jsonError("not_authenticated", 401);
  const userId = await currentUserId(request, token);
  if (!userId) return jsonError("not_authenticated", 401);

  const baseUrl = targetBase();
  const adminKey = String(process.env.QUESTION_BANK_ADMIN_API_KEY ?? "").trim();
  if (!baseUrl || !adminKey) {
    return jsonError(
      "question_bank_ai_correction_unavailable",
      503,
      "Question Bank canonical AI enrichment is not configured.",
    );
  }

  const { questionId } = await context.params;
  const cleanQuestionId = String(questionId || "").trim();
  if (!cleanQuestionId) return jsonError("question_id_required", 422);

  const upstream = await fetch(
    `${baseUrl}/v1/admin/questions/${encodeURIComponent(cleanQuestionId)}/analyze`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Question-Bank-Admin-Key": adminKey,
      },
      body: JSON.stringify({
        source: "student_requested",
        requested_by_user_id: userId,
      }),
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
