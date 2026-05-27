import { NextRequest } from "next/server";
import { proxyAdminAccessKeys } from "../access-keys/_adminProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = new URLSearchParams();
  const limit = request.nextUrl.searchParams.get("limit");
  const offset = request.nextUrl.searchParams.get("offset");
  const action = request.nextUrl.searchParams.get("action");
  const targetType = request.nextUrl.searchParams.get("target_type");
  if (limit) params.set("limit", limit);
  if (offset) params.set("offset", offset);
  if (action) params.set("action", action);
  if (targetType) params.set("target_type", targetType);
  const qs = params.toString();
  return proxyAdminAccessKeys(
    request,
    `/admin/ops/audit-log${qs ? `?${qs}` : ""}`,
    { method: "GET" },
  );
}
