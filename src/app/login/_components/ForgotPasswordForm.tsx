"use client";

import React from "react";
import { Button } from "@/components/ui/Button";

export type ForgotPasswordFormProps = {
  forgotEmail: string;
  setForgotEmail: (v: string) => void;
  forgotBusy: boolean;
  forgotError: string;
  forgotSuccess: string;
  onForgot: () => void;
  onSwitchView: (view: "login" | "signup" | "forgot" | "verify") => void;
};

export function ForgotPasswordForm({
  forgotEmail,
  setForgotEmail,
  forgotBusy,
  forgotError,
  forgotSuccess,
  onForgot,
  onSwitchView,
}: ForgotPasswordFormProps) {
  const inputCls =
    "w-full border border-edge px-3 py-2 text-sm bg-paper focus:outline-none focus:border-ink transition-colors";
  const btnLink = "text-sm text-muted hover:text-ink transition-colors";

  return (
    <div className="space-y-3">
      <p className="text-xs leading-tight text-muted text-center">
        Informe seu e-mail e enviaremos um link para redefinir a senha.
      </p>
      <input
        type="email"
        className={inputCls}
        placeholder="seu@email.com"
        autoComplete="email"
        value={forgotEmail}
        onChange={(event) => setForgotEmail(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && onForgot()}
      />
      {forgotError && <p className="text-sm text-red-600">{forgotError}</p>}
      {forgotSuccess && <p className="text-sm text-emerald-700">{forgotSuccess}</p>}
      <Button variant="primary" size="md" loading={forgotBusy} onClick={onForgot} className="w-full">
        Enviar link
      </Button>
      <div className="text-center pt-1">
        <button className={btnLink} onClick={() => onSwitchView("login")}>
          Voltar
        </button>
      </div>
    </div>
  );
}
