import { NextRequest } from "next/server";
import { proxyAdminAccessKeys } from "./_adminProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = new URLSearchParams();
  const mentorLabel = request.nextUrl.searchParams.get("mentor_label");
  const q = request.nextUrl.searchParams.get("q");
  const status = request.nextUrl.searchParams.get("status");
  if (mentorLabel) params.set("mentor_label", mentorLabel);
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  const qs = params.toString();
  return proxyAdminAccessKeys(
    request,
    `/ops/access-keys${qs ? `?${qs}` : ""}`,
    { method: "GET" },
  );
}

export async function POST(request: NextRequest) {
  return proxyAdminAccessKeys(request, "/ops/access-keys/batch", {
    method: "POST",
    body: await request.text(),
  });
}
