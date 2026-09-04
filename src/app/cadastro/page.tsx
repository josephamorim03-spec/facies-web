"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SignupForm } from "@/app/login/_components/SignupForm";
import { useGoogleSignIn } from "@/app/login/_hooks/useGoogleSignIn";
import {
  obterModosDeAuth,
  resendLocalVerification,
  signupLocalAccount,
} from "@/lib/api/domains/auth";
import { CabecalhoPublico } from "@/components/facies/CabecalhoPublico";
import { podeEnviarCadastro } from "./podeEnviar";

/**
 * A via de e-mail do cadastro.
 *
 * ## O que esta tela pede, e o que ela NÃO pede
 *
 * Só e-mail, senha e nome. **Identidade (nascimento, situação profissional) fica
 * para `/cadastro/completar`**, depois da verificação do e-mail — coletar dado
 * pessoal antes de provar posse do endereço é coletar de quem talvez não seja o
 * titular. Os dois caminhos, Google e e-mail, convergem naquela tela.
 *
 * ## O aceite linka, não abre modal
 *
 * O `TermsModal` tinha o texto dos Termos embutido no componente: sem versão,
 * sem hash e sem registro de qual texto foi aceito. Agora aponta para `/termos`
 * e `/privacidade`, que servem a versão vigente de `app/legal/` e conferem o
 * SHA-256 antes de exibir. Uma fonte só.
 *
 * ⚠️ O `terms_version` do payload é vestígio do caminho antigo. Quem resolve a
 * versão é o SERVIDOR, contra o que está publicado — ver
 * `legal_document_service.registrar_aceite_do_vigente`.
 *
 * ## Quem decide se o formulário de e-mail aparece: o SERVIDOR
 *
 * A tela pergunta `GET /auth/modes` e só renderiza o bloco de e-mail quando
 * `local_auth` é verdadeiro. Em produção o alvo é google-only
 * (`docs/production-readiness.md`; `runtime_checks._security_checks` reprova o
 * boot com qualquer outro `AUTH_MODE`), e nesse modo o router de auth local nem
 * é registrado em `main.py` — `POST /auth/signup` responde **404**.
 *
 * Antes disto o formulário era incondicional, e o botão "Criar a minha conta" da
 * landing apontava para cá: o funil inteiro terminava num formulário que o
 * servidor não atende. O botão do Google, que é o caminho real de produção,
 * ficava abaixo dele.
 *
 * A mesma resposta já governa o link "Criar conta" em `/login`. Um flag
 * `NEXT_PUBLIC_*` seria um segundo lugar para o mesmo fato, e os dois divergem
 * no primeiro deploy em que alguém lembra de um e esquece do outro.
 *
 * ## Pré-requisito de configuração
 *
 * `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` precisa existir, senão o `SignupForm` mostra
 * "Cadastro indisponível" e o botão não envia. É fail-closed de propósito: o
 * backend recusa signup sem captcha (`verify_recaptcha_token` devolve `False`
 * quando falta segredo), e um formulário que enviasse mesmo assim só produziria
 * erro depois de a pessoa ter digitado tudo.
 */
export default function CadastroPage() {
  const router = useRouter();
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaResetCounter, setCaptchaResetCounter] = useState(0);
  const [busy, setBusy] = useState(false);
  const [aguardandoVerificacao, setAguardandoVerificacao] = useState(false);
  const [error, setError] = useState("");
  // Reenvio do link de verificação, direto da tela de espera. Ver `reenviar()`.
  const [reenviando, setReenviando] = useState(false);
  const [reenvioFeito, setReenvioFeito] = useState(false);
  const [erroReenvio, setErroReenvio] = useState("");

  /**
   * Se ESTA instalação aceita criar conta por e-mail e senha.
   *
   * ⚠️ Começa FALSO, e o padrão é o mesmo de `/login`: mostrar um caminho que
   * talvez não exista é pior que esconder um que existe. Em produção o alvo é
   * google-only — `runtime_checks._security_checks` reprova o boot com qualquer
   * `AUTH_MODE` diferente de `google` —, e nesse modo `POST /auth/signup` nem é
   * registrado: responde 404. Esta tela é o destino do botão "Criar a minha
   * conta" da landing, então renderizar o formulário sem perguntar era mandar o
   * funil inteiro para um formulário que o servidor não atende.
   *
   * `obterModosDeAuth` nunca lança: falha de rede cai no mesmo `false`.
   */
  const [viaEmailDisponivel, setViaEmailDisponivel] = useState(false);

  useEffect(() => {
    let vivo = true;
    obterModosDeAuth().then((modos) => {
      if (vivo && modos) setViaEmailDisponivel(modos.local_auth);
    });
    return () => {
      vivo = false;
    };
  }, []);

  const { googleButtonRef, googleError } = useGoogleSignIn({
    googleClientId,
    view: "signup",
    rememberDevice: false,
  });

  // `installState` só existe para o banner de PWA da tela de login. Aqui não há
  // banner, então o espaçamento extra que ele reserva não se aplica.
  const installState = "hidden";
  const passwordsMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  const canSubmit = useMemo(
    () =>
      podeEnviarCadastro({
        viaEmailDisponivel,
        recaptchaSiteKey,
        busy,
        email,
        password,
        confirmPassword,
        termsAccepted,
        captchaToken,
      }),
    [
      viaEmailDisponivel,
      recaptchaSiteKey,
      busy,
      email,
      password,
      confirmPassword,
      termsAccepted,
      captchaToken,
    ],
  );

  async function handleSignup() {
    if (!canSubmit) return;
    setBusy(true);
    setError("");
    try {
      await signupLocalAccount({
        email: email.trim(),
        password,
        confirm_password: confirmPassword,
        captcha_token: captchaToken,
        terms_accepted: termsAccepted,
        // Vestígio do caminho antigo: o servidor ignora este valor e resolve a
        // versão vigente por conta própria. Mantido porque o contrato ainda o
        // exige e as três colunas de `local_accounts` ainda o consomem.
        terms_version: "servidor",
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
      });
      // A conta existe e o e-mail saiu. A sessão só nasce quando o link for
      // aberto — e é `/auth/verify-email` que consome o token e leva adiante.
      //
      // SEM query aqui: aquela página lê `?token=`, e mandar `?email=` faria ela
      // tentar verificar um token que não existe e pintar erro logo depois de um
      // cadastro que deu certo.
      // `setBusy(false)` também aqui, e não só no `catch`: a tela de espera
      // troca o formulário inteiro, então o `busy` preso não aparecia — mas
      // qualquer caminho futuro que volte ao formulário (um "corrigir e-mail",
      // por exemplo) encontraria os controles desabilitados sem motivo.
      setBusy(false);
      setAguardandoVerificacao(true);
    } catch (e) {
      const detalhe = e instanceof Error ? e.message : "";
      setError(detalhe || "Não consegui criar a conta. Confira os dados e tente de novo.");
      // O token do captcha é de uso único: sem resetar, a segunda tentativa
      // falha sozinha e parece problema do formulário.
      setCaptchaToken("");
      setCaptchaResetCounter((n) => n + 1);
      setBusy(false);
    }
  }

  /**
   * Reenvia o link de verificação sem sair desta tela.
   *
   * Antes, "não chegou?" levava a `/auth/verify-email`, onde a pessoa digitava
   * o MESMO e-mail de novo — pedir a informação que acabamos de receber, no
   * ponto de maior frustração do funil.
   *
   * ⚠️ Mais relevante agora: `send.facies.app` é domínio de envio novo, sem
   * reputação acumulada. Cair em spam nas primeiras semanas é esperado, e é
   * exatamente aí que reenviar sem atrito decide se a conta existe ou não.
   *
   * Sucesso desabilita o botão em vez de permitir repetir: o servidor limita a
   * 3 por minuto e 15 por dia (`auth:resend`), e deixar clicar até bater no teto
   * daria erro em vez de resposta. Quem precisar de outro depois de um recarrega
   * a página.
   */
  async function reenviar() {
    if (reenviando || reenvioFeito) return;
    setReenviando(true);
    setErroReenvio("");
    try {
      await resendLocalVerification({ email: email.trim() });
      setReenvioFeito(true);
    } catch {
      // Sem distinguir causa: a resposta do servidor é uniforme de propósito
      // (não revela se o e-mail existe), então detalhar aqui seria inventar.
      setErroReenvio("Não deu para reenviar agora. Tente de novo em instantes.");
    } finally {
      setReenviando(false);
    }
  }

  // A conta foi criada e o e-mail saiu. Trocar a tela inteira, em vez de mostrar
  // um aviso acima do formulário, é o que evita a pessoa reenviar o cadastro
  // achando que não funcionou — e um segundo envio devolveria 409.
  if (aguardandoVerificacao) {
    return (
      <div className="min-h-screen bg-paper px-4 pb-16">
        <main className="mx-auto w-full max-w-md">
          <CabecalhoPublico />
          <div className="pt-10">
            <span className="paper-eyebrow">Conta criada</span>
            <h1 className="mt-3 font-serif text-2xl font-semibold leading-snug text-ink">
              Confirme seu e-mail para continuar.
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              Enviamos um link para <span className="text-ink">{email.trim()}</span>. Abra
              ele para confirmar a conta — o link vale uma vez e expira.
            </p>
            <p className="mt-4 text-sm leading-6 text-muted">
              Não chegou? Confira o spam — estamos começando a enviar deste endereço,
              e alguns provedores demoram a confiar.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void reenviar()}
                disabled={reenviando || reenvioFeito}
                className="paper-control rounded-control border border-edge bg-surfaceMuted px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50"
              >
                {reenviando ? "Enviando…" : "Reenviar o link"}
              </button>
              {reenvioFeito ? (
                <span role="status" className="text-sm text-ink">
                  Reenviado. Confira a caixa de entrada e o spam.
                </span>
              ) : null}
              {erroReenvio ? (
                <span role="alert" className="text-sm text-danger">
                  {erroReenvio}
                </span>
              ) : null}
            </div>
            <p className="mt-8 text-xs leading-5 text-muted">
              Enquanto isso, a leitura da sua prova continua liberada e não depende de
              conta.{" "}
              <Link href="/" className="underline underline-offset-2">
                Ver a fácies
              </Link>
              .
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper px-4 pb-16">
      <main className="mx-auto w-full max-w-md">
        <CabecalhoPublico />

        <div className="pt-6">
          <span className="paper-eyebrow">Criar conta</span>
          <h1 className="mt-3 font-serif text-2xl font-semibold leading-snug text-ink">
            Comece pela sua prova.
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            A leitura da fácies é gratuita e não exige conta. A conta serve para o que vem
            depois: medir onde você está e dimensionar o que estudar.
          </p>
        </div>

        <div className="mt-8">
          <SignupForm
            signupFirstName={firstName}
            setSignupFirstName={setFirstName}
            signupLastName={lastName}
            setSignupLastName={setLastName}
            signupEmail={email}
            setSignupEmail={setEmail}
            signupPassword={password}
            setSignupPassword={setPassword}
            signupConfirmPassword={confirmPassword}
            setSignupConfirmPassword={setConfirmPassword}
            signupPasswordsMismatch={passwordsMismatch}
            signupTermsAccepted={termsAccepted}
            setSignupTermsAccepted={setTermsAccepted}
            signupCaptchaToken={captchaToken}
            setSignupCaptchaToken={setCaptchaToken}
            signupCaptchaResetCounter={captchaResetCounter}
            signupBusy={busy}
            signupError={error}
            signupCanSubmit={canSubmit}
            recaptchaSiteKey={recaptchaSiteKey}
            googleClientId={googleClientId}
            googleButtonRef={googleButtonRef}
            googleError={googleError}
            viaEmailDisponivel={viaEmailDisponivel}
            installState={installState}
            onSignup={handleSignup}
            onSwitchView={() => router.push("/login")}
          />
        </div>

        <p className="mt-8 text-xs leading-5 text-muted">
          A Fácies não promete aprovação e não vende conteúdo teórico.{" "}
          <Link href="/" className="underline underline-offset-2">
            Ver a fácies da sua prova
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
