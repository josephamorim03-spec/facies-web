import { NextRequest } from "next/server";
import { proxyAdmin } from "../../../_shared/adminProxy";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entitlementId: string }> },
) {
  const { entitlementId } = await params;
  return proxyAdmin(
    request,
    `/ops/entitlements/${encodeURIComponent(entitlementId)}/revoke`,
    { method: "POST" },
  );
}
