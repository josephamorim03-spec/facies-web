"use client";

import { Monitor, Moon, Sun } from "lucide-react";

import { useTema } from "@/hooks/useTema";
import { aplicarTema, CICLO, ROTULO, type Tema } from "@/lib/tema";

const ICONE: Record<Tema, typeof Sun> = {
  claro: Sun,
  escuro: Moon,
  sistema: Monitor,
};

/**
 * O botão de ícone da barra lateral. CICLA pelos três, não alterna dois.
 *
 * ⚠️ Ele alternava `claro ⇄ escuro` e, ao fazê-lo, gravava a chave — o que
 * tornava "seguir o sistema" um estado sem porta de volta. E o ícone era um
 * desenho fixo, igual nos dois estados: não dizia em qual você estava.
 *
 * A escolha por extenso vive em `/voce` (`SeletorDeTema`), que é onde o
 * operador vai procurá-la. Este aqui é o atalho de quem já sabe.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const tema = useTema();

  const Icone = ICONE[tema];
  return (
    <button
      type="button"
      onClick={() => aplicarTema(CICLO[tema])}
      className={`text-muted transition-colors hover:bg-surfaceMuted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`}
      aria-label={`Tema: ${ROTULO[tema]}. Trocar para ${ROTULO[CICLO[tema]]}`}
    >
      <Icone className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
