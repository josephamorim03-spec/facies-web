"use client";

import { AlertDialog } from "radix-ui";
import { Button } from "@/components/ui/Button";

/**
 * As TRÊS saídas da sessão — o artboard 13b.
 *
 * ## Por que três, e não duas
 *
 * O diálogo anterior era um `ConfirmDialog`: "Continuar simulado" ou "Sair". A
 * segunda opção escondia uma decisão que o aluno não tomou — sair deixava a
 * sessão pendente, e nada na tela dizia isso nem oferecia a alternativa.
 *
 * O projeto de design escreve a regra na própria prancheta: *"três saídas,
 * porque são três intenções diferentes: pendente guarda o lugar, encerrar
 * corrige o que foi feito e devolve o resto, e continuar"*. São intenções, não
 * variações de uma:
 *
 *   continuar   volto agora, não terminei de pensar
 *   pendente    paro aqui, mas isto ainda é meu — guarda o lugar
 *   encerrar    o plantão comeu o resto; corrija o que eu fiz e devolva o resto
 *
 * Quem sai às 23h40 com 7 de 24 respondidas quer a terceira, e a interface só
 * oferecia a segunda. As três ações já existiam na página da sessão: o que
 * faltava era oferecê-las no momento em que a decisão é tomada.
 *
 * ## A consequência vai escrita em cada botão
 *
 * "Volta de onde parou, na questão 8" e "corrige as 7 que você fez e fecha a
 * sessão; as 17 voltam para o banco" não são microcopy decorativa — são a única
 * forma de o aluno distinguir duas saídas que, pelo rótulo, parecem a mesma. O
 * repositório já registra o custo de não fazer isso em outro lugar: o CTA que
 * anunciava "feedback por questão" numa sessão que só corrigia no fim.
 *
 * Nenhum dos três é destrutivo, e por isso nenhum é `danger`. O trabalho é
 * preservado nas três — o que muda é o que acontece com o que ficou por fazer.
 */
export function SaidaDaSessao({
  open,
  respondidas,
  pendentes,
  proximaPosicao,
  rotuloSessao,
  onContinuar,
  onDeixarPendente,
  onEncerrar,
}: {
  open: boolean;
  /** Quantas já foram respondidas — o que "encerrar" vai corrigir. */
  respondidas: number;
  /** Quantas ficam por fazer — o que "encerrar" devolve ao banco. */
  pendentes: number;
  /** Onde "continuar" e "pendente" retomam. */
  proximaPosicao: number;
  /** "sessão", "simulado" — o vocabulário que o resto da tela já usa. */
  rotuloSessao: string;
  onContinuar: () => void;
  onDeixarPendente: () => void;
  onEncerrar: () => void;
}) {
  const plural = (n: number, singular: string, plural_: string) =>
    `${n} ${n === 1 ? singular : plural_}`;

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(aberto) => {
        // Fechar pelo Esc ou pelo fundo é CONTINUAR, nunca sair. A ação
        // acidental tem de cair na opção que não muda nada.
        if (!aberto) onContinuar();
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[60] bg-ink/45" />
        <AlertDialog.Content className="paper-overlay fixed left-1/2 top-1/2 z-[60] w-[min(calc(100vw-2rem),28rem)] -translate-x-1/2 -translate-y-1/2 rounded-surface border border-edge bg-surface p-5 focus:outline-none">
          <AlertDialog.Title className="text-xl font-semibold leading-tight text-ink">
            Sair da {rotuloSessao}?
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-base text-muted">
            Ela fica salva — você pode retomar quando quiser em Questões ou no Histórico.
          </AlertDialog.Description>

          {/* O placar da decisão. Vem antes dos botões porque é o que torna as
              duas saídas distinguíveis: sem os números, "pendente" e "encerrar"
              são dois rótulos sinônimos. */}
          <p className="mt-4 border-y border-rule py-3 text-sm text-ink">
            <span className="font-mono">{plural(respondidas, "respondida", "respondidas")}</span>
            <span className="text-muted">
              {" · "}
              <span className="font-mono">{pendentes}</span>{" "}
              {pendentes === 1 ? "fica pendente" : "ficam pendentes"}
            </span>
          </p>

          <div className="mt-5 grid gap-2">
            <AlertDialog.Cancel asChild>
              <Button variant="primary" size="md" onClick={onContinuar}>
                Continuar respondendo
              </Button>
            </AlertDialog.Cancel>

            <AlertDialog.Action asChild>
              <Button variant="outline" size="md" onClick={onDeixarPendente}>
                Sair e deixar pendente
              </Button>
            </AlertDialog.Action>
            <p className="-mt-1 px-1 text-sm text-muted">
              Volta de onde parou, na questão {proximaPosicao}.
            </p>

            {/* Encerrar só aparece com algo a corrigir: "corrija as 0 que você
                fez" é uma frase que não deveria existir, e a ação seria idêntica
                a sair pendente. */}
            {respondidas > 0 ? (
              <>
                <AlertDialog.Action asChild>
                  <Button variant="outline" size="md" onClick={onEncerrar}>
                    Encerrar por hoje
                  </Button>
                </AlertDialog.Action>
                <p className="-mt-1 px-1 text-sm text-muted">
                  Corrige {plural(respondidas, "a que você fez", "as que você fez")} e fecha a{" "}
                  {rotuloSessao}.{" "}
                  {pendentes > 0
                    ? `${pendentes === 1 ? "A" : "As"} ${pendentes} ${
                        pendentes === 1 ? "volta" : "voltam"
                      } para o banco.`
                    : ""}
                </p>
              </>
            ) : null}
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
