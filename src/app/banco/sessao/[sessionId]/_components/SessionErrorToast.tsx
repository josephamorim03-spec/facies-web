"use client";

import { Alert } from "@/components/ui/Alert";

/**
 * O aviso de erro da sessão, no rodapé.
 *
 * Extraído da página porque ela o repetia em cada ramo de retorno como uma
 * variável de 10 linhas de JSX. Aqui é uma tag por ramo, e o estilo — posição
 * fixa, área segura do iPhone, largura máxima — vive num lugar só.
 */
export function SessionErrorToast({
  error,
  onDismiss,
}: {
  error: string | null;
  onDismiss: () => void;
}) {
  if (!error) return null;
  return (
    <div
      className="fixed inset-x-0 bottom-4 z-50 mx-auto w-full max-w-md px-4"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <Alert variant="danger" onDismiss={onDismiss} className="">
        {error}
      </Alert>
    </div>
  );
}
