/**
 * O IP do aluno, repassado do BFF para a API.
 *
 * ## O que estava quebrado
 *
 * Oito dos nove arquivos que falam com o backend montam um objeto de headers
 * NOVO para o `fetch` — inclusive `api/auth/session` e `api/auth/session/refresh`,
 * que são o login em produção. Nenhum header de encaminhamento atravessa, então
 * `client_ip()` no backend enxerga o IP de saída da função da Vercel, igual para
 * toda a base. Três controles diferentes dependiam disso:
 *
 * - os tetos por IP de `auth:*`, `facies_*` e `cadastro` viravam UM balde só;
 * - a trilha de acesso (`refresh_sessions.ip_address`, `terms_accept_ip`, o
 *   `ip_hash` do aceite legal) gravava o endereço de um datacenter, que é a
 *   mesma resposta para todos os titulares — ou seja, nenhuma;
 * - o `remote_ip` mandado ao reCAPTCHA, com que o Google pontua risco.
 *
 * ## Por que um header próprio, e não repassar `X-Forwarded-For`
 *
 * O backend lê o ÚLTIMO salto de `X-Forwarded-For` de propósito: o primeiro é
 * escolhido pelo cliente. Reencaminhar o header não muda nada — o último salto
 * continua sendo o que o proxy da Railway acrescenta, ou seja, a Vercel. Ficaria
 * igual e *pareceria* corrigido, que é a pior combinação.
 *
 * Por isso o header tem nome próprio e é autenticado por segredo compartilhado,
 * não por posição. Sem `FACIES_PROXY_TOKEN` configurado dos dois lados, nada é
 * enviado e o backend se comporta exatamente como antes: a variável ausente não
 * pode piorar nada.
 *
 * ## O que este valor NÃO é
 *
 * Não é uma identidade confiável. Ele depende de a Vercel sobrescrever o
 * `x-forwarded-for` que o navegador manda, e depende de o segredo não vazar. Por
 * isso o backend o usa para ACRESCENTAR um segundo balde, nunca para substituir
 * o balde da chave não-forjável — ver `ip_de_origem` em `app/api/rate_limit.py`.
 * O pior caso continua sendo o comportamento de hoje.
 */

import type { NextRequest } from "next/server";

export const CABECALHO_IP_DE_ORIGEM = "X-Facies-Client-IP";
export const CABECALHO_TOKEN_DE_PROCEDENCIA = "X-Facies-Proxy-Token";

/**
 * Os dois headers acima, em minúsculas, para remoção.
 *
 * O proxy catch-all copia TODOS os headers do cliente antes de acrescentar os
 * seus. Sem apagar estes dois primeiro, qualquer pessoa poderia declarar o
 * próprio IP — e o segredo, se o adivinhasse — através da nossa própria rota.
 */
export const CABECALHOS_DE_PROCEDENCIA_MINUSCULOS = [
  CABECALHO_IP_DE_ORIGEM.toLowerCase(),
  CABECALHO_TOKEN_DE_PROCEDENCIA.toLowerCase(),
] as const;

/** Descarta porta (`1.2.3.4:5678`) e colchetes de IPv6 (`[::1]`). */
function limparEndereco(bruto: string): string {
  const valor = bruto.trim();
  if (valor.startsWith("[")) {
    const fim = valor.indexOf("]");
    return fim > 0 ? valor.slice(1, fim) : valor;
  }
  // Só desmembra quando há exatamente um `:` — dois ou mais são IPv6 sem porta.
  const partes = valor.split(":");
  return partes.length === 2 ? partes[0]!.trim() : valor;
}

/**
 * O IP do aluno, segundo a Vercel.
 *
 * `x-real-ip` primeiro: é o header de valor único que a plataforma escreve.
 * `x-forwarded-for` é a alternativa, e aí vale o PRIMEIRO salto — na borda da
 * Vercel é o cliente, e os saltos seguintes seriam proxies dela.
 */
export function ipDoCliente(request: NextRequest): string | null {
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return limparEndereco(real) || null;

  const encaminhado = request.headers.get("x-forwarded-for")?.trim();
  if (!encaminhado) return null;
  const primeiro = encaminhado.split(",")[0]?.trim();
  return primeiro ? limparEndereco(primeiro) || null : null;
}

/**
 * Os headers de procedência a acrescentar no `fetch` ao backend.
 *
 * Objeto vazio quando falta o segredo ou o IP — o chamador espalha o resultado
 * e não precisa saber a diferença.
 */
export function cabecalhosDeProcedencia(request: NextRequest): Record<string, string> {
  const token = String(process.env.FACIES_PROXY_TOKEN ?? "").trim();
  if (!token) return {};
  const ip = ipDoCliente(request);
  if (!ip) return {};
  return {
    [CABECALHO_IP_DE_ORIGEM]: ip,
    [CABECALHO_TOKEN_DE_PROCEDENCIA]: token,
  };
}
