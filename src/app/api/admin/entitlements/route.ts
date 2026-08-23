import { NextRequest } from "next/server";
import { proxyAdmin } from "../_shared/adminProxy";

/**
 * Conceder acesso, e consultar o acesso de um aluno.
 *
 * O `OPS_TOKEN` nunca chega ao navegador: `proxyAdmin` confere que o e-mail da
 * sessao esta em `ADMIN_EMAILS` e so entao injeta o token do lado do servidor.
 * Mutacao exige mesma origem e `X-KrosMed-CSRF`, como todo o resto do BFF.
 */

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("user_id")?.trim();
  if (!userId) {
    return Response.json({ error: "user_id_required" }, { status: 400 });
  }
  // `encodeURIComponent` porque `user_id` entra no CAMINHO: um id com barra
  // reescreveria a rota chamada no backend.
  return proxyAdmin(request, `/ops/entitlements/${encodeURIComponent(userId)}`, {
    method: "GET",
  });
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyAdmin(request, "/ops/entitlements/grant", { method: "POST", body });
}
