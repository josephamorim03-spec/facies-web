"use client";

import { AREA_BG_CLASS } from "@/lib/areaColors";
import { Meter } from "@/components/ui/Meter";
import type { QuestionBankPerformance } from "@/lib/api";
import { CabecalhoDoGrafico } from "./CabecalhoDoGrafico";

type Props = {
  performance?: QuestionBankPerformance | null;
};

export function AreaAccuracySnapshot({ performance }: Props) {
  const rows = (performance?.areas ?? [])
    .filter((area) => area.questions_seen > 0 && area.accuracy !== null)
    .sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0));

  return (
    <section data-testid="chart-area-accuracy-snapshot" className="space-y-3">
      {/* "Acurácia diagnóstica acumulada pela primeira tentativa" era uma frase
          em sans a explicar o eixo. O sistema já tem o lugar da procedência do
          número, e ele é o rótulo em mono. */}
      <CabecalhoDoGrafico titulo="Acerto por grande área" medida="acerto na primeira tentativa" />
      {rows.length ? (
        <div className="space-y-2.5">
          {rows.map((area) => {
            const pct = Math.round((area.accuracy ?? 0) * 100);
            const code = area.area.toUpperCase();
            return (
              <Meter
                key={area.area}
                label={code}
                // Sigla de área é dado, e a mono do desenho nunca é negrito: o
                // `font-semibold` daqui pintava 12/600, degrau que as artboards
                // não têm. O que separa a sigla do valor é a tinta.
                labelClassName="w-9 font-mono text-ink"
                pct={pct}
                fillClassName={AREA_BG_CLASS[code] ?? "bg-primary"}
                value={`${pct}% · ${area.questions_seen} q`}
                valueClassName="w-20 text-right font-mono text-muted tabular-nums"
                className="min-h-7"
              />
            );
          })}
        </div>
      ) : (
        <p className="text-nota leading-6 text-muted">Responda questões em pelo menos uma grande área para formar esta leitura.</p>
      )}
    </section>
  );
}
