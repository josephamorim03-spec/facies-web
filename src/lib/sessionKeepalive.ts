import { refreshAuthSession } from "./auth";
import { isSessionExpirationSuppressedPath, subscribeSessionRenewed } from "./sessionExpiration";

/**
 * Renovação proativa da sessão.
 *
 * O caminho reativo (renovar depois de tomar 401) funciona, mas concentra várias
 * requisições expirando no mesmo instante e faz o aluno pagar a latência do
 * refresh no meio de uma ação. Renovar antes do vencimento mantém o access token
 * sempre válido durante o uso, e o modal de sessão expirada volta a significar o
 * que diz: o refresh realmente morreu.
 *
 * Não há timer quando a aba está oculta — navegador em background estrangula
 * timers e não há nada a renovar sem usuário ativo. Ao voltar, renova na hora se
 * o prazo já passou.
 */

/** Fração do TTL em que a renovação é agendada. */
const REFRESH_AT_FRACTION = 0.8;
/** Piso de segurança: nunca agendar a menos de 30 s do agora. */
const MIN_DELAY_MS = 30_000;
/** TTL assumido quando o BFF não informa `expires_in`. */
const FALLBACK_TTL_SECONDS = 15 * 60;

function computeDelayMs(expiresInSeconds: number): number {
  return Math.max(MIN_DELAY_MS, Math.floor(expiresInSeconds * REFRESH_AT_FRACTION * 1000));
}

/**
 * Inicia o keepalive. Retorna a função de limpeza (para usar no `useEffect`).
 */
export function startSessionKeepalive(): () => void {
  if (typeof window === "undefined") return () => undefined;

  let timerId: ReturnType<typeof setTimeout> | null = null;
  let dueAt = 0;
  let stopped = false;

  function clearTimer(): void {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  }

  function isEligible(): boolean {
    return !stopped && !isSessionExpirationSuppressedPath(window.location.pathname);
  }

  function schedule(expiresInSeconds: number): void {
    clearTimer();
    if (!isEligible()) return;
    const delay = computeDelayMs(expiresInSeconds);
    dueAt = Date.now() + delay;
    if (document.visibilityState !== "visible") return;
    timerId = setTimeout(runRefresh, delay);
  }

  function runRefresh(): void {
    clearTimer();
    if (!isEligible()) return;
    void refreshAuthSession().then((outcome) => {
      // Sucesso re-agenda via evento `session-renewed`. Falha não insiste: o
      // caminho reativo do http.ts decide entre retry e sessão expirada.
      if (outcome === "failed") dueAt = 0;
      // "raced": outra aba renovou e já disparou o evento — nada a fazer aqui.
    });
  }

  function handleVisibilityChange(): void {
    if (document.visibilityState !== "visible") {
      clearTimer();
      return;
    }
    if (!isEligible() || dueAt === 0) return;
    const remaining = dueAt - Date.now();
    if (remaining <= 0) {
      runRefresh();
      return;
    }
    clearTimer();
    timerId = setTimeout(runRefresh, remaining);
  }

  const unsubscribe = subscribeSessionRenewed(({ expiresInSeconds }) => {
    schedule(expiresInSeconds && expiresInSeconds > 0 ? expiresInSeconds : FALLBACK_TTL_SECONDS);
  });
  window.addEventListener("visibilitychange", handleVisibilityChange);

  // Sessão pré-existente (recarregar a página não reemite cookie): agenda com o
  // TTL de fallback e deixa o primeiro refresh corrigir o relógio.
  schedule(FALLBACK_TTL_SECONDS);

  return () => {
    stopped = true;
    clearTimer();
    unsubscribe();
    window.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}
