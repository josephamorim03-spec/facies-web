"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { clearAuthToken } from "@/lib/auth";
import { resolveAuthenticatedLandingRoute } from "@/lib/initialGoalSetup";
import { loginLocalAccount } from "@/lib/api";
import { useGoogleSignIn } from "./_hooks/useGoogleSignIn";
import { useInstallPrompt } from "./_hooks/useInstallPrompt";
import { LoginForm } from "./_components/LoginForm";
import { GoogleSection } from "./_components/GoogleSection";
import { InstallBanner } from "./_components/InstallBanner";
import { KrosWordmark } from "@/components/KrosWordmark";
import { BootSequence } from "./_components/BootSequence";
import styles from "./LoginPremium.module.css";

function safeInternalNext(value: string): string | null {
  const normalized = value.trim();
  if (!normalized.startsWith("/") || normalized.startsWith("//")) return null;
  if (normalized.startsWith("/login") || normalized.startsWith("/auth")) return null;
  try {
    const parsed = new URL(normalized, "http://krosmed.local");
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

function LoginPageContent() {
  const router = useRouter();
  // O boot e overlay, nao gate: o formulario ja esta montado atras dele, entao
  // quem digita rapido nem ve a sequencia e nada bloqueia a autenticacao.
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get("reason") === "expired";
  const nextParam = searchParams.get("next") ?? "";
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
  const isDevMode = !googleClientId;

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [rememberDevice, setRememberDevice] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState("");

  const { googleButtonRef, googleError, setGoogleError } = useGoogleSignIn({
    googleClientId,
    view: "login",
    rememberDevice,
  });
  const { installState, showIosTooltip, setShowIosTooltip, handleInstall } =
    useInstallPrompt();

  async function handleLocalLogin() {
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError("Preencha e-mail e senha.");
      return;
    }
    setLoginBusy(true);
    setLoginError("");
    try {
      await loginLocalAccount({
        email: loginEmail.trim(),
        password: loginPassword,
        remember_device: rememberDevice,
      });
      const route = safeInternalNext(nextParam) ?? await resolveAuthenticatedLandingRoute("");
      router.replace(route);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("invalid_credentials") || msg.includes("401")) {
        setLoginError("E-mail ou senha incorretos.");
      } else if (msg.includes("email_not_verified") || msg.includes("403")) {
        setLoginError("E-mail não verificado. Verifique sua caixa de entrada.");
      } else {
        setLoginError("Não foi possível entrar. Verifique se o servidor local está rodando.");
      }
    } finally {
      setLoginBusy(false);
    }
  }

  useEffect(() => {
    let active = true;

    fetch("/api/profile", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
      .then((res) => {
        if (!active || !res.ok) return;
        resolveAuthenticatedLandingRoute("")
          .then((targetRoute) => {
            if (active) router.replace(targetRoute);
          })
          .catch(() => {
            if (active) clearAuthToken();
          });
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className={`${styles.screen} w-full text-ink`}>
      <div className={`${styles.shell}${installState !== "hidden" ? " pb-28 sm:pb-10" : ""}`}>
        {/* A tela de acesso É a tela de POST.

            O autoteste era um overlay que cobria o formulário e sumia em menos
            de um segundo — rápido demais para ser lido, e no caminho de quem só
            queria entrar. Como enquadramento ele faz o oposto: diz o que o
            sistema é enquanto a pessoa está parada olhando, sem atrasar nada. */}
        <section className={`chrome-window ${styles.composition}`}>
          <div className="chrome-titlebar">
            <span>KrosMed — Acesso</span>
            <span aria-hidden="true">▪</span>
          </div>

          <div className="px-5 py-6 sm:px-7">
            <div className={styles.brandBlock}>
              <h1 className="leading-none">
                <KrosWordmark />
              </h1>
              <p className="mt-2 text-center font-serif text-sm leading-relaxed text-muted">
                Sistema de treino para residência médica
              </p>
            </div>

            <div className="mt-5">
              <BootSequence />
            </div>

            {isDevMode ? (
              <p className={`${styles.accessLine} mt-3`}>Ambiente de desenvolvimento</p>
            ) : null}

            <div className="mt-4 space-y-4">
              {sessionExpired && (
                <div
                  role="alert"
                  className="border border-warning bg-[var(--amber-tint)] px-4 py-3 text-center text-sm text-ink"
                >
                  Sessão expirada. Entre novamente.
                </div>
              )}

              {isDevMode ? (
                <LoginForm
                  loginEmail={loginEmail}
                  setLoginEmail={setLoginEmail}
                  loginPassword={loginPassword}
                  setLoginPassword={setLoginPassword}
                  rememberDevice={rememberDevice}
                  setRememberDevice={setRememberDevice}
                  loginBusy={loginBusy}
                  loginError={loginError}
                  googleClientId={googleClientId}
                  googleButtonRef={googleButtonRef}
                  googleError={googleError}
                  installState={installState}
                  onLogin={handleLocalLogin}
                  onSwitchView={() => undefined}
                />
              ) : (
                <div className="space-y-3">
                  <GoogleSection
                    googleClientId={googleClientId}
                    googleButtonRef={googleButtonRef}
                    googleError={googleError}
                    onGoogleError={setGoogleError}
                  />
                  {/* Depois do botao do Google, centralizado: e' uma opcao
                      sobre o login que acabou de acontecer, nao um passo antes
                      dele. `items-center` alinha a caixa com a linha do texto. */}
                  <label className="flex cursor-pointer items-center justify-center gap-2 text-sm text-muted">
                    <input
                      type="checkbox"
                      className="h-4 w-4 shrink-0 rounded border-edge text-ink"
                      checked={rememberDevice}
                      onChange={(event) => setRememberDevice(event.target.checked)}
                    />
                    <span>Lembrar neste dispositivo</span>
                  </label>
                </div>
              )}
            </div>

            {/* Prompt de comando: decoração, e por isso `aria-hidden`. O leitor
                de tela não deve anunciar "C dois pontos barra invertida KROS
                maior que" entre o formulário e o fim da página. */}
            <div
              aria-hidden="true"
              className="mt-6 flex items-center gap-1 border-t border-dotted border-edge pt-3 text-sm text-muted"
            >
              <span>{"C:\\KROS>"}</span>
              <span className="chrome-cursor" />
            </div>
          </div>

          <div className="chrome-statusbar">
            <span>Aguardando acesso</span>
            <span className="flex-1" />
            <span>{isDevMode ? "Modo desenvolvimento" : "Entrada por Google"}</span>
          </div>
        </section>
      </div>

      <InstallBanner
        installState={installState}
        showIosTooltip={showIosTooltip}
        onInstall={handleInstall}
        onCloseTooltip={() => setShowIosTooltip(false)}
      />
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper" />}>
      <LoginPageContent />
    </Suspense>
  );
}
