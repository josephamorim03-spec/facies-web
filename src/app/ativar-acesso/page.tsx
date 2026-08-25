"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getProfile } from "@/lib/api";
import { resolveAuthenticatedLandingRoute } from "@/lib/initialGoalSetup";
import { LoadBar } from "@/components/ui/LoadBar";

/**
 * Onde para quem entrou e ainda não tem acesso.
 *
 * Esta tela era um campo pedindo `KROS-XXXX-XXXX-XXXX-XXXX` — a chave de mentor.
 * O modelo de convite acabou: o acesso agora vem de assinatura ou de cortesia
 * concedida pelo admin, e não há nada que o visitante possa digitar aqui.
 *
 * O formulário saiu inteiro em vez de virar um campo que recusa tudo. Campo que
 * existe e nunca funciona é pior que campo ausente: a pessoa tenta, erra, e
 * conclui que o problema é dela.
 *
 * O que está escrito é só o que É VERDADE hoje. Sem preço, sem data, sem "em
 * breve" — anúncio vira obrigação (CDC art. 30), e a home foi limpa pelo mesmo
 * motivo. Quando o checkout existir, esta rota vira a entrada dele.
 *
 * A saída é a Fácies, onde há algo que funciona de verdade: a leitura da prova é
 * gratuita e não depende de acesso nenhum.
 *
 * ## Duas telas, porque são dois estados diferentes
 *
 * Desde que a conta passa a nascer com uma avaliação, `expired` deixou de ser um
 * caso de borda e virou o caminho normal: é quem usou o produto por 14 dias. Essa
 * pessoa não precisa saber o que a Fácies é — ela acabou de usar. Precisa saber
 * que o trabalho dela continua guardado.
 *
 * `status_de_acesso` já separava "nunca teve" de "teve e venceu"; o que faltava
 * era a tela ler essa diferença em vez de dar a mesma resposta às duas.
 */
export default function AtivarAcessoPage() {
  const router = useRouter();
  const [verificando, setVerificando] = useState(true);
  const [venceu, setVenceu] = useState(false);

  useEffect(() => {
    getProfile("")
      .then((profile) => {
        if (profile.access_status === "active") {
          resolveAuthenticatedLandingRoute("")
            .then((rota) => router.replace(rota))
            .catch(() => router.replace("/"));
        } else {
          setVenceu(profile.access_status === "expired");
          setVerificando(false);
        }
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  if (verificando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <div className="w-full max-w-xs">
          <LoadBar label="Verificando seu acesso" />
          <p className="paper-eyebrow mt-2">Verificando acesso</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <main className="w-full max-w-md">
        <span className="paper-eyebrow">Sua conta</span>
        <h1 className="mt-3 font-serif text-2xl font-semibold leading-snug text-ink">
          {venceu ? "Sua avaliação terminou." : "Seu acesso ao app não está ativo."}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          {venceu
            ? "Nada do que você fez foi perdido. As questões respondidas, o que o sistema mediu sobre você e a sua prova alvo continuam guardados, e voltam exatamente como estavam quando o acesso for reativado."
            : "O app ainda não está aberto para assinatura. Sua conta continua sua — o progresso, as preferências e os dados ficam onde estão, e voltam assim que o acesso for ativado."}
        </p>

        <div className="mt-6 border-t border-rule pt-5">
          <p className="text-sm font-semibold text-ink">Enquanto isso</p>
          <p className="mt-1 text-sm leading-6 text-muted">
            A leitura da sua prova é gratuita e não depende disto. Lá dá para ver como a sua
            banca cobra e ser avisado quando ela mudar.
          </p>
          <Link
            href="/"
            className="paper-control mt-4 inline-flex rounded-control border border-primary bg-primary px-5 py-2.5 text-sm font-semibold text-primaryInk"
          >
            Ver a fácies da sua prova
          </Link>
        </div>

        {/* Quem está sem acesso é justamente quem mais precisa alcançar isto:
            exportar os dados e excluir a conta são direitos do titular, não do
            assinante. `/conta` fica fora do portão de acesso por isso. */}
        <p className="mt-6 text-sm text-muted">
          Você continua podendo{" "}
          <Link href="/conta" className="font-semibold text-primary">
            exportar seus dados ou excluir a conta
          </Link>
          .
        </p>

        <p className="mt-8 text-xs leading-5 text-muted">
          A Fácies não promete aprovação e não vende conteúdo teórico.
        </p>
      </main>
    </div>
  );
}
