"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Texto que aparece sendo digitado — uma vez por aba, e nunca à custa da leitura.
 *
 * Quatro travas, todas porque a mesma pessoa vê isto muitas vezes:
 *
 * 1. **Uma vez por aba** (`sessionStorage`, chave por `storageKey`). Quem abre o
 *    Kros seis vezes num dia vê a animação na primeira.
 * 2. **`prefers-reduced-motion` manda.** Texto que aparece letra a letra É
 *    movimento; quem pediu menos ao sistema recebe o texto pronto.
 * 3. **O texto completo está sempre no DOM.** O que anima é um recorte visual —
 *    o leitor de tela lê a frase inteira, de uma vez, e a busca do navegador
 *    encontra a palavra mesmo durante a animação.
 * 4. **Curta.** 28ms por caractere, teto de ~1,2s: passado isso, o resto
 *    aparece de uma vez. Uma pergunta de seis palavras não pode custar espera.
 */
const MS_PER_CHAR = 28;
const MAX_TOTAL_MS = 1200;

export function TypedText({
  text,
  storageKey,
  className = "",
}: {
  text: string;
  /** Chave em `sessionStorage`. Duas frases na mesma tela compartilham a chave. */
  storageKey: string;
  className?: string;
}) {
  const [shown, setShown] = useState<number | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    // A decisão depende de `sessionStorage` e `matchMedia`, que só existem no
    // cliente — então ela não pode virar estado inicial (o servidor renderizaria
    // diferente e a hidratação divergiria). Um quadro de atraso é imperceptível.
    const frame = window.requestAnimationFrame(() => {
      let seen = true;
      try {
        seen = sessionStorage.getItem(storageKey) === "1";
      } catch {
        // Armazenamento bloqueado: trata como já visto. Repetir a cada
        // navegação é pior do que nunca animar.
      }
      const reduced =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (seen || reduced) {
        setShown(text.length);
        return;
      }
      try {
        sessionStorage.setItem(storageKey, "1");
      } catch {
        // Sem persistência a animação repetiria; exibi-la uma vez ainda é certo.
      }
      setShown(0);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [storageKey, text.length]);

  useEffect(() => {
    if (shown === null || shown >= text.length || doneRef.current) return;
    const step = Math.max(1, Math.ceil(text.length / (MAX_TOTAL_MS / MS_PER_CHAR)));
    const timer = window.setTimeout(() => {
      setShown((current) => {
        const next = Math.min(text.length, (current ?? 0) + step);
        if (next >= text.length) doneRef.current = true;
        return next;
      });
    }, MS_PER_CHAR);
    return () => window.clearTimeout(timer);
  }, [shown, text.length]);

  const typing = shown !== null && shown < text.length;

  return (
    <span className={className}>
      {/* O texto inteiro existe sempre; o recorte é só visual. */}
      <span aria-hidden="true">{shown === null ? text : text.slice(0, shown)}</span>
      <span className="sr-only">{text}</span>
      {typing ? <span className="chrome-cursor" aria-hidden="true" /> : null}
    </span>
  );
}
