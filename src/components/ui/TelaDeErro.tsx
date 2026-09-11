"use client";

import { useEffect } from "react";

import { Alert } from "@/components/ui/Alert";

/**
 * A fronteira de erro de uma rota de aluno.
 *
 * ## O que ela existe para impedir
 *
 * ⚠️ Os `error.tsx` do app despejavam `{error.message}` num `<pre>` na cara do
 * médico. Isso é texto de exceção — "Failed to fetch", o corpo de um 500, o
 * `TypeError` de um bug nosso. Nada disso diz ao aluno o que fazer, e alguns
 * carregam detalhe de infraestrutura que não é dele.
 *
 * O `error.tsx` da raiz nunca vazou: dizia uma frase e oferecia o botão. Era o
 * único dos cinco a acertar, e agora é o comportamento de todos.
 *
 * ## A mensagem não some, muda de destino
 *
 * `console.error` mantém o detalhe onde ele serve — o console, onde eu olho —
 * em vez da tela, onde ele só assusta. `error.digest` é a chave que liga o que
 * o aluno viu ao que o servidor registrou.
 */
export function TelaDeErro({
  error,
  reset,
  titulo,
  children,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  /** O que falhou, na língua do aluno. */
  titulo: string;
  /** Uma saída a mais, quando existe (um link para outra tela). */
  children?: React.ReactNode;
}) {
  useEffect(() => {
    console.error(`[${titulo}]`, error);
  }, [error, titulo]);

  return (
    <main className="min-h-screen bg-paper p-8">
      <div className="mx-auto max-w-2xl space-y-4">
        {/* ⚠️ A SAÍDA MORA DENTRO DO AVISO, e não ao lado dele.

            O botão vivia num `<div>` irmão: para quem lê a tela dá no mesmo, mas
            para a regra não — `check-sem-beco` procura a saída na própria tag do
            `Alert`, e a fronteira de erro que serve cinco rotas era exatamente o
            componente que a violava. O guard só a viu depois de passar a varrer
            `src/components`. */}
        <Alert variant="danger" onRetry={() => reset()}>
          {titulo}
        </Alert>
        {children ? <div className="flex flex-wrap items-center gap-3">{children}</div> : null}
      </div>
    </main>
  );
}
