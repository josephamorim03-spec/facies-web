"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { obterStatusCadastro, registrarAceite } from "@/lib/api/domains/cadastro";
import { resolveAuthenticatedLandingRoute } from "@/lib/initialGoalSetup";
import { LoadBar } from "@/components/ui/LoadBar";

/**
 * O aceite dos documentos vigentes, sozinho.
 *
 * ## Por que não é dentro de `/cadastro/completar`
 *
 * Aquela tela redireciona para fora assim que `cadastro_completo` é verdadeiro,
 * e é exatamente essa a situação de quem precisa re-aceitar: identidade
 * completa, documento novo. Reusá-la faria a pessoa entrar e sair em laço.
 *
 * E o título mentiria. Concordar com uma versão nova dos Termos não é
 * "completar cadastro" — é uma decisão sobre um contrato, tomada por alguém que
 * já é usuário.
 *
 * ## Os dois públicos
 *
 * 1. **Quem entrou pelo Google e nunca aceitou nada.** Em produção
 *    google-only isso é todo mundo: essa conta não passa pelo cadastro local,
 *    onde o aceite viaja junto com a identidade.
 * 2. **Toda a base, no dia em que uma versão nova for publicada.**
 *
 * ## Inerte enquanto não houver texto
 *
 * `aceites_pendentes` vem vazio enquanto `app/legal/` estiver vazio — o sistema
 * é inerte por desenho. Nesse estado ninguém é roteado para cá, e quem chegar
 * pela URL é mandado adiante em vez de ver um formulário sem conteúdo.
 */

/** Rótulo humano por tipo de documento, na mesma ordem em que o backend lista. */
const NOMES: Record<string, { rotulo: string; href: string }> = {
  termos_de_uso: { rotulo: "Termos de Uso", href: "/termos" },
  politica_privacidade: { rotulo: "Política de Privacidade", href: "/privacidade" },
  contrato_assinatura: { rotulo: "Contrato de Assinatura", href: "/termos" },
  politica_reembolso: { rotulo: "Política de Reembolso", href: "/termos" },
  politica_cookies: { rotulo: "Política de Cookies", href: "/privacidade" },
};

export default function AceitePage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aceite, setAceite] = useState(false);
  const [pendentes, setPendentes] = useState<string[]>([]);

  useEffect(() => {
    let vivo = true;
    obterStatusCadastro("")
      .then((status) => {
        if (!vivo) return;
        // Nada pendente: esta tela não tem o que fazer. Vale para o estado de
        // hoje (sem documento publicado) e para quem já aceitou e voltou pela URL.
        if (status.aceites_pendentes.length === 0) {
          resolveAuthenticatedLandingRoute("")
            .then((rota) => router.replace(rota))
            .catch(() => router.replace("/hoje"));
          return;
        }
        setPendentes(status.aceites_pendentes);
        setCarregando(false);
      })
      .catch(() => {
        if (vivo) router.replace("/login");
      });
    return () => {
      vivo = false;
    };
  }, [router]);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!aceite || salvando) return;
    setSalvando(true);
    setErro(null);
    try {
      await registrarAceite();
      router.replace(await resolveAuthenticatedLandingRoute(""));
    } catch {
      setErro("Não consegui registrar seu aceite. Tente de novo.");
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <div className="w-full max-w-xs">
          <LoadBar label="Carregando os documentos" />
          <p className="paper-eyebrow mt-2">Carregando</p>
        </div>
      </div>
    );
  }

  const documentos = pendentes.map((kind) => NOMES[kind] ?? { rotulo: kind, href: "/termos" });

  return (
    <div className="min-h-screen bg-paper px-4 py-10">
      <main className="mx-auto w-full max-w-lg">
        <span className="paper-eyebrow">Um minuto</span>
        <h1 className="mt-3 font-serif text-2xl font-semibold leading-snug text-ink">
          {documentos.length > 1 ? "Atualizamos nossos documentos" : "Atualizamos um documento"}
        </h1>
        <p className="mt-3 max-w-[52ch] text-sm leading-6 text-muted">
          Leia antes de concordar — os links abrem o texto completo, e ele fica sempre
          disponível depois.
        </p>

        <ul className="mt-6 space-y-2 border-y border-rule py-5">
          {documentos.map((doc) => (
            <li key={doc.rotulo} className="text-sm leading-6 text-ink">
              <Link href={doc.href} className="font-semibold text-primary underline">
                {doc.rotulo}
              </Link>
            </li>
          ))}
        </ul>

        <form className="mt-6 space-y-6" onSubmit={enviar} noValidate>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={aceite}
              onChange={(e) => setAceite(e.target.checked)}
              className="mt-0.5"
              required
            />
            <span className="text-sm leading-6 text-ink">
              Li e aceito {documentos.length > 1 ? "os documentos acima" : "o documento acima"}.{" "}
              <span className="text-danger">*</span>
            </span>
          </label>

          {erro ? (
            <p role="alert" className="text-sm leading-6 text-danger">
              {erro}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!aceite || salvando}
            className="paper-control inline-flex rounded-control border border-primary bg-primary px-5 py-2.5 text-sm font-medium text-primaryInk disabled:opacity-50"
          >
            {salvando ? "Registrando…" : "Concordar e continuar"}
          </button>
        </form>
      </main>
    </div>
  );
}
