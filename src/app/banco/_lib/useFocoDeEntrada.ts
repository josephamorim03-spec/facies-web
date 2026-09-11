"use client";

import { useEffect, useRef } from "react";

import type { QuestionBankTopic } from "@/lib/api";
import type { QuestionBankEntryContext } from "./sessionBuilder";

/**
 * O foco pedido por quem navegou até o Banco, FORA do calendário.
 *
 * ## O defeito que isto fecha
 *
 * ⚠️ A página só resolvia tópico quando `source === "calendar-review"`. Toda
 * outra origem caía num Banco sem foco nenhum — e a principal delas é o fim de
 * sessão, que monta `/banco?knowledge_node_ids=…` para o botão "Treinar {tema}".
 * O parâmetro viajava na URL e ninguém o lia.
 *
 * ## Por que é um efeito separado do calendário
 *
 * O do calendário **bloqueia o render** até resolver: uma revisão datada aberta
 * com o filtro errado é pior que uma espera de meio segundo. Aqui não há o que
 * esperar — o Banco já é útil sem o foco, e ele entra quando o bootstrap
 * chegar.
 *
 * A trava por `routeSearchKey` é o que impede o efeito de reimpor a seleção
 * depois de o aluno a ter mudado: aplica-se uma vez por URL, não a cada render
 * em que os tópicos mudam de identidade.
 */
export function useFocoDeEntrada({
  ativo,
  contexto,
  chaveDaRota,
  topicos,
  aoAplicar,
}: {
  /** O bootstrap já chegou. Sem ele não há em que procurar. */
  ativo: boolean;
  contexto: QuestionBankEntryContext;
  chaveDaRota: string;
  topicos: QuestionBankTopic[];
  aoAplicar: (achados: QuestionBankTopic[]) => void;
}) {
  const aplicadoRef = useRef<string | null>(null);

  useEffect(() => {
    if (!ativo || contexto.source) return;
    if (contexto.knowledgeNodeIds.length === 0) return;
    if (aplicadoRef.current === chaveDaRota) return;
    const achados = contexto.knowledgeNodeIds
      .map((id) => topicos.find((topico) => topico.knowledge_node_id === id))
      .filter((topico): topico is QuestionBankTopic => Boolean(topico));
    // ⚠️ A TRAVA SÓ FECHA DEPOIS DE ACHAR.
    //
    // Marcar a rota como aplicada ANTES da busca fazia o foco cair em silêncio
    // quando o nó ainda não estava na lista carregada: o efeito nunca mais
    // tentava para aquela URL, e o Banco abria sem assunto nenhum — sem erro,
    // sem aviso. Era o mesmo defeito que esta rodada existe para remover, dentro
    // da correção dele.
    if (achados.length === 0) return;
    aplicadoRef.current = chaveDaRota;
    aoAplicar(achados);
  }, [ativo, aoAplicar, chaveDaRota, contexto, topicos]);
}
