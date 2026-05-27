import { NextRequest } from "next/server";
import { proxyAdminAccessKeys } from "../../_adminProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ keyId: string }> },
) {
  const { keyId } = await context.params;
  return proxyAdminAccessKeys(
    request,
    `/ops/access-keys/${encodeURIComponent(keyId)}/extend`,
    {
      method: "POST",
      body: await request.text(),
    },
  );
}
