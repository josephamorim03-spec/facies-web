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
 * Dois formatos de payload convivem, e os dois precisam ser lidos:
 *
 *   v1|uid=<id>|exp=<ts>
 *   v2|cls=<kros|local>|uid=<id>|iat=<ts>|exp=<ts>
 *
 * O `v2` assina a CLASSE do token e carrega o instante de emissão — ver
 * `_montar_payload` em `app/auth/local_auth.py`. O PREFIXO continua `.v1.` nos
 * dois: ele virou rótulo de transporte quando a classe passou a ser assinada.
 *
 * ⚠️ Ler só o `v1` aqui não daria erro: devolveria `null`, o pré-check de
 * expiração pararia de disparar e nada apareceria. É exatamente o defeito que
 * este arquivo foi criado para consertar, e ele voltaria pela porta do formato
 * novo. Nada é verificado aqui: a assinatura é do backend.
 */
function expiracaoDoTokenFacies(token: string): number | null {
  const prefixo = PREFIXOS_FACIES.find((candidato) => token.startsWith(candidato));
  if (!prefixo) return null;

  const resto = token.slice(prefixo.length);
  const payloadB64 = resto.split(".", 1)[0];
  if (!payloadB64) return null;

  try {
    const partes = decodificarBase64Url(payloadB64).split("|");
    // `v1|uid=…|exp=…` (3 campos) e `v2|cls=…|uid=…|iat=…|exp=…` (5). O `exp` é
    // sempre o ÚLTIMO, então a leitura não depende da posição fixa — o que
    // importa aqui, porque este parser é o que falha ABERTO: um `null` desliga o
    // pré-check em silêncio, e foi assim que a versão anterior dele passou meses
    // sem nunca disparar.
    const versao = partes[0];
    if (versao !== "v1" && versao !== "v2") return null;
    if (versao === "v1" && partes.length !== 3) return null;
    if (versao === "v2" && partes.length !== 5) return null;
    const exp = partes[partes.length - 1];
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
