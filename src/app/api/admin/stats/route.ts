import { NextRequest } from "next/server";
import { proxyAdminAccessKeys } from "../access-keys/_adminProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return proxyAdminAccessKeys(request, "/admin/stats", { method: "GET" });
}
