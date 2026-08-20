"use client";

import React from "react";
import { Button } from "@/components/ui/Button";

export type VerifyEmailFormProps = {
  verifyEmail: string;
  setVerifyEmail: (v: string) => void;
  verifyBusy: boolean;
  verifyError: string;
  verifySuccess: string;
  onResendVerification: () => void;
  onSwitchView: (view: "login" | "signup" | "forgot" | "verify") => void;
};

export function VerifyEmailForm({
  verifyEmail,
  setVerifyEmail,
  verifyBusy,
  verifyError,
  verifySuccess,
  onResendVerification,
  onSwitchView,
}: VerifyEmailFormProps) {
  const inputCls =
    "w-full border border-edge px-3 py-2 text-sm bg-paper focus:outline-none focus:border-ink transition-colors";

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink leading-relaxed text-center">
        Conta criada. Enviamos um link de verificação por e-mail — abra-o e faça login.
      </p>
      <input
        type="email"
        className={inputCls}
        placeholder="seu@email.com"
        autoComplete="email"
        value={verifyEmail}
        onChange={(event) => setVerifyEmail(event.target.value)}
      />
      {verifyError && <p className="text-sm text-danger">{verifyError}</p>}
      {verifySuccess && <p className="text-sm text-success">{verifySuccess}</p>}
      <Button variant="primary" size="md" loading={verifyBusy} onClick={onResendVerification} className="w-full">
        Reenviar e-mail de verificação
      </Button>
      <div className="text-center">
        <button
          className="text-sm text-muted hover:text-ink transition-colors"
          onClick={() => onSwitchView("login")}
        >
          Ir para o login
        </button>
      </div>
    </div>
  );
}
