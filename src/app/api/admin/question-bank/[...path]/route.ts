import { NextRequest } from "next/server";

import { proxyQuestionBankAdmin } from "../_questionBankProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildUpstreamPath(request: NextRequest, path: string[]): string {
  const cleanPath = path.map((segment) => encodeURIComponent(segment)).join("/");
  return `/v1/admin/${cleanPath}${request.nextUrl.search}`;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyQuestionBankAdmin(request, buildUpstreamPath(request, path), { method: "GET" });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const contentType = request.headers.get("content-type");
  const bodyBuffer = Buffer.from(await request.arrayBuffer());
  return proxyQuestionBankAdmin(request, buildUpstreamPath(request, path), {
    method: "POST",
    body: bodyBuffer.byteLength > 0 ? bodyBuffer : null,
    contentType,
  });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const contentType = request.headers.get("content-type");
  const bodyBuffer = Buffer.from(await request.arrayBuffer());
  return proxyQuestionBankAdmin(request, buildUpstreamPath(request, path), {
    method: "PATCH",
    body: bodyBuffer.byteLength > 0 ? bodyBuffer : null,
    contentType: contentType ?? "application/json",
  });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyQuestionBankAdmin(request, buildUpstreamPath(request, path), { method: "DELETE" });
}
