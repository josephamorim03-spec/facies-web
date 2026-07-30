"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { GoogleSection } from "./GoogleSection";

export type LoginFormProps = {
  loginEmail: string;
  setLoginEmail: (v: string) => void;
  loginPassword: string;
  setLoginPassword: (v: string) => void;
  rememberDevice: boolean;
  setRememberDevice: (v: boolean) => void;
  loginBusy: boolean;
  loginError: string;
  googleClientId: string;
  googleButtonRef: React.RefObject<HTMLDivElement | null>;
  googleError: string;
  installState: string;
  onLogin: () => void;
  onSwitchView: (view: "login" | "signup" | "forgot" | "verify") => void;
};

export function LoginForm({
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  rememberDevice,
  setRememberDevice,
  loginBusy,
  loginError,
  googleClientId,
  googleButtonRef,
  googleError,
  installState,
  onLogin,
  onSwitchView,
}: LoginFormProps) {
  const inputCls =
    "w-full border border-edge px-3 py-2 text-sm bg-paper focus:outline-none focus:border-ink transition-colors";
  const btnLink = "text-sm text-muted hover:text-ink transition-colors";
  const formSpacingCls = `space-y-3${installState !== "hidden" ? " pb-20" : ""}`;

  return (
    <div className={formSpacingCls}>
      <input
        type="email"
        className={inputCls}
        placeholder="seu@email.com"
        autoComplete="email"
        value={loginEmail}
        onChange={(event) => setLoginEmail(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && onLogin()}
      />
      <input
        type="password"
        className={inputCls}
        placeholder="Senha"
        autoComplete="current-password"
        value={loginPassword}
        onChange={(event) => setLoginPassword(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && onLogin()}
      />
      {/* Aqui a caixa fica acima do "Entrar" de proposito: neste formulario ela
          governa os dois caminhos de login, o local e o do Google. */}
      <label className="flex cursor-pointer items-center gap-2 text-left text-sm text-muted">
        <input
          type="checkbox"
          className="h-4 w-4 shrink-0 rounded border-edge text-ink"
          checked={rememberDevice}
          onChange={(event) => setRememberDevice(event.target.checked)}
        />
        <span>Lembrar neste dispositivo</span>
      </label>
      {loginError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
          {loginError}
        </div>
      )}
      <Button variant="primary" size="md" loading={loginBusy} onClick={onLogin} className="w-full">
        Entrar
      </Button>

      <GoogleSection
        googleClientId={googleClientId}
        googleButtonRef={googleButtonRef}
        googleError={googleError}
      />

      <div className="flex justify-between pt-1">
        <button className={btnLink} onClick={() => onSwitchView("signup")}>
          Criar conta
        </button>
        <button className={btnLink} onClick={() => onSwitchView("forgot")}>
          Esqueci a senha
        </button>
      </div>
    </div>
  );
}
