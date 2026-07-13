"use client";

import { useEffect } from "react";
import { useToast } from "@/lib/useToast";

export function Toast() {
  const { messages, dismissToast } = useToast();
  const latestMessage = messages.length > 0 ? messages[messages.length - 1] : null;

  useEffect(() => {
    if (!latestMessage) return undefined;

    function handleKeyDown() {
      dismissToast();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dismissToast, latestMessage]);

  if (!latestMessage) return null;

  const { message, type, id } = latestMessage;

  const typeClass =
    type === "success"
      ? "bg-ink text-paper border border-ink"
      : type === "error"
        ? "border border-danger text-danger bg-surface"
        : "border border-edge text-ink bg-paper";

  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+var(--mobile-nav-height)+0.75rem)] left-1/2 z-[90] w-[min(92vw,34rem)] -translate-x-1/2 md:bottom-5">
      <div
        key={id}
        role="status"
        aria-live="polite"
        className={`paper-overlay relative rounded-lg px-5 py-4 text-sm toast-enter ${typeClass}`}
      >
        <p className="pr-8 text-center leading-relaxed">{message}</p>
        <button
          type="button"
          onClick={dismissToast}
          className="paper-control absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center text-base text-muted hover:bg-surfaceMuted hover:text-ink focus-visible:outline-none"
          aria-label="Fechar mensagem"
        >
          ×
        </button>
      </div>
    </div>
  );
}
