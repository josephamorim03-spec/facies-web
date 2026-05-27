"use client";

import { establishAuthSession } from "@/lib/auth";
import { SHOW_DEV_TOKEN_PANEL } from "../lib/eventEncoding";

type Props = {
  token: string;
  onTokenChange: (v: string) => void;
  onResetConfirmOpen: (v: boolean) => void;
};

export function DevTokenPanel({ token, onTokenChange, onResetConfirmOpen }: Props) {
  if (!SHOW_DEV_TOKEN_PANEL) return null;

  return (
    <>
      <section className="space-y-2">
        <p className="text-xs text-muted uppercase tracking-wide">Token (dev)</p>
        <input
          type="text"
          className="w-full border border-edge bg-paper px-2 py-1 text-sm"
          placeholder="usuario_id"
          value={token}
          onChange={(e) => onTokenChange(e.target.value)}
          onBlur={() => {
            if (token.trim()) void establishAuthSession(token).catch(() => undefined);
          }}
        />
        {token && (
          <button
            className="text-xs text-muted border border-edge px-2 py-0.5 hover:border-red-500 hover:text-red-500 transition-colors"
            onClick={() => onResetConfirmOpen(true)}
          >
            Limpar dados
          </button>
        )}
      </section>
      <hr className="border-edge" />
    </>
  );
}
