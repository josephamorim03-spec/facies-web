"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/useToast";
import { getProfile } from "@/lib/api";
import { redeemKey } from "@/lib/api/domains/access-keys";
import { getAPIErrorCode } from "@/lib/api/shared/http";
import { resolveAuthenticatedLandingRoute } from "@/lib/initialGoalSetup";
import { LoadBar } from "@/components/ui/LoadBar";

export default function AtivarAcessoPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [keyCode, setKeyCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    getProfile("")
      .then((profile) => {
        if (profile.access_status === "active") {
          resolveAuthenticatedLandingRoute("")
            .then((route) => router.replace(route))
            .catch(() => router.replace("/"));
        } else {
          setChecking(false);
        }
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = keyCode.trim().toUpperCase();
    if (!code) return;
    setError("");
    setBusy(true);
    try {
      await redeemKey("", code);
      showToast("Acesso ativado.", "success");
      const route = await resolveAuthenticatedLandingRoute("");
      router.replace(route);
    } catch (err: unknown) {
      const errCode = getAPIErrorCode(err);
      if (errCode === "already_active") {
        router.replace("/");
      } else if (errCode === "invalid_key") {
        setError("Chave inválida ou já utilizada. Verifique e tente novamente.");
      } else if (errCode === "access_key_rate_limited") {
        setError("Muitas tentativas. Aguarde um pouco e tente novamente.");
      } else {
        setError("Erro ao ativar. Tente novamente em instantes.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-paper">
        <div className="w-full max-w-xs">
          <LoadBar label="Verificando seu acesso" />
          <p className="paper-eyebrow mt-2">Verificando acesso</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 bg-edge flex items-center justify-center">
            <svg
              className="w-7 h-7 text-ink"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="butt"
                strokeLinejoin="miter"
                d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-xl font-semibold text-ink text-center mb-1">Ativar Acesso</h1>
        <p className="text-sm text-muted text-center mb-6">
          Chave recebida do seu mentor
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={keyCode}
            onChange={(e) => setKeyCode(e.target.value.toUpperCase())}
            placeholder="KROS-XXXX-XXXX-XXXX-XXXX"
            maxLength={24}
            spellCheck={false}
            autoComplete="off"
            className="w-full px-3 py-2.5 rounded-control border border-edge bg-paper text-ink text-center text-base tracking-widest placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-ink/20"
          />

          {error && (
            <p className="text-xs text-red-600 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={busy || !keyCode.trim()}
            className="w-full py-2.5 bg-primary text-primaryInk text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {busy ? "Ativando..." : "Ativar"}
          </button>
        </form>

        {/* A saída para quem chegou pela Fácies e não tem chave.

            Sem este bloco a tela é um beco: o produto virou público em
            `facies.app`, o `PonteDiagnostico` manda o visitante para cá, e o que
            ele encontra é um campo pedindo um código de um mentor que ele não
            tem — sem explicação de que isso é o modelo e não um erro dele.

            O que está escrito aqui é só o que É VERDADE hoje: o acesso é por
            convite. Nenhuma promessa de preço, de data ou de venda — porque
            nada disso existe, e anúncio vira obrigação (CDC art. 30).

            O destino é a Fácies, onde já existe algo que funciona de verdade:
            a leitura é gratuita e o gate de e-mail avisa quando a prova muda.
            Transformar o beco em lista é o melhor que dá para fazer sem
            inventar um modelo comercial que ainda não foi decidido. */}
        <div className="mt-8 border-t border-rule pt-5">
          <p className="text-sm font-semibold text-ink">Não tem uma chave?</p>
          <p className="mt-1 text-sm text-muted">
            O acesso ao app hoje é por convite, e a chave vem de um mentor. Isto não é
            um erro seu.
          </p>
          <Link href="/" className="mt-3 inline-flex text-sm font-semibold text-primary">
            Ver a fácies da sua prova →
          </Link>
          <p className="mt-1 text-xs text-muted">
            A leitura é gratuita e sem cadastro. Lá dá para salvar a sua prova e ser
            avisado quando ela mudar.
          </p>
        </div>
      </div>
    </div>
  );
}
