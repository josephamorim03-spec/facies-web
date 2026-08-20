"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { previewKros, type KrosMode, type KrosPreview } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";

/** Espaço entre o último ajuste e a chamada. A barra dispara no commit, não a cada pixel. */
const DEBOUNCE_MS = 450;

type UseKrosPreviewResult = {
  preview: KrosPreview | null;
  loading: boolean;
  /** Pede uma prévia agora, respeitando o debounce.
   *
   *  `minutes` e o tempo declarado na Rota: com ele o servidor devolve
   *  `suggested_size` e `size_band`. Sem ele a previa segue servindo o caminho
   *  antigo, de barra livre. */
  refresh: (mode: KrosMode, size: number, minutes?: number | null) => void;
};

/**
 * Prévia da composição do Kros.
 *
 * Três decisões que valem comentário:
 *
 * 1. **Mantém a prévia anterior enquanto carrega.** Zerar o estado a cada
 *    chamada faria o bloco de composição sumir e voltar a cada ajuste, com a
 *    página pulando embaixo do dedo. Quem consome esmaece em vez de colapsar.
 * 2. **Erro nunca vira estado de erro.** A prévia é informação acessória; se
 *    falhar, a tela segue com o que tinha e o botão de iniciar continua vivo.
 * 3. **Aborta a chamada anterior.** Arrastar a barra gera uma sequência de
 *    pedidos e só o último interessa — sem abortar, uma resposta atrasada
 *    poderia sobrescrever uma mais recente.
 */
export function useKrosPreview(): UseKrosPreviewResult {
  const [preview, setPreview] = useState<KrosPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      controllerRef.current?.abort();
    };
  }, []);

  const refresh = useCallback((mode: KrosMode, size: number, minutes?: number | null) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setLoading(true);
    timerRef.current = setTimeout(() => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      previewKros(
        getAuthToken(),
        {
          session_kind: "kros",
          feedback_timing: "post_result",
          kros_mode: mode,
          limit: size,
          // Com o tempo declarado o servidor devolve `suggested_size` e
          // `size_band`; sem ele a prévia segue no caminho de barra livre.
          ...(minutes ? { time_limit_minutes: minutes } : {}),
        },
        controller.signal,
      )
        .then((result) => {
          if (!mountedRef.current || controller.signal.aborted) return;
          setPreview(result);
        })
        .catch(() => undefined)
        .finally(() => {
          // Uma chamada abortada foi substituída por outra que ainda está no ar:
          // desligar o `loading` aqui faria a tela piscar "pronto" no meio.
          if (!mountedRef.current || controller.signal.aborted) return;
          setLoading(false);
        });
    }, DEBOUNCE_MS);
  }, []);

  return { preview, loading, refresh };
}
