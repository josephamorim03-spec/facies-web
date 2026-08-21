"use client";

import { AREA_COLORS, AREA_LABELS } from "@/app/desempenho/_lib/perfilAnalytics";
import type { Area as AreaKey } from "@/app/desempenho/_lib/perfilShared";

type Props = {
  activeAreaLines: AreaKey[];
  areaLineData: Record<string, unknown>[];
};

const VB_W = 132;
const VB_H = 44;
const PAD = { x: 3, top: 6, bottom: 4 };

function seriesFor(area: AreaKey, rows: Record<string, unknown>[]): (number | null)[] {
  return rows.map((r) => {
    const v = r[area];
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  });
}

/**
 * Small multiples: um mini-gráfico de acerto por área, com % atual e tendência.
 * Domínio Y compartilhado entre as áreas para comparação justa.
 */
export function AreaSmallMultiples({ activeAreaLines, areaLineData }: Props) {
  if (activeAreaLines.length === 0) return null;

  // Domínio compartilhado (min/max de todas as áreas ativas, com folga, dentro de 0–100).
  const allValues: number[] = [];
  for (const area of activeAreaLines) {
    for (const v of seriesFor(area, areaLineData)) if (v !== null) allValues.push(v);
  }
  const rawMin = allValues.length ? Math.min(...allValues) : 0;
  const rawMax = allValues.length ? Math.max(...allValues) : 100;
  const min = Math.max(0, Math.floor(rawMin - 5));
  const max = Math.min(100, Math.ceil(rawMax + 5));
  const span = Math.max(1, max - min);

  const n = areaLineData.length;
  const xAt = (i: number) => PAD.x + (VB_W - PAD.x * 2) * (n <= 1 ? 0.5 : i / (n - 1));
  const yAt = (v: number) => VB_H - PAD.bottom - (VB_H - PAD.top - PAD.bottom) * ((v - min) / span);

  return (
    <section data-testid="chart-area-small-multiples" className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {activeAreaLines.map((area) => {
          const color = AREA_COLORS[area];
          const series = seriesFor(area, areaLineData);
          const nonNull = series.filter((v): v is number => v !== null);
          const current = nonNull.length ? nonNull[nonNull.length - 1] : null;
          const first = nonNull.length ? nonNull[0] : null;
          const delta = current !== null && first !== null ? current - first : null;
          const tone =
            delta === null || Math.abs(delta) < 1 ? "text-muted" : delta > 0 ? "text-success" : "text-danger";
          const arrow = delta === null || Math.abs(delta) < 1 ? "→" : delta > 0 ? "↑" : "↓";

          // Caminho da sparkline, quebrando em lacunas (null).
          let linePath = "";
          series.forEach((v, i) => {
            if (v === null) return;
            const cmd = linePath.endsWith("Z") || linePath === "" || series[i - 1] === null ? "M" : "L";
            linePath += `${cmd}${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)} `;
          });
          // Área preenchida só quando a série é contínua o suficiente (usa o último ponto).
          const firstIdx = series.findIndex((v) => v !== null);
          const lastIdx = series.length - 1 - [...series].reverse().findIndex((v) => v !== null);
          const areaPath =
            firstIdx >= 0 && current !== null
              ? `${linePath}L${xAt(lastIdx).toFixed(1)} ${(VB_H - PAD.bottom).toFixed(1)} L${xAt(firstIdx).toFixed(1)} ${(VB_H - PAD.bottom).toFixed(1)} Z`
              : "";

          return (
            <div key={area} className="border border-edge bg-paper px-2.5 py-2">
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-micro font-bold tracking-wide" style={{ color }}>
                  {area}
                </span>
                {delta !== null && (
                  <span className={`text-nano font-semibold tabular-nums ${tone}`}>
                    {arrow} {delta > 0 ? "+" : ""}
                    {delta}
                  </span>
                )}
              </div>
              <div className="truncate text-pico leading-tight text-muted">{AREA_LABELS[area]}</div>
              <div className="mt-0.5 text-base font-semibold tabular-nums text-ink">
                {current === null ? "—" : `${current}%`}
              </div>
              <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="mt-1 block w-full" style={{ height: "auto" }} aria-hidden="true">
                {/* Hachura de 1px, nao tinta translucida.

                    O `fillOpacity={0.1}` aqui era o mesmo gesto que saiu do
                    grafico principal: area que desvanece simula profundidade, e
                    o sistema desenha em traco chapado. A trama diz "abaixo da
                    linha" sem inventar volume, e sobrevive a impressao.

                    O `id` carrega a area porque os seis cartoes convivem no
                    mesmo documento — `id` repetido faria os seis usarem a cor
                    do primeiro. */}
                {areaPath && (
                  <>
                    <defs>
                      <pattern
                        id={`sparkline-hatch-${area}`}
                        width="4"
                        height="4"
                        patternUnits="userSpaceOnUse"
                      >
                        <path d="M0 4L4 0" stroke={color} strokeWidth={0.5} strokeOpacity={0.55} />
                      </pattern>
                    </defs>
                    <path d={areaPath} fill={`url(#sparkline-hatch-${area})`} stroke="none" />
                  </>
                )}
                {linePath && (
                  <path
                    d={linePath.trim()}
                    fill="none"
                    stroke={color}
                    strokeWidth={1}
                    strokeLinejoin="miter"
                    strokeLinecap="butt"
                  />
                )}
                {current !== null && lastIdx >= 0 && (
                  <rect x={xAt(lastIdx) - 1.5} y={yAt(current) - 1.5} width={3} height={3} fill={color} />
                )}
              </svg>
            </div>
          );
        })}
      </div>
    </section>
  );
}
