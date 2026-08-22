"use client";

import { useEffect, useRef } from "react";
import { registrarEvento } from "@/lib/faciesFunnel";

/**
 * Conta que esta página foi aberta.
 *
 * Por que precisa existir: `facies_vista` só dispara dentro do `FaciesPicker`,
 * que vive no índice. As páginas geradas por prova e por banca — que são as que
 * recebem o link colado em grupo — não contavam nada. O funil ficava cego
 * exatamente onde o tráfego bate, e sem esse número "12 e-mails capturados" não
 * significa coisa nenhuma: taxa sem denominador não é taxa.
 *
 * A página é estática e servida de CDN, então a contagem só pode vir do cliente.
 * Não há request no servidor para contar.
 *
 * Uma vez por montagem, com trava de `ref`: em desenvolvimento o StrictMode
 * invoca o efeito duas vezes, e um denominador inflado é pior que ausente —
 * ausente a gente percebe.
 */
export function ContarVisita({ chave }: { chave: string }) {
  const contado = useRef(false);

  useEffect(() => {
    if (contado.current) return;
    contado.current = true;
    registrarEvento("facies_pagina_aberta", chave);
  }, [chave]);

  return null;
}
