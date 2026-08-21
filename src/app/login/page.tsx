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
  const [booting, setBooting] = useState(true);
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
      {booting ? <BootSequence onDone={() => setBooting(false)} /> : null}
      <div className={`${styles.shell}${installState !== "hidden" ? " pb-28 sm:pb-10" : ""}`}>
        <section className={styles.composition}>
            {/* Havia DUAS marcas empilhadas: o sprite animado de 75 quadros e um
                wordmark em serifa logo abaixo. Sobrou uma, mono e estática — o
                `<h1>` já era o lugar semanticamente certo para o nome. */}
            <div className={styles.brandBlock}>
              <h1 className="leading-none">
                <KrosWordmark />
              </h1>
            </div>

          <div className={styles.accessPanel}>
            {isDevMode ? (
              <p className={styles.accessLine}>Ambiente de desenvolvimento</p>
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
