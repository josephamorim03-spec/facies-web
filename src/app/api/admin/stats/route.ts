import { NextRequest } from "next/server";
import { proxyAdmin } from "../_shared/adminProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return proxyAdmin(request, "/admin/stats", { method: "GET" });
}
