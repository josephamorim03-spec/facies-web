"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { clearAuthToken } from "@/lib/auth";
import { destinoInternoSeguro } from "@/lib/destinoInterno";
import { resolveAuthenticatedLandingRoute } from "@/lib/initialGoalSetup";
import { loginLocalAccount } from "@/lib/api";
import { useGoogleSignIn } from "./_hooks/useGoogleSignIn";
import { obterModosDeAuth } from "@/lib/api/domains/auth";
import { useInstallPrompt } from "./_hooks/useInstallPrompt";
import { GoogleSection } from "./_components/GoogleSection";
import { EmailLoginSection } from "./_components/EmailLoginSection";
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

              {/* UM caminho só, e não um por regime.
                  ⚠️ Aqui havia um garfo em `isDevMode` (que é apenas "não há
                  `NEXT_PUBLIC_GOOGLE_CLIENT_ID`"): sem Google renderizava
                  `LoginForm`, com Google renderizava outro conjunto. Duas telas
                  de login, e a decisão de mostrar a via de e-mail duplicada nas
                  duas — foi assim que ela ficou presa do lado errado, visível só
                  onde o Google NÃO está configurado, ou seja, em lugar nenhum
                  que importa.
                  O efeito colateral era pior que o bug: `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
                  é VAZIO no `.env.local`, então o desenvolvimento e o e2e local
                  exercitavam sempre o ramo que produção nunca executa. Testar
                  uma tela e publicar outra não é cobertura.
                  `GoogleSection` já trata a ausência de `client_id` sozinha —
                  desenha um botão que explica a configuração que falta — então o
                  garfo nunca foi necessário para isso. */}
              <div className="space-y-3">
                  {/* E-MAIL PRIMEIRO, Google depois — ordem pedida pelo
                      operador em 2026-09-10. O divisor "ou" mora DENTRO do
                      condicional junto com o formulário: sem a via de e-mail
                      não há duas coisas a separar, e um "ou" sozinho sobre o
                      botão do Google prometeria uma alternativa que a
                      instalação não tem.

                      `AUTH_MODE` vive no backend; a tela pergunta em vez de
                      duplicar o flag aqui — dois lugares para o mesmo fato
                      divergem no primeiro deploy em que um é atualizado e o
                      outro não.

                      ⚠️ Aqui havia só "Prefere e-mail e senha? Criar conta" —
                      um convite a CRIAR conta, sem forma de ENTRAR com ela.
                      Quem se cadastrava por e-mail chegava nesta tela e não
                      tinha campo nenhum: o formulário existia (`LoginForm`) mas
                      era renderizado apenas no ramo `isDevMode`, isto é, só
                      quando o Google NÃO está configurado. Em produção, onde
                      está, a via de e-mail era de mão única. */}
                  {cadastroLocalDisponivel ? (
                    <>
                      <EmailLoginSection
                        email={loginEmail}
                        setEmail={setLoginEmail}
                        senha={loginPassword}
                        setSenha={setLoginPassword}
                        ocupado={loginBusy}
                        erro={loginError}
                        onEntrar={handleLocalLogin}
                      />
                      <div className="flex items-center gap-3 pt-1">
                        <span className="h-px flex-1 bg-rule" />
                        <span className="paper-eyebrow">ou</span>
                        <span className="h-px flex-1 bg-rule" />
                      </div>
                    </>
                  ) : null}
                  {/* FORA do condicional, e é obrigatório que fique: o
                      `googleButtonRef` é onde o GSI desenha, e o efeito de
                      `useGoogleSignIn` NÃO roda de novo quando a resposta de
                      `/auth/modes` chega. Se o contêiner nascesse dentro do
                      ramo, o botão ficaria sem onde montar no regime
                      google-only — que é o único caminho em produção quando a
                      auth local está desligada. Há spec para isto. */}
                  <GoogleSection
                    googleClientId={googleClientId}
                    googleButtonRef={googleButtonRef}
                    googleError={googleError}
                    onGoogleError={setGoogleError}
                  />

                  {/* Depois das DUAS vias, e não entre elas: a caixa governa o
                      login local e o do Google (`useGoogleSignIn` recebe
                      `rememberDevice`, e `loginLocalAccount` manda
                      `remember_device`). Acima do divisor "ou" ela parecia uma
                      opção do Google, o que é falso nos dois sentidos. */}
                  <label className="flex cursor-pointer items-center justify-center gap-2 pt-1 text-sm text-muted">
                    <input
                      type="checkbox"
                      className="h-4 w-4 shrink-0 rounded border-edge text-ink"
                      checked={rememberDevice}
                      onChange={(event) => setRememberDevice(event.target.checked)}
                    />
                    <span>Lembrar neste dispositivo</span>
                  </label>
                </div>
            </div>

            {/* A ressalva "não promete aprovação e não vende conteúdo teórico"
                SAIU daqui, por decisão do operador: ela pertence aos Termos, que
                é onde vincula. Numa tela de entrada era ruído no momento em que
                a pessoa só quer entrar — e estava sem `text-center`, então era
                também o único bloco desalinhado da composição.

                ⚠️ Ela continua OBRIGATÓRIA nas superfícies de oferta: a landing
                a mantém, porque lá há alegação comercial e o CONAR exige que ela
                seja comprovável. Tirar de `/login` não é tirar do produto. */}
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
