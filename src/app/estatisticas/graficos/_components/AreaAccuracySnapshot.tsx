"use client";

import { AREA_BG_CLASS, AREA_TEXT_CLASS } from "@/lib/areaColors";
import { Meter } from "@/components/ui/Meter";
import type { QuestionBankPerformance } from "@/lib/api";

type Props = {
  performance?: QuestionBankPerformance | null;
};

export function AreaAccuracySnapshot({ performance }: Props) {
  const rows = (performance?.areas ?? [])
    .filter((area) => area.questions_seen > 0 && area.accuracy !== null)
    .sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0));

  return (
    <section data-testid="chart-area-accuracy-snapshot" className="space-y-3">
      <div>
        <h2 className="text-sm font-medium">Acerto por grande área</h2>
        <p className="mt-1 text-xs text-muted">Acurácia diagnóstica acumulada pela primeira tentativa.</p>
      </div>
      {rows.length ? (
        <div className="space-y-2.5">
          {rows.map((area) => {
            const pct = Math.round((area.accuracy ?? 0) * 100);
            const code = area.area.toUpperCase();
            return (
              <Meter
                key={area.area}
                label={code}
                labelClassName={`w-9 font-semibold ${AREA_TEXT_CLASS[code] ?? "text-ink"}`}
                pct={pct}
                fillClassName={AREA_BG_CLASS[code] ?? "bg-primary"}
                value={`${pct}% · ${area.questions_seen} q`}
                valueClassName="w-20 text-right text-muted tabular-nums"
                className="min-h-7"
              />
            );
          })}
        </div>
      ) : (
        <p className="text-xs leading-5 text-muted">Responda questões em pelo menos uma grande área para formar esta leitura.</p>
      )}
    </section>
  );
}
