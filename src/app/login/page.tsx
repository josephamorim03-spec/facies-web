"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { clearAuthToken, setAuthToken } from "@/lib/auth";
import { resolveAuthenticatedLandingRoute } from "@/lib/initialGoalSetup";
import { loginLocalAccount } from "@/lib/api";
import { useGoogleSignIn } from "./_hooks/useGoogleSignIn";
import { useInstallPrompt } from "./_hooks/useInstallPrompt";
import { LoginForm } from "./_components/LoginForm";
import { GoogleSection } from "./_components/GoogleSection";
import { InstallBanner } from "./_components/InstallBanner";
import { KrosIntro } from "./_components/KrosIntro";
import styles from "./LoginPremium.module.css";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get("reason") === "expired";
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
  const isDevMode = !googleClientId;

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState("");

  const { googleButtonRef, googleError, setGoogleError } = useGoogleSignIn({
    googleClientId,
    view: "login",
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
      const res = await loginLocalAccount({ email: loginEmail.trim(), password: loginPassword });
      if (!res.access_token) throw new Error("Token ausente na resposta.");
      setAuthToken(res.access_token);
      const route = await resolveAuthenticatedLandingRoute(res.access_token);
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
        <section className={styles.composition}>
          <div className={styles.brandBlock}>
            <div className={styles.logoField}>
              <KrosIntro />
            </div>

            <div className={styles.wordmark}>
              <h1
                className={`${styles.wordmarkText} font-serif text-[2rem] font-semibold leading-none text-ink sm:text-[2.25rem]`}
              >
                KROSMED
              </h1>
            </div>

            <p
              className={`${styles.pitch} mx-auto mt-3 max-w-[23rem] text-sm leading-6 text-muted [text-wrap:balance]`}
            >
              Preparação médica com precisão, ritmo e inteligência.
            </p>
          </div>

          <div className={styles.accessPanel}>
            <p className={styles.accessLine}>
              {isDevMode ? "Ambiente de desenvolvimento" : "Entre com sua conta Google para continuar."}
            </p>

            <div className="mt-4 space-y-4">
              {sessionExpired && (
                <div
                  role="alert"
                  className="rounded-lg bg-[var(--amber-tint)] px-4 py-3 text-center text-sm text-ink shadow-sm"
                >
                  Sua sessão expirou. Entre novamente para continuar.
                </div>
              )}

              {isDevMode ? (
                <LoginForm
                  loginEmail={loginEmail}
                  setLoginEmail={setLoginEmail}
                  loginPassword={loginPassword}
                  setLoginPassword={setLoginPassword}
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
                <GoogleSection
                  googleClientId={googleClientId}
                  googleButtonRef={googleButtonRef}
                  googleError={googleError}
                  onGoogleError={setGoogleError}
                />
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
