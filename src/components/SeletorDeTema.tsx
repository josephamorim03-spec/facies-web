"use client";

import { useTemaEfetivo } from "@/hooks/useTemaEfetivo";
import { SegmentedToggle } from "@/components/ui/SegmentedToggle";
import { aplicarTema, ROTULO } from "@/lib/tema";

const OPCOES = [
  { value: "claro" as const, label: ROTULO.claro },
  { value: "escuro" as const, label: ROTULO.escuro },
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
 * Fica em `/voce`, no primeiro nível: ver qual está ativa é metade do controle.
 *
 * ## DUAS opções, e não três — a pedido do operador (2026-09-06)
 *
 * O modelo guardado continua com três estados, e continua a começar em
 * "sistema": até a primeira escolha, a Fácies segue o aparelho. O que saiu foi
 * o BOTÃO de sistema.
 *
 * ⚠️ O motivo é medido, não estético: com o aparelho em claro, "Sistema" e
 * "Claro" pintam exatamente a mesma tela. Um controle com duas posições que
 * fazem a mesma coisa não informa — ele faz o olho procurar uma diferença que
 * não existe, que é o oposto do que um seletor serve.
 *
 * ⚠️ **E há um custo, escrito para não ser descoberto depois.** Sem o botão,
 * não há caminho de volta para "seguir o aparelho" a partir da interface — só
 * limpando os dados do site. O `lib/tema.ts` avisa disto em letra, e a escolha
 * de assumir o custo é do operador, que é o único utilizador.
 *
 * O ativo mostra o tema EFETIVO: quem nunca escolheu vê marcada a posição que
 * o aparelho está a pintar, em vez de nenhuma.
 */
export function SeletorDeTema() {
  // O EFETIVO, e não o escolhido: quem nunca escolheu vê marcada a posição que
  // o aparelho está a pintar, em vez de nenhuma das duas.
  const tema = useTemaEfetivo();

  return (
    /* ⚠️ EMPILHA E CENTRA ABAIXO DE `sm`. Medido a 390px: o segmentado
        ficava a +122px do centro, espremido contra a margem direita por um
        `justify-between` que servia bem o desktop e mal o telemóvel.

        ⚠️ E CENTRA A LINHA INTEIRA, rótulo incluído — não só o controlo.
        Centrar apenas o segmentado deixaria-o órfão do texto que o nomeia,
        que é o oposto do que uma linha de definições faz. É o mesmo
        tratamento dos cabeçalhos do cronograma: título e ação em linhas
        próprias no telemóvel, na mesma linha a partir de `sm`. */
    <div className="flex min-h-12 flex-col items-center gap-2 border-b border-rule py-3 text-center sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:text-left">
      <span className="min-w-0 text-sm text-ink">
        Aparência
        <span className="mt-0.5 block text-nota text-muted">
          Começa seguindo o seu aparelho até você escolher
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
