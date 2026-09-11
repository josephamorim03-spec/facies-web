"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { resendLocalVerification, verifyLocalEmail } from "@/lib/api/domains/auth";
import { CabecalhoPublico } from "@/components/facies/CabecalhoPublico";
import { LoadBar } from "@/components/ui/LoadBar";

/**
 * O link do e-mail de verificação.
 *
 * ## Esta página existia e não fazia nada
 *
 * Eram cinco linhas: `redirect("/login")`. O e-mail apontava para cá com
 * `?token=...` (`LOCAL_AUTH_VERIFICATION_BASE_URL`), e o token nunca era
 * consumido — a conta ficava `email_verified=false` para sempre e
 * `resolve_current_user` recusava o login local com 403.
 *
 * O endpoint do backend sempre existiu. Faltava quem o chamasse: o cadastro
 * local era inalcançável em produção (`AUTH_MODE` google-only), então ninguém
 * chegava a clicar no link para descobrir que ele não levava a nada.
 *
 * ## Por que o token sai da URL depois de usado
 *
 * `history.replaceState` limpa a query assim que o token é lido. Ele é de uso
 * único, mas até ser consumido continua válido — e URL vaza por histórico do
 * navegador, `Referer` e print de tela.
 *
 * ## Por que a verificação roda UMA vez
 *
 * `useEffect` em StrictMode roda duas vezes em desenvolvimento. Sem a trava, a
 * segunda chamada encontra o token já consumido e pinta a tela de erro depois de
 * ter dado certo — o pior tipo de falso negativo, porque a conta ESTÁ verificada.
 */

type Estado = "verificando" | "ok" | "invalido" | "sem_token";

function VerifyEmailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // O token está disponível já na PRIMEIRA renderização, então "não veio token"
  // é estado inicial DERIVADO — não algo a setar dentro do efeito. Setar ali
  // dispara uma renderização em cascata (o eslint reclama, e com razão: a tela
  // pisca "verificando" antes de admitir que não havia o que verificar).
  const tokenDaUrl = searchParams.get("token")?.trim() ?? "";
  const [estado, setEstado] = useState<Estado>(tokenDaUrl ? "verificando" : "sem_token");
  const [email, setEmail] = useState("");
  const [reenviando, setReenviando] = useState(false);
  const [reenviado, setReenviado] = useState(false);
  const jaRodou = useRef(false);

  useEffect(() => {
    if (jaRodou.current) return;
    jaRodou.current = true;

    if (!tokenDaUrl) return;

    // Tira o token da URL antes mesmo da resposta: ele já foi lido, e a partir
    // daqui só atrapalha (histórico, Referer, print).
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", window.location.pathname);
    }

    verifyLocalEmail(tokenDaUrl)
      .then((resposta) => {
        setEmail(resposta.email);
        setEstado("ok");
      })
      .catch(() => setEstado("invalido"));
  }, [tokenDaUrl]);

  async function reenviar() {
    if (!email.trim() || reenviando) return;
    setReenviando(true);
    try {
      await resendLocalVerification({ email: email.trim() });
    } catch {
      // A resposta do backend é uniforme por desenho (anti-enumeração), e um
      // erro de rede aqui não muda o que dizemos: a mensagem é a mesma nos dois
      // casos, senão a tela vira o oráculo que o backend evita ser.
    }
    setReenviado(true);
    setReenviando(false);
  }

  if (estado === "verificando") {
    return (
      <div className="w-full max-w-xs">
        <LoadBar label="Verificando seu e-mail" />
        <p className="paper-eyebrow mt-2">Verificando</p>
      </div>
    );
  }

  if (estado === "ok") {
    return (
      <div className="w-full max-w-md">
        <span className="paper-eyebrow">E-mail confirmado</span>
        <h1 className="mt-3 font-serif font-semibold leading-snug text-ink">
          Pronto, {email} está confirmado.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Falta um passo curto: contar quem você é, para a Fácies dimensionar o que
          recomenda. São três campos.
        </p>
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="paper-control mt-6 inline-flex rounded-control border border-primary bg-primary px-5 py-2.5 text-sm font-medium text-primaryInk"
        >
          Entrar
        </button>
      </div>
    );
  }

  // `invalido` e `sem_token` compartilham a tela: em ambos os casos a pessoa
  // precisa de um link novo, e distinguir "token expirado" de "token inválido"
  // não muda nada para ela — só informaria a quem está testando tokens.
  return (
    <div className="w-full max-w-md">
      <span className="paper-eyebrow">Link inválido</span>
      <h1 className="mt-3 font-serif font-semibold leading-snug text-ink">
        Este link não vale mais.
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        Links de verificação expiram e valem uma vez só. Se você já confirmou antes, é só
        entrar. Se não, peça um link novo.
      </p>

      {reenviado ? (
        <p className="mt-6 border-t border-rule pt-5 text-sm text-ink">
          Se houver uma conta com esse e-mail aguardando confirmação, o link acabou de
          sair. Confira a caixa de entrada e o spam.
        </p>
      ) : (
        <div className="mt-6 border-t border-rule pt-5">
          <label htmlFor="email-reenvio" className="block text-sm font-medium text-ink">
            Reenviar para
          </label>
          <input
            id="email-reenvio"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            autoComplete="email"
            className="paper-control mt-2 w-full rounded-control border border-edge bg-surface px-3 py-2.5 text-sm text-ink"
          />
          <button
            type="button"
            onClick={reenviar}
            disabled={!email.trim() || reenviando}
            className="paper-control mt-3 w-full rounded-control border border-primary bg-primary px-5 py-2.5 text-sm font-medium text-primaryInk disabled:opacity-50"
          >
            {reenviando ? "Enviando…" : "Enviar novo link"}
          </button>
        </div>
      )}

      <p className="mt-6 text-sm text-muted">
        <Link href="/login" className="font-semibold text-primary">
          Voltar para entrar
        </Link>
      </p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-paper px-4 pb-16">
      <main className="mx-auto w-full max-w-md">
        <CabecalhoPublico />
        {/* `useSearchParams` exige limite de Suspense para a rota poder ser
            pré-renderizada; sem ele o build falha na geração estática. */}
        <div className="flex justify-center pt-10">
          <Suspense
            fallback={
              <div className="w-full max-w-xs">
                <LoadBar label="Carregando" />
              </div>
            }
          >
            <VerifyEmailInner />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
