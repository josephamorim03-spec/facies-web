"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { clearAuthToken } from "@/lib/auth";
import { destinoInternoSeguro } from "@/lib/destinoInterno";
import { resolveAuthenticatedLandingRoute } from "@/lib/initialGoalSetup";
import { loginLocalAccount } from "@/lib/api";
import { useGoogleSignIn } from "./_hooks/useGoogleSignIn";
import { obterModosDeAuth } from "@/lib/api/domains/auth";
import { useInstallPrompt } from "./_hooks/useInstallPrompt";
import { LoginForm } from "./_components/LoginForm";
import { GoogleSection } from "./_components/GoogleSection";
import { InstallBanner } from "./_components/InstallBanner";
import { FaciesWordmark } from "@/components/FaciesWordmark";
import styles from "./LoginPremium.module.css";

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
  // Se esta instalação oferece cadastro por e-mail. Começa FALSO: mostrar um
  // caminho que talvez não exista é pior que esconder um que existe, e a
  // resposta chega em milissegundos.
  const [cadastroLocalDisponivel, setCadastroLocalDisponivel] = useState(false);

  useEffect(() => {
    let vivo = true;
    obterModosDeAuth().then((modos) => {
      if (vivo && modos) setCadastroLocalDisponivel(modos.local_auth);
    });
    return () => {
      vivo = false;
    };
  }, []);

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
      const route = destinoInternoSeguro(nextParam) ?? await resolveAuthenticatedLandingRoute("");
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
        {/* A tela de acesso já encenou um computador ligando: barra de título,
            lista de autoteste, barra de status. Era coerente com a identidade de
            terminal e não sobrevive a esta — o que a lista dizia ("banco de
            questões OK, motor adaptativo OK") a marca diz em duas palavras, e o
            qualificador é obrigatório na primeira aparição de qualquer contexto
            novo. */}
        <section className={`paper-surface ${styles.composition}`}>
          <div className="px-5 py-8 sm:px-7">
            <div className={styles.brandBlock}>
              <h1 className="leading-none">
                <FaciesWordmark />
              </h1>
              <p className="mt-2 text-center font-serif text-sm leading-relaxed text-muted">
                Inteligência de prova para residência médica
              </p>
            </div>

            {isDevMode ? (
              <p className="paper-eyebrow mt-3 text-center">Ambiente de desenvolvimento</p>
            ) : null}

            <div className="mt-7 space-y-4">
              {sessionExpired && (
                <div
                  role="alert"
                  className="rounded-surface border border-warning bg-[var(--wash-atencao)] px-4 py-3 text-center text-sm text-ink"
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
                  {/* A via de e-mail, e SÓ quando ela existe de verdade.
                      `AUTH_MODE` vive no backend; a tela pergunta em vez de
                      duplicar o flag aqui — dois lugares para o mesmo fato
                      divergem no primeiro deploy em que um é atualizado e o
                      outro não. */}
                  {cadastroLocalDisponivel ? (
                    <p className="pt-1 text-center text-sm text-muted">
                      Prefere e-mail e senha?{" "}
                      <Link href="/cadastro" className="font-semibold text-ink underline underline-offset-2">
                        Criar conta
                      </Link>
                    </p>
                  ) : null}

                </div>
              )}
            </div>

            {/* O prompt `C:\KROS>` com cursor piscando saiu daqui junto com
                a identidade KROS/DOS: era decoracao de terminal, e decoracao
                de terminal e' exatamente o que fazia a tela parecer feita
                por dev e nao por medico. No lugar, a unica linha que quem
                chega aqui precisa ler antes de entrar. */}
            <p className="mt-6 border-t border-rule pt-3 text-sm text-muted">
              A Fácies não promete aprovação e não vende conteúdo teórico.
            </p>
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
