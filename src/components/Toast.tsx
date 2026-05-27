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
        ? "border border-red-600 text-red-600 bg-paper"
        : "border border-edge text-ink bg-paper";

  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] left-1/2 -translate-x-1/2 z-[90] w-[min(92vw,34rem)]">
      <div
        key={id}
        role="status"
        aria-live="polite"
        className={`relative px-5 py-4 text-sm shadow-lg rounded-md toast-enter ${typeClass}`}
      >
        <p className="pr-8 text-center leading-relaxed">{message}</p>
        <button
          type="button"
          onClick={dismissToast}
          className="absolute right-2 top-2 text-xs text-muted hover:text-ink focus-visible:outline-none"
          aria-label="Fechar mensagem"
        >
          ×
        </button>
      </div>
    </div>
  );
}
