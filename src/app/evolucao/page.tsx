"use client";

import { EvolucaoClientPage } from "./EvolucaoClientPage";

/**
 * Aba `evolucao` — os sete cartoes dos artboards `9b` (celular) e `12a`
 * (desktop).
 *
 * Fina de proposito: a leitura inteira depende do token do aluno, entao ela vive
 * no cliente. A versao anterior desta pagina era um painel de graficos com 249
 * linhas de logica de medida aqui dentro; a logica virou `_lib/leitura.ts`, que
 * tem teste.
 */
export default function EvolucaoPage() {
  return <EvolucaoClientPage />;
}
