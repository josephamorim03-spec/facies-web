import { api, authHeader } from "../shared/http";

/**
 * Conta do titular: sessões e direitos de LGPD.
 *
 * O backend de exportação e exclusão existia desde sempre e **nunca teve tela** —
 * os endpoints só apareciam no schema gerado. Direito que só existe por `curl`
 * não é direito exercível.
 */

export type SessaoAtiva = {
  session_id: string;
  created_at: string;
  last_used_at: string | null;
  expires_at: string;
};

export async function listarSessoes(token = ""): Promise<{ sessions: SessaoAtiva[] }> {
  return api<{ sessions: SessaoAtiva[] }>("/api/account/sessions", {
    headers: authHeader(token),
  });
}

export async function encerrarTodasAsSessoes(token = ""): Promise<{ revoked: number }> {
  return api<{ revoked: number }>("/api/account/sessions/revoke-all", {
    method: "POST",
    headers: authHeader(token),
  });
}

/**
 * A exclusão exige o e-mail exato da conta no corpo — confirmação explícita de
 * ação irreversível, checada no servidor.
 */
export async function excluirConta(
  email: string,
  token = "",
): Promise<{ deleted: boolean }> {
  return api<{ deleted: boolean }>("/api/account/delete", {
    method: "POST",
    headers: authHeader(token),
    body: JSON.stringify({ email }),
  });
}

/** Caminho da exportação. O download é navegação direta, não `fetch`. */
export const CAMINHO_EXPORTACAO = "/api/account/export";
