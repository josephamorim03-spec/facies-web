"use client";

import { ChevronDown } from "lucide-react";

import { Meter } from "@/components/ui/Meter";
import { Skeleton } from "@/components/Skeleton";
import { AREA_BG_CLASS } from "@/lib/areaColors";
import { AREA_FULL_LABELS, type DisplayArea } from "@/lib/areaIdentity";
import type { KrosComposition as KrosCompositionData } from "@/lib/api";

type KrosCompositionProps = {
  composition: KrosCompositionData | null;
  loading: boolean;
};

function areaLabel(area: string): string {
  return AREA_FULL_LABELS[area as DisplayArea] ?? area;
}

function areaFill(area: string): string {
  return AREA_BG_CLASS[area as DisplayArea] ?? AREA_BG_CLASS.OU;
}

/** "38 novas · 12 reexpostas · 5 áreas" — a linha que fica visível fechada. */
function summaryLine(composition: KrosCompositionData): string {
  const parts = [`${composition.by_novelty.new_count} novas`];
  if (composition.by_novelty.revisited_count > 0) {
    parts.push(`${composition.by_novelty.revisited_count} reexpostas`);
  }
  const areas = composition.by_area.length;
  if (areas > 0) parts.push(`${areas} ${areas === 1 ? "área" : "áreas"}`);
  return parts.join(" · ");
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="paper-eyebrow">{title}</p>
      <div className="mt-2 space-y-1.5">{children}</div>
    </div>
  );
}

/**
 * O "ver mais" da montagem da prova. Responde *como esta prova foi montada* —
 * nunca *o que esperar da questão 7*: tudo aqui é agregado, porque antecipar a
 * categoria de um item específico num simulado seria entregar meia resposta.
 *
 * Fechado por padrão. A linha-resumo já dá a informação de maior valor (quanto
 * é inédito vs. reexposto) sem custar uma interação.
 */
export function KrosComposition({ composition, loading }: KrosCompositionProps) {
  if (!composition && loading) {
    return (
      <div className="mt-5 space-y-2" aria-label="Carregando a composição da prova">
        <Skeleton className="h-4 w-56 rounded-control" />
        <Skeleton className="h-11 w-full rounded-control" />
      </div>
    );
  }

  if (!composition || composition.total === 0) return null;

  const total = composition.total;
  const pct = (count: number) => (total > 0 ? (count / total) * 100 : 0);

  return (
    // `loading` com composição anterior presente: esmaece em vez de colapsar.
    // Sumir e voltar a cada ajuste da barra faria a página pular embaixo do dedo.
    <details
      className={`group mt-5 transition-opacity ${loading ? "opacity-50" : "opacity-100"}`}
    >
      <summary className="paper-control flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 marker:hidden">
        <span className="text-sm text-muted">
          <span className="font-semibold text-ink">Como esta prova foi montada</span>
          {" · "}
          {summaryLine(composition)}
        </span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>

      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        <Block title="Por que estas questões">
          {composition.by_intervention.length > 0 ? (
            composition.by_intervention.map((row) => (
              <Meter
                key={row.key}
                label={row.label}
                labelClassName="w-40 truncate text-ink"
                value={<span className="tabular-nums text-muted">{row.count}</span>}
                valueClassName="w-8 text-right"
                pct={pct(row.count)}
                fillClassName="bg-primary"
              />
            ))
          ) : (
            <p className="text-xs text-muted">Seleção sem sinal dominante.</p>
          )}
        </Block>

        <Block title="Distribuição por área">
          {composition.by_area.map((row) => (
            <Meter
              key={row.area}
              label={areaLabel(row.area)}
              labelClassName="w-40 truncate text-ink"
              value={<span className="tabular-nums text-muted">{row.count}</span>}
              valueClassName="w-8 text-right"
              pct={pct(row.count)}
              fillClassName={areaFill(row.area)}
            />
          ))}
        </Block>

        {composition.top_microcompetencies.length > 0 ? (
          <Block title="Microcompetências no foco">
            {composition.top_microcompetencies.map((micro) => (
              <Meter
                key={micro.node_id}
                label={micro.label}
                labelClassName="w-40 truncate text-ink"
                value={
                  <span className="tabular-nums text-muted">
                    {micro.count}
                    {micro.mastery != null ? ` · ${Math.round(micro.mastery * 100)}%` : ""}
                  </span>
                }
                valueClassName="w-16 text-right"
                // A barra mede o domínio, não a contagem: numa lista de "onde
                // você está fraco", a barra curta é a informação.
                pct={(micro.mastery ?? 0) * 100}
                fillClassName="bg-muted"
              />
            ))}
            <p className="pt-1 text-[11px] leading-4 text-muted">
              A barra mostra o seu domínio atual; o número, quantas questões da prova
              tocam nessa microcompetência.
            </p>
          </Block>
        ) : null}

        <Block title="Dificuldade e bancas">
          <div className="flex flex-wrap gap-1.5">
            {composition.by_difficulty.map((row) => (
              <span key={row.key} className="km-chip">
                {row.label} <span className="tabular-nums">{row.count}</span>
              </span>
            ))}
          </div>
          {composition.by_board.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {composition.by_board.map((row) => (
                <span key={row.board_code} className="km-chip">
                  {row.board_code} <span className="tabular-nums">{row.count}</span>
                </span>
              ))}
            </div>
          ) : null}
        </Block>
      </div>
    </details>
  );
}
