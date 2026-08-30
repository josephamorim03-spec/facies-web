"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import RecaptchaCheckbox from "@/components/RecaptchaCheckbox";
import { GoogleSection } from "./GoogleSection";

export type SignupFormProps = {
  signupFirstName: string;
  setSignupFirstName: (v: string) => void;
  signupLastName: string;
  setSignupLastName: (v: string) => void;
  signupEmail: string;
  setSignupEmail: (v: string) => void;
  signupPassword: string;
  setSignupPassword: (v: string) => void;
  signupConfirmPassword: string;
  setSignupConfirmPassword: (v: string) => void;
  signupPasswordsMismatch: boolean;
  signupTermsAccepted: boolean;
  setSignupTermsAccepted: (v: boolean) => void;
  signupCaptchaToken: string;
  setSignupCaptchaToken: (v: string) => void;
  signupCaptchaResetCounter: number;
  signupBusy: boolean;
  signupError: string;
  signupCanSubmit: boolean;
  recaptchaSiteKey: string;
  googleClientId: string;
  googleButtonRef: React.RefObject<HTMLDivElement | null>;
  googleError: string;
  installState: string;
  onSignup: () => void;
  onSwitchView: (view: "login" | "signup" | "forgot" | "verify") => void;
};

export function SignupForm({
  signupFirstName,
  setSignupFirstName,
  signupLastName,
  setSignupLastName,
  signupEmail,
  setSignupEmail,
  signupPassword,
  setSignupPassword,
  signupConfirmPassword,
  setSignupConfirmPassword,
  signupPasswordsMismatch,
  signupTermsAccepted,
  setSignupTermsAccepted,
  signupCaptchaToken,
  setSignupCaptchaToken,
  signupCaptchaResetCounter,
  signupBusy,
  signupError,
  signupCanSubmit,
  recaptchaSiteKey,
  googleClientId,
  googleButtonRef,
  googleError,
  installState,
  onSignup,
  onSwitchView,
}: SignupFormProps) {
  const inputCls =
    "w-full border border-edge px-3 py-2 text-sm bg-paper focus:outline-none focus:border-ink transition-colors";
  const btnLink = "text-sm text-muted hover:text-ink transition-colors";
  const formSpacingCls = `space-y-3${installState !== "hidden" ? " pb-20" : ""}`;

  return (
    <div className={formSpacingCls}>
      <input
        type="text"
        className={inputCls}
        placeholder="Nome"
        autoComplete="given-name"
        value={signupFirstName}
        onChange={(event) => setSignupFirstName(event.target.value)}
      />
      <input
        type="text"
        className={inputCls}
        placeholder="Sobrenome"
        autoComplete="family-name"
        value={signupLastName}
        onChange={(event) => setSignupLastName(event.target.value)}
      />
      <input
        type="email"
        className={inputCls}
        placeholder="seu@email.com"
        autoComplete="email"
        value={signupEmail}
        onChange={(event) => setSignupEmail(event.target.value)}
      />
      <input
        type="password"
        className={inputCls}
        placeholder="Senha"
        autoComplete="new-password"
        aria-describedby="regra-senha"
        value={signupPassword}
        onChange={(event) => setSignupPassword(event.target.value)}
      />
      {/* A REGRA INTEIRA, ANTES DE ERRAR. O placeholder dizia "mínimo 8
          caracteres" e `is_password_valid` exige 12 com maiúscula, minúscula e
          dígito: quem seguisse o campo era recusado sem saber por quê, e a
          mensagem do servidor chega depois de já ter digitado tudo. */}
      <p id="regra-senha" className="text-xs leading-5 text-muted">
        Mínimo 12 caracteres, com maiúscula, minúscula e número.
      </p>
      <input
        type="password"
        className={inputCls}
        placeholder="Confirmar senha"
        autoComplete="new-password"
        value={signupConfirmPassword}
        onChange={(event) => setSignupConfirmPassword(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && onSignup()}
      />

      {signupPasswordsMismatch && (
        <p className="text-sm text-danger">Senhas incompatíveis, digite novamente</p>
      )}

      <div className="flex items-center justify-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          className="h-4 w-4 border border-edge"
          checked={signupTermsAccepted}
          onChange={(event) => setSignupTermsAccepted(event.target.checked)}
        />
        <span className="text-center">
          Li e aceito os{" "}
          <Link
            href="/termos"
            target="_blank"
            className="text-ink underline underline-offset-2 transition-colors hover:text-muted"
          >
            Termos de Uso
          </Link>{" "}
          e a{" "}
          <Link
            href="/privacidade"
            target="_blank"
            className="text-ink underline underline-offset-2 transition-colors hover:text-muted"
          >
            Política de Privacidade
          </Link>
        </span>
      </div>

      {recaptchaSiteKey ? (
        <div className="space-y-2">
          <RecaptchaCheckbox
            siteKey={recaptchaSiteKey}
            onTokenChange={setSignupCaptchaToken}
            resetCounter={signupCaptchaResetCounter}
          />
        </div>
      ) : (
        <p className="text-sm text-danger">Cadastro indisponível no momento.</p>
      )}

      {signupError && <p className="text-sm text-danger">{signupError}</p>}
      <Button variant="primary" size="md" loading={signupBusy} disabled={!signupCanSubmit} onClick={onSignup} className="w-full">
        Criar conta
      </Button>

      <GoogleSection
        googleClientId={googleClientId}
        googleButtonRef={googleButtonRef}
        googleError={googleError}
      />

      <div className="text-center pt-1">
        <button className={btnLink} onClick={() => onSwitchView("login")}>
          Já tenho conta
        </button>
      </div>
    </div>
  );
}
