"use client";

import { useState, type ReactNode } from "react";

import { FaciesPicker } from "@/components/facies/FaciesPicker";
import { GateEmail } from "@/components/facies/GateEmail";
import { PonteDiagnostico } from "@/components/facies/PonteDiagnostico";
import type { Banca } from "@/lib/facies";

/**
 * A parte da home que depende de QUAL banca está na tela.
 *
 * Três coisas precisam desse estado, e elas estão separadas por seções estáticas:
 * o seletor (que o produz), a ponte para o produto (que registra a conversão
 * com a banca de origem) e o gate de e-mail (que precisa saber para quem a
 * leitura semanal deve ser escrita).
 *
 * Por isso `children`: as seções estáticas — o que vem depois de entrar, é/não
 * é, acesso — continuam sendo **server components** e entram por dentro. Um
 * componente cliente que envolvesse a página toda arrastaria para o bundle
 * conteúdo que nunca muda, numa página cujo tráfego é pico de WhatsApp.
 *
 * ## A ordem é a decisão de conversão da página
 *
 *   relatório → ponte → (estático: produto, é/não é, acesso) → **e-mail**
 *
 * Esta ordem já estava escrita aqui e o código não a tinha: o `<GateEmail>`
 * vivia dentro do `PonteDiagnostico`, ou seja, ANTES das seções estáticas. O
 * comentário descrevia uma página que não existia, que é o tipo de divergência
 * que sobrevive justamente por parecer resolvida.
 *
 * Por que o fim, e não o pico: as seções estáticas carregam a prova do produto —
 * as três telas e a captura do `/hoje`. Pedir o e-mail antes delas gasta o
 * interesse antes de mostrar o que se está comprando. No fim, o gate encosta no
 * parágrafo que diz que a assinatura ainda não abriu e vira a resposta dele.
 */
export function FunilHome({
  bancas,
  children,
}: {
  bancas: Banca[];
  children: ReactNode;
}) {
  const [ativa, setAtiva] = useState<Banca | null>(bancas[0] ?? null);

  return (
    <>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3">
        <span className="paper-eyebrow">Ou veja uma prova institucional</span>
      </div>
      <FaciesPicker bancas={bancas} onBancaChange={setAtiva} />

      <PonteDiagnostico banca={ativa?.institution_key ?? null} />

      {children}

      {/* `mt-4`, e não o respiro de ato: o gate é a CONTINUAÇÃO do cartão de
          acesso que fecha o `children` ("o app ainda não está aberto para
          assinatura"), e não uma seção nova. Separá-los quebraria a única
          pergunta que a página faz. */}
      <div className="mt-4">
        <GateEmail banca={ativa?.institution_key ?? null} />
      </div>
    </>
  );
}
