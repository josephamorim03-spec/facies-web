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

/** O que o servidor devolve ao definir ou trocar a senha. */
export type SenhaDefinida = {
  /** `true` quando a conta passou a ter senha agora (era só Google). */
  senha_criada: boolean;
  /** E-mail com que a pessoa passa a entrar. Vem da identidade verificada. */
  email: string;
  /** Sessões derrubadas. Zero na primeira definição. */
  sessoes_encerradas: number;
};

/**
 * Define a PRIMEIRA senha, ou troca a que existe.
 *
 * `senhaAtual` fica de fora na primeira definição: conta criada pelo Google não
 * tem senha, e a sessão viva já é a prova de identidade. Quem decide qual caso é
 * o SERVIDOR, olhando se existe conta local — o cliente omitir o campo não
 * dispensa a exigência.
 *
 * O e-mail NÃO viaja no corpo de propósito: ele vem da identidade verificada no
 * servidor. Aceitá-lo daqui deixaria qualquer pessoa logada criar uma conta
 * local com o endereço de outra.
 */
export async function definirSenha(
  senhaNova: string,
  senhaAtual?: string,
  token = "",
): Promise<SenhaDefinida> {
  return api<SenhaDefinida>("/api/account/senha", {
    method: "POST",
    headers: authHeader(token),
    body: JSON.stringify({
      senha_nova: senhaNova,
      ...(senhaAtual ? { senha_atual: senhaAtual } : {}),
    }),
  });
}
