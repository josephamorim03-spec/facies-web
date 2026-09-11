"use client";

import { useEffect, useRef } from "react";

import { recordTrainerRecommendationEvent } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";

/**
 * Emite `shown` uma vez por recomendação exibida ao aluno.
 *
 * ## Por que isto existe outra vez
 *
 * O disparo original vivia em `app/hoje/page.tsx` e saiu no commit `00347875`
 * ("fix(web): convergencia visual do aluno", 2026-08-03) — uma mudança visual,
 * sem nenhum teste vermelho. O último `shown` em produção é de **2026-08-02**.
 *
 * O que morreu junto foi a única medida de aceitação do motor:
 * `trainer_recommendation_repo` calcula `acceptance_rate = started / shown` e
 * devolve `None` quando `shown` é zero — que na tela se lê como "ainda não há
 * dados", e não como "o instrumento quebrou".
 *
 * Medido em 2026-09-09 contra produção: a política que serve o aluno hoje
 * (`trainer-policy-5-effort-budget`) tinha **24 recomendações geradas e zero
 * eventos de qualquer tipo**. As políticas que tinham `shown` (1, 2 e 3) tinham
 * `started = 0`, e as que tinham `started` nunca tiveram `shown` — as duas
 * metades do laço nunca coexistiram na mesma política.
 *
 * ## Uma diferença deliberada em relação ao original
 *
 * O original deduplicava **só** por `useRef`, que zera a cada remontagem — daí
 * os 273 eventos para apenas 36 recomendações distintas que ficaram no banco.
 * Aqui o `event_id` é determinístico (`shown:<recommendation_id>`), então a
 * idempotência passa a ser do **servidor** e sobrevive a remontagem, a segunda
 * aba e ao StrictMode do React em desenvolvimento. O `useRef` fica só para
 * poupar a ida à rede.
 *
 * ⚠️ **Duas telas emitem, e isso NÃO conta duas vezes** — mudou em 2026-09-10.
 *
 * A regra era "exclusivo do `/hoje`", e a razão escrita era a contagem
 * repetida: a faixa do treinador renderiza em várias páginas. Essa razão
 * envelheceu no próprio ficheiro que a escreveu — o parágrafo acima já diz que
 * o `event_id` é determinístico (`shown:<recommendation_id>`) e que a
 * idempotência passou a ser do SERVIDOR, sobrevivendo a remontagem, segunda aba
 * e StrictMode. Duas rotas com a mesma recomendação produzem o mesmo
 * `event_id`, e o servidor guarda um.
 *
 * O que mudou foi a barra: `/inicio` passou a ser a home, e `/hoje` a tela
 * secundária. Manter a emissão só no `/hoje` faria a medida de aceitação
 * cair para perto de zero de novo — e este instrumento JÁ MORREU UMA VEZ assim,
 * num commit de "convergencia visual" sem nenhum teste vermelho.
 *
 * `origem` é obrigatória para que as duas rotas se distingam no banco: sem ela,
 * `source_page` mentiria "/hoje" para eventos vindos do Início.
 *
 * ⚠️ Não existe `if (!token)` aqui de propósito. `getAuthToken()` devolve `""`
 * por desenho — a sessão vive num cookie httpOnly que o BFF converte em
 * `Authorization` — então um guard de token seria um `return` incondicional.
 */
export function useRecordRecommendationShown(
  recommendationId: string | null | undefined,
  origem: "/hoje" | "/inicio",
): void {
  const jaEmitido = useRef<string | null>(null);

  useEffect(() => {
    if (!recommendationId || jaEmitido.current === recommendationId) return;
    jaEmitido.current = recommendationId;
    // Best-effort: telemetria nunca pode derrubar a tela do dia.
    void recordTrainerRecommendationEvent(getAuthToken(), recommendationId, {
      event_type: "shown",
      event_id: `shown:${recommendationId}`,
      payload: { source_page: origem },
    }).catch(() => null);
  }, [recommendationId, origem]);
}
