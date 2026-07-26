"use client";

import { useEffect } from "react";
import { useToast } from "@/lib/useToast";
import { TONE_ALERT, type Tone } from "@/lib/toneClasses";

const TOAST_TONE: Record<string, Tone> = { success: "positive", error: "critical", info: "info" };

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
  const tone = TOAST_TONE[type] ?? "neutral";

  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] left-1/2 z-[90] w-[min(92vw,34rem)] -translate-x-1/2 md:bottom-5">
      <div
        key={id}
        role="status"
        aria-live="polite"
        className={`paper-overlay relative rounded-surface border bg-surface px-5 py-4 text-sm toast-enter ${TONE_ALERT[tone]}`}
      >
        <p className="pr-8 text-center leading-relaxed text-ink">{message}</p>
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
