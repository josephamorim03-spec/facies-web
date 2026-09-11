"use client";

import { useSyncExternalStore } from "react";

import { assinarTema, CONSULTA_ESCURO, lerTema, temaEfetivo } from "@/lib/tema";

/**
 * O tema que a tela está REALMENTE a pintar — `claro` ou `escuro`, nunca
 * `sistema`.
 *
 * ## Porque não basta chamar `temaEfetivo(useTema())`
 *
 * ⚠️ **Duas armadilhas, e as duas silenciosas.**
 *
 * 1. `temaEfetivo` consulta `window.matchMedia` durante o render. No servidor
 *    não há `matchMedia`, o `try/catch` devolve `"claro"`, e no cliente a mesma
 *    linha pode devolver `"escuro"` — divergência de hidratação num atributo
 *    (`aria-pressed`) que ninguém vai notar até um leitor de tela anunciar o
 *    estado errado.
 * 2. A loja do tema (`assinarTema`) só avisa quando alguém ESCOLHE. Se o
 *    aparelho trocar de claro para escuro com a página aberta — e trocar sozinho
 *    é justamente o que o modo automático dos telemóveis faz ao anoitecer — o
 *    seletor continuaria a marcar a posição antiga.
 *
 * Aqui a assinatura cobre as duas fontes, e o snapshot do servidor é `"claro"`:
 * é o que o script de boot assume antes da primeira pintura, então servidor e
 * cliente concordam.
 */
export function useTemaEfetivo(): "claro" | "escuro" {
  return useSyncExternalStore(
    (aoMudar) => {
      const desassinarEscolha = assinarTema(aoMudar);
      let media: MediaQueryList | null = null;
      try {
        media = window.matchMedia(CONSULTA_ESCURO);
        media.addEventListener("change", aoMudar);
      } catch {
        // Navegador sem `matchMedia`: só a escolha explícita move o seletor.
      }
      return () => {
        desassinarEscolha();
        media?.removeEventListener("change", aoMudar);
      };
    },
    () => temaEfetivo(lerTema()),
    () => "claro" as const,
  );
}
