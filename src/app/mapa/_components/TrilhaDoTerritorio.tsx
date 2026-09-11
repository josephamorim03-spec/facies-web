"use client";

import { AREA_VAR } from "@/lib/areaIdentity";
import { resolveDisplayArea } from "@/lib/areaDisplay";
import type { Indice, Passo } from "./mapaLayout";

/**
 * O rastro: onde você está, e o caminho de volta inteiro.
 *
 * ## Por que um botão por nível, e não a trilha proporcional
 *
 * O desenho que eu tinha proposto punha, em cada linha, TODOS os irmãos daquele
 * nível como faixas proporcionais — contexto geométrico em vez de palavra, com
 * salto lateral de graça. É melhor de ler, e não foi feito.
 *
 * ⚠️ `tests/e2e/mapa.navegavel.spec.ts` — que está em `SPECS_DE_GATE` — prende o
 * contrato: o rastro é visível na raiz e cresce EXATAMENTE UM botão por nível
 * (`toBe(passosNoInicio + 1)`), e o primeiro botão volta ao começo. Uma linha de
 * N irmãos cresce N botões e derruba o gate.
 *
 * A escolha é deliberada: a proporcionalidade já é o assunto do mapa embaixo, e
 * o gate existe porque as duas versões anteriores foram reprovadas em produção.
 * Contrato de teste ganha de refinamento meu.
 */
export function TrilhaDoTerritorio({
  indice,
  caminho,
  nomeDaBanca,
  onIr,
  onVerTudo,
}: {
  indice: Indice;
  caminho: Passo[];
  nomeDaBanca: string;
  onIr: (nivel: number) => void;
  onVerTudo: () => void;
}) {
  return (
    <nav
      aria-label="Onde você está"
      className="flex flex-wrap items-center gap-1 border-b border-edge bg-surface px-1.5 py-1"
    >
      <button
        type="button"
        onClick={onVerTudo}
        aria-current={caminho.length === 0 ? "page" : undefined}
        className="paper-control min-h-9 rounded-control px-2 text-nota text-muted hover:text-ink"
      >
        {nomeDaBanca}
      </button>

      {caminho.map((passo, nivel) => {
        const no = passo.tipo === "no" ? indice.porId.get(passo.id) : undefined;
        const area = no
          ? resolveDisplayArea(null, no.node_path?.[0] ?? no.node_name)
          : null;
        const cor = area
          ? (AREA_VAR[area as keyof typeof AREA_VAR] ?? "var(--color-primary)")
          : "var(--color-muted)";
        const ultimo = nivel === caminho.length - 1;
        return (
          <span key={`${passo.tipo}-${nivel}`} className="flex items-center gap-1">
            <span aria-hidden="true" className="text-nota text-muted">
              ›
            </span>
            <button
              type="button"
              onClick={() => onIr(nivel)}
              aria-current={ultimo ? "page" : undefined}
              className={`paper-control inline-flex min-h-9 items-center gap-1.5 rounded-control px-2 text-nota ${
                ultimo ? "text-ink" : "text-muted hover:text-ink"
              }`}
            >
              {/* A cor da área vai no filete, e o nome em tinta.
                  `areaIdentity.ts` proíbe escrever o nome NA cor da área. */}
              <span aria-hidden="true" className="h-3 w-[3px] shrink-0" style={{ background: cor }} />
              <span className="max-w-[18ch] truncate">{passo.nome}</span>
            </button>
          </span>
        );
      })}
    </nav>
  );
}
