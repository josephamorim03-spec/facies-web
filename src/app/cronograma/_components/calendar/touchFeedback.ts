/**
 * Retorno tatil compartilhado pelos dois arrastos por toque do calendario
 * (sessoes de estudo e compromissos). E o unico sinal de que o long-press
 * armou o arrasto antes de o fantasma aparecer, entao os dois fluxos precisam
 * emitir o mesmo pulso.
 */
export function vibrateLongPress() {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(12);
  } catch {
    // ignore
  }
}
