"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { resetLocalPassword } from "@/lib/api/domains/auth";
import { CabecalhoPublico } from "@/components/facies/CabecalhoPublico";

/**
 * O link do e-mail de recuperação de senha.
 *
 * ## Esta página tinha o mesmo defeito da verificação
 *
 * Eram cinco linhas: `redirect("/login")`. O e-mail apontava para cá com
 * `?token=...` (`LOCAL_AUTH_RESET_BASE_URL`) e o token era descartado — quem
 * pedisse recuperação recebia um link que levava à tela de entrar sem nunca
 * permitir trocar a senha.
 *
 * O endpoint sempre existiu. Faltava a tela, e ninguém percebeu porque o login
 * local está desligado em produção (`AUTH_MODE` google-only): ninguém chegou a
 * pedir uma recuperação para descobrir que o link não levava a nada.
 *
 * ## A troca de senha derruba as sessões
 *
 * `reset_password` chama `revoke_user` ANTES de gravar a senha nova. Quem pede
 * recuperação normalmente suspeita que a conta foi comprometida — deixar a
 * sessão do invasor viva tornaria a troca inútil. A ordem também importa: se a
 * revogação falhasse depois, a senha já teria mudado e as sessões seguiriam de
 * pé, que é o pior dos dois lados.
 *
 * ## O token sai da URL
 *
 * Ele vive no `state` a partir da primeira renderização e some da barra de
 * endereço — é de uso único, mas até ser consumido continua válido, e URL vaza
 * por histórico, `Referer` e print de tela.
 */

const MIN_SENHA = 12;

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Lido uma vez, na primeira renderização. Ver a nota do topo: derivar em vez
  // de setar dentro de efeito evita a renderização em cascata.
  const [token] = useState(() => searchParams.get("token")?.trim() ?? "");
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [pronto, setPronto] = useState(false);

  // A MESMA regra de `is_password_valid`, para a pessoa saber antes de errar.
  // Duplicar validação entre cliente e servidor é aceitável quando o cliente só
  // ANTECIPA a mensagem; o servidor continua sendo quem decide.
  const forca = useMemo(() => {
    return {
      tamanho: senha.length >= MIN_SENHA,
      maiuscula: /[A-Z]/.test(senha),
      minuscula: /[a-z]/.test(senha),
      digito: /\d/.test(senha),
    };
  }, [senha]);
  const senhaValida = Object.values(forca).every(Boolean);
  const conferem = confirma.length > 0 && senha === confirma;

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!token || !senhaValida || !conferem || enviando) return;
    setEnviando(true);
    setErro("");
    try {
      await resetLocalPassword({ token, new_password: senha });
      setPronto(true);
    } catch {
      // Sem distinguir "token expirado" de "token inválido": para quem clicou não
      // muda nada, e distinguir só informaria quem está testando tokens.
      setErro(
        "Este link não vale mais. Links de recuperação expiram e valem uma vez só.",
      );
      setEnviando(false);
    }
  }

  if (!token) {
    return (
      <div className="w-full max-w-md">
        <span className="paper-eyebrow">Link inválido</span>
        <h1 className="mt-3 font-serif text-2xl font-semibold leading-snug text-ink">
          Falta o código deste link.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Abra o link direto do e-mail que você recebeu. Se ele já expirou, peça outro na
          tela de entrar.
        </p>
        <Link
          href="/login"
          className="paper-control mt-6 inline-flex rounded-control border border-primary bg-primary px-5 py-2.5 text-sm font-semibold text-primaryInk"
        >
          Ir para entrar
        </Link>
      </div>
    );
  }

  if (pronto) {
    return (
      <div className="w-full max-w-md">
        <span className="paper-eyebrow">Senha alterada</span>
        <h1 className="mt-3 font-serif text-2xl font-semibold leading-snug text-ink">
          Pronto. Sua senha foi trocada.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Todas as sessões anteriores foram encerradas — inclusive em outros aparelhos. Se
          alguém tinha acesso à sua conta, não tem mais.
        </p>
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="paper-control mt-6 inline-flex rounded-control border border-primary bg-primary px-5 py-2.5 text-sm font-semibold text-primaryInk"
        >
          Entrar com a senha nova
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <span className="paper-eyebrow">Nova senha</span>
      <h1 className="mt-3 font-serif text-2xl font-semibold leading-snug text-ink">
        Escolha uma senha nova.
      </h1>

      <form className="mt-6 space-y-4" onSubmit={enviar} noValidate>
        <div>
          <label htmlFor="senha" className="block text-sm font-semibold text-ink">
            Nova senha
          </label>
          <input
            id="senha"
            type="password"
            autoComplete="new-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            aria-describedby="regra-senha"
            className="paper-control mt-2 w-full rounded-control border border-edge bg-surface px-3 py-2.5 text-sm text-ink"
          />
          <ul id="regra-senha" className="mt-2 space-y-1 text-xs leading-5 text-muted">
            {[
              [forca.tamanho, `Ao menos ${MIN_SENHA} caracteres`],
              [forca.maiuscula, "Uma letra maiúscula"],
              [forca.minuscula, "Uma letra minúscula"],
              [forca.digito, "Um número"],
            ].map(([ok, rotulo]) => (
              <li key={String(rotulo)} className={ok ? "text-ink" : undefined}>
                {ok ? "✓" : "·"} {rotulo}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <label htmlFor="confirma" className="block text-sm font-semibold text-ink">
            Repita a senha
          </label>
          <input
            id="confirma"
            type="password"
            autoComplete="new-password"
            value={confirma}
            onChange={(e) => setConfirma(e.target.value)}
            className="paper-control mt-2 w-full rounded-control border border-edge bg-surface px-3 py-2.5 text-sm text-ink"
          />
          {confirma.length > 0 && !conferem ? (
            <p className="mt-2 text-sm text-danger">As senhas não são iguais.</p>
          ) : null}
        </div>

        {erro ? (
          <p role="alert" className="text-sm text-danger">
            {erro}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={!senhaValida || !conferem || enviando}
          className="paper-control w-full rounded-control border border-primary bg-primary px-5 py-3 text-sm font-semibold text-primaryInk disabled:opacity-50"
        >
          {enviando ? "Salvando…" : "Trocar senha"}
        </button>

        <p className="text-xs leading-5 text-muted">
          Trocar a senha encerra todas as sessões abertas, em qualquer aparelho.
        </p>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-paper px-4 pb-16">
      <main className="mx-auto w-full max-w-md">
        <CabecalhoPublico />
        <div className="flex justify-center pt-10">
          {/* `useSearchParams` exige limite de Suspense para a rota poder ser
              pré-renderizada. */}
          <Suspense fallback={<div className="w-full max-w-md" />}>
            <ResetPasswordInner />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
