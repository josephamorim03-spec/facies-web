"use client";

import { useEffect } from "react";

import { aplicarTema, CONSULTA_ESCURO, lerTema } from "@/lib/tema";

/**
 * Aplica o tema guardado e SEGUE o sistema enquanto a página está aberta.
 *
 * ⚠️ O `matchMedia` não existia aqui, e a falta era visível: quem estava em
 * "sistema" e trocava o modo do telefone (ou entrava no horário em que o
 * Android troca sozinho) via a Fácies ficar clara num aparelho escuro até
 * recarregar. O `addEventListener` custa nada e fecha isso.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    aplicarTema(lerTema());

    let consulta: MediaQueryList;
    try {
      consulta = window.matchMedia(CONSULTA_ESCURO);
    } catch {
      return;
    }
    // Só reage quem está em "sistema": uma escolha explícita não é revogada
    // porque o telefone anoiteceu.
    const aoMudar = () => {
      if (lerTema() === "sistema") aplicarTema("sistema");
    };
    consulta.addEventListener("change", aoMudar);
    return () => consulta.removeEventListener("change", aoMudar);
  }, []);
  return <>{children}</>;
}
