/**
 * O token da sessão já expirou? Decidido no BFF, sem ida ao backend.
 *
 * ## Por que existia e não funcionava
 *
 * `api/[...path]` tinha um `isJwtExpired` que fazia `token.split(".")` e só
 * agia com exatamente 3 partes — o formato JWT. Só que o cookie de sessão da
 * Fácies **não guarda JWT**: guarda o token emitido por `app/auth/local_auth.py`,
 *
 *     kros.v1.<base64url(payload)>.<base64url(assinatura)>
 *
 * que dá QUATRO partes no split. A função retornava `false` para todo token
 * real: o pré-check nunca disparou uma vez sequer desde que foi escrito.
 *
 * Não era falha visível — o 401 do backend é tratado logo abaixo, no mesmo
 * arquivo. Era pior que isso: código que *parece* proteger e não protege. Quem
 * lesse o handler concluiria que requisição com token vencido não sobe, e essa
 * conclusão estaria errada.
 *
 * ## O que ele evita agora
 *
 * Com o aluno voltando a uma aba parada há mais de uma hora, toda requisição da
 * tela subia ao backend só para receber 401. Agora o BFF responde na hora, marca
 * `X-KrosMed-Session-Expired` e o cliente renova — sem gastar a ida.
 *
 * ## Falha ABERTA, sempre
 *
 * Qualquer coisa que não decodifique devolve `false` ("não sei dizer que
 * expirou"), e a decisão volta a ser do backend, que é quem verifica assinatura.
 * O erro caro aqui seria o contrário: declarar expirado um token válido derruba
 * sessão viva a partir de um parser, sem nada ter sido verificado.
 */

/** Tolerância de relógio entre o navegador, o BFF e o backend. */
export const CLOCK_SKEW_SECONDS = 30;

const PREFIXOS_FACIES = ["kros.v1.", "local.v1."] as const;

function decodificarBase64Url(valor: string): string {
  const padding = "=".repeat((4 - (valor.length % 4)) % 4);
  return Buffer.from(valor + padding, "base64").toString("utf8");
}

/**
 * `exp` de um token `kros.v1.`/`local.v1.`.
 *
 * O payload é o texto `v1|uid=<id>|exp=<timestamp>` — ver `issue_app_access_token`
 * em `app/auth/local_auth.py`. Nada é verificado aqui: a assinatura é do backend.
 */
function expiracaoDoTokenFacies(token: string): number | null {
  const prefixo = PREFIXOS_FACIES.find((candidato) => token.startsWith(candidato));
  if (!prefixo) return null;

  const resto = token.slice(prefixo.length);
  const payloadB64 = resto.split(".", 1)[0];
  if (!payloadB64) return null;

  try {
    const partes = decodificarBase64Url(payloadB64).split("|");
    if (partes.length !== 3 || partes[0] !== "v1") return null;
    const exp = partes[2];
    if (!exp?.startsWith("exp=")) return null;
    const timestamp = Number.parseInt(exp.slice("exp=".length), 10);
    return Number.isFinite(timestamp) ? timestamp : null;
  } catch {
    return null;
  }
}

/** `exp` de um JWT (o id_token do Google, no bootstrap). */
function expiracaoDoJwt(token: string): number | null {
  const partes = token.split(".");
  if (partes.length !== 3) return null;
  try {
    const payload = JSON.parse(decodificarBase64Url(partes[1] ?? "")) as Record<string, unknown>;
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

export function tokenEstaExpirado(token: string, agoraSegundos?: number): boolean {
  const normalizado = token.trim();
  if (!normalizado) return false;

  const exp = expiracaoDoTokenFacies(normalizado) ?? expiracaoDoJwt(normalizado);
  if (exp === null) return false;

  const agora = agoraSegundos ?? Math.floor(Date.now() / 1000);
  return agora - CLOCK_SKEW_SECONDS > exp;
}
