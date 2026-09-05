/**
 * Para onde o `?next=` pode mandar alguém depois do login.
 *
 * ## O buraco
 *
 * A versão anterior recusava valor começando em `//` — e depois **normalizava**,
 * o que recriava exatamente o que ela tinha acabado de recusar:
 *
 *     new URL("/..//evil.com", base).pathname  ===  "//evil.com"
 *
 * `/..` no começo não tem o que subir, some, e sobram duas barras. O resultado
 * voltava como caminho "interno", e `router.replace("//evil.com")` é
 * protocol-relative: o navegador sai do domínio. Redirecionamento aberto
 * clássico, e a ponta útil dele é phishing — a vítima clica num link do domínio
 * real e termina num clone da tela de login.
 *
 * A correção é conferir a **saída**, não só a entrada. Validar antes de
 * normalizar valida uma string que não é a que vai ser usada.
 *
 * ## Por que mora em `lib/`, e não dentro de `page.tsx`
 *
 * É fronteira de segurança, e regra de segurança presa dentro de um componente
 * é regra que ninguém exercita — o mesmo motivo de `rotasPublicas.ts` e de
 * `upstreamAuth.ts` terem saído dos seus arquivos de origem. A matriz está em
 * `tests/unit/destino-interno.test.mjs`.
 */

/** Base sintética: só existe para o parser resolver caminho relativo. */
const BASE_SINTETICA = "http://facies.local";

/**
 * O caminho interno de *value*, ou `null` se ele não for seguramente interno.
 *
 * Devolve sempre caminho relativo — nunca origem — para que nenhum host
 * atravesse, mesmo que o parser aceite a string.
 */
export function destinoInternoSeguro(value: string | null | undefined): string | null {
  const normalized = String(value ?? "").trim();
  if (!normalized.startsWith("/") || normalized.startsWith("//")) return null;
  // `/login` e `/auth` sairiam num laço: o destino pós-login não pode ser a
  // própria tela de login.
  if (normalized.startsWith("/login") || normalized.startsWith("/auth")) return null;

  let destino: string;
  try {
    const parsed = new URL(normalized, BASE_SINTETICA);
    // Só caminho, busca e âncora. Descartar `origin` é o que impede um host de
    // atravessar caso o parser aceite algo inesperado.
    destino = `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }

  // A conferência que faltava. Depois de normalizar, `//` volta a significar
  // "protocol-relative" para o navegador — e é aqui que `/..//evil.com` morre.
  if (!destino.startsWith("/") || destino.startsWith("//")) return null;
  return destino;
}
