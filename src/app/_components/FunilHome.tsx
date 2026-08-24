"use client";

import { useState, type ReactNode } from "react";

import { FaciesPicker } from "@/components/facies/FaciesPicker";
import { GateEmail } from "@/components/facies/GateEmail";
import { PonteDiagnostico } from "@/components/facies/PonteDiagnostico";
import type { Banca } from "@/lib/facies";
import type { Prova } from "@/lib/provas";

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
  prova,
  children,
}: {
  bancas: Banca[];
  prova?: Prova | null;
  children: ReactNode;
}) {
  // A chave do que esta na tela, e nao mais a banca: com o ENAMED dentro do
  // seletor, o visitante pode estar vendo uma PROVA, e quem salva o e-mail
  // vendo o ENAMED quer noticia do ENAMED.
  const [chave, setChave] = useState<string | null>(null);

  return (
    <>
      {/* O rotulo "Veja uma prova institucional" SAIU: ele existia para emendar
          o cartao do ENAMED ao seletor, e agora os dois sao um so. Os chips
          dizem sozinhos o que sao. */}
      <FaciesPicker bancas={bancas} prova={prova} onChaveChange={setChave} />

      <PonteDiagnostico banca={chave} />

      {children}

      {/* `mt-4`, e não o respiro de ato: o gate é a CONTINUAÇÃO do cartão de
          acesso que fecha o `children` ("o app ainda não está aberto para
          assinatura"), e não uma seção nova. Separá-los quebraria a única
          pergunta que a página faz. */}
      <div className="mt-4">
        <GateEmail banca={chave} />
      </div>
    </>
  );
}
