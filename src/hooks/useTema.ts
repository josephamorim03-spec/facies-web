"use client";

import { useSyncExternalStore } from "react";

import { assinarTema, lerTema, type Tema } from "@/lib/tema";

/**
 * O tema escolhido, lido da loja externa.
 *
 * `useSyncExternalStore` e não `useState` + `useEffect`: o tema mora no
 * `localStorage` e numa classe do `<html>`, fora do React. A leitura por efeito
 * dava um render extra em cada montagem — que o `react-hooks/set-state-in-effect`
 * reprova — e deixava as duas superfícies que o mostram (o ícone da barra
 * lateral e o seletor de `/voce`) sem saber uma da outra.
 *
 * O snapshot do SERVIDOR é `"sistema"`, e tem de ser: no servidor não há
 * `localStorage` nem `matchMedia`, e é o mesmo padrão que o script de boot
 * assume antes da primeira pintura.
 */
export function useTema(): Tema {
  return useSyncExternalStore(assinarTema, lerTema, () => "sistema" as Tema);
}
