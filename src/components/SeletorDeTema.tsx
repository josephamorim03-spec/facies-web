"use client";

import { useTema } from "@/hooks/useTema";
import { SegmentedToggle } from "@/components/ui/SegmentedToggle";
import { aplicarTema, ROTULO, type Tema } from "@/lib/tema";

const OPCOES: { value: Tema; label: string }[] = [
  { value: "claro", label: ROTULO.claro },
  { value: "escuro", label: ROTULO.escuro },
  { value: "sistema", label: ROTULO.sistema },
];

/**
 * A escolha do tema, escrita e ao alcance do polegar.
 *
 * ⚠️ **No telefone ela não existia.** O único controle era o ícone do rodapé da
 * barra lateral — e a barra lateral é `hidden lg:flex`. Quem usa a Fácies no
 * celular, que é como ela é usada, não tinha caminho nenhum para o modo escuro
 * a não ser trocar o do sistema inteiro. A segunda porta era dentro de
 * `/preferencias`, numa secção de conta, atrás de duas telas.
 *
 * Fica em `/voce`, no primeiro nível, com as três respostas visíveis ao mesmo
 * tempo: ver qual está ativa é metade do controle.
 */
export function SeletorDeTema() {
  const tema = useTema();

  return (
    <div className="flex min-h-12 items-center justify-between gap-3 border-b border-rule py-3">
      <span className="min-w-0 text-sm text-ink">
        Aparência
        <span className="mt-0.5 block text-nota text-muted">
          Claro, escuro, ou o que o seu aparelho estiver usando
        </span>
      </span>
      <SegmentedToggle
        value={tema}
        onChange={aplicarTema}
        options={OPCOES}
        ariaLabel="Aparência"
      />
    </div>
  );
}
