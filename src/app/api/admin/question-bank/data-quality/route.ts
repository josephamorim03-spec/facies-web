import { NextRequest } from "next/server";

import { proxyAdmin } from "../../_shared/adminProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.search || "?min_attempts=30&limit=500";
  return proxyAdmin(request, `/question-bank/admin/data-quality${search}`, {
    method: "GET",
  });
}
