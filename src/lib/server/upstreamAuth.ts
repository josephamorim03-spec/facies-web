/**
 * Quem decide a identidade que o BFF envia ao backend: o cookie, e não o cliente.
 *
 * ## O buraco que isto fecha
 *
 * `api/[...path]` copiava TODOS os headers do navegador e só injetava o token do
 * cookie httpOnly quando `authorization` estava ausente:
 *
 *     if (sessionToken && !headers.has("authorization")) { ... }
 *
 * Ou seja: o header escolhido pelo cliente vencia o cookie em qualquer rota. Em
 * produção isso não é impersonação — o backend ainda exige assinatura OIDC
 * válida ou um `kros.v1.` legítimo. Mas em qualquer ambiente com
 * `ALLOW_LEGACY_AUTH_PASSTHROUGH=1` (dev, staging, a suíte) o token **vira** o
 * `user_id`, sem verificação nenhuma: bastava mandar um header para ser quem
 * quisesse. É o modelo de sessão do BFF sendo contornado pelo próprio BFF.
 *
 * ## A exceção, e por que ela é uma só
 *
 * `me` é o BOOTSTRAP do login Google: `useGoogleSignIn` chama `me(idToken)` para
 * descobrir se o backend sabe validar aquele token ANTES de existir cookie de
 * sessão — é assim que a tela distingue "OIDC não configurado" de "credencial
 * inválida". Sem a exceção, o botão do Google perde esse diagnóstico.
 *
 * Em todo o resto: com cookie, o cookie manda; sem cookie, nenhuma identidade
 * escolhida pelo cliente atravessa.
 *
 * ## Por que é função pura, num arquivo separado
 *
 * Para poder ser exercitada sem subir Next: `tests/unit/upstream-auth.test.mjs`
 * roda a matriz inteira (cookie x header x rota) em `node --test`. A regra é de
 * segurança, e regra de segurança que só existe dentro de um route handler é
 * regra que ninguém testa.
 */

/**
 * As ÚNICAS rotas em que um `Authorization` vindo do navegador é repassado.
 *
 * ⚠️ Acrescentar um nome aqui é abrir de novo o buraco descrito acima, para
 * aquela rota. Antes de acrescentar: existe caminho em que o cliente precisa
 * autenticar SEM ter cookie? Se a resposta for não, não entra.
 */
export const BOOTSTRAP_COM_AUTHORIZATION_DO_CLIENTE: ReadonlySet<string> = new Set(["me"]);

export type DecisaoAuthUpstream =
  /** O header do cliente é a credencial: bootstrap, ainda não há sessão. */
  | { acao: "manter-do-cliente" }
  /** O cookie httpOnly manda, sobrescrevendo o que o cliente tenha mandado. */
  | { acao: "usar-cookie"; token: string }
  /** Sem cookie e fora do bootstrap: a requisição segue anônima. */
  | { acao: "remover" };

export function decidirAuthorizationUpstream(params: {
  pathKey: string;
  temAuthorizationDoCliente: boolean;
  sessionToken: string;
}): DecisaoAuthUpstream {
  const { pathKey, temAuthorizationDoCliente } = params;
  const sessionToken = params.sessionToken.trim();

  if (BOOTSTRAP_COM_AUTHORIZATION_DO_CLIENTE.has(pathKey) && temAuthorizationDoCliente) {
    return { acao: "manter-do-cliente" };
  }
  if (sessionToken) {
    return { acao: "usar-cookie", token: sessionToken };
  }
  return { acao: "remover" };
}
