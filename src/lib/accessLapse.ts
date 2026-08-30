/**
 * O acesso venceu com a pessoa DENTRO do app.
 *
 * ## O buraco que isto fecha
 *
 * O portão de acesso (`require_active_access`) protege 186 rotas e devolve 403
 * `access_denied` quando o direito não está mais vivo. O roteamento para
 * `/ativar-acesso` existia só em `resolveAuthenticatedLandingRoute` — ou seja,
 * **no login**. Quem já estava com o app aberto quando o direito venceu não era
 * levado a lugar nenhum: cada painel disparava sua própria chamada, cada uma
 * voltava 403, e a tela virava um mosaico de erros genéricos sem dizer o que
 * houve nem o que fazer.
 *
 * Hoje isso acontece quando o trial de 14 dias termina com a aba aberta. Quando
 * houver assinatura, passa a ser rotina — cartão recusado, ciclo não renovado.
 *
 * ## Por que header, e não o corpo da resposta
 *
 * Detectar pelo corpo exigiria ler o stream de toda resposta de erro, no
 * caminho quente, para achar um caso raro. O 401 já resolveu isso com
 * `X-KrosMed-Session-Expired`, e aqui seguimos o mesmo desenho: quem sabe
 * distinguir um 403 de acesso de um 403 de e-mail não verificado é o backend,
 * então é ele que marca (`app/api/deps.py`), e o BFF só repassa.
 *
 * ## Por que uma trava de disparo único
 *
 * Uma tela do Fácies dispara várias chamadas em paralelo. Sem a trava, um único
 * vencimento gera um evento por requisição em voo — e o app tentaria navegar
 * várias vezes. `acessoVencidoPendente` faz o primeiro ganhar e os demais serem
 * descartados, exatamente como `sessionExpiredPending` faz do outro lado.
 */

export const ACCESS_DENIED_EVENT = "krosmed:access-denied";

/** Posto pelo backend no 403 do portão; o BFF copia os headers do upstream. */
export const ACCESS_DENIED_HEADER = "X-KrosMed-Access-Denied";

export type AccessDeniedEventDetail = {
  /** Caminho da API que topou no portão. Só para telemetria e depuração. */
  path?: string;
};

let acessoVencidoPendente = false;

function podeUsarNavegador(): boolean {
  return typeof window !== "undefined";
}

/**
 * Telas onde o aviso seria ruído: quem já está na tela de ativar acesso não
 * precisa ser mandado para ela, e o funil público não tem sessão.
 */
export function isAccessLapseSuppressedPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/cadastro") ||
    pathname.startsWith("/facies") ||
    pathname.startsWith("/ativar-acesso") ||
    pathname.startsWith("/assinar")
  );
}

export function isAccessDeniedApiResponse(res: {
  status: number;
  headers: Pick<Headers, "get">;
}): boolean {
  return res.status === 403 && res.headers.get(ACCESS_DENIED_HEADER) === "1";
}

export function dispatchAccessDenied(detail: AccessDeniedEventDetail = {}): boolean {
  if (!podeUsarNavegador()) return false;
  if (acessoVencidoPendente) return false;
  acessoVencidoPendente = true;
  window.dispatchEvent(
    new CustomEvent<AccessDeniedEventDetail>(ACCESS_DENIED_EVENT, { detail }),
  );
  return true;
}

export function subscribeAccessDenied(
  callback: (detail: AccessDeniedEventDetail) => void,
): () => void {
  if (!podeUsarNavegador()) return () => undefined;

  function handleEvent(event: Event) {
    callback((event as CustomEvent<AccessDeniedEventDetail>).detail ?? {});
  }

  window.addEventListener(ACCESS_DENIED_EVENT, handleEvent);
  return () => window.removeEventListener(ACCESS_DENIED_EVENT, handleEvent);
}

/** Libera a trava — chamar depois de tratar, e nos testes. */
export function resetAccessLapseState(): void {
  acessoVencidoPendente = false;
}
