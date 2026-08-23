"use client";

import { useState, type ReactNode } from "react";

import { FaciesPicker } from "@/components/facies/FaciesPicker";
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
 * é, preço — continuam sendo **server components** e entram por dentro. Um
 * componente cliente que envolvesse a página toda arrastaria para o bundle
 * conteúdo que nunca muda, numa página cujo tráfego é pico de WhatsApp.
 *
 * A ordem aqui é a decisão de conversão da página, e é o oposto da anterior:
 *
 *   relatório → **ponte** → (estático) → **e-mail**
 *
 * O gate morava logo depois do relatório, isto é, no instante mais caro: quem
 * acabou de ver a fácies da própria prova está no pico de interesse, e a página
 * gastava esse pico pedindo e-mail. A oferta do produto chegava depois, com o
 * interesse já gasto. Agora a oferta ocupa o pico e o e-mail vira a saída de
 * quem não vai assinar hoje.
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

      {/* O gate MUDOU de lugar: ele agora e a acao primaria da ponte, logo
          acima. Enquanto a assinatura nao abre, o e-mail e a unica conversao
          que se completa — e pedir duas vezes na mesma pagina e pedir mal. */}
      {children}
    </>
  );
}
