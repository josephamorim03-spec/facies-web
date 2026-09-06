"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

/**
 * O botão que cancela. Um clique, e o clique é do titular.
 *
 * O token vem da query e vai no CORPO do POST, nunca na URL da requisição: URL
 * entra em log de servidor, header de referer e histórico do navegador, e o
 * token é a única credencial que existe aqui.
 */
function Botao() {
  const token = useSearchParams().get("t") ?? "";
  const [estado, setEstado] = useState<"pronto" | "enviando" | "ok" | "erro">("pronto");

  if (!token) {
    return (
      <p className="mt-8 rounded-surface border border-edge bg-surfaceMuted p-5 text-sm text-muted">
        Este link está incompleto. Abra o link exatamente como ele veio no e-mail — ou
        responda o e-mail pedindo para sair, que a gente resolve do outro lado.
      </p>
    );
  }

  if (estado === "ok") {
    return (
      <div className="mt-8 rounded-surface border border-primary bg-surfaceMuted p-5">
        <p className="text-base font-semibold text-ink">Pronto. Não escrevemos mais.</p>
        <p className="mt-1 text-sm text-muted">
          Se mudar de ideia, é só salvar a fácies de novo em qualquer página de prova.
        </p>
      </div>
    );
  }

  async function cancelar() {
    setEstado("enviando");
    try {
      const resposta = await fetch("/api/facies/descadastrar", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-KrosMed-CSRF": "1" },
        body: JSON.stringify({ token }),
      });
      setEstado(resposta.ok ? "ok" : "erro");
    } catch {
      setEstado("erro");
    }
  }

  return (
    <div className="mt-8">
      <button
        type="button"
        onClick={cancelar}
        disabled={estado === "enviando"}
        className="paper-control rounded-control border border-primary bg-primary px-5 py-2.5 text-sm font-medium text-primaryInk disabled:opacity-60"
      >
        {estado === "enviando" ? "Cancelando…" : "Parar de receber"}
      </button>
      {estado === "erro" ? (
        <p className="mt-3 text-sm text-muted">
          Não consegui agora. Tente de novo em alguns minutos — ou responda o e-mail
          pedindo para sair.
        </p>
      ) : null}
    </div>
  );
}

export function Descadastro() {
  // `useSearchParams` exige limite de Suspense no App Router; sem ele a página
  // inteira vira dinâmica e perde o build estático.
  return (
    <Suspense fallback={<div className="mt-8 h-10" />}>
      <Botao />
    </Suspense>
  );
}
