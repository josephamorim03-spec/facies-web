"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { resolveAuthenticatedLandingRoute } from "@/lib/initialGoalSetup";

/**
 * Manda quem já entrou para dentro do app, e NÃO manda mais ninguém para o login.
 *
 * O que mudou, e por quê: `/` era um redirect puro — quem não tinha sessão caía
 * em `/login` em até 5 segundos. Agora `/` é a página pública da Fácies, então
 * visitante anônimo TEM que ficar onde está. Ele é o público da página; mandá-lo
 * para um formulário de login antes de entregar valor é exatamente o gate antes
 * do valor que o §3.3 proíbe.
 *
 * O caminho do usuário autenticado fica igual ao que era, incluindo
 * `resolveAuthenticatedLandingRoute`: quem tem sessão não quer ler a landing.
 *
 * A sessão (`krosmed_session`) é httpOnly e invisível para `document.cookie`, por
 * isso a checagem passa pelo BFF em vez de ler o cookie no cliente.
 */
export function RedirectIfAuthenticated() {
  const router = useRouter();

  useEffect(() => {
    let ativo = true;

    fetch("/api/profile", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
      .then((res) => {
        if (!ativo || !res.ok) return;
        resolveAuthenticatedLandingRoute("")
          .then((rota) => {
            if (ativo) router.replace(rota);
          })
          .catch(() => {
            // Sessão válida mas rota indeterminada: `/hoje` é o destino padrão
            // do aluno. Nunca `/login` — ele JÁ está autenticado.
            if (ativo) router.replace("/hoje");
          });
      })
      .catch(() => {
        // Sem rede ou sem sessão: fica na página pública, que é conteúdo
        // completo por si só. Nenhum redirect de fallback aqui.
      });

    return () => {
      ativo = false;
    };
  }, [router]);

  return null;
}
